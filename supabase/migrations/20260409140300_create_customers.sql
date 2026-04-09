-- supabase/migrations/20260409140300_create_customers.sql

CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code varchar(50) NOT NULL,
  customer_type public.customer_type_enum NOT NULL,
  name varchar(255) NOT NULL,
  email varchar(255),
  phone varchar(50),
  tax_id varchar(100),
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
  CONSTRAINT chk_customers_deleted_state
    CHECK (
      (is_deleted = false AND deleted_at IS NULL AND deleted_by IS NULL) OR
      (is_deleted = true AND deleted_at IS NOT NULL)
    ),
  CONSTRAINT chk_customers_email_format
    CHECK (email IS NULL OR email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_customer_code_active
  ON public.customers (customer_code)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS ix_customers_name
  ON public.customers (name);

CREATE INDEX IF NOT EXISTS ix_customers_status_active
  ON public.customers (status, is_deleted);

CREATE INDEX IF NOT EXISTS ix_customers_created_at
  ON public.customers (created_at DESC);

DROP TRIGGER IF EXISTS trg_customers_set_audit_fields ON public.customers;
CREATE TRIGGER trg_customers_set_audit_fields
BEFORE INSERT OR UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION app.set_audit_fields();

DROP TRIGGER IF EXISTS trg_customers_apply_soft_delete_fields ON public.customers;
CREATE TRIGGER trg_customers_apply_soft_delete_fields
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION app.apply_soft_delete_fields();
