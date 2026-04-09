-- CI smoke-check after applying migrations + seed data.
-- Expects seed from supabase/sql/seed_crm_erp_test_scenarios.sql.
-- Fails loudly via RAISE EXCEPTION on any inconsistency.

DO $$
DECLARE
  v_order_confirmed_id uuid;
  v_order_cancelled_id uuid;
  v_confirmed_product_line_id uuid;
  v_confirmed_service_line_id uuid;
  v_cancelled_line_id uuid;
  v_confirmed_reservation_id uuid;
  v_cancelled_reservation_id uuid;
  v_confirmed_sr_id uuid;
  v_cancelled_sr_id uuid;
  v_cnt bigint;
BEGIN
  SELECT id INTO v_order_confirmed_id
  FROM public.orders
  WHERE order_no = 'TST-ORD-001';

  IF v_order_confirmed_id IS NULL THEN
    RAISE EXCEPTION 'SMOKE_CHECK_FAILED: order TST-ORD-001 not found';
  END IF;

  SELECT id INTO v_order_cancelled_id
  FROM public.orders
  WHERE order_no = 'TST-ORD-002';

  IF v_order_cancelled_id IS NULL THEN
    RAISE EXCEPTION 'SMOKE_CHECK_FAILED: order TST-ORD-002 not found';
  END IF;

  -- 1) Reservations created correctly.
  SELECT ol.id INTO v_confirmed_product_line_id
  FROM public.order_lines ol
  WHERE ol.order_id = v_order_confirmed_id
    AND ol.line_no = 1;

  IF v_confirmed_product_line_id IS NULL THEN
    RAISE EXCEPTION 'SMOKE_CHECK_FAILED: confirmed product line (TST-ORD-001 line 1) not found';
  END IF;

  SELECT r.id
  INTO v_confirmed_reservation_id
  FROM public.inventory_reservations r
  WHERE r.order_id = v_order_confirmed_id
    AND r.order_line_id = v_confirmed_product_line_id
    AND r.status = 'ACTIVE'
  ORDER BY r.created_at DESC
  LIMIT 1;

  IF v_confirmed_reservation_id IS NULL THEN
    RAISE EXCEPTION 'SMOKE_CHECK_FAILED: active reservation for TST-ORD-001 line 1 not found';
  END IF;

  PERFORM 1
  FROM public.inventory_reservations r
  WHERE r.id = v_confirmed_reservation_id
    AND r.reserved_qty = 2.0000
    AND r.released_qty = 0.0000
    AND r.consumed_qty = 0.0000
    AND r.outstanding_qty = 2.0000;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SMOKE_CHECK_FAILED: reservation qty mismatch for TST-ORD-001 line 1';
  END IF;

  -- 2) Inventory movements created correctly.
  SELECT count(*) INTO v_cnt
  FROM public.inventory_movements m
  WHERE m.order_id = v_order_confirmed_id
    AND m.order_line_id = v_confirmed_product_line_id
    AND m.movement_type = 'RESERVE'
    AND m.status = 'POSTED'
    AND m.reservation_id = v_confirmed_reservation_id;

  IF v_cnt <> 1 THEN
    RAISE EXCEPTION 'SMOKE_CHECK_FAILED: expected exactly 1 RESERVE movement for TST-ORD-001 line 1, got %', v_cnt;
  END IF;

  -- 3) Entity event log entries are written.
  SELECT count(*) INTO v_cnt
  FROM public.entity_event_log e
  WHERE e.order_id = v_order_confirmed_id
    AND e.event_type = 'order.confirmed';

  IF v_cnt < 1 THEN
    RAISE EXCEPTION 'SMOKE_CHECK_FAILED: missing order.confirmed event for TST-ORD-001';
  END IF;

  SELECT count(*) INTO v_cnt
  FROM public.entity_event_log e
  WHERE e.order_id = v_order_cancelled_id
    AND e.event_type = 'order.cancelled';

  IF v_cnt < 1 THEN
    RAISE EXCEPTION 'SMOKE_CHECK_FAILED: missing order.cancelled event for TST-ORD-002';
  END IF;

  -- 4) Consistency between current statuses and status history.
  PERFORM 1
  FROM public.orders o
  WHERE o.id = v_order_confirmed_id
    AND o.status = 'CONFIRMED'
    AND o.confirmed_at IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SMOKE_CHECK_FAILED: TST-ORD-001 status/confirmed_at mismatch';
  END IF;

  SELECT count(*) INTO v_cnt
  FROM public.order_status_history h
  WHERE h.order_id = v_order_confirmed_id
    AND h.to_status = 'CONFIRMED';

  IF v_cnt < 1 THEN
    RAISE EXCEPTION 'SMOKE_CHECK_FAILED: missing CONFIRMED status history for TST-ORD-001';
  END IF;

  PERFORM 1
  FROM public.orders o
  WHERE o.id = v_order_cancelled_id
    AND o.status = 'CANCELLED'
    AND o.cancelled_at IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SMOKE_CHECK_FAILED: TST-ORD-002 status/cancelled_at mismatch';
  END IF;

  SELECT count(*) INTO v_cnt
  FROM public.order_status_history h
  WHERE h.order_id = v_order_cancelled_id
    AND h.to_status = 'CANCELLED';

  IF v_cnt < 1 THEN
    RAISE EXCEPTION 'SMOKE_CHECK_FAILED: missing CANCELLED status history for TST-ORD-002';
  END IF;

  -- 5) Service request generation from service lines.
  SELECT ol.id INTO v_confirmed_service_line_id
  FROM public.order_lines ol
  WHERE ol.order_id = v_order_confirmed_id
    AND ol.line_no = 2
    AND ol.line_type = 'SERVICE';

  IF v_confirmed_service_line_id IS NULL THEN
    RAISE EXCEPTION 'SMOKE_CHECK_FAILED: service line (TST-ORD-001 line 2) not found';
  END IF;

  SELECT sr.id INTO v_confirmed_sr_id
  FROM public.service_requests sr
  WHERE sr.order_id = v_order_confirmed_id
    AND sr.order_line_id = v_confirmed_service_line_id
  ORDER BY sr.created_at DESC
  LIMIT 1;

  IF v_confirmed_sr_id IS NULL THEN
    RAISE EXCEPTION 'SMOKE_CHECK_FAILED: service request not generated for TST-ORD-001 service line';
  END IF;

  SELECT count(*) INTO v_cnt
  FROM public.service_request_status_history sh
  WHERE sh.service_request_id = v_confirmed_sr_id
    AND sh.to_status IN ('NEW', 'PLANNED');

  IF v_cnt < 1 THEN
    RAISE EXCEPTION 'SMOKE_CHECK_FAILED: missing status history for generated service request in TST-ORD-001';
  END IF;

  -- 6) Rollback/cancel scenario consistency.
  SELECT ol.id INTO v_cancelled_line_id
  FROM public.order_lines ol
  WHERE ol.order_id = v_order_cancelled_id
    AND ol.line_no = 1;

  IF v_cancelled_line_id IS NULL THEN
    RAISE EXCEPTION 'SMOKE_CHECK_FAILED: cancelled line (TST-ORD-002 line 1) not found';
  END IF;

  PERFORM 1
  FROM public.order_lines ol
  WHERE ol.id = v_cancelled_line_id
    AND ol.status = 'CANCELLED'
    AND ol.reserved_qty = 0.0000;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SMOKE_CHECK_FAILED: cancelled line state mismatch for TST-ORD-002 line 1';
  END IF;

  SELECT r.id
  INTO v_cancelled_reservation_id
  FROM public.inventory_reservations r
  WHERE r.order_id = v_order_cancelled_id
    AND r.order_line_id = v_cancelled_line_id
    AND r.status = 'RELEASED'
  ORDER BY r.created_at DESC
  LIMIT 1;

  IF v_cancelled_reservation_id IS NULL THEN
    RAISE EXCEPTION 'SMOKE_CHECK_FAILED: released reservation not found for TST-ORD-002 line 1';
  END IF;

  PERFORM 1
  FROM public.inventory_reservations r
  WHERE r.id = v_cancelled_reservation_id
    AND r.reserved_qty = r.released_qty
    AND r.outstanding_qty = 0.0000;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SMOKE_CHECK_FAILED: released reservation quantities mismatch for TST-ORD-002';
  END IF;

  SELECT count(*) INTO v_cnt
  FROM public.inventory_movements m
  WHERE m.order_id = v_order_cancelled_id
    AND m.order_line_id = v_cancelled_line_id
    AND m.movement_type = 'UNRESERVE'
    AND m.status = 'POSTED'
    AND m.reservation_id = v_cancelled_reservation_id;

  IF v_cnt <> 1 THEN
    RAISE EXCEPTION 'SMOKE_CHECK_FAILED: expected exactly 1 UNRESERVE movement for TST-ORD-002 line 1, got %', v_cnt;
  END IF;

  SELECT sr.id INTO v_cancelled_sr_id
  FROM public.service_requests sr
  WHERE sr.order_id = v_order_cancelled_id
    AND sr.status = 'CANCELLED'
  ORDER BY sr.created_at DESC
  LIMIT 1;

  IF v_cancelled_sr_id IS NULL THEN
    RAISE EXCEPTION 'SMOKE_CHECK_FAILED: cancelled service request not found for rollback scenario';
  END IF;

  SELECT count(*) INTO v_cnt
  FROM public.service_request_status_history sh
  WHERE sh.service_request_id = v_cancelled_sr_id
    AND sh.to_status = 'CANCELLED';

  IF v_cnt < 1 THEN
    RAISE EXCEPTION 'SMOKE_CHECK_FAILED: missing CANCELLED status history for rollback service request';
  END IF;

  -- 7) Base inventory consistency check.
  SELECT count(*) INTO v_cnt
  FROM public.inventory_balances ib
  WHERE ib.available_qty <> (ib.on_hand_qty - ib.reserved_qty);

  IF v_cnt > 0 THEN
    RAISE EXCEPTION 'SMOKE_CHECK_FAILED: inventory_balances available_qty inconsistency on % rows', v_cnt;
  END IF;
END
$$;

SELECT 'SMOKE_CHECK_OK' AS result;
