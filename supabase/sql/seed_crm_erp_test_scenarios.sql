-- Test seed for CRM/ERP core scenarios.
-- Scenario A: order confirmation with product reservation + service request generation.
-- Scenario B: cancellation/rollback with reservation release + service request cancellation.

BEGIN;

-- 1) Master data.
INSERT INTO public.customers (customer_code, customer_type, name, email, status)
VALUES ('TST-CUST-001', 'PERSON', 'Test Customer A', 'tst.customer.a@example.com', 'ACTIVE')
ON CONFLICT DO NOTHING;

INSERT INTO public.catalog_products (
  sku,
  name,
  uom_code,
  is_stock_managed,
  default_unit_price,
  default_tax_rate,
  currency_code,
  status
)
VALUES
  ('TST-PROD-001', 'Test Product A', 'EA', true, 100.0000, 0.2000, 'GBP', 'ACTIVE'),
  ('TST-PROD-002', 'Test Product Rollback', 'EA', true, 50.0000, 0.2000, 'GBP', 'ACTIVE')
ON CONFLICT DO NOTHING;

INSERT INTO public.catalog_services (
  service_code,
  name,
  default_unit_price,
  default_tax_rate,
  currency_code,
  default_sla_minutes,
  default_duration_minutes,
  requires_assignee,
  status
)
VALUES
  ('TST-SVC-001', 'Test Service A', 80.0000, 0.2000, 'GBP', 1440, 120, true, 'ACTIVE')
ON CONFLICT DO NOTHING;

INSERT INTO public.offers (
  offer_code,
  name,
  pricing_mode,
  fixed_price,
  currency_code,
  status
)
VALUES ('TST-OFR-001', 'Test Offer A', 'SUM_COMPONENTS', NULL, 'GBP', 'ACTIVE')
ON CONFLICT DO NOTHING;

INSERT INTO public.warehouses (warehouse_code, name, status)
VALUES ('TST-WH-001', 'Test Warehouse A', 'ACTIVE')
ON CONFLICT DO NOTHING;

-- 2) Offer components.
WITH x_offer AS (
  SELECT id FROM public.offers WHERE offer_code = 'TST-OFR-001'
), x_prod AS (
  SELECT id, name FROM public.catalog_products WHERE sku = 'TST-PROD-001'
), x_svc AS (
  SELECT id, name FROM public.catalog_services WHERE service_code = 'TST-SVC-001'
)
INSERT INTO public.offer_components (
  offer_id,
  component_type,
  catalog_product_id,
  catalog_service_id,
  component_name_snapshot,
  qty,
  sort_order,
  price_allocation_ratio,
  is_optional
)
SELECT x_offer.id, 'PRODUCT', x_prod.id, NULL, x_prod.name, 1.0000, 1, 0.600000, false
FROM x_offer, x_prod
WHERE NOT EXISTS (
  SELECT 1
  FROM public.offer_components oc
  WHERE oc.offer_id = x_offer.id
    AND oc.sort_order = 1
)
UNION ALL
SELECT x_offer.id, 'SERVICE', NULL, x_svc.id, x_svc.name, 1.0000, 2, 0.400000, false
FROM x_offer, x_svc
WHERE NOT EXISTS (
  SELECT 1
  FROM public.offer_components oc
  WHERE oc.offer_id = x_offer.id
    AND oc.sort_order = 2
);

-- 3) Inventory balances baseline.
WITH x_wh AS (
  SELECT id FROM public.warehouses WHERE warehouse_code = 'TST-WH-001'
), x_prod_a AS (
  SELECT id FROM public.catalog_products WHERE sku = 'TST-PROD-001'
), x_prod_b AS (
  SELECT id FROM public.catalog_products WHERE sku = 'TST-PROD-002'
)
INSERT INTO public.inventory_balances (warehouse_id, product_id, on_hand_qty, reserved_qty, available_qty, last_movement_at)
SELECT x_wh.id, x_prod_a.id, 100.0000, 2.0000, 98.0000, now()
FROM x_wh, x_prod_a
ON CONFLICT (warehouse_id, product_id)
DO UPDATE SET
  on_hand_qty = EXCLUDED.on_hand_qty,
  reserved_qty = EXCLUDED.reserved_qty,
  available_qty = EXCLUDED.available_qty,
  last_movement_at = EXCLUDED.last_movement_at
;

WITH x_wh AS (
  SELECT id FROM public.warehouses WHERE warehouse_code = 'TST-WH-001'
), x_prod_b AS (
  SELECT id FROM public.catalog_products WHERE sku = 'TST-PROD-002'
)
INSERT INTO public.inventory_balances (warehouse_id, product_id, on_hand_qty, reserved_qty, available_qty, last_movement_at)
SELECT x_wh.id, x_prod_b.id, 50.0000, 0.0000, 50.0000, now()
FROM x_wh, x_prod_b
ON CONFLICT (warehouse_id, product_id)
DO UPDATE SET
  on_hand_qty = EXCLUDED.on_hand_qty,
  reserved_qty = EXCLUDED.reserved_qty,
  available_qty = EXCLUDED.available_qty,
  last_movement_at = EXCLUDED.last_movement_at
;

-- 4) Scenario A order (confirmed path).
WITH x_c AS (
  SELECT id FROM public.customers WHERE customer_code = 'TST-CUST-001'
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
  confirmed_at,
  metadata
)
SELECT
  'TST-ORD-001',
  x_c.id,
  'CONFIRMED',
  'GBP',
  280.0000,
  0.0000,
  56.0000,
  336.0000,
  now(),
  jsonb_build_object('scenario', 'A_ORDER_CONFIRMED')
FROM x_c
ON CONFLICT (order_no)
DO UPDATE SET
  status = EXCLUDED.status,
  subtotal_amount = EXCLUDED.subtotal_amount,
  discount_amount = EXCLUDED.discount_amount,
  tax_amount = EXCLUDED.tax_amount,
  total_amount = EXCLUDED.total_amount,
  confirmed_at = EXCLUDED.confirmed_at,
  metadata = EXCLUDED.metadata
;

WITH x_o AS (
  SELECT id FROM public.orders WHERE order_no = 'TST-ORD-001'
), x_prod AS (
  SELECT id, name FROM public.catalog_products WHERE sku = 'TST-PROD-001'
)
INSERT INTO public.order_lines (
  order_id,
  line_no,
  status,
  line_type,
  source_type,
  catalog_product_id,
  is_custom,
  name_snapshot,
  uom_code,
  qty,
  unit_price,
  discount_percent,
  discount_amount,
  tax_rate,
  tax_amount,
  line_net_amount,
  line_gross_amount,
  reservation_required_qty,
  reserved_qty,
  fulfilled_qty,
  metadata
)
SELECT
  x_o.id,
  1,
  'RESERVED',
  'PRODUCT',
  'CATALOG_PRODUCT',
  x_prod.id,
  false,
  x_prod.name,
  'EA',
  2.0000,
  100.0000,
  0.0000,
  0.0000,
  0.2000,
  40.0000,
  200.0000,
  240.0000,
  2.0000,
  2.0000,
  0.0000,
  jsonb_build_object('scenario', 'A_PRODUCT_LINE_RESERVED')
FROM x_o, x_prod
ON CONFLICT (order_id, line_no)
DO UPDATE SET
  status = EXCLUDED.status,
  reservation_required_qty = EXCLUDED.reservation_required_qty,
  reserved_qty = EXCLUDED.reserved_qty,
  fulfilled_qty = EXCLUDED.fulfilled_qty,
  tax_amount = EXCLUDED.tax_amount,
  line_net_amount = EXCLUDED.line_net_amount,
  line_gross_amount = EXCLUDED.line_gross_amount,
  metadata = EXCLUDED.metadata
;

WITH x_o AS (
  SELECT id FROM public.orders WHERE order_no = 'TST-ORD-001'
), x_svc AS (
  SELECT id, name FROM public.catalog_services WHERE service_code = 'TST-SVC-001'
)
INSERT INTO public.order_lines (
  order_id,
  line_no,
  status,
  line_type,
  source_type,
  catalog_service_id,
  is_custom,
  name_snapshot,
  qty,
  unit_price,
  discount_percent,
  discount_amount,
  tax_rate,
  tax_amount,
  line_net_amount,
  line_gross_amount,
  metadata
)
SELECT
  x_o.id,
  2,
  'CONFIRMED',
  'SERVICE',
  'CATALOG_SERVICE',
  x_svc.id,
  false,
  x_svc.name,
  1.0000,
  80.0000,
  0.0000,
  0.0000,
  0.2000,
  16.0000,
  80.0000,
  96.0000,
  jsonb_build_object('scenario', 'A_SERVICE_LINE_CONFIRMED')
FROM x_o, x_svc
ON CONFLICT (order_id, line_no)
DO UPDATE SET
  status = EXCLUDED.status,
  tax_amount = EXCLUDED.tax_amount,
  line_net_amount = EXCLUDED.line_net_amount,
  line_gross_amount = EXCLUDED.line_gross_amount,
  metadata = EXCLUDED.metadata
;

INSERT INTO public.order_status_history (order_id, from_status, to_status, reason, changed_at)
SELECT o.id, 'READY_FOR_CONFIRMATION', 'CONFIRMED', 'Test seed scenario A', now()
FROM public.orders o
WHERE o.order_no = 'TST-ORD-001'
  AND NOT EXISTS (
    SELECT 1
    FROM public.order_status_history h
    WHERE h.order_id = o.id
      AND h.to_status = 'CONFIRMED'
      AND h.reason = 'Test seed scenario A'
  );

INSERT INTO public.order_line_status_history (order_line_id, from_status, to_status, reason, changed_at)
SELECT ol.id, 'CONFIRMED', 'RESERVED', 'Inventory reserved in scenario A', now()
FROM public.order_lines ol
JOIN public.orders o ON o.id = ol.order_id
WHERE o.order_no = 'TST-ORD-001'
  AND ol.line_no = 1
  AND NOT EXISTS (
    SELECT 1
    FROM public.order_line_status_history h
    WHERE h.order_line_id = ol.id
      AND h.to_status = 'RESERVED'
      AND h.reason = 'Inventory reserved in scenario A'
  );

-- Reservation + movement for scenario A.
WITH x_o AS (
  SELECT id FROM public.orders WHERE order_no = 'TST-ORD-001'
), x_l AS (
  SELECT ol.id, ol.catalog_product_id
  FROM public.order_lines ol
  JOIN x_o ON x_o.id = ol.order_id
  WHERE ol.line_no = 1
), x_wh AS (
  SELECT id FROM public.warehouses WHERE warehouse_code = 'TST-WH-001'
)
INSERT INTO public.inventory_reservations (
  order_id,
  order_line_id,
  warehouse_id,
  product_id,
  status,
  reserved_qty,
  released_qty,
  consumed_qty,
  note,
  metadata
)
SELECT
  x_o.id,
  x_l.id,
  x_wh.id,
  x_l.catalog_product_id,
  'ACTIVE',
  2.0000,
  0.0000,
  0.0000,
  'Scenario A active reservation',
  jsonb_build_object('scenario', 'A')
FROM x_o, x_l, x_wh
WHERE NOT EXISTS (
  SELECT 1
  FROM public.inventory_reservations r
  WHERE r.order_id = x_o.id
    AND r.order_line_id = x_l.id
    AND r.status = 'ACTIVE'
);

WITH x_o AS (
  SELECT id FROM public.orders WHERE order_no = 'TST-ORD-001'
), x_l AS (
  SELECT id, catalog_product_id FROM public.order_lines WHERE order_id = (SELECT id FROM x_o) AND line_no = 1
), x_r AS (
  SELECT id FROM public.inventory_reservations
  WHERE order_id = (SELECT id FROM x_o)
    AND order_line_id = (SELECT id FROM x_l)
    AND status = 'ACTIVE'
  ORDER BY created_at DESC
  LIMIT 1
), x_wh AS (
  SELECT id FROM public.warehouses WHERE warehouse_code = 'TST-WH-001'
)
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
  metadata
)
SELECT
  x_wh.id,
  x_l.catalog_product_id,
  'RESERVE',
  'POSTED',
  2.0000,
  now(),
  x_o.id,
  x_l.id,
  x_r.id,
  'Scenario A reservation posting',
  jsonb_build_object('scenario', 'A')
FROM x_o, x_l, x_r, x_wh
WHERE NOT EXISTS (
  SELECT 1
  FROM public.inventory_movements m
  WHERE m.order_id = x_o.id
    AND m.order_line_id = x_l.id
    AND m.movement_type = 'RESERVE'
    AND m.reason = 'Scenario A reservation posting'
);

-- Service request for scenario A.
WITH x_o AS (
  SELECT id, customer_id FROM public.orders WHERE order_no = 'TST-ORD-001'
), x_l AS (
  SELECT id, catalog_service_id, sla_due_at
  FROM public.order_lines
  WHERE order_id = (SELECT id FROM x_o)
    AND line_no = 2
)
INSERT INTO public.service_requests (
  request_no,
  order_id,
  order_line_id,
  customer_id,
  catalog_service_id,
  name_snapshot,
  status,
  priority,
  planned_start_at,
  planned_end_at,
  sla_due_at,
  metadata
)
SELECT
  'TST-SR-001',
  x_o.id,
  x_l.id,
  x_o.customer_id,
  x_l.catalog_service_id,
  'Scenario A service request',
  'PLANNED',
  'NORMAL',
  now() + interval '1 day',
  now() + interval '1 day 2 hour',
  coalesce(x_l.sla_due_at, now() + interval '2 day'),
  jsonb_build_object('scenario', 'A')
FROM x_o, x_l
ON CONFLICT (request_no)
DO UPDATE SET
  status = EXCLUDED.status,
  planned_start_at = EXCLUDED.planned_start_at,
  planned_end_at = EXCLUDED.planned_end_at,
  metadata = EXCLUDED.metadata
;

INSERT INTO public.service_request_status_history (service_request_id, from_status, to_status, reason, changed_at)
SELECT sr.id, 'NEW', 'PLANNED', 'Generated from confirmed order TST-ORD-001', now()
FROM public.service_requests sr
WHERE sr.request_no = 'TST-SR-001'
  AND NOT EXISTS (
    SELECT 1
    FROM public.service_request_status_history h
    WHERE h.service_request_id = sr.id
      AND h.to_status = 'PLANNED'
      AND h.reason = 'Generated from confirmed order TST-ORD-001'
  );

-- 5) Scenario B order (cancellation/rollback path).
WITH x_c AS (
  SELECT id FROM public.customers WHERE customer_code = 'TST-CUST-001'
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
  confirmed_at,
  cancelled_at,
  cancel_reason,
  metadata
)
SELECT
  'TST-ORD-002',
  x_c.id,
  'CANCELLED',
  'GBP',
  100.0000,
  0.0000,
  20.0000,
  120.0000,
  now() - interval '1 hour',
  now(),
  'Rollback scenario cancellation',
  jsonb_build_object('scenario', 'B_CANCEL_ROLLBACK')
FROM x_c
ON CONFLICT (order_no)
DO UPDATE SET
  status = EXCLUDED.status,
  subtotal_amount = EXCLUDED.subtotal_amount,
  tax_amount = EXCLUDED.tax_amount,
  total_amount = EXCLUDED.total_amount,
  confirmed_at = EXCLUDED.confirmed_at,
  cancelled_at = EXCLUDED.cancelled_at,
  cancel_reason = EXCLUDED.cancel_reason,
  metadata = EXCLUDED.metadata
;

WITH x_o AS (
  SELECT id FROM public.orders WHERE order_no = 'TST-ORD-002'
), x_prod AS (
  SELECT id, name FROM public.catalog_products WHERE sku = 'TST-PROD-002'
)
INSERT INTO public.order_lines (
  order_id,
  line_no,
  status,
  line_type,
  source_type,
  catalog_product_id,
  is_custom,
  name_snapshot,
  uom_code,
  qty,
  unit_price,
  discount_percent,
  discount_amount,
  tax_rate,
  tax_amount,
  line_net_amount,
  line_gross_amount,
  reservation_required_qty,
  reserved_qty,
  fulfilled_qty,
  metadata
)
SELECT
  x_o.id,
  1,
  'CANCELLED',
  'PRODUCT',
  'CATALOG_PRODUCT',
  x_prod.id,
  false,
  x_prod.name,
  'EA',
  2.0000,
  50.0000,
  0.0000,
  0.0000,
  0.2000,
  20.0000,
  100.0000,
  120.0000,
  2.0000,
  0.0000,
  0.0000,
  jsonb_build_object('scenario', 'B_LINE_CANCELLED')
FROM x_o, x_prod
ON CONFLICT (order_id, line_no)
DO UPDATE SET
  status = EXCLUDED.status,
  reservation_required_qty = EXCLUDED.reservation_required_qty,
  reserved_qty = EXCLUDED.reserved_qty,
  fulfilled_qty = EXCLUDED.fulfilled_qty,
  metadata = EXCLUDED.metadata
;

INSERT INTO public.order_status_history (order_id, from_status, to_status, reason, changed_at)
SELECT o.id, 'CONFIRMED', 'CANCELLED', 'Scenario B rollback cancellation', now()
FROM public.orders o
WHERE o.order_no = 'TST-ORD-002'
  AND NOT EXISTS (
    SELECT 1
    FROM public.order_status_history h
    WHERE h.order_id = o.id
      AND h.to_status = 'CANCELLED'
      AND h.reason = 'Scenario B rollback cancellation'
  );

WITH x_o AS (
  SELECT id FROM public.orders WHERE order_no = 'TST-ORD-002'
), x_l AS (
  SELECT ol.id, ol.catalog_product_id
  FROM public.order_lines ol
  JOIN x_o ON x_o.id = ol.order_id
  WHERE ol.line_no = 1
), x_wh AS (
  SELECT id FROM public.warehouses WHERE warehouse_code = 'TST-WH-001'
)
INSERT INTO public.inventory_reservations (
  order_id,
  order_line_id,
  warehouse_id,
  product_id,
  status,
  reserved_qty,
  released_qty,
  consumed_qty,
  released_at,
  note,
  metadata
)
SELECT
  x_o.id,
  x_l.id,
  x_wh.id,
  x_l.catalog_product_id,
  'RELEASED',
  2.0000,
  2.0000,
  0.0000,
  now(),
  'Scenario B reservation released',
  jsonb_build_object('scenario', 'B')
FROM x_o, x_l, x_wh
WHERE NOT EXISTS (
  SELECT 1
  FROM public.inventory_reservations r
  WHERE r.order_id = x_o.id
    AND r.order_line_id = x_l.id
    AND r.status = 'RELEASED'
);

WITH x_o AS (
  SELECT id FROM public.orders WHERE order_no = 'TST-ORD-002'
), x_l AS (
  SELECT id, catalog_product_id FROM public.order_lines WHERE order_id = (SELECT id FROM x_o) AND line_no = 1
), x_r AS (
  SELECT id FROM public.inventory_reservations
  WHERE order_id = (SELECT id FROM x_o)
    AND order_line_id = (SELECT id FROM x_l)
    AND status = 'RELEASED'
  ORDER BY created_at DESC
  LIMIT 1
), x_wh AS (
  SELECT id FROM public.warehouses WHERE warehouse_code = 'TST-WH-001'
)
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
  metadata
)
SELECT
  x_wh.id,
  x_l.catalog_product_id,
  'UNRESERVE',
  'POSTED',
  2.0000,
  now(),
  x_o.id,
  x_l.id,
  x_r.id,
  'Scenario B unreserve posting',
  jsonb_build_object('scenario', 'B')
FROM x_o, x_l, x_r, x_wh
WHERE NOT EXISTS (
  SELECT 1
  FROM public.inventory_movements m
  WHERE m.order_id = x_o.id
    AND m.order_line_id = x_l.id
    AND m.movement_type = 'UNRESERVE'
    AND m.reason = 'Scenario B unreserve posting'
);

-- Service request cancelled as part of rollback.
WITH x_o AS (
  SELECT id, customer_id FROM public.orders WHERE order_no = 'TST-ORD-002'
), x_l AS (
  SELECT id
  FROM public.order_lines
  WHERE order_id = (SELECT id FROM x_o)
    AND line_no = 1
)
INSERT INTO public.service_requests (
  request_no,
  order_id,
  order_line_id,
  customer_id,
  catalog_service_id,
  name_snapshot,
  status,
  priority,
  resolution_note,
  metadata
)
SELECT
  'TST-SR-002',
  x_o.id,
  x_l.id,
  x_o.customer_id,
  NULL,
  'Scenario B rollback follow-up',
  'CANCELLED',
  'NORMAL',
  'Cancelled due to order rollback',
  jsonb_build_object('scenario', 'B')
FROM x_o, x_l
ON CONFLICT (request_no)
DO UPDATE SET
  status = EXCLUDED.status,
  resolution_note = EXCLUDED.resolution_note,
  metadata = EXCLUDED.metadata
;

INSERT INTO public.service_request_status_history (service_request_id, from_status, to_status, reason, changed_at)
SELECT sr.id, 'PLANNED', 'CANCELLED', 'Cancelled due to order TST-ORD-002 rollback', now()
FROM public.service_requests sr
WHERE sr.request_no = 'TST-SR-002'
  AND NOT EXISTS (
    SELECT 1
    FROM public.service_request_status_history h
    WHERE h.service_request_id = sr.id
      AND h.to_status = 'CANCELLED'
      AND h.reason = 'Cancelled due to order TST-ORD-002 rollback'
  );

-- 6) Event log entries for both scenarios.
INSERT INTO public.entity_event_log (
  entity_type,
  entity_id,
  event_type,
  operation,
  order_id,
  payload,
  source
)
SELECT
  'order',
  o.id,
  'order.confirmed',
  'UPDATE',
  o.id,
  jsonb_build_object('order_no', o.order_no, 'scenario', 'A'),
  'seed_crm_erp_test_scenarios'
FROM public.orders o
WHERE o.order_no = 'TST-ORD-001'
  AND NOT EXISTS (
    SELECT 1
    FROM public.entity_event_log e
    WHERE e.order_id = o.id
      AND e.event_type = 'order.confirmed'
      AND e.source = 'seed_crm_erp_test_scenarios'
  );

INSERT INTO public.entity_event_log (
  entity_type,
  entity_id,
  event_type,
  operation,
  order_id,
  payload,
  source
)
SELECT
  'order',
  o.id,
  'order.cancelled',
  'UPDATE',
  o.id,
  jsonb_build_object('order_no', o.order_no, 'scenario', 'B'),
  'seed_crm_erp_test_scenarios'
FROM public.orders o
WHERE o.order_no = 'TST-ORD-002'
  AND NOT EXISTS (
    SELECT 1
    FROM public.entity_event_log e
    WHERE e.order_id = o.id
      AND e.event_type = 'order.cancelled'
      AND e.source = 'seed_crm_erp_test_scenarios'
  );

COMMIT;
