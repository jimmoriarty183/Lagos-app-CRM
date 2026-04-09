-- supabase/migrations/20260409141300_create_service_requests.sql

CREATE TABLE IF NOT EXISTS public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_no varchar(50) NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  order_line_id uuid REFERENCES public.order_lines(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  catalog_service_id uuid REFERENCES public.catalog_services(id) ON DELETE RESTRICT,
  name_snapshot varchar(255) NOT NULL,
  status public.service_request_status_enum NOT NULL DEFAULT 'NEW',
  priority public.service_request_priority_enum NOT NULL DEFAULT 'NORMAL',
  planned_start_at timestamptz,
  planned_end_at timestamptz,
  actual_start_at timestamptz,
  actual_end_at timestamptz,
  assignee_id uuid,
  sla_due_at timestamptz,
  resolution_note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT app.current_actor_id(),
  updated_by uuid NOT NULL DEFAULT app.current_actor_id(),
  version integer NOT NULL DEFAULT 1,
  CONSTRAINT chk_service_requests_planned_time_order
    CHECK (
      planned_end_at IS NULL OR
      planned_start_at IS NULL OR
      planned_end_at >= planned_start_at
    ),
  CONSTRAINT chk_service_requests_actual_time_order
    CHECK (
      actual_end_at IS NULL OR
      actual_start_at IS NULL OR
      actual_end_at >= actual_start_at
    ),
  CONSTRAINT chk_service_requests_order_line_link_requires_order
    CHECK (
      (order_line_id IS NULL) OR
      (order_line_id IS NOT NULL AND order_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_service_requests_request_no
  ON public.service_requests (request_no);

CREATE INDEX IF NOT EXISTS ix_service_requests_order
  ON public.service_requests (order_id);

CREATE INDEX IF NOT EXISTS ix_service_requests_order_line
  ON public.service_requests (order_line_id);

CREATE INDEX IF NOT EXISTS ix_service_requests_customer
  ON public.service_requests (customer_id);

CREATE INDEX IF NOT EXISTS ix_service_requests_status_plan
  ON public.service_requests (status, planned_start_at);

CREATE INDEX IF NOT EXISTS ix_service_requests_assignee_status
  ON public.service_requests (assignee_id, status)
  WHERE assignee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_service_requests_sla_due_at
  ON public.service_requests (sla_due_at)
  WHERE sla_due_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_service_requests_created_at
  ON public.service_requests (created_at DESC);

DROP TRIGGER IF EXISTS trg_service_requests_set_audit_fields ON public.service_requests;
CREATE TRIGGER trg_service_requests_set_audit_fields
BEFORE INSERT OR UPDATE ON public.service_requests
FOR EACH ROW
EXECUTE FUNCTION app.set_audit_fields();
