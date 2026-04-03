create table if not exists public.event_log (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  target_business_id uuid references public.businesses(id) on delete set null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.event_log is
  'Lightweight product/admin event log for Ordero admin panel and product analytics lite.';

create index if not exists event_log_created_at_idx
  on public.event_log (created_at desc);

create index if not exists event_log_event_type_idx
  on public.event_log (event_type);

create index if not exists event_log_actor_user_id_idx
  on public.event_log (actor_user_id);

create index if not exists event_log_target_user_id_idx
  on public.event_log (target_user_id);

create index if not exists event_log_target_business_id_idx
  on public.event_log (target_business_id);
