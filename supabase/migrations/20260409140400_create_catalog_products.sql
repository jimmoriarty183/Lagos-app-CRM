-- supabase/migrations/20260409140400_create_catalog_products.sql

CREATE TABLE IF NOT EXISTS public.catalog_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku varchar(100) NOT NULL,
  name varchar(255) NOT NULL,
  description text,
  uom_code varchar(20) NOT NULL,
  is_stock_managed boolean NOT NULL DEFAULT true,
  default_unit_price numeric(18,4) NOT NULL,
  default_tax_rate numeric(7,4) NOT NULL,
  currency_code char(3) NOT NULL,
  status public.master_status_enum NOT NULL DEFAULT 'ACTIVE',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT app.current_actor_id(),
  updated_by uuid NOT NULL DEFAULT app.current_actor_id(),
  version integer NOT NULL DEFAULT 1,
  CONSTRAINT chk_catalog_products_default_unit_price_non_negative
    CHECK (default_unit_price >= 0),
  CONSTRAINT chk_catalog_products_default_tax_rate_range
    CHECK (default_tax_rate >= 0 AND default_tax_rate <= 1),
  CONSTRAINT chk_catalog_products_currency_code_upper
    CHECK (currency_code ~ '^[A-Z]{3}$'),
  CONSTRAINT chk_catalog_products_deleted_state
    CHECK (
      (is_deleted = false AND deleted_at IS NULL AND deleted_by IS NULL) OR
      (is_deleted = true AND deleted_at IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_catalog_products_sku_active
  ON public.catalog_products (sku)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS ix_catalog_products_name
  ON public.catalog_products (name);

CREATE INDEX IF NOT EXISTS ix_catalog_products_status_active
  ON public.catalog_products (status, is_deleted);

CREATE INDEX IF NOT EXISTS ix_catalog_products_stock_managed
  ON public.catalog_products (is_stock_managed, status)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS ix_catalog_products_created_at
  ON public.catalog_products (created_at DESC);

DROP TRIGGER IF EXISTS trg_catalog_products_set_audit_fields ON public.catalog_products;
CREATE TRIGGER trg_catalog_products_set_audit_fields
BEFORE INSERT OR UPDATE ON public.catalog_products
FOR EACH ROW
EXECUTE FUNCTION app.set_audit_fields();

DROP TRIGGER IF EXISTS trg_catalog_products_apply_soft_delete_fields ON public.catalog_products;
CREATE TRIGGER trg_catalog_products_apply_soft_delete_fields
BEFORE UPDATE ON public.catalog_products
FOR EACH ROW
EXECUTE FUNCTION app.apply_soft_delete_fields();
