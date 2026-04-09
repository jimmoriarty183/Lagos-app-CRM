-- Order confirmation transaction flow (pseudocode on top of existing schema).
-- Goal: confirm order atomically, reserve inventory for product lines,
-- generate service requests for service lines, write status history and event log.

-- Inputs:
--   :p_order_id uuid
--   :p_actor_id uuid
--   :p_expected_version integer
--   :p_reservation_mode text = 'FULL_ONLY' | 'ALLOW_PARTIAL'
--   :p_default_warehouse_id uuid (nullable)
--   :p_correlation_id uuid (nullable)

BEGIN;

-- 1) Lock target order row and validate optimistic lock.
WITH locked_order AS (
  SELECT *
  FROM public.orders
  WHERE id = :p_order_id
  FOR UPDATE
)
SELECT 1
FROM locked_order
WHERE status = 'READY_FOR_CONFIRMATION'
  AND version = :p_expected_version;
-- if no row -> RAISE EXCEPTION 'ORDER_NOT_CONFIRMABLE_OR_STALE_VERSION'

-- 2) Lock all order lines in deterministic order.
SELECT id
FROM public.order_lines
WHERE order_id = :p_order_id
ORDER BY line_no
FOR UPDATE;

-- 3) Validate line-level preconditions.
--    - statuses in ('DRAFT','CONFIRMED') only
--    - qty/amount consistency is already protected by table checks
--    - for PRODUCT lines: reservation_required_qty >= 0
-- if violation -> RAISE EXCEPTION 'ORDER_LINE_VALIDATION_FAILED'

-- 4) Reserve inventory for PRODUCT lines.
--    Each product line is processed with locked inventory_balances row.
FOR rec_line IN (
  SELECT ol.id, ol.catalog_product_id AS product_id, ol.reservation_required_qty, ol.reserved_qty
  FROM public.order_lines ol
  WHERE ol.order_id = :p_order_id
    AND ol.line_type = 'PRODUCT'
  ORDER BY ol.line_no
)
LOOP
  -- Skip lines with no required reservation.
  IF rec_line.reservation_required_qty <= 0 THEN
    CONTINUE;
  END IF;

  -- Determine warehouse (explicit input or default business rule outside SQL).
  -- pseudocode variable: v_warehouse_id

  SELECT *
  FROM public.inventory_balances ib
  WHERE ib.warehouse_id = v_warehouse_id
    AND ib.product_id = rec_line.product_id
  FOR UPDATE;
  -- if no row -> RAISE EXCEPTION 'INVENTORY_BALANCE_NOT_FOUND'

  v_needed_qty := rec_line.reservation_required_qty - rec_line.reserved_qty;
  v_available := ib.available_qty;

  IF :p_reservation_mode = 'FULL_ONLY' AND v_available < v_needed_qty THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK_FOR_FULL_RESERVATION';
  END IF;

  v_to_reserve := CASE
    WHEN :p_reservation_mode = 'ALLOW_PARTIAL' THEN LEAST(v_needed_qty, v_available)
    ELSE v_needed_qty
  END;

  IF v_to_reserve > 0 THEN
    INSERT INTO public.inventory_reservations (
      order_id,
      order_line_id,
      warehouse_id,
      product_id,
      status,
      reserved_qty,
      metadata
    )
    VALUES (
      :p_order_id,
      rec_line.id,
      v_warehouse_id,
      rec_line.product_id,
      'ACTIVE',
      v_to_reserve,
      jsonb_build_object('correlation_id', :p_correlation_id)
    )
    RETURNING id INTO v_reservation_id;

    INSERT INTO public.inventory_movements (
      warehouse_id,
      product_id,
      movement_type,
      status,
      qty,
      order_id,
      order_line_id,
      reservation_id,
      reason,
      metadata
    )
    VALUES (
      v_warehouse_id,
      rec_line.product_id,
      'RESERVE',
      'POSTED',
      v_to_reserve,
      :p_order_id,
      rec_line.id,
      v_reservation_id,
      'Order confirmation reservation',
      jsonb_build_object('correlation_id', :p_correlation_id)
    );

    UPDATE public.inventory_balances
    SET
      reserved_qty = reserved_qty + v_to_reserve,
      available_qty = on_hand_qty - (reserved_qty + v_to_reserve),
      last_movement_at = now()
    WHERE warehouse_id = v_warehouse_id
      AND product_id = rec_line.product_id;

    UPDATE public.order_lines
    SET
      reserved_qty = reserved_qty + v_to_reserve,
      status = CASE
        WHEN (reserved_qty + v_to_reserve) >= reservation_required_qty THEN 'RESERVED'
        ELSE 'CONFIRMED'
      END
    WHERE id = rec_line.id;

    INSERT INTO public.order_line_status_history (
      order_line_id,
      from_status,
      to_status,
      reason,
      changed_by
    )
    VALUES (
      rec_line.id,
      'CONFIRMED',
      CASE
        WHEN (rec_line.reserved_qty + v_to_reserve) >= rec_line.reservation_required_qty THEN 'RESERVED'
        ELSE 'CONFIRMED'
      END,
      'Inventory reservation during order confirmation',
      :p_actor_id
    );
  END IF;
END LOOP;

-- 5) Generate service requests for SERVICE lines.
FOR rec_service_line IN (
  SELECT ol.id, ol.order_id, o.customer_id, ol.catalog_service_id, ol.name_snapshot, ol.sla_due_at
  FROM public.order_lines ol
  JOIN public.orders o ON o.id = ol.order_id
  WHERE ol.order_id = :p_order_id
    AND ol.line_type = 'SERVICE'
  ORDER BY ol.line_no
)
LOOP
  INSERT INTO public.service_requests (
    request_no,
    order_id,
    order_line_id,
    customer_id,
    catalog_service_id,
    name_snapshot,
    status,
    priority,
    sla_due_at,
    metadata
  )
  VALUES (
    concat('SR-', replace(gen_random_uuid()::text, '-', '')),
    :p_order_id,
    rec_service_line.id,
    rec_service_line.customer_id,
    rec_service_line.catalog_service_id,
    rec_service_line.name_snapshot,
    'NEW',
    'NORMAL',
    rec_service_line.sla_due_at,
    jsonb_build_object('correlation_id', :p_correlation_id)
  )
  RETURNING id INTO v_service_request_id;

  INSERT INTO public.service_request_status_history (
    service_request_id,
    from_status,
    to_status,
    reason,
    changed_by
  )
  VALUES (
    v_service_request_id,
    NULL,
    'NEW',
    'Generated from order confirmation',
    :p_actor_id
  );

  UPDATE public.order_lines
  SET status = 'IN_SERVICE'
  WHERE id = rec_service_line.id;

  INSERT INTO public.order_line_status_history (
    order_line_id,
    from_status,
    to_status,
    reason,
    changed_by
  )
  VALUES (
    rec_service_line.id,
    'CONFIRMED',
    'IN_SERVICE',
    'Service request generated during order confirmation',
    :p_actor_id
  );
END LOOP;

-- 6) Update order status and timestamps.
UPDATE public.orders
SET
  status = 'CONFIRMED',
  confirmed_at = COALESCE(confirmed_at, now())
WHERE id = :p_order_id;

INSERT INTO public.order_status_history (
  order_id,
  from_status,
  to_status,
  reason,
  changed_by
)
VALUES (
  :p_order_id,
  'READY_FOR_CONFIRMATION',
  'CONFIRMED',
  'Order confirmation transaction committed',
  :p_actor_id
);

-- 7) Write immutable event log records.
INSERT INTO public.entity_event_log (
  entity_type,
  entity_id,
  event_type,
  operation,
  order_id,
  actor_id,
  correlation_id,
  payload,
  source
)
VALUES (
  'order',
  :p_order_id,
  'order.confirmed',
  'UPDATE',
  :p_order_id,
  :p_actor_id,
  :p_correlation_id,
  jsonb_build_object('stage', 'finalized_confirmation'),
  'order_confirmation_tx'
);

COMMIT;

-- Rollback behavior:
-- Any exception in steps 1-7 aborts the transaction.
-- No partial reservations, movement postings, service requests, or status transitions remain persisted.
