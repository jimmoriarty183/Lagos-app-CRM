-- supabase/migrations/20260409140900_create_orders.sql

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no varchar(50) NOT NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  status public.order_status_enum NOT NULL DEFAULT 'DRAFT',
  order_date timestamptz NOT NULL DEFAULT now(),
  currency_code char(3) NOT NULL,
  subtotal_amount numeric(18,4) NOT NULL DEFAULT 0,
  discount_amount numeric(18,4) NOT NULL DEFAULT 0,
  tax_amount numeric(18,4) NOT NULL DEFAULT 0,
  total_amount numeric(18,4) NOT NULL DEFAULT 0,
  confirmed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT app.current_actor_id(),
  updated_by uuid NOT NULL DEFAULT app.current_actor_id(),
  version integer NOT NULL DEFAULT 1,
  CONSTRAINT chk_orders_currency_code_upper
    CHECK (currency_code ~ '^[A-Z]{3}$'),
  CONSTRAINT chk_orders_amounts_non_negative
    CHECK (
      subtotal_amount >= 0 AND
      discount_amount >= 0 AND
      tax_amount >= 0 AND
      total_amount >= 0
    ),
  CONSTRAINT chk_orders_total_consistency
    CHECK (total_amount = ((subtotal_amount - discount_amount) + tax_amount)),
  CONSTRAINT chk_orders_confirmed_at_for_confirmed_like
    CHECK (
      (status IN ('CONFIRMED', 'PARTIALLY_FULFILLED', 'FULFILLED', 'COMPLETED') AND confirmed_at IS NOT NULL)
      OR
      (status IN ('DRAFT', 'READY_FOR_CONFIRMATION', 'CANCELLED'))
    ),
  CONSTRAINT chk_orders_cancel_fields
    CHECK (
      (status = 'CANCELLED' AND cancelled_at IS NOT NULL)
      OR
      (status <> 'CANCELLED')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_order_no
  ON public.orders (order_no);

CREATE INDEX IF NOT EXISTS ix_orders_customer_date
  ON public.orders (customer_id, order_date DESC);

CREATE INDEX IF NOT EXISTS ix_orders_status_date
  ON public.orders (status, order_date DESC);

CREATE INDEX IF NOT EXISTS ix_orders_confirmed_at
  ON public.orders (confirmed_at DESC)
  WHERE confirmed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_orders_completed_at
  ON public.orders (completed_at DESC)
  WHERE completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_orders_created_at
  ON public.orders (created_at DESC);

DROP TRIGGER IF EXISTS trg_orders_set_audit_fields ON public.orders;
CREATE TRIGGER trg_orders_set_audit_fields
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION app.set_audit_fields();
