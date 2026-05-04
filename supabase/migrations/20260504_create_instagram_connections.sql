-- Per-merchant Instagram Business Login connections.
-- Stores the long-lived IG access token, the Sheet-based product catalog
-- pointer, and merchant-specific bot configuration so the webhook handler
-- can look up the right token + config by recipient ig_user_id.

create table if not exists public.instagram_connections (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,

  -- Instagram identity (received from /me on connect)
  ig_user_id text not null,
  ig_username text not null,
  ig_account_type text,

  -- OAuth credentials
  ig_access_token text not null,
  expires_at timestamptz,
  webhook_subscribed boolean not null default false,

  -- Per-merchant bot configuration
  catalog_sheet_id text,
  catalog_sheet_gid text not null default '0',
  system_prompt text,
  enabled boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (business_id, ig_user_id)
);

create index if not exists instagram_connections_ig_user_id_idx
  on public.instagram_connections (ig_user_id);

create index if not exists instagram_connections_business_id_idx
  on public.instagram_connections (business_id);

-- Auto-update updated_at on row modification.
create or replace function public.instagram_connections_set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists instagram_connections_updated_at
  on public.instagram_connections;

create trigger instagram_connections_updated_at
  before update on public.instagram_connections
  for each row
  execute function public.instagram_connections_set_updated_at();

-- Row-level security.
-- The webhook handler uses the service role and bypasses RLS to look up
-- the token by ig_user_id; user-facing reads/writes go through these
-- policies.
alter table public.instagram_connections enable row level security;

-- Any member of the business can view its connections (settings page,
-- status display).
drop policy if exists instagram_connections_select on public.instagram_connections;
create policy instagram_connections_select
  on public.instagram_connections
  for select
  using (
    business_id in (
      select m.business_id
      from public.memberships m
      where m.user_id = auth.uid()
    )
  );

-- Only owners and managers can connect, edit, or disconnect.
drop policy if exists instagram_connections_insert on public.instagram_connections;
create policy instagram_connections_insert
  on public.instagram_connections
  for insert
  with check (
    business_id in (
      select m.business_id
      from public.memberships m
      where m.user_id = auth.uid()
        and lower(m.role) in ('owner', 'manager')
    )
  );

drop policy if exists instagram_connections_update on public.instagram_connections;
create policy instagram_connections_update
  on public.instagram_connections
  for update
  using (
    business_id in (
      select m.business_id
      from public.memberships m
      where m.user_id = auth.uid()
        and lower(m.role) in ('owner', 'manager')
    )
  );

drop policy if exists instagram_connections_delete on public.instagram_connections;
create policy instagram_connections_delete
  on public.instagram_connections
  for delete
  using (
    business_id in (
      select m.business_id
      from public.memberships m
      where m.user_id = auth.uid()
        and lower(m.role) in ('owner', 'manager')
    )
  );

comment on table public.instagram_connections is
  'Per-merchant Instagram Business Login connections (token + bot config). Webhook handler bypasses RLS via service role.';
