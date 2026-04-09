-- Creates atomic order confirmation transaction function.

CREATE OR REPLACE FUNCTION public.confirm_order_tx(
  p_order_id uuid,
  p_actor_id uuid,
  p_expected_version integer,
  p_reservation_mode text DEFAULT 'FULL_ONLY',
  p_default_warehouse_id uuid DEFAULT NULL,
  p_correlation_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_mode text := upper(coalesce(p_reservation_mode, 'FULL_ONLY'));
  v_now timestamptz := now();
  v_confirmed_at timestamptz;
  v_order_version integer;

  v_line record;
  v_balance record;
  v_needed_qty numeric(18,4);
  v_to_reserve numeric(18,4);
  v_reservation_id uuid;
  v_old_line_status public.order_line_status_enum;
  v_new_line_status public.order_line_status_enum;

  v_service_line record;
  v_existing_service_request_id uuid;
  v_service_request_id uuid;
  v_request_no text;
  v_request_try integer;

  v_reservations_created integer := 0;
  v_movements_created integer := 0;
  v_service_requests_created integer := 0;
  v_line_status_updates integer := 0;
  v_event_logs_written integer := 0;
  v_reserved_qty_total numeric(18,4) := 0;
BEGIN
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'ORDER_ID_REQUIRED';
  END IF;

  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'ACTOR_ID_REQUIRED';
  END IF;

  IF p_expected_version IS NULL OR p_expected_version <= 0 THEN
    RAISE EXCEPTION 'EXPECTED_VERSION_INVALID';
  END IF;

  IF v_mode NOT IN ('FULL_ONLY', 'ALLOW_PARTIAL') THEN
    RAISE EXCEPTION 'RESERVATION_MODE_INVALID: %', v_mode;
  END IF;

  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND: %', p_order_id;
  END IF;

  IF v_order.status IN ('CONFIRMED', 'PARTIALLY_FULFILLED', 'FULFILLED', 'COMPLETED')
     AND v_order.confirmed_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'order_id', v_order.id,
      'status', v_order.status,
      'confirmed_at', v_order.confirmed_at,
      'version', v_order.version,
      'reservation_mode', v_mode,
      'reservations_created', 0,
      'movements_created', 0,
      'service_requests_created', 0,
      'line_status_updates', 0,
      'event_logs_written', 0,
      'reserved_qty_total', 0
    );
  END IF;

  IF v_order.status <> 'READY_FOR_CONFIRMATION' THEN
    RAISE EXCEPTION 'ORDER_NOT_CONFIRMABLE: expected READY_FOR_CONFIRMATION, got %', v_order.status;
  END IF;

  IF v_order.version <> p_expected_version THEN
    RAISE EXCEPTION 'STALE_VERSION: expected %, got %', p_expected_version, v_order.version;
  END IF;

  -- Lock all lines to guarantee deterministic, atomic state changes.
  PERFORM 1
  FROM public.order_lines ol
  WHERE ol.order_id = p_order_id
  ORDER BY ol.line_no
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_HAS_NO_LINES: %', p_order_id;
  END IF;

  -- DRAFT lines are promoted to CONFIRMED before reservation/service generation.
  FOR v_line IN
    SELECT ol.id, ol.status
    FROM public.order_lines ol
    WHERE ol.order_id = p_order_id
      AND ol.status = 'DRAFT'
    ORDER BY ol.line_no
  LOOP
    UPDATE public.order_lines
    SET status = 'CONFIRMED'
    WHERE id = v_line.id;

    INSERT INTO public.order_line_status_history (
      order_line_id,
      from_status,
      to_status,
      reason,
      changed_at,
      changed_by
    )
    VALUES (
      v_line.id,
      'DRAFT',
      'CONFIRMED',
      'Auto-promoted during order confirmation',
      v_now,
      p_actor_id
    );

    v_line_status_updates := v_line_status_updates + 1;
  END LOOP;

  -- Reserve inventory for PRODUCT lines using existing snapshots and required quantities.
  FOR v_line IN
    SELECT
      ol.id,
      ol.line_no,
      ol.status,
      ol.catalog_product_id,
      ol.reservation_required_qty,
      ol.reserved_qty,
      ol.name_snapshot
    FROM public.order_lines ol
    WHERE ol.order_id = p_order_id
      AND ol.line_type = 'PRODUCT'
      AND ol.status IN ('CONFIRMED', 'RESERVED')
    ORDER BY ol.line_no
  LOOP
    IF v_line.catalog_product_id IS NULL THEN
      RAISE EXCEPTION 'PRODUCT_LINE_WITHOUT_PRODUCT: line_id=%', v_line.id;
    END IF;

    v_needed_qty := greatest(v_line.reservation_required_qty - v_line.reserved_qty, 0);
    IF v_needed_qty <= 0 THEN
      CONTINUE;
    END IF;

    IF p_default_warehouse_id IS NOT NULL THEN
      SELECT ib.*
      INTO v_balance
      FROM public.inventory_balances ib
      WHERE ib.warehouse_id = p_default_warehouse_id
        AND ib.product_id = v_line.catalog_product_id
      FOR UPDATE;
    ELSE
      SELECT ib.*
      INTO v_balance
      FROM public.inventory_balances ib
      WHERE ib.product_id = v_line.catalog_product_id
      ORDER BY ib.available_qty DESC, ib.updated_at DESC NULLS LAST
      LIMIT 1
      FOR UPDATE;
    END IF;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVENTORY_BALANCE_NOT_FOUND: product_id=%', v_line.catalog_product_id;
    END IF;

    IF v_mode = 'FULL_ONLY' AND v_balance.available_qty < v_needed_qty THEN
      RAISE EXCEPTION
        'INSUFFICIENT_STOCK: line_id=% product_id=% needed=% available=%',
        v_line.id,
        v_line.catalog_product_id,
        v_needed_qty,
        v_balance.available_qty;
    END IF;

    v_to_reserve := CASE
      WHEN v_mode = 'ALLOW_PARTIAL' THEN least(v_needed_qty, v_balance.available_qty)
      ELSE v_needed_qty
    END;

    IF v_to_reserve <= 0 THEN
      CONTINUE;
    END IF;

    INSERT INTO public.inventory_reservations (
      order_id,
      order_line_id,
      warehouse_id,
      product_id,
      status,
      reserved_qty,
      released_qty,
      consumed_qty,
      reserved_at,
      metadata,
      created_at,
      updated_at,
      created_by,
      updated_by
    )
    VALUES (
      p_order_id,
      v_line.id,
      v_balance.warehouse_id,
      v_line.catalog_product_id,
      'ACTIVE',
      v_to_reserve,
      0,
      0,
      v_now,
      jsonb_build_object(
        'reservation_mode', v_mode,
        'correlation_id', p_correlation_id,
        'line_no', v_line.line_no,
        'line_name_snapshot', v_line.name_snapshot
      ),
      v_now,
      v_now,
      p_actor_id,
      p_actor_id
    )
    RETURNING id INTO v_reservation_id;

    v_reservations_created := v_reservations_created + 1;
    v_reserved_qty_total := v_reserved_qty_total + v_to_reserve;

    INSERT INTO public.inventory_movements (
      warehouse_id,
      product_id,
      movement_type,
      status,
      qty,
      happened_at,
      order_id,
      order_line_id,
      reservation_id,
      reason,
      metadata,
      created_at,
      updated_at,
      created_by,
      updated_by
    )
    VALUES (
      v_balance.warehouse_id,
      v_line.catalog_product_id,
      'RESERVE',
      'POSTED',
      v_to_reserve,
      v_now,
      p_order_id,
      v_line.id,
      v_reservation_id,
      'Order confirmation reservation',
      jsonb_build_object('correlation_id', p_correlation_id),
      v_now,
      v_now,
      p_actor_id,
      p_actor_id
    );

    v_movements_created := v_movements_created + 1;

    UPDATE public.inventory_balances ib
    SET
      reserved_qty = ib.reserved_qty + v_to_reserve,
      available_qty = ib.on_hand_qty - (ib.reserved_qty + v_to_reserve),
      last_movement_at = v_now,
      updated_at = v_now,
      updated_by = p_actor_id
    WHERE ib.id = v_balance.id;

    v_old_line_status := v_line.status;
    UPDATE public.order_lines ol
    SET
      reserved_qty = ol.reserved_qty + v_to_reserve,
      status = CASE
        WHEN (ol.reserved_qty + v_to_reserve) >= ol.reservation_required_qty
             AND ol.reservation_required_qty > 0
          THEN 'RESERVED'
        ELSE ol.status
      END,
      updated_at = v_now,
      updated_by = p_actor_id
    WHERE ol.id = v_line.id
    RETURNING status INTO v_new_line_status;

    IF v_new_line_status IS DISTINCT FROM v_old_line_status THEN
      INSERT INTO public.order_line_status_history (
        order_line_id,
        from_status,
        to_status,
        reason,
        changed_at,
        changed_by
      )
      VALUES (
        v_line.id,
        v_old_line_status,
        v_new_line_status,
        'Inventory reservation during order confirmation',
        v_now,
        p_actor_id
      );

      v_line_status_updates := v_line_status_updates + 1;
    END IF;

    INSERT INTO public.entity_event_log (
      business_id,
      entity_type,
      entity_id,
      event_type,
      operation,
      order_id,
      order_line_id,
      reservation_id,
      actor_id,
      correlation_id,
      payload,
      occurred_at,
      source
    )
    VALUES (
      NULL,
      'inventory_reservation',
      v_reservation_id,
      'inventory.reserved',
      'INSERT',
      p_order_id,
      v_line.id,
      v_reservation_id,
      p_actor_id,
      p_correlation_id,
      jsonb_build_object('reserved_qty', v_to_reserve, 'line_no', v_line.line_no),
      v_now,
      'confirm_order_tx'
    );

    v_event_logs_written := v_event_logs_written + 1;
  END LOOP;

  -- Create service requests for SERVICE lines.
  FOR v_service_line IN
    SELECT
      ol.id,
      ol.line_no,
      ol.status,
      ol.catalog_service_id,
      ol.name_snapshot,
      ol.sla_due_at,
      o.customer_id
    FROM public.order_lines ol
    JOIN public.orders o ON o.id = ol.order_id
    WHERE ol.order_id = p_order_id
      AND ol.line_type = 'SERVICE'
      AND ol.status IN ('CONFIRMED', 'IN_SERVICE')
    ORDER BY ol.line_no
  LOOP
    SELECT sr.id
    INTO v_existing_service_request_id
    FROM public.service_requests sr
    WHERE sr.order_line_id = v_service_line.id
      AND sr.status <> 'CANCELLED'
    ORDER BY sr.created_at DESC
    LIMIT 1;

    IF v_existing_service_request_id IS NULL THEN
      v_request_try := 0;
      LOOP
        v_request_try := v_request_try + 1;
        v_request_no := 'SR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 20));

        BEGIN
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
            metadata,
            created_at,
            updated_at,
            created_by,
            updated_by
          )
          VALUES (
            v_request_no,
            p_order_id,
            v_service_line.id,
            v_service_line.customer_id,
            v_service_line.catalog_service_id,
            v_service_line.name_snapshot,
            'NEW',
            'NORMAL',
            v_service_line.sla_due_at,
            jsonb_build_object('correlation_id', p_correlation_id, 'line_no', v_service_line.line_no),
            v_now,
            v_now,
            p_actor_id,
            p_actor_id
          )
          RETURNING id INTO v_service_request_id;

          EXIT;
        EXCEPTION
          WHEN unique_violation THEN
            IF v_request_try >= 5 THEN
              RAISE EXCEPTION 'SERVICE_REQUEST_NO_GENERATION_FAILED: line_id=%', v_service_line.id;
            END IF;
        END;
      END LOOP;

      INSERT INTO public.service_request_status_history (
        service_request_id,
        from_status,
        to_status,
        reason,
        changed_at,
        changed_by
      )
      VALUES (
        v_service_request_id,
        NULL,
        'NEW',
        'Generated from order confirmation',
        v_now,
        p_actor_id
      );

      v_service_requests_created := v_service_requests_created + 1;

      INSERT INTO public.entity_event_log (
        business_id,
        entity_type,
        entity_id,
        event_type,
        operation,
        order_id,
        order_line_id,
        service_request_id,
        actor_id,
        correlation_id,
        payload,
        occurred_at,
        source
      )
      VALUES (
        NULL,
        'service_request',
        v_service_request_id,
        'service_request.created',
        'INSERT',
        p_order_id,
        v_service_line.id,
        v_service_request_id,
        p_actor_id,
        p_correlation_id,
        jsonb_build_object('line_no', v_service_line.line_no, 'request_no', v_request_no),
        v_now,
        'confirm_order_tx'
      );

      v_event_logs_written := v_event_logs_written + 1;
    END IF;

    IF v_service_line.status <> 'IN_SERVICE' THEN
      UPDATE public.order_lines
      SET
        status = 'IN_SERVICE',
        updated_at = v_now,
        updated_by = p_actor_id
      WHERE id = v_service_line.id;

      INSERT INTO public.order_line_status_history (
        order_line_id,
        from_status,
        to_status,
        reason,
        changed_at,
        changed_by
      )
      VALUES (
        v_service_line.id,
        v_service_line.status,
        'IN_SERVICE',
        'Service request generated during order confirmation',
        v_now,
        p_actor_id
      );

      v_line_status_updates := v_line_status_updates + 1;
    END IF;
  END LOOP;

  UPDATE public.orders
  SET
    status = 'CONFIRMED',
    confirmed_at = coalesce(confirmed_at, v_now),
    updated_at = v_now,
    updated_by = p_actor_id
  WHERE id = p_order_id
  RETURNING confirmed_at, version INTO v_confirmed_at, v_order_version;

  INSERT INTO public.order_status_history (
    order_id,
    from_status,
    to_status,
    reason,
    changed_at,
    changed_by
  )
  VALUES (
    p_order_id,
    'READY_FOR_CONFIRMATION',
    'CONFIRMED',
    'Order confirmation transaction committed',
    v_now,
    p_actor_id
  );

  INSERT INTO public.entity_event_log (
    business_id,
    entity_type,
    entity_id,
    event_type,
    operation,
    order_id,
    actor_id,
    correlation_id,
    payload,
    occurred_at,
    source
  )
  VALUES (
    NULL,
    'order',
    p_order_id,
    'order.confirmed',
    'UPDATE',
    p_order_id,
    p_actor_id,
    p_correlation_id,
    jsonb_build_object(
      'reservation_mode', v_mode,
      'reservations_created', v_reservations_created,
      'movements_created', v_movements_created,
      'service_requests_created', v_service_requests_created,
      'line_status_updates', v_line_status_updates,
      'reserved_qty_total', v_reserved_qty_total
    ),
    v_now,
    'confirm_order_tx'
  );

  v_event_logs_written := v_event_logs_written + 1;

  RETURN jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'order_id', p_order_id,
    'status', 'CONFIRMED',
    'confirmed_at', v_confirmed_at,
    'version', v_order_version,
    'reservation_mode', v_mode,
    'reservations_created', v_reservations_created,
    'movements_created', v_movements_created,
    'service_requests_created', v_service_requests_created,
    'line_status_updates', v_line_status_updates,
    'event_logs_written', v_event_logs_written,
    'reserved_qty_total', v_reserved_qty_total
  );
END;
$$;
