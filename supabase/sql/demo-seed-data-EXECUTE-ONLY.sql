-- =====================================================
-- DEMO SEED DATA - EXECUTE ONLY (NO MIGRATIONS)
-- =====================================================
-- 
-- This script ONLY inserts demo data into existing tables.
-- Run this directly against your Supabase project:
-- 
-- Option 1: Via Supabase Dashboard
--   1. Go to SQL Editor
--   2. Click "New Query"
--   3. Copy-paste this entire file
--   4. Click "Execute"
-- 
-- Option 2: Via CLI
--   supabase db push --local
-- 
-- This script is idempotent and can be re-run safely.
--
-- =====================================================

SET search_path = public, app;
SET session_replication_role = 'replica';

-- =====================================================
-- 1. CREATE WAREHOUSES
-- =====================================================

INSERT INTO public.warehouses (warehouse_code, name, status)
VALUES 
  ('WHR-LGS-001', 'Lagos Main Warehouse', 'ACTIVE'),
  ('WHR-LGS-002', 'Lagos Distribution Center', 'ACTIVE')
ON CONFLICT (warehouse_code) DO NOTHING;

-- =====================================================
-- 2. CREATE CUSTOMERS
-- =====================================================

INSERT INTO public.customers (
  customer_code, customer_type, name, email, phone, tax_id, status
)
VALUES
  ('CUST-001', 'BUSINESS', 'TechVision Solutions Ltd', 'contact@techvision.ng', '+234-701-234-5678', 'TIN-12345678', 'ACTIVE'),
  ('CUST-002', 'BUSINESS', 'Lagos Logistics Hub', 'orders@lagoslogistics.ng', '+234-702-345-6789', 'TIN-87654321', 'ACTIVE'),
  ('CUST-003', 'INDIVIDUAL', 'Engr. Chioma Okonkwo', 'chioma.okonkwo@email.ng', '+234-703-456-7890', NULL, 'ACTIVE'),
  ('CUST-004', 'BUSINESS', 'Rapid Manufacturing Inc', 'procurement@rapidmfg.ng', '+234-704-567-8901', 'TIN-45678901', 'ACTIVE'),
  ('CUST-005', 'BUSINESS', 'Smart Supply Chain Co', 'sales@smartsupply.ng', '+234-705-678-9012', 'TIN-23456789', 'ACTIVE')
ON CONFLICT (customer_code) DO UPDATE
SET updated_at = now();

-- =====================================================
-- 3. CREATE CATALOG PRODUCTS
-- =====================================================

INSERT INTO public.catalog_products (
  sku, name, description, uom_code, is_stock_managed,
  default_unit_price, default_tax_rate, currency_code, status
)
VALUES
  ('PROD-001', 'Industrial Control Unit - Model X500', 'PLC control system with 16-point I/O', 'UNIT', true, 125000.0000, 0.0750, 'NGN', 'ACTIVE'),
  ('PROD-002', 'Backup Power Supply - 5KVA UPS', 'Industrial UPS with automatic switchover', 'UNIT', true, 280000.0000, 0.0750, 'NGN', 'ACTIVE'),
  ('PROD-003', 'Network Switch - Managed Cat6 48-Port', 'Enterprise-grade network switching', 'UNIT', true, 450000.0000, 0.0750, 'NGN', 'ACTIVE'),
  ('PROD-004', 'Server Grade SSD - 2TB', 'High-speed NVMe storage module', 'UNIT', true, 95000.0000, 0.0750, 'NGN', 'ACTIVE'),
  ('PROD-005', 'Industrial Motor - 15HP AC', 'Three-phase electric motor', 'UNIT', true, 185000.0000, 0.0750, 'NGN', 'ACTIVE'),
  ('PROD-006', 'Safety Relay Module - Dual Channel', 'Safety-critical relay system', 'UNIT', true, 65000.0000, 0.0750, 'NGN', 'ACTIVE'),
  ('PROD-007', 'Hydraulic Pump Assembly - Variable Displacement', 'Professional-grade pump unit', 'UNIT', true, 380000.0000, 0.0750, 'NGN', 'ACTIVE'),
  ('PROD-008', 'Sensor Array - Temperature & Humidity', 'Multi-sensor IoT module', 'UNIT', true, 28000.0000, 0.0750, 'NGN', 'ACTIVE'),
  ('PROD-009', 'Cable & Connector Kit - Premium', 'Industrial-grade cabling bundle', 'KIT', true, 45000.0000, 0.0750, 'NGN', 'ACTIVE'),
  ('PROD-010', 'Programmable Timer Unit - 16-Channel', 'Digital timing controller', 'UNIT', true, 35000.0000, 0.0750, 'NGN', 'ACTIVE'),
  ('PROD-011', 'Cooling System - Closed-Loop Water', 'Industrial cooling solution', 'UNIT', true, 520000.0000, 0.0750, 'NGN', 'ACTIVE'),
  ('PROD-012', 'Cabinet Frame - 42U Server Rack', 'Data center infrastructure component', 'UNIT', true, 180000.0000, 0.0750, 'NGN', 'ACTIVE')
ON CONFLICT (sku) DO UPDATE
SET updated_at = now();

-- =====================================================
-- 4. CREATE CATALOG SERVICES
-- =====================================================

INSERT INTO public.catalog_services (
  service_code, name, description, uom_code,
  default_unit_price, default_tax_rate, currency_code, status
)
VALUES
  ('SVC-001', 'System Installation Service - Full Stack', 'Professional on-site installation with testing', 'HOUR', 45000.0000, 0.0750, 'NGN', 'ACTIVE'),
  ('SVC-002', 'Annual Maintenance Contract - Premium', 'Quarterly preventive maintenance visits', 'YEAR', 850000.0000, 0.0750, 'NGN', 'ACTIVE'),
  ('SVC-003', 'Technical Consultation - Engineering', 'Expert system design consultation (0.5 day)', 'DAY', 180000.0000, 0.0750, 'NGN', 'ACTIVE'),
  ('SVC-004', 'Staff Training Program - Standard', 'Onsite operator and maintenance staff training', 'DAY', 120000.0000, 0.0750, 'NGN', 'ACTIVE'),
  ('SVC-005', '24/7 Remote Support - 90 Days', 'Priority remote technical support package', 'MONTH', 220000.0000, 0.0750, 'NGN', 'ACTIVE')
ON CONFLICT (service_code) DO UPDATE
SET updated_at = now();

-- =====================================================
-- 5. POPULATE INVENTORY BALANCES
-- =====================================================

INSERT INTO public.inventory_balances (
  warehouse_id, product_id, available_qty, reserved_qty, defective_qty
)
SELECT w.id, p.id, 
  CASE p.sku
    WHEN 'PROD-001' THEN 15
    WHEN 'PROD-002' THEN 8
    WHEN 'PROD-003' THEN 12
    WHEN 'PROD-004' THEN 45
    WHEN 'PROD-005' THEN 6
    WHEN 'PROD-006' THEN 25
    WHEN 'PROD-007' THEN 4
    WHEN 'PROD-008' THEN 120
    WHEN 'PROD-009' THEN 35
    WHEN 'PROD-010' THEN 40
    WHEN 'PROD-011' THEN 3
    WHEN 'PROD-012' THEN 5
    ELSE 10
  END,
  0,
  0
FROM public.warehouses w
CROSS JOIN public.catalog_products p
WHERE w.warehouse_code IN ('WHR-LGS-001', 'WHR-LGS-002')
  AND p.is_deleted = false
  AND p.is_stock_managed = true
ON CONFLICT (warehouse_id, product_id) DO UPDATE
SET available_qty = EXCLUDED.available_qty,
    updated_at = now();

-- =====================================================
-- 6. CREATE SAMPLE ORDERS
-- =====================================================

-- ORDER #1: DRAFT STATE
WITH order_draft AS (
  INSERT INTO public.orders (
    order_no, customer_id, status, order_date,
    currency_code, subtotal_amount, discount_amount, tax_amount, total_amount
  )
  SELECT
    'ORD-2026-001',
    c.id,
    'DRAFT',
    now() - INTERVAL '5 days',
    'NGN',
    645000.0000,
    0.0000,
    48375.0000,
    693375.0000
  FROM public.customers c
  WHERE c.customer_code = 'CUST-001'
    AND c.is_deleted = false
  ON CONFLICT (order_no) DO UPDATE
  SET updated_at = now()
  RETURNING id
)
INSERT INTO public.order_lines (
  order_id, line_no, status, line_type, source_type,
  catalog_product_id, name_snapshot, uom_code, qty,
  unit_price, discount_percent, tax_rate, tax_amount,
  line_net_amount, line_gross_amount
)
SELECT
  od.id, 1, 'DRAFT', 'PRODUCT', 'CATALOG_PRODUCT',
  p.id, p.name, p.uom_code, 3,
  p.default_unit_price, 0.0000, p.default_tax_rate,
  (3 * p.default_unit_price * p.default_tax_rate),
  (3 * p.default_unit_price),
  (3 * p.default_unit_price) + (3 * p.default_unit_price * p.default_tax_rate)
FROM order_draft od
CROSS JOIN public.catalog_products p
WHERE p.sku = 'PROD-001'
ON CONFLICT (order_id, line_no) DO UPDATE
SET updated_at = now();

-- ORDER #2: CONFIRMED STATE
WITH order_confirmed AS (
  INSERT INTO public.orders (
    order_no, customer_id, status, order_date, confirmed_at,
    currency_code, subtotal_amount, discount_amount, tax_amount, total_amount
  )
  SELECT
    'ORD-2026-002',
    c.id,
    'CONFIRMED',
    now() - INTERVAL '2 days',
    now() - INTERVAL '1 day',
    'NGN',
    832000.0000,
    50000.0000,
    58350.0000,
    840350.0000
  FROM public.customers c
  WHERE c.customer_code = 'CUST-002'
    AND c.is_deleted = false
  ON CONFLICT (order_no) DO UPDATE
  SET updated_at = now()
  RETURNING id
)
INSERT INTO public.order_lines (
  order_id, line_no, status, line_type, source_type,
  catalog_product_id, name_snapshot, uom_code, qty,
  unit_price, discount_percent, tax_rate, tax_amount,
  line_net_amount, line_gross_amount, reservation_required_qty
)
SELECT
  od.id,
  ROW_NUMBER() OVER (ORDER BY p.sku),
  'CONFIRMED',
  'PRODUCT',
  'CATALOG_PRODUCT',
  p.id, p.name, p.uom_code,
  CASE p.sku
    WHEN 'PROD-002' THEN 2
    WHEN 'PROD-003' THEN 1
    ELSE 0
  END,
  p.default_unit_price,
  0.05,
  p.default_tax_rate,
  (CASE p.sku
    WHEN 'PROD-002' THEN 2
    WHEN 'PROD-003' THEN 1
    ELSE 0
  END * p.default_unit_price * p.default_tax_rate),
  (CASE p.sku
    WHEN 'PROD-002' THEN 2
    WHEN 'PROD-003' THEN 1
    ELSE 0
  END * p.default_unit_price * (1 - 0.05)),
  (CASE p.sku
    WHEN 'PROD-002' THEN 2
    WHEN 'PROD-003' THEN 1
    ELSE 0
  END * p.default_unit_price * (1 - 0.05)) + 
  (CASE p.sku
    WHEN 'PROD-002' THEN 2
    WHEN 'PROD-003' THEN 1
    ELSE 0
  END * p.default_unit_price * p.default_tax_rate),
  CASE p.sku
    WHEN 'PROD-002' THEN 2
    WHEN 'PROD-003' THEN 1
    ELSE 0
  END
FROM order_confirmed od
CROSS JOIN public.catalog_products p
WHERE p.sku IN ('PROD-002', 'PROD-003')
  AND (CASE p.sku
    WHEN 'PROD-002' THEN 2
    WHEN 'PROD-003' THEN 1
    ELSE 0
  END) > 0
ON CONFLICT (order_id, line_no) DO UPDATE
SET updated_at = now();

-- ORDER #3: COMPLETED STATE
WITH order_fulfilled AS (
  INSERT INTO public.orders (
    order_no, customer_id, status, order_date, confirmed_at, completed_at,
    currency_code, subtotal_amount, discount_amount, tax_amount, total_amount
  )
  SELECT
    'ORD-2026-003',
    c.id,
    'COMPLETED',
    now() - INTERVAL '14 days',
    now() - INTERVAL '12 days',
    now() - INTERVAL '3 days',
    'NGN',
    585000.0000,
    0.0000,
    43875.0000,
    628875.0000
  FROM public.customers c
  WHERE c.customer_code = 'CUST-004'
    AND c.is_deleted = false
  ON CONFLICT (order_no) DO UPDATE
  SET updated_at = now()
  RETURNING id
)
INSERT INTO public.order_lines (
  order_id, line_no, status, line_type, source_type,
  catalog_product_id, name_snapshot, uom_code, qty,
  unit_price, discount_percent, tax_rate, tax_amount,
  line_net_amount, line_gross_amount, fulfilled_qty
)
SELECT
  od.id, 1, 'FULFILLED', 'PRODUCT', 'CATALOG_PRODUCT',
  p.id, p.name, p.uom_code, 3,
  p.default_unit_price, 0.0000, p.default_tax_rate,
  (3 * p.default_unit_price * p.default_tax_rate),
  (3 * p.default_unit_price),
  (3 * p.default_unit_price) + (3 * p.default_unit_price * p.default_tax_rate),
  3
FROM order_fulfilled od
CROSS JOIN public.catalog_products p
WHERE p.sku = 'PROD-005'
ON CONFLICT (order_id, line_no) DO UPDATE
SET updated_at = now();

-- =====================================================
-- 7. CREATE SERVICE REQUESTS
-- =====================================================

INSERT INTO public.service_requests (
  request_no, order_id, customer_id, catalog_service_id,
  name_snapshot, status, priority, planned_start_at, planned_end_at
)
SELECT
  'SVC-REQ-2026-001',
  o.id,
  c.id,
  s.id,
  'Installation Service: Network Switch Setup',
  'IN_PROGRESS',
  'HIGH',
  now() + INTERVAL '2 days',
  now() + INTERVAL '3 days'
FROM public.orders o
JOIN public.customers c ON o.customer_id = c.id
JOIN public.catalog_services s ON s.service_code = 'SVC-001'
WHERE o.order_no = 'ORD-2026-002'
ON CONFLICT (request_no) DO NOTHING;

INSERT INTO public.service_requests (
  request_no, order_id, customer_id, catalog_service_id,
  name_snapshot, status, priority, planned_start_at, sla_due_at
)
SELECT
  'SVC-REQ-2026-002',
  o.id,
  c.id,
  s.id,
  'Annual Maintenance Contract - Premium',
  'SCHEDULED',
  'NORMAL',
  now() + INTERVAL '10 days',
  now() + INTERVAL '30 days'
FROM public.orders o
JOIN public.customers c ON o.customer_id = c.id
JOIN public.catalog_services s ON s.service_code = 'SVC-002'
WHERE o.order_no = 'ORD-2026-001'
ON CONFLICT (request_no) DO NOTHING;

INSERT INTO public.service_requests (
  request_no, order_id, customer_id, catalog_service_id,
  name_snapshot, status, priority, planned_start_at, planned_end_at,
  actual_start_at, actual_end_at, resolution_note
)
SELECT
  'SVC-REQ-2026-003',
  o.id,
  c.id,
  s.id,
  'Installation & Configuration: Industrial Motor Setup',
  'COMPLETED',
  'HIGH',
  now() - INTERVAL '13 days',
  now() - INTERVAL '12 days',
  now() - INTERVAL '13 days',
  now() - INTERVAL '10 days',
  'Successfully installed 15HP motor with 3-phase power configuration. Client training completed. Ready for production.'
FROM public.orders o
JOIN public.customers c ON o.customer_id = c.id
JOIN public.catalog_services s ON s.service_code = 'SVC-001'
WHERE o.order_no = 'ORD-2026-003'
ON CONFLICT (request_no) DO NOTHING;

-- =====================================================
-- 8. CREATE ACTIVITY & COMMENTS
-- =====================================================

INSERT INTO public.comments (
  business_id, entity_type, entity_id, author_id,
  body, created_at
)
SELECT
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'order', o.id, NULL,
  'Client requested expedited delivery. Checking warehouse availability for power supplies.',
  now() - INTERVAL '3 days'
FROM public.orders o
WHERE o.order_no = 'ORD-2026-001'
ON CONFLICT DO NOTHING;

INSERT INTO public.comments (
  business_id, entity_type, entity_id, author_id,
  body, created_at
)
SELECT
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'order', o.id, NULL,
  'PLC units confirmed in stock. Ready to fulfill. Awaiting customer approval on installation dates.',
  now() - INTERVAL '2 days'
FROM public.orders o
WHERE o.order_no = 'ORD-2026-001'
ON CONFLICT DO NOTHING;

INSERT INTO public.comments (
  business_id, entity_type, entity_id, author_id,
  body, created_at
)
SELECT
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'order', o.id, NULL,
  'Order confirmed and locked for invoicing. Warehouse has allocated stock. Installation team scheduled for next week.',
  now() - INTERVAL '1 day'
FROM public.orders o
WHERE o.order_no = 'ORD-2026-002'
ON CONFLICT DO NOTHING;

INSERT INTO public.comments (
  business_id, entity_type, entity_id, author_id,
  body, created_at
)
SELECT
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'order', o.id, NULL,
  'All items delivered to customer site. Installation team completed setup and testing. Client satisfied with delivery time and quality.',
  now() - INTERVAL '4 days'
FROM public.orders o
WHERE o.order_no = 'ORD-2026-003'
ON CONFLICT DO NOTHING;

-- =====================================================
-- RE-ENABLE TRIGGERS
-- =====================================================

SET session_replication_role = 'origin';

-- =====================================================
-- VERIFICATION SUMMARY
-- =====================================================

SELECT 'Customers' as entity, COUNT(*) as count FROM public.customers WHERE is_deleted = false
UNION ALL
SELECT 'Products', COUNT(*) FROM public.catalog_products WHERE is_deleted = false
UNION ALL
SELECT 'Services', COUNT(*) FROM public.catalog_services WHERE is_deleted = false
UNION ALL
SELECT 'Warehouses', COUNT(*) FROM public.warehouses WHERE is_deleted = false
UNION ALL
SELECT 'Orders', COUNT(*) FROM public.orders
UNION ALL
SELECT 'Order Lines', COUNT(*) FROM public.order_lines
UNION ALL
SELECT 'Service Requests', COUNT(*) FROM public.service_requests
UNION ALL
SELECT 'Comments', COUNT(*) FROM public.comments;
