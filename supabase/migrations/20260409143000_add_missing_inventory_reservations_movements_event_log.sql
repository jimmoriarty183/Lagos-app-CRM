-- Additive corrective migration.
-- Adds missing inventory reservation/movement/event-log tables without changing existing domain objects.

CREATE TABLE IF NOT EXISTS public.inventory_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  order_line_id uuid NOT NULL REFERENCES public.order_lines(id) ON DELETE RESTRICT,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.catalog_products(id) ON DELETE RESTRICT,
  status public.inventory_reservation_status_enum NOT NULL DEFAULT 'ACTIVE',
  reserved_qty numeric(18,4) NOT NULL,
  released_qty numeric(18,4) NOT NULL DEFAULT 0,
  consumed_qty numeric(18,4) NOT NULL DEFAULT 0,
  reserved_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  consumed_at timestamptz,
  note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT app.current_actor_id(),
  updated_by uuid NOT NULL DEFAULT app.current_actor_id(),
  version integer NOT NULL DEFAULT 1,
  outstanding_qty numeric(18,4) GENERATED ALWAYS AS ((reserved_qty - released_qty) - consumed_qty) STORED,
  CONSTRAINT chk_inventory_reservations_reserved_qty_positive
    CHECK (reserved_qty > 0),
  CONSTRAINT chk_inventory_reservations_released_qty_non_negative
    CHECK (released_qty >= 0),
  CONSTRAINT chk_inventory_reservations_consumed_qty_non_negative
    CHECK (consumed_qty >= 0),
  CONSTRAINT chk_inventory_reservations_released_le_reserved
    CHECK (released_qty <= reserved_qty),
  CONSTRAINT chk_inventory_reservations_consumed_le_reserved
    CHECK (consumed_qty <= reserved_qty),
  CONSTRAINT chk_inventory_reservations_outstanding_non_negative
    CHECK (outstanding_qty >= 0),
  CONSTRAINT chk_inventory_reservations_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS ix_inventory_reservations_order
  ON public.inventory_reservations (order_id, reserved_at DESC);

CREATE INDEX IF NOT EXISTS ix_inventory_reservations_order_line
  ON public.inventory_reservations (order_line_id, reserved_at DESC);

CREATE INDEX IF NOT EXISTS ix_inventory_reservations_warehouse_product_status
  ON public.inventory_reservations (warehouse_id, product_id, status);

CREATE INDEX IF NOT EXISTS ix_inventory_reservations_product_status
  ON public.inventory_reservations (product_id, status, reserved_at DESC);

DROP TRIGGER IF EXISTS trg_inventory_reservations_set_audit_fields ON public.inventory_reservations;
CREATE TRIGGER trg_inventory_reservations_set_audit_fields
BEFORE INSERT OR UPDATE ON public.inventory_reservations
FOR EACH ROW
EXECUTE FUNCTION app.set_audit_fields();

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.catalog_products(id) ON DELETE RESTRICT,
  movement_type public.inventory_movement_type_enum NOT NULL,
  status public.inventory_movement_status_enum NOT NULL DEFAULT 'POSTED',
  qty numeric(18,4) NOT NULL,
  happened_at timestamptz NOT NULL DEFAULT now(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  order_line_id uuid REFERENCES public.order_lines(id) ON DELETE SET NULL,
  reservation_id uuid REFERENCES public.inventory_reservations(id) ON DELETE SET NULL,
  reason text,
  external_ref text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT app.current_actor_id(),
  updated_by uuid NOT NULL DEFAULT app.current_actor_id(),
  version integer NOT NULL DEFAULT 1,
  CONSTRAINT chk_inventory_movements_qty_positive
    CHECK (qty > 0),
  CONSTRAINT chk_inventory_movements_reservation_ref_for_reserve_ops
    CHECK (
      movement_type NOT IN ('RESERVE', 'UNRESERVE')
      OR reservation_id IS NOT NULL
    ),
  CONSTRAINT chk_inventory_movements_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS ix_inventory_movements_product_warehouse_time
  ON public.inventory_movements (product_id, warehouse_id, happened_at DESC);

CREATE INDEX IF NOT EXISTS ix_inventory_movements_order_time
  ON public.inventory_movements (order_id, happened_at DESC)
  WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_inventory_movements_order_line_time
  ON public.inventory_movements (order_line_id, happened_at DESC)
  WHERE order_line_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_inventory_movements_reservation_time
  ON public.inventory_movements (reservation_id, happened_at DESC)
  WHERE reservation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_inventory_movements_status_type_time
  ON public.inventory_movements (status, movement_type, happened_at DESC);

DROP TRIGGER IF EXISTS trg_inventory_movements_set_audit_fields ON public.inventory_movements;
CREATE TRIGGER trg_inventory_movements_set_audit_fields
BEFORE INSERT OR UPDATE ON public.inventory_movements
FOR EACH ROW
EXECUTE FUNCTION app.set_audit_fields();

CREATE TABLE IF NOT EXISTS public.entity_event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  entity_type varchar(100) NOT NULL,
  entity_id uuid NOT NULL,
  event_type varchar(150) NOT NULL,
  operation public.audit_operation_enum NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  order_line_id uuid REFERENCES public.order_lines(id) ON DELETE SET NULL,
  service_request_id uuid REFERENCES public.service_requests(id) ON DELETE SET NULL,
  reservation_id uuid REFERENCES public.inventory_reservations(id) ON DELETE SET NULL,
  movement_id uuid REFERENCES public.inventory_movements(id) ON DELETE SET NULL,
  actor_id uuid NOT NULL DEFAULT app.current_actor_id(),
  correlation_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  source text,
  CONSTRAINT chk_entity_event_log_entity_type_not_blank
    CHECK (btrim(entity_type) <> ''),
  CONSTRAINT chk_entity_event_log_event_type_not_blank
    CHECK (btrim(event_type) <> ''),
  CONSTRAINT chk_entity_event_log_payload_object
    CHECK (jsonb_typeof(payload) = 'object')
);

CREATE INDEX IF NOT EXISTS ix_entity_event_log_entity_time
  ON public.entity_event_log (entity_type, entity_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS ix_entity_event_log_order_time
  ON public.entity_event_log (order_id, occurred_at DESC)
  WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_entity_event_log_service_request_time
  ON public.entity_event_log (service_request_id, occurred_at DESC)
  WHERE service_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_entity_event_log_reservation_time
  ON public.entity_event_log (reservation_id, occurred_at DESC)
  WHERE reservation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_entity_event_log_correlation_time
  ON public.entity_event_log (correlation_id, occurred_at DESC)
  WHERE correlation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_entity_event_log_operation_time
  ON public.entity_event_log (operation, occurred_at DESC);
