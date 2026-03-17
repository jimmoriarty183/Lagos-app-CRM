create table if not exists public.workspaces (
  id uuid primary key references public.businesses(id) on delete cascade,
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint modules_key_check check (key in ('crm', 'tasks', 'academy'))
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  status text not null default 'active',
  legacy_membership_id uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_members_role_check check (role in ('OWNER', 'MANAGER', 'GUEST')),
  constraint workspace_members_status_check check (status in ('active', 'invited', 'inactive'))
);

create unique index if not exists workspace_members_workspace_user_idx
  on public.workspace_members (workspace_id, user_id);

create table if not exists public.workspace_modules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  module_key text not null references public.modules(key) on delete restrict,
  enabled boolean not null default false,
  visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_modules_workspace_module_unique unique (workspace_id, module_key)
);

insert into public.modules (key, name, description)
values
  ('crm', 'CRM', 'Primary live Corelix module for customer and business operations.'),
  ('tasks', 'Tasks', 'Future Corelix module for internal execution workflows.'),
  ('academy', 'Academy', 'Future Corelix module for learning and enablement.')
on conflict (key) do update
set
  name = excluded.name,
  description = excluded.description,
  updated_at = now();

insert into public.workspaces (id, name, slug, created_at, updated_at)
select
  b.id,
  coalesce(nullif(btrim(b.name), ''), coalesce(nullif(btrim(b.slug), ''), 'Workspace')),
  b.slug,
  coalesce(b.created_at, now()),
  coalesce(b.updated_at, now())
from public.businesses b
where b.slug is not null
on conflict (id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  updated_at = excluded.updated_at;

insert into public.workspace_members (
  workspace_id,
  user_id,
  role,
  status,
  legacy_membership_id,
  created_at,
  updated_at
)
select
  m.business_id,
  m.user_id,
  upper(coalesce(m.role, 'GUEST')),
  'active',
  m.id,
  coalesce(m.created_at, now()),
  coalesce(m.created_at, now())
from public.memberships m
where m.business_id is not null
  and m.user_id is not null
on conflict (workspace_id, user_id) do update
set
  role = excluded.role,
  legacy_membership_id = excluded.legacy_membership_id,
  updated_at = now();

insert into public.workspace_modules (
  workspace_id,
  module_key,
  enabled,
  visible
)
select
  w.id,
  m.key,
  case when m.key = 'crm' then true else false end,
  case when m.key = 'crm' then true else false end
from public.workspaces w
cross join public.modules m
on conflict (workspace_id, module_key) do update
set
  enabled = excluded.enabled,
  visible = excluded.visible,
  updated_at = now();

create or replace function public.corelix_seed_workspace_modules(p_workspace_id uuid)
returns void
language plpgsql
as $$
begin
  insert into public.workspace_modules (
    workspace_id,
    module_key,
    enabled,
    visible
  )
  select
    p_workspace_id,
    m.key,
    case when m.key = 'crm' then true else false end,
    case when m.key = 'crm' then true else false end
  from public.modules m
  on conflict (workspace_id, module_key) do nothing;
end;
$$;

create or replace function public.sync_business_to_workspace()
returns trigger
language plpgsql
as $$
begin
  insert into public.workspaces (id, name, slug, created_at, updated_at)
  values (
    new.id,
    coalesce(nullif(btrim(new.name), ''), coalesce(nullif(btrim(new.slug), ''), 'Workspace')),
    new.slug,
    coalesce(new.created_at, now()),
    coalesce(new.updated_at, now())
  )
  on conflict (id) do update
  set
    name = excluded.name,
    slug = excluded.slug,
    updated_at = excluded.updated_at;

  perform public.corelix_seed_workspace_modules(new.id);

  return new;
end;
$$;

drop trigger if exists sync_business_to_workspace_after_change on public.businesses;
create trigger sync_business_to_workspace_after_change
after insert or update on public.businesses
for each row
execute function public.sync_business_to_workspace();

create or replace function public.sync_membership_to_workspace_member()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.workspace_members
    where legacy_membership_id = old.id
       or (workspace_id = old.business_id and user_id = old.user_id);
    return old;
  end if;

  insert into public.workspace_members (
    workspace_id,
    user_id,
    role,
    status,
    legacy_membership_id,
    created_at,
    updated_at
  )
  values (
    new.business_id,
    new.user_id,
    upper(coalesce(new.role, 'GUEST')),
    'active',
    new.id,
    coalesce(new.created_at, now()),
    now()
  )
  on conflict (workspace_id, user_id) do update
  set
    role = excluded.role,
    legacy_membership_id = excluded.legacy_membership_id,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists sync_membership_to_workspace_member_after_change on public.memberships;
create trigger sync_membership_to_workspace_member_after_change
after insert or update or delete on public.memberships
for each row
execute function public.sync_membership_to_workspace_member();

create or replace function public.corelix_sync_workspace_id(
  p_table_name text,
  p_business_column text default 'business_id'
)
returns void
language plpgsql
as $$
declare
  v_has_workspace_id boolean;
  v_has_business_id boolean;
  v_workspace_constraint text;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = p_table_name
      and column_name = 'workspace_id'
  ) into v_has_workspace_id;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = p_table_name
      and column_name = p_business_column
  ) into v_has_business_id;

  if not v_has_business_id then
    return;
  end if;

  if not v_has_workspace_id then
    execute format(
      'alter table public.%I add column workspace_id uuid',
      p_table_name
    );
  end if;

  execute format(
    'update public.%I set workspace_id = %I where workspace_id is null and %I is not null',
    p_table_name,
    p_business_column,
    p_business_column
  );

  v_workspace_constraint := format('%s_workspace_id_fkey', p_table_name);

  if not exists (
    select 1 from pg_constraint where conname = v_workspace_constraint
  ) then
    execute format(
      'alter table public.%I add constraint %I foreign key (workspace_id) references public.workspaces(id) on delete restrict',
      p_table_name,
      v_workspace_constraint
    );
  end if;

  execute format(
    'create index if not exists %I on public.%I (workspace_id)',
    format('%s_workspace_id_idx', p_table_name),
    p_table_name
  );
end;
$$;

select public.corelix_sync_workspace_id('orders');
select public.corelix_sync_workspace_id('business_invites');
select public.corelix_sync_workspace_id('business_statuses');
select public.corelix_sync_workspace_id('activity_events');
select public.corelix_sync_workspace_id('comments');
select public.corelix_sync_workspace_id('order_checklist_items');

comment on table public.workspaces is
  'Corelix platform workspace registry. Currently synced 1:1 with legacy businesses to preserve CRM compatibility.';

comment on table public.workspace_members is
  'Corelix platform membership table mirrored from legacy memberships for modular platform growth.';

comment on table public.workspace_modules is
  'Per-workspace module flags for Corelix platform modules.';
