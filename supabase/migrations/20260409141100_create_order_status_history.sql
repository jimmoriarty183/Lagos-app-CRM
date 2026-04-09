-- supabase/migrations/20260409141100_create_order_status_history.sql

CREATE TABLE IF NOT EXISTS public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_status public.order_status_enum,
  to_status public.order_status_enum NOT NULL,
  reason text,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid NOT NULL DEFAULT app.current_actor_id()
);

CREATE INDEX IF NOT EXISTS ix_order_status_history_order_time
  ON public.order_status_history (order_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS ix_order_status_history_to_status_time
  ON public.order_status_history (to_status, changed_at DESC);

CREATE INDEX IF NOT EXISTS ix_order_status_history_changed_by_time
  ON public.order_status_history (changed_by, changed_at DESC);
