-- supabase/migrations/20260409141500_create_inventory_balances.sql

CREATE TABLE IF NOT EXISTS public.inventory_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.catalog_products(id) ON DELETE RESTRICT,
  on_hand_qty numeric(18,4) NOT NULL DEFAULT 0,
  reserved_qty numeric(18,4) NOT NULL DEFAULT 0,
  available_qty numeric(18,4) NOT NULL DEFAULT 0,
  last_movement_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT app.current_actor_id(),
  updated_by uuid NOT NULL DEFAULT app.current_actor_id(),
  version integer NOT NULL DEFAULT 1,
  CONSTRAINT uq_inventory_balances_warehouse_product UNIQUE (warehouse_id, product_id),
  CONSTRAINT chk_inventory_balances_on_hand_non_negative
    CHECK (on_hand_qty >= 0),
  CONSTRAINT chk_inventory_balances_reserved_non_negative
    CHECK (reserved_qty >= 0),
  CONSTRAINT chk_inventory_balances_available_non_negative
    CHECK (available_qty >= 0),
  CONSTRAINT chk_inventory_balances_reserved_lte_on_hand
    CHECK (reserved_qty <= on_hand_qty),
  CONSTRAINT chk_inventory_balances_available_consistency
    CHECK (available_qty = (on_hand_qty - reserved_qty))
);

CREATE INDEX IF NOT EXISTS ix_inventory_balances_product_warehouse
  ON public.inventory_balances (product_id, warehouse_id);

CREATE INDEX IF NOT EXISTS ix_inventory_balances_warehouse_product
  ON public.inventory_balances (warehouse_id, product_id);

CREATE INDEX IF NOT EXISTS ix_inventory_balances_last_movement_at
  ON public.inventory_balances (last_movement_at DESC)
  WHERE last_movement_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_inventory_balances_created_at
  ON public.inventory_balances (created_at DESC);

DROP TRIGGER IF EXISTS trg_inventory_balances_set_audit_fields ON public.inventory_balances;
CREATE TRIGGER trg_inventory_balances_set_audit_fields
BEFORE INSERT OR UPDATE ON public.inventory_balances
FOR EACH ROW
EXECUTE FUNCTION app.set_audit_fields();
