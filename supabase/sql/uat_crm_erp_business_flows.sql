-- UAT package for manual business-flow testing.
-- Scenarios:
-- 1) confirm flow
-- 2) reserve flow
-- 3) cancel flow
-- 4) mixed order flow (product + service)
-- 5) custom service line flow

-- Prerequisites:
-- - Core migrations applied.
-- - Corrective migration 20260409143000 applied.

-- ============================================================================
-- Scenario 0: Shared references
-- ============================================================================
WITH refs AS (
  SELECT
    (SELECT id FROM public.customers WHERE customer_code = 'TST-CUST-001' LIMIT 1) AS customer_id,
    (SELECT id FROM public.catalog_products WHERE sku = 'TST-PROD-001' LIMIT 1) AS prod_a_id,
    (SELECT id FROM public.catalog_products WHERE sku = 'TST-PROD-002' LIMIT 1) AS prod_b_id,
    (SELECT id FROM public.catalog_services WHERE service_code = 'TST-SVC-001' LIMIT 1) AS svc_a_id,
    (SELECT id FROM public.warehouses WHERE warehouse_code = 'TST-WH-001' LIMIT 1) AS wh_id
)
SELECT * FROM refs;

-- ============================================================================
-- Scenario 1: Confirm flow (order-level confirm + status history)
-- ============================================================================
BEGIN;

WITH c AS (
  SELECT id FROM public.customers WHERE customer_code = 'TST-CUST-001' LIMIT 1
)
INSERT INTO public.orders (
  order_no,
  customer_id,
  status,
  currency_code,
  subtotal_amount,
  discount_amount,
  tax_amount,
  total_amount,
  metadata
)
SELECT
  'UAT-ORD-CONFIRM-001',
  c.id,
  'READY_FOR_CONFIRMATION',
  'GBP',
  100.0000,
  0.0000,
  20.0000,
  120.0000,
  jsonb_build_object('uat', 'confirm_flow')
FROM c
ON CONFLICT (order_no) DO NOTHING;

WITH o AS (
  SELECT id FROM public.orders WHERE order_no = 'UAT-ORD-CONFIRM-001'
), p AS (
  SELECT id, name FROM public.catalog_products WHERE sku = 'TST-PROD-001'
)
INSERT INTO public.order_lines (
  order_id, line_no, status, line_type, source_type,
  catalog_product_id, is_custom, name_snapshot, uom_code,
  qty, unit_price, discount_percent, discount_amount, tax_rate, tax_amount,
  line_net_amount, line_gross_amount,
  reservation_required_qty, reserved_qty, fulfilled_qty,
  metadata
)
SELECT
  o.id, 1, 'CONFIRMED', 'PRODUCT', 'CATALOG_PRODUCT',
  p.id, false, p.name, 'EA',
  1.0000, 100.0000, 0.0000, 0.0000, 0.2000, 20.0000,
  100.0000, 120.0000,
  1.0000, 0.0000, 0.0000,
  jsonb_build_object('uat', 'confirm_flow')
FROM o, p
ON CONFLICT (order_id, line_no) DO NOTHING;

UPDATE public.orders
SET status = 'CONFIRMED', confirmed_at = now()
WHERE order_no = 'UAT-ORD-CONFIRM-001'
  AND status = 'READY_FOR_CONFIRMATION';

INSERT INTO public.order_status_history (order_id, from_status, to_status, reason)
SELECT o.id, 'READY_FOR_CONFIRMATION', 'CONFIRMED', 'UAT confirm flow'
FROM public.orders o
WHERE o.order_no = 'UAT-ORD-CONFIRM-001'
  AND NOT EXISTS (
    SELECT 1 FROM public.order_status_history h
    WHERE h.order_id = o.id AND h.to_status = 'CONFIRMED' AND h.reason = 'UAT confirm flow'
  );

INSERT INTO public.entity_event_log (entity_type, entity_id, event_type, operation, order_id, payload, source)
SELECT 'order', o.id, 'order.confirmed', 'UPDATE', o.id,
       jsonb_build_object('scenario', 'confirm_flow'), 'uat_package'
FROM public.orders o
WHERE o.order_no = 'UAT-ORD-CONFIRM-001'
  AND NOT EXISTS (
    SELECT 1 FROM public.entity_event_log e
    WHERE e.order_id = o.id AND e.event_type = 'order.confirmed' AND e.source = 'uat_package'
  );

-- Verification queries.
SELECT o.id, o.order_no, o.status, o.confirmed_at
FROM public.orders o
WHERE o.order_no = 'UAT-ORD-CONFIRM-001';

SELECT h.order_id, h.from_status, h.to_status, h.reason, h.changed_at
FROM public.order_status_history h
JOIN public.orders o ON o.id = h.order_id
WHERE o.order_no = 'UAT-ORD-CONFIRM-001'
ORDER BY h.changed_at DESC;

COMMIT;

-- ============================================================================
-- Scenario 2: Reserve flow (reservation + movement + line update)
-- ============================================================================
BEGIN;

WITH o AS (
  SELECT id FROM public.orders WHERE order_no = 'UAT-ORD-CONFIRM-001'
), l AS (
  SELECT id, catalog_product_id FROM public.order_lines
  WHERE order_id = (SELECT id FROM o) AND line_no = 1
), w AS (
  SELECT id FROM public.warehouses WHERE warehouse_code = 'TST-WH-001'
)
INSERT INTO public.inventory_reservations (
  order_id, order_line_id, warehouse_id, product_id,
  status, reserved_qty, released_qty, consumed_qty,
  note, metadata
)
SELECT
  o.id, l.id, w.id, l.catalog_product_id,
  'ACTIVE', 1.0000, 0.0000, 0.0000,
  'UAT reserve flow', jsonb_build_object('scenario', 'reserve_flow')
FROM o, l, w
WHERE NOT EXISTS (
  SELECT 1 FROM public.inventory_reservations r
  WHERE r.order_id = o.id AND r.order_line_id = l.id AND r.note = 'UAT reserve flow'
);

WITH o AS (
  SELECT id FROM public.orders WHERE order_no = 'UAT-ORD-CONFIRM-001'
), l AS (
  SELECT id, catalog_product_id FROM public.order_lines
  WHERE order_id = (SELECT id FROM o) AND line_no = 1
), r AS (
  SELECT id FROM public.inventory_reservations
  WHERE order_id = (SELECT id FROM o) AND order_line_id = (SELECT id FROM l)
    AND note = 'UAT reserve flow'
  ORDER BY created_at DESC LIMIT 1
), w AS (
  SELECT id FROM public.warehouses WHERE warehouse_code = 'TST-WH-001'
)
INSERT INTO public.inventory_movements (
  warehouse_id, product_id, movement_type, status, qty,
  order_id, order_line_id, reservation_id, reason, metadata
)
SELECT
  w.id, l.catalog_product_id, 'RESERVE', 'POSTED', 1.0000,
  o.id, l.id, r.id, 'UAT reserve flow movement', jsonb_build_object('scenario', 'reserve_flow')
FROM o, l, r, w
WHERE NOT EXISTS (
  SELECT 1 FROM public.inventory_movements m
  WHERE m.order_id = o.id AND m.order_line_id = l.id
    AND m.movement_type = 'RESERVE' AND m.reason = 'UAT reserve flow movement'
);

UPDATE public.order_lines ol
SET reserved_qty = 1.0000, status = 'RESERVED'
FROM public.orders o
WHERE o.id = ol.order_id
  AND o.order_no = 'UAT-ORD-CONFIRM-001'
  AND ol.line_no = 1;

INSERT INTO public.order_line_status_history (order_line_id, from_status, to_status, reason)
SELECT ol.id, 'CONFIRMED', 'RESERVED', 'UAT reserve flow'
FROM public.order_lines ol
JOIN public.orders o ON o.id = ol.order_id
WHERE o.order_no = 'UAT-ORD-CONFIRM-001'
  AND ol.line_no = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.order_line_status_history h
    WHERE h.order_line_id = ol.id AND h.to_status = 'RESERVED' AND h.reason = 'UAT reserve flow'
  );

-- Verification queries.
SELECT r.id, r.order_id, r.order_line_id, r.status, r.reserved_qty, r.released_qty, r.consumed_qty, r.outstanding_qty
FROM public.inventory_reservations r
JOIN public.orders o ON o.id = r.order_id
WHERE o.order_no = 'UAT-ORD-CONFIRM-001'
ORDER BY r.created_at DESC;

SELECT m.id, m.order_id, m.order_line_id, m.movement_type, m.status, m.qty, m.reservation_id, m.reason
FROM public.inventory_movements m
JOIN public.orders o ON o.id = m.order_id
WHERE o.order_no = 'UAT-ORD-CONFIRM-001'
ORDER BY m.happened_at DESC;

COMMIT;

-- ============================================================================
-- Scenario 3: Cancel flow (release reservation + unreserve + order cancel)
-- ============================================================================
BEGIN;

WITH c AS (
  SELECT id FROM public.customers WHERE customer_code = 'TST-CUST-001' LIMIT 1
)
INSERT INTO public.orders (
  order_no, customer_id, status, currency_code,
  subtotal_amount, discount_amount, tax_amount, total_amount,
  confirmed_at, metadata
)
SELECT
  'UAT-ORD-CANCEL-001', c.id, 'CONFIRMED', 'GBP',
  50.0000, 0.0000, 10.0000, 60.0000,
  now(), jsonb_build_object('uat', 'cancel_flow')
FROM c
ON CONFLICT (order_no) DO NOTHING;

WITH o AS (
  SELECT id FROM public.orders WHERE order_no = 'UAT-ORD-CANCEL-001'
), p AS (
  SELECT id, name FROM public.catalog_products WHERE sku = 'TST-PROD-002'
)
INSERT INTO public.order_lines (
  order_id, line_no, status, line_type, source_type,
  catalog_product_id, is_custom, name_snapshot, uom_code,
  qty, unit_price, discount_percent, discount_amount, tax_rate, tax_amount,
  line_net_amount, line_gross_amount,
  reservation_required_qty, reserved_qty, fulfilled_qty,
  metadata
)
SELECT
  o.id, 1, 'RESERVED', 'PRODUCT', 'CATALOG_PRODUCT',
  p.id, false, p.name, 'EA',
  1.0000, 50.0000, 0.0000, 0.0000, 0.2000, 10.0000,
  50.0000, 60.0000,
  1.0000, 1.0000, 0.0000,
  jsonb_build_object('uat', 'cancel_flow')
FROM o, p
ON CONFLICT (order_id, line_no) DO NOTHING;

WITH o AS (
  SELECT id FROM public.orders WHERE order_no = 'UAT-ORD-CANCEL-001'
), l AS (
  SELECT id, catalog_product_id FROM public.order_lines WHERE order_id = (SELECT id FROM o) AND line_no = 1
), w AS (
  SELECT id FROM public.warehouses WHERE warehouse_code = 'TST-WH-001'
)
INSERT INTO public.inventory_reservations (
  order_id, order_line_id, warehouse_id, product_id,
  status, reserved_qty, released_qty, consumed_qty,
  note, metadata
)
SELECT
  o.id, l.id, w.id, l.catalog_product_id,
  'RELEASED', 1.0000, 1.0000, 0.0000,
  'UAT cancel release', jsonb_build_object('scenario', 'cancel_flow')
FROM o, l, w
WHERE NOT EXISTS (
  SELECT 1 FROM public.inventory_reservations r
  WHERE r.order_id = o.id AND r.order_line_id = l.id AND r.note = 'UAT cancel release'
);

WITH o AS (
  SELECT id FROM public.orders WHERE order_no = 'UAT-ORD-CANCEL-001'
), l AS (
  SELECT id, catalog_product_id FROM public.order_lines WHERE order_id = (SELECT id FROM o) AND line_no = 1
), r AS (
  SELECT id FROM public.inventory_reservations
  WHERE order_id = (SELECT id FROM o) AND order_line_id = (SELECT id FROM l)
    AND note = 'UAT cancel release'
  ORDER BY created_at DESC LIMIT 1
), w AS (
  SELECT id FROM public.warehouses WHERE warehouse_code = 'TST-WH-001'
)
INSERT INTO public.inventory_movements (
  warehouse_id, product_id, movement_type, status, qty,
  order_id, order_line_id, reservation_id, reason, metadata
)
SELECT
  w.id, l.catalog_product_id, 'UNRESERVE', 'POSTED', 1.0000,
  o.id, l.id, r.id, 'UAT cancel unreserve movement', jsonb_build_object('scenario', 'cancel_flow')
FROM o, l, r, w
WHERE NOT EXISTS (
  SELECT 1 FROM public.inventory_movements m
  WHERE m.order_id = o.id AND m.order_line_id = l.id
    AND m.movement_type = 'UNRESERVE' AND m.reason = 'UAT cancel unreserve movement'
);

UPDATE public.order_lines ol
SET status = 'CANCELLED', reserved_qty = 0.0000
FROM public.orders o
WHERE o.id = ol.order_id
  AND o.order_no = 'UAT-ORD-CANCEL-001'
  AND ol.line_no = 1;

UPDATE public.orders
SET status = 'CANCELLED', cancelled_at = now(), cancel_reason = 'UAT cancel flow'
WHERE order_no = 'UAT-ORD-CANCEL-001';

INSERT INTO public.order_status_history (order_id, from_status, to_status, reason)
SELECT o.id, 'CONFIRMED', 'CANCELLED', 'UAT cancel flow'
FROM public.orders o
WHERE o.order_no = 'UAT-ORD-CANCEL-001'
  AND NOT EXISTS (
    SELECT 1 FROM public.order_status_history h
    WHERE h.order_id = o.id AND h.to_status = 'CANCELLED' AND h.reason = 'UAT cancel flow'
  );

INSERT INTO public.entity_event_log (entity_type, entity_id, event_type, operation, order_id, payload, source)
SELECT 'order', o.id, 'order.cancelled', 'UPDATE', o.id,
       jsonb_build_object('scenario', 'cancel_flow'), 'uat_package'
FROM public.orders o
WHERE o.order_no = 'UAT-ORD-CANCEL-001'
  AND NOT EXISTS (
    SELECT 1 FROM public.entity_event_log e
    WHERE e.order_id = o.id AND e.event_type = 'order.cancelled' AND e.source = 'uat_package'
  );

-- Verification queries.
SELECT o.id, o.order_no, o.status, o.cancelled_at, o.cancel_reason
FROM public.orders o
WHERE o.order_no = 'UAT-ORD-CANCEL-001';

SELECT r.id, r.status, r.reserved_qty, r.released_qty, r.outstanding_qty
FROM public.inventory_reservations r
JOIN public.orders o ON o.id = r.order_id
WHERE o.order_no = 'UAT-ORD-CANCEL-001'
ORDER BY r.created_at DESC;

COMMIT;

-- ============================================================================
-- Scenario 4: Mixed order flow (product + service)
-- ============================================================================
BEGIN;

WITH c AS (
  SELECT id FROM public.customers WHERE customer_code = 'TST-CUST-001' LIMIT 1
)
INSERT INTO public.orders (
  order_no, customer_id, status, currency_code,
  subtotal_amount, discount_amount, tax_amount, total_amount,
  metadata
)
SELECT
  'UAT-ORD-MIXED-001', c.id, 'READY_FOR_CONFIRMATION', 'GBP',
  180.0000, 0.0000, 36.0000, 216.0000,
  jsonb_build_object('uat', 'mixed_flow')
FROM c
ON CONFLICT (order_no) DO NOTHING;

WITH o AS (
  SELECT id FROM public.orders WHERE order_no = 'UAT-ORD-MIXED-001'
), p AS (
  SELECT id, name FROM public.catalog_products WHERE sku = 'TST-PROD-001'
)
INSERT INTO public.order_lines (
  order_id, line_no, status, line_type, source_type, catalog_product_id,
  is_custom, name_snapshot, uom_code,
  qty, unit_price, discount_percent, discount_amount, tax_rate, tax_amount,
  line_net_amount, line_gross_amount,
  reservation_required_qty, reserved_qty, fulfilled_qty,
  metadata
)
SELECT
  o.id, 1, 'CONFIRMED', 'PRODUCT', 'CATALOG_PRODUCT', p.id,
  false, p.name, 'EA',
  1.0000, 100.0000, 0.0000, 0.0000, 0.2000, 20.0000,
  100.0000, 120.0000,
  1.0000, 0.0000, 0.0000,
  jsonb_build_object('uat', 'mixed_flow_product')
FROM o, p
ON CONFLICT (order_id, line_no) DO NOTHING;

WITH o AS (
  SELECT id FROM public.orders WHERE order_no = 'UAT-ORD-MIXED-001'
), s AS (
  SELECT id, name FROM public.catalog_services WHERE service_code = 'TST-SVC-001'
)
INSERT INTO public.order_lines (
  order_id, line_no, status, line_type, source_type, catalog_service_id,
  is_custom, name_snapshot,
  qty, unit_price, discount_percent, discount_amount, tax_rate, tax_amount,
  line_net_amount, line_gross_amount,
  metadata
)
SELECT
  o.id, 2, 'CONFIRMED', 'SERVICE', 'CATALOG_SERVICE', s.id,
  false, s.name,
  1.0000, 80.0000, 0.0000, 0.0000, 0.2000, 16.0000,
  80.0000, 96.0000,
  jsonb_build_object('uat', 'mixed_flow_service')
FROM o, s
ON CONFLICT (order_id, line_no) DO NOTHING;

-- Reserve product line.
WITH o AS (
  SELECT id FROM public.orders WHERE order_no = 'UAT-ORD-MIXED-001'
), l AS (
  SELECT id, catalog_product_id FROM public.order_lines WHERE order_id = (SELECT id FROM o) AND line_no = 1
), w AS (
  SELECT id FROM public.warehouses WHERE warehouse_code = 'TST-WH-001'
)
INSERT INTO public.inventory_reservations (
  order_id, order_line_id, warehouse_id, product_id,
  status, reserved_qty, note, metadata
)
SELECT
  o.id, l.id, w.id, l.catalog_product_id,
  'ACTIVE', 1.0000, 'UAT mixed reserve', jsonb_build_object('scenario', 'mixed_flow')
FROM o, l, w
WHERE NOT EXISTS (
  SELECT 1 FROM public.inventory_reservations r
  WHERE r.order_id = o.id AND r.order_line_id = l.id AND r.note = 'UAT mixed reserve'
);

-- Generate service request for service line.
WITH o AS (
  SELECT id, customer_id FROM public.orders WHERE order_no = 'UAT-ORD-MIXED-001'
), l AS (
  SELECT id, catalog_service_id FROM public.order_lines WHERE order_id = (SELECT id FROM o) AND line_no = 2
)
INSERT INTO public.service_requests (
  request_no, order_id, order_line_id, customer_id, catalog_service_id,
  name_snapshot, status, priority, metadata
)
SELECT
  'UAT-SR-MIXED-001',
  o.id,
  l.id,
  o.customer_id,
  l.catalog_service_id,
  'UAT mixed service request',
  'NEW',
  'NORMAL',
  jsonb_build_object('scenario', 'mixed_flow')
FROM o, l
ON CONFLICT (request_no) DO NOTHING;

UPDATE public.order_lines ol
SET status = 'IN_SERVICE'
FROM public.orders o
WHERE o.id = ol.order_id
  AND o.order_no = 'UAT-ORD-MIXED-001'
  AND ol.line_no = 2;

UPDATE public.orders
SET status = 'CONFIRMED', confirmed_at = COALESCE(confirmed_at, now())
WHERE order_no = 'UAT-ORD-MIXED-001';

-- Verification queries.
SELECT o.order_no, o.status, o.confirmed_at
FROM public.orders o
WHERE o.order_no = 'UAT-ORD-MIXED-001';

SELECT ol.order_id, ol.line_no, ol.line_type, ol.status, ol.reserved_qty
FROM public.order_lines ol
JOIN public.orders o ON o.id = ol.order_id
WHERE o.order_no = 'UAT-ORD-MIXED-001'
ORDER BY ol.line_no;

SELECT sr.request_no, sr.order_id, sr.order_line_id, sr.status, sr.priority
FROM public.service_requests sr
JOIN public.orders o ON o.id = sr.order_id
WHERE o.order_no = 'UAT-ORD-MIXED-001';

COMMIT;

-- ============================================================================
-- Scenario 5: Custom service line flow
-- ============================================================================
BEGIN;

WITH c AS (
  SELECT id FROM public.customers WHERE customer_code = 'TST-CUST-001' LIMIT 1
)
INSERT INTO public.orders (
  order_no, customer_id, status, currency_code,
  subtotal_amount, discount_amount, tax_amount, total_amount,
  metadata
)
SELECT
  'UAT-ORD-CUSTOM-SVC-001', c.id, 'CONFIRMED', 'GBP',
  120.0000, 0.0000, 24.0000, 144.0000,
  jsonb_build_object('uat', 'custom_service_flow')
FROM c
ON CONFLICT (order_no) DO NOTHING;

WITH o AS (
  SELECT id FROM public.orders WHERE order_no = 'UAT-ORD-CUSTOM-SVC-001'
)
INSERT INTO public.order_lines (
  order_id, line_no, status, line_type, source_type,
  catalog_service_id, is_custom, name_snapshot,
  qty, unit_price, discount_percent, discount_amount, tax_rate, tax_amount,
  line_net_amount, line_gross_amount,
  metadata
)
SELECT
  o.id, 1, 'CONFIRMED', 'SERVICE', 'CUSTOM_SERVICE',
  NULL, true, 'Custom On-site Consultation',
  1.0000, 120.0000, 0.0000, 0.0000, 0.2000, 24.0000,
  120.0000, 144.0000,
  jsonb_build_object('uat', 'custom_service_flow')
FROM o
ON CONFLICT (order_id, line_no) DO NOTHING;

WITH o AS (
  SELECT id, customer_id FROM public.orders WHERE order_no = 'UAT-ORD-CUSTOM-SVC-001'
), l AS (
  SELECT id FROM public.order_lines WHERE order_id = (SELECT id FROM o) AND line_no = 1
)
INSERT INTO public.service_requests (
  request_no, order_id, order_line_id, customer_id,
  catalog_service_id, name_snapshot, status, priority, metadata
)
SELECT
  'UAT-SR-CUSTOM-001',
  o.id,
  l.id,
  o.customer_id,
  NULL,
  'Custom On-site Consultation',
  'NEW',
  'HIGH',
  jsonb_build_object('scenario', 'custom_service_flow')
FROM o, l
ON CONFLICT (request_no) DO NOTHING;

INSERT INTO public.service_request_status_history (service_request_id, from_status, to_status, reason)
SELECT sr.id, NULL, 'NEW', 'UAT custom service flow'
FROM public.service_requests sr
WHERE sr.request_no = 'UAT-SR-CUSTOM-001'
  AND NOT EXISTS (
    SELECT 1 FROM public.service_request_status_history h
    WHERE h.service_request_id = sr.id AND h.reason = 'UAT custom service flow'
  );

UPDATE public.order_lines ol
SET status = 'IN_SERVICE'
FROM public.orders o
WHERE o.id = ol.order_id
  AND o.order_no = 'UAT-ORD-CUSTOM-SVC-001'
  AND ol.line_no = 1;

-- Verification queries.
SELECT o.order_no, o.status, ol.line_no, ol.source_type, ol.is_custom, ol.status AS line_status
FROM public.orders o
JOIN public.order_lines ol ON ol.order_id = o.id
WHERE o.order_no = 'UAT-ORD-CUSTOM-SVC-001';

SELECT sr.request_no, sr.catalog_service_id, sr.status, sr.priority, sr.name_snapshot
FROM public.service_requests sr
WHERE sr.request_no = 'UAT-SR-CUSTOM-001';

COMMIT;

-- Final cross-check snapshot.
SELECT
  o.order_no,
  o.status,
  count(DISTINCT ol.id) AS lines_count,
  count(DISTINCT r.id) AS reservations_count,
  count(DISTINCT sr.id) AS service_requests_count,
  count(DISTINCT e.id) AS events_count
FROM public.orders o
LEFT JOIN public.order_lines ol ON ol.order_id = o.id
LEFT JOIN public.inventory_reservations r ON r.order_id = o.id
LEFT JOIN public.service_requests sr ON sr.order_id = o.id
LEFT JOIN public.entity_event_log e ON e.order_id = o.id
WHERE o.order_no IN (
  'UAT-ORD-CONFIRM-001',
  'UAT-ORD-CANCEL-001',
  'UAT-ORD-MIXED-001',
  'UAT-ORD-CUSTOM-SVC-001'
)
GROUP BY o.order_no, o.status
ORDER BY o.order_no;
