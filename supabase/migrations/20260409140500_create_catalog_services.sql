-- supabase/migrations/20260409140500_create_catalog_services.sql

CREATE TABLE IF NOT EXISTS public.catalog_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_code varchar(100) NOT NULL,
  name varchar(255) NOT NULL,
  description text,
  default_unit_price numeric(18,4) NOT NULL,
  default_tax_rate numeric(7,4) NOT NULL,
  currency_code char(3) NOT NULL,
  default_sla_minutes integer,
  default_duration_minutes integer,
  requires_assignee boolean NOT NULL DEFAULT true,
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
  CONSTRAINT chk_catalog_services_default_unit_price_non_negative
    CHECK (default_unit_price >= 0),
  CONSTRAINT chk_catalog_services_default_tax_rate_range
    CHECK (default_tax_rate >= 0 AND default_tax_rate <= 1),
  CONSTRAINT chk_catalog_services_currency_code_upper
    CHECK (currency_code ~ '^[A-Z]{3}$'),
  CONSTRAINT chk_catalog_services_default_sla_minutes_positive
    CHECK (default_sla_minutes IS NULL OR default_sla_minutes > 0),
  CONSTRAINT chk_catalog_services_default_duration_minutes_positive
    CHECK (default_duration_minutes IS NULL OR default_duration_minutes > 0),
  CONSTRAINT chk_catalog_services_deleted_state
    CHECK (
      (is_deleted = false AND deleted_at IS NULL AND deleted_by IS NULL) OR
      (is_deleted = true AND deleted_at IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_catalog_services_service_code_active
  ON public.catalog_services (service_code)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS ix_catalog_services_name
  ON public.catalog_services (name);

CREATE INDEX IF NOT EXISTS ix_catalog_services_status_active
  ON public.catalog_services (status, is_deleted);

CREATE INDEX IF NOT EXISTS ix_catalog_services_requires_assignee
  ON public.catalog_services (requires_assignee, status)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS ix_catalog_services_created_at
  ON public.catalog_services (created_at DESC);

DROP TRIGGER IF EXISTS trg_catalog_services_set_audit_fields ON public.catalog_services;
CREATE TRIGGER trg_catalog_services_set_audit_fields
BEFORE INSERT OR UPDATE ON public.catalog_services
FOR EACH ROW
EXECUTE FUNCTION app.set_audit_fields();

DROP TRIGGER IF EXISTS trg_catalog_services_apply_soft_delete_fields ON public.catalog_services;
CREATE TRIGGER trg_catalog_services_apply_soft_delete_fields
BEFORE UPDATE ON public.catalog_services
FOR EACH ROW
EXECUTE FUNCTION app.apply_soft_delete_fields();
