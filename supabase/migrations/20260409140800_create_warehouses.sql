-- supabase/migrations/20260409140800_create_warehouses.sql

CREATE TABLE IF NOT EXISTS public.warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_code varchar(50) NOT NULL,
  name varchar(255) NOT NULL,
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
  CONSTRAINT chk_warehouses_deleted_state
    CHECK (
      (is_deleted = false AND deleted_at IS NULL AND deleted_by IS NULL) OR
      (is_deleted = true AND deleted_at IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_warehouses_code_active
  ON public.warehouses (warehouse_code)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS ix_warehouses_name
  ON public.warehouses (name);

CREATE INDEX IF NOT EXISTS ix_warehouses_status_active
  ON public.warehouses (status, is_deleted);

CREATE INDEX IF NOT EXISTS ix_warehouses_created_at
  ON public.warehouses (created_at DESC);

DROP TRIGGER IF EXISTS trg_warehouses_set_audit_fields ON public.warehouses;
CREATE TRIGGER trg_warehouses_set_audit_fields
BEFORE INSERT OR UPDATE ON public.warehouses
FOR EACH ROW
EXECUTE FUNCTION app.set_audit_fields();

DROP TRIGGER IF EXISTS trg_warehouses_apply_soft_delete_fields ON public.warehouses;
CREATE TRIGGER trg_warehouses_apply_soft_delete_fields
BEFORE UPDATE ON public.warehouses
FOR EACH ROW
EXECUTE FUNCTION app.apply_soft_delete_fields();
