-- CRM client-centric data model foundation
-- Migration goals:
-- 1) Introduce normalized client entities for individuals and companies.
-- 2) Keep existing order flows operational (legacy order client fields remain).
-- 3) Add dedupe-friendly normalized columns and indexes.
-- 4) Backfill client records from existing orders when possible.

-- ---------------------------------------------------------------------------
-- A) Shared types and helper functions
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'client_type_enum'
  ) then
    create type public.client_type_enum as enum ('individual', 'company');
  end if;
end
$$;

create or replace function public.crm_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.crm_is_business_owner_or_manager(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.business_id = target_business_id
      and m.user_id = auth.uid()
      and upper(coalesce(m.role, '')) in ('OWNER', 'MANAGER')
  );
$$;

-- ---------------------------------------------------------------------------
-- B) Core client tables
-- ---------------------------------------------------------------------------

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  workspace_id uuid null references public.workspaces(id) on delete set null,
  client_type public.client_type_enum not null,
  display_name text not null,
  primary_email text null,
  primary_phone text null,
  postcode text null,
  city text null,
  country_code text not null default 'GB',
  is_archived boolean not null default false,
  legacy_source_order_id uuid null references public.orders(id) on delete set null,
  created_by uuid null references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_display_name_not_blank check (btrim(display_name) <> ''),
  constraint clients_country_code_len_check check (char_length(country_code) between 2 and 3),
  constraint clients_metadata_object_check check (jsonb_typeof(metadata) = 'object')
);

create index if not exists clients_business_id_idx
  on public.clients (business_id);

create index if not exists clients_workspace_id_idx
  on public.clients (workspace_id)
  where workspace_id is not null;

create index if not exists clients_business_type_idx
  on public.clients (business_id, client_type);

create index if not exists clients_business_display_name_idx
  on public.clients (business_id, lower(btrim(display_name)));

create index if not exists clients_business_primary_email_idx
  on public.clients (business_id, lower(btrim(primary_email)))
  where primary_email is not null;

create index if not exists clients_business_primary_phone_idx
  on public.clients (
    business_id,
    regexp_replace(coalesce(primary_phone, ''), '[^0-9]+', '', 'g')
  )
  where primary_phone is not null;

create index if not exists clients_business_name_postcode_idx
  on public.clients (
    business_id,
    lower(regexp_replace(btrim(display_name), '\s+', ' ', 'g')),
    lower(regexp_replace(coalesce(postcode, ''), '\s+', '', 'g'))
  );

create table if not exists public.client_individual_profiles (
  client_id uuid primary key references public.clients(id) on delete cascade,
  first_name text null,
  last_name text null,
  full_name text null,
  email text null,
  phone text null,
  date_of_birth date null,
  address_line1 text null,
  address_line2 text null,
  address_line3 text null,
  city text null,
  county text null,
  postcode text null,
  country_code text not null default 'GB',
  email_normalized text generated always as (nullif(lower(btrim(email)), '')) stored,
  phone_normalized text generated always as (nullif(regexp_replace(coalesce(phone, ''), '[^0-9]+', '', 'g'), '')) stored,
  full_name_normalized text generated always as (nullif(lower(regexp_replace(btrim(coalesce(full_name, '')), '\s+', ' ', 'g')), '')) stored,
  postcode_normalized text generated always as (nullif(lower(regexp_replace(coalesce(postcode, ''), '\s+', '', 'g')), '')) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_individual_profiles_country_code_len_check check (char_length(country_code) between 2 and 3)
);

create index if not exists client_individual_profiles_email_norm_idx
  on public.client_individual_profiles (email_normalized)
  where email_normalized is not null;

create index if not exists client_individual_profiles_phone_norm_idx
  on public.client_individual_profiles (phone_normalized)
  where phone_normalized is not null;

create index if not exists client_individual_profiles_name_postcode_norm_idx
  on public.client_individual_profiles (full_name_normalized, postcode_normalized)
  where full_name_normalized is not null;

create table if not exists public.client_company_profiles (
  client_id uuid primary key references public.clients(id) on delete cascade,
  company_name text not null,
  registration_number text null,
  vat_number text null,
  website text null,
  email text null,
  phone text null,
  address_line1 text null,
  address_line2 text null,
  address_line3 text null,
  city text null,
  county text null,
  postcode text null,
  country_code text not null default 'GB',
  company_name_normalized text generated always as (nullif(lower(regexp_replace(btrim(company_name), '\s+', ' ', 'g')), '')) stored,
  registration_number_normalized text generated always as (nullif(lower(regexp_replace(coalesce(registration_number, ''), '[^a-zA-Z0-9]+', '', 'g')), '')) stored,
  vat_number_normalized text generated always as (nullif(lower(regexp_replace(coalesce(vat_number, ''), '[^a-zA-Z0-9]+', '', 'g')), '')) stored,
  postcode_normalized text generated always as (nullif(lower(regexp_replace(coalesce(postcode, ''), '\s+', '', 'g')), '')) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_company_profiles_company_name_not_blank check (btrim(company_name) <> ''),
  constraint client_company_profiles_country_code_len_check check (char_length(country_code) between 2 and 3)
);

create index if not exists client_company_profiles_registration_number_norm_idx
  on public.client_company_profiles (registration_number_normalized)
  where registration_number_normalized is not null;

create index if not exists client_company_profiles_vat_number_norm_idx
  on public.client_company_profiles (vat_number_normalized)
  where vat_number_normalized is not null;

create index if not exists client_company_profiles_name_postcode_norm_idx
  on public.client_company_profiles (company_name_normalized, postcode_normalized);

create table if not exists public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  first_name text null,
  last_name text null,
  full_name text null,
  job_title text null,
  email text null,
  phone text null,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  email_normalized text generated always as (nullif(lower(btrim(email)), '')) stored,
  phone_normalized text generated always as (nullif(regexp_replace(coalesce(phone, ''), '[^0-9]+', '', 'g'), '')) stored,
  full_name_normalized text generated always as (nullif(lower(regexp_replace(btrim(coalesce(full_name, '')), '\s+', ' ', 'g')), '')) stored,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_contacts_metadata_object_check check (jsonb_typeof(metadata) = 'object')
);

create index if not exists client_contacts_client_id_idx
  on public.client_contacts (client_id);

create unique index if not exists client_contacts_one_primary_per_client_idx
  on public.client_contacts (client_id)
  where is_primary = true and is_active = true;

create index if not exists client_contacts_email_norm_idx
  on public.client_contacts (email_normalized)
  where email_normalized is not null;

create index if not exists client_contacts_phone_norm_idx
  on public.client_contacts (phone_normalized)
  where phone_normalized is not null;

create index if not exists client_contacts_client_full_name_norm_idx
  on public.client_contacts (client_id, full_name_normalized)
  where full_name_normalized is not null;

create table if not exists public.client_manager_assignments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  manager_id uuid null references public.profiles(id) on delete set null,
  assigned_by uuid null references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz null,
  note text null,
  created_at timestamptz not null default now(),
  constraint client_manager_assignments_window_check check (
    unassigned_at is null or unassigned_at >= assigned_at
  )
);

create unique index if not exists client_manager_assignments_one_current_idx
  on public.client_manager_assignments (client_id)
  where unassigned_at is null;

create index if not exists client_manager_assignments_manager_current_idx
  on public.client_manager_assignments (manager_id, assigned_at desc)
  where unassigned_at is null and manager_id is not null;

create index if not exists client_manager_assignments_history_idx
  on public.client_manager_assignments (client_id, assigned_at desc);

-- Keep updated_at current on mutable tables.
drop trigger if exists crm_touch_updated_at_clients on public.clients;
create trigger crm_touch_updated_at_clients
before update on public.clients
for each row
execute function public.crm_touch_updated_at();

drop trigger if exists crm_touch_updated_at_client_individual_profiles on public.client_individual_profiles;
create trigger crm_touch_updated_at_client_individual_profiles
before update on public.client_individual_profiles
for each row
execute function public.crm_touch_updated_at();

drop trigger if exists crm_touch_updated_at_client_company_profiles on public.client_company_profiles;
create trigger crm_touch_updated_at_client_company_profiles
before update on public.client_company_profiles
for each row
execute function public.crm_touch_updated_at();

drop trigger if exists crm_touch_updated_at_client_contacts on public.client_contacts;
create trigger crm_touch_updated_at_client_contacts
before update on public.client_contacts
for each row
execute function public.crm_touch_updated_at();

-- Ensure profile table type consistency.
create or replace function public.crm_validate_client_profile_types()
returns trigger
language plpgsql
as $$
declare
  v_client_type public.client_type_enum;
begin
  select c.client_type
  into v_client_type
  from public.clients c
  where c.id = new.client_id;

  if v_client_type is null then
    raise exception 'Client % not found', new.client_id;
  end if;

  if tg_table_name = 'client_individual_profiles' and v_client_type <> 'individual' then
    raise exception 'Client % is not an individual client', new.client_id;
  end if;

  if tg_table_name = 'client_company_profiles' and v_client_type <> 'company' then
    raise exception 'Client % is not a company client', new.client_id;
  end if;

  return new;
end;
$$;

drop trigger if exists crm_validate_client_individual_profile_type on public.client_individual_profiles;
create trigger crm_validate_client_individual_profile_type
before insert or update on public.client_individual_profiles
for each row
execute function public.crm_validate_client_profile_types();

drop trigger if exists crm_validate_client_company_profile_type on public.client_company_profiles;
create trigger crm_validate_client_company_profile_type
before insert or update on public.client_company_profiles
for each row
execute function public.crm_validate_client_profile_types();

-- ---------------------------------------------------------------------------
-- C) Orders links to clients
-- ---------------------------------------------------------------------------

alter table public.orders
  add column if not exists client_id uuid null,
  add column if not exists contact_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_client_id_fkey'
  ) then
    alter table public.orders
      add constraint orders_client_id_fkey
      foreign key (client_id)
      references public.clients(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_contact_id_fkey'
  ) then
    alter table public.orders
      add constraint orders_contact_id_fkey
      foreign key (contact_id)
      references public.client_contacts(id)
      on delete set null;
  end if;
end
$$;

create index if not exists orders_client_id_idx
  on public.orders (client_id)
  where client_id is not null;

create index if not exists orders_contact_id_idx
  on public.orders (contact_id)
  where contact_id is not null;

create index if not exists orders_business_client_idx
  on public.orders (business_id, client_id)
  where client_id is not null;

create or replace function public.crm_validate_order_client_links()
returns trigger
language plpgsql
as $$
declare
  v_client_business_id uuid;
  v_contact_client_id uuid;
  v_contact_client_business_id uuid;
begin
  if new.client_id is not null then
    select c.business_id
    into v_client_business_id
    from public.clients c
    where c.id = new.client_id;

    if v_client_business_id is null then
      raise exception 'Client % does not exist', new.client_id;
    end if;

    if new.business_id is distinct from v_client_business_id then
      raise exception 'Client % belongs to another business', new.client_id;
    end if;
  end if;

  if new.contact_id is not null then
    select cc.client_id, c.business_id
    into v_contact_client_id, v_contact_client_business_id
    from public.client_contacts cc
    join public.clients c on c.id = cc.client_id
    where cc.id = new.contact_id;

    if v_contact_client_id is null then
      raise exception 'Contact % does not exist', new.contact_id;
    end if;

    if new.client_id is null then
      new.client_id := v_contact_client_id;
    end if;

    if new.client_id is distinct from v_contact_client_id then
      raise exception 'Contact % does not belong to client %', new.contact_id, new.client_id;
    end if;

    if new.business_id is distinct from v_contact_client_business_id then
      raise exception 'Contact % belongs to another business', new.contact_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists crm_validate_order_client_links_before_write on public.orders;
create trigger crm_validate_order_client_links_before_write
before insert or update of business_id, client_id, contact_id
on public.orders
for each row
execute function public.crm_validate_order_client_links();

-- ---------------------------------------------------------------------------
-- D) Backfill from legacy order client fields
-- ---------------------------------------------------------------------------

with source_orders as (
  select
    o.id as order_id,
    o.business_id,
    o.workspace_id,
    nullif(btrim(coalesce(o.full_name, concat_ws(' ', o.first_name, o.last_name), o.client_name)), '') as full_name,
    nullif(btrim(o.first_name), '') as first_name,
    nullif(btrim(o.last_name), '') as last_name,
    nullif(btrim(o.client_phone), '') as client_phone,
    o.created_by,
    o.created_at
  from public.orders o
  where o.client_id is null
),
normalized as (
  select
    s.*,
    coalesce(nullif(lower(regexp_replace(coalesce(s.full_name, ''), '\s+', ' ', 'g')), ''), 'unknown-client') as name_key,
    coalesce(nullif(regexp_replace(coalesce(s.client_phone, ''), '[^0-9]+', '', 'g'), ''), '') as phone_key
  from source_orders s
),
clustered as (
  select
    n.business_id,
    min(n.workspace_id) as workspace_id,
    n.name_key,
    n.phone_key,
    max(n.full_name) filter (where n.full_name is not null) as full_name,
    max(n.first_name) filter (where n.first_name is not null) as first_name,
    max(n.last_name) filter (where n.last_name is not null) as last_name,
    max(n.client_phone) filter (where n.client_phone is not null) as client_phone,
    min(n.order_id) as sample_order_id,
    min(n.created_by) as created_by,
    min(n.created_at) as created_at
  from normalized n
  group by n.business_id, n.name_key, n.phone_key
)
insert into public.clients (
  business_id,
  workspace_id,
  client_type,
  display_name,
  primary_phone,
  legacy_source_order_id,
  created_by,
  created_at,
  updated_at,
  metadata
)
select
  c.business_id,
  c.workspace_id,
  'individual'::public.client_type_enum,
  coalesce(c.full_name, c.first_name, 'Unknown client'),
  c.client_phone,
  c.sample_order_id,
  c.created_by,
  coalesce(c.created_at, now()),
  now(),
  jsonb_build_object('source', 'orders_backfill_v1')
from clustered c
where not exists (
  select 1
  from public.clients existing
  left join public.client_individual_profiles ip on ip.client_id = existing.id
  where existing.business_id = c.business_id
    and existing.client_type = 'individual'::public.client_type_enum
    and coalesce(ip.full_name_normalized, lower(regexp_replace(existing.display_name, '\s+', ' ', 'g')), 'unknown-client') = c.name_key
    and coalesce(regexp_replace(coalesce(existing.primary_phone, ''), '[^0-9]+', '', 'g'), '') = c.phone_key
);

with source_orders as (
  select
    o.id as order_id,
    o.business_id,
    coalesce(nullif(lower(regexp_replace(coalesce(o.full_name, concat_ws(' ', o.first_name, o.last_name), o.client_name), '\s+', ' ', 'g')), ''), 'unknown-client') as name_key,
    coalesce(nullif(regexp_replace(coalesce(o.client_phone, ''), '[^0-9]+', '', 'g'), ''), '') as phone_key
  from public.orders o
  where o.client_id is null
),
matched as (
  select
    s.order_id,
    c.id as client_id
  from source_orders s
  join lateral (
    select existing.id
    from public.clients existing
    left join public.client_individual_profiles ip on ip.client_id = existing.id
    where existing.business_id = s.business_id
      and existing.client_type = 'individual'::public.client_type_enum
      and coalesce(ip.full_name_normalized, lower(regexp_replace(existing.display_name, '\s+', ' ', 'g')), 'unknown-client') = s.name_key
      and coalesce(regexp_replace(coalesce(existing.primary_phone, ''), '[^0-9]+', '', 'g'), '') = s.phone_key
    order by existing.created_at asc, existing.id asc
    limit 1
  ) c on true
)
update public.orders o
set client_id = m.client_id
from matched m
where o.id = m.order_id
  and o.client_id is null;

insert into public.client_individual_profiles (
  client_id,
  first_name,
  last_name,
  full_name,
  phone,
  postcode,
  created_at,
  updated_at
)
select
  c.id,
  coalesce(source.first_name, nullif(split_part(c.display_name, ' ', 1), '')),
  source.last_name,
  coalesce(source.full_name, c.display_name),
  coalesce(source.phone, c.primary_phone),
  c.postcode,
  c.created_at,
  now()
from public.clients c
left join public.client_individual_profiles ip on ip.client_id = c.id
left join lateral (
  select
    nullif(btrim(o.first_name), '') as first_name,
    nullif(btrim(o.last_name), '') as last_name,
    nullif(btrim(coalesce(o.full_name, o.client_name)), '') as full_name,
    nullif(btrim(o.client_phone), '') as phone
  from public.orders o
  where o.client_id = c.id
  order by o.created_at asc
  limit 1
) source on true
where c.client_type = 'individual'::public.client_type_enum
  and ip.client_id is null;

update public.clients c
set primary_phone = coalesce(c.primary_phone, ip.phone),
    updated_at = now()
from public.client_individual_profiles ip
where ip.client_id = c.id
  and c.primary_phone is null
  and ip.phone is not null;

with latest_order_manager as (
  select distinct on (o.client_id)
    o.client_id,
    coalesce(o.manager_id, o.created_by) as manager_id,
    coalesce(o.updated_at, o.created_at, now()) as assigned_at
  from public.orders o
  where o.client_id is not null
    and coalesce(o.manager_id, o.created_by) is not null
  order by o.client_id, coalesce(o.updated_at, o.created_at, now()) desc, o.id desc
)
insert into public.client_manager_assignments (
  client_id,
  manager_id,
  assigned_by,
  assigned_at,
  note,
  created_at
)
select
  lom.client_id,
  lom.manager_id,
  lom.manager_id,
  lom.assigned_at,
  'Backfilled from latest order manager at migration time',
  now()
from latest_order_manager lom
where not exists (
  select 1
  from public.client_manager_assignments cma
  where cma.client_id = lom.client_id
    and cma.unassigned_at is null
);

-- ---------------------------------------------------------------------------
-- E) RLS for new tables (read access for business members)
-- ---------------------------------------------------------------------------

do $$
begin
  alter table public.clients enable row level security;
  alter table public.client_individual_profiles enable row level security;
  alter table public.client_company_profiles enable row level security;
  alter table public.client_contacts enable row level security;
  alter table public.client_manager_assignments enable row level security;
exception
  when undefined_table then
    null;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'clients'
      and policyname = 'clients_select_for_business_members'
  ) then
    create policy "clients_select_for_business_members"
      on public.clients
      for select
      to authenticated
      using (public.is_business_member(business_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'clients'
      and policyname = 'clients_write_for_business_owners_managers'
  ) then
    create policy "clients_write_for_business_owners_managers"
      on public.clients
      for all
      to authenticated
      using (public.crm_is_business_owner_or_manager(business_id))
      with check (public.crm_is_business_owner_or_manager(business_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'client_individual_profiles'
      and policyname = 'client_individual_profiles_select_for_business_members'
  ) then
    create policy "client_individual_profiles_select_for_business_members"
      on public.client_individual_profiles
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.clients c
          where c.id = client_individual_profiles.client_id
            and public.is_business_member(c.business_id)
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'client_individual_profiles'
      and policyname = 'client_individual_profiles_write_for_business_owners_managers'
  ) then
    create policy "client_individual_profiles_write_for_business_owners_managers"
      on public.client_individual_profiles
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.clients c
          where c.id = client_individual_profiles.client_id
            and public.crm_is_business_owner_or_manager(c.business_id)
        )
      )
      with check (
        exists (
          select 1
          from public.clients c
          where c.id = client_individual_profiles.client_id
            and public.crm_is_business_owner_or_manager(c.business_id)
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'client_company_profiles'
      and policyname = 'client_company_profiles_select_for_business_members'
  ) then
    create policy "client_company_profiles_select_for_business_members"
      on public.client_company_profiles
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.clients c
          where c.id = client_company_profiles.client_id
            and public.is_business_member(c.business_id)
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'client_company_profiles'
      and policyname = 'client_company_profiles_write_for_business_owners_managers'
  ) then
    create policy "client_company_profiles_write_for_business_owners_managers"
      on public.client_company_profiles
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.clients c
          where c.id = client_company_profiles.client_id
            and public.crm_is_business_owner_or_manager(c.business_id)
        )
      )
      with check (
        exists (
          select 1
          from public.clients c
          where c.id = client_company_profiles.client_id
            and public.crm_is_business_owner_or_manager(c.business_id)
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'client_contacts'
      and policyname = 'client_contacts_select_for_business_members'
  ) then
    create policy "client_contacts_select_for_business_members"
      on public.client_contacts
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.clients c
          where c.id = client_contacts.client_id
            and public.is_business_member(c.business_id)
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'client_contacts'
      and policyname = 'client_contacts_write_for_business_owners_managers'
  ) then
    create policy "client_contacts_write_for_business_owners_managers"
      on public.client_contacts
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.clients c
          where c.id = client_contacts.client_id
            and public.crm_is_business_owner_or_manager(c.business_id)
        )
      )
      with check (
        exists (
          select 1
          from public.clients c
          where c.id = client_contacts.client_id
            and public.crm_is_business_owner_or_manager(c.business_id)
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'client_manager_assignments'
      and policyname = 'client_manager_assignments_select_for_business_members'
  ) then
    create policy "client_manager_assignments_select_for_business_members"
      on public.client_manager_assignments
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.clients c
          where c.id = client_manager_assignments.client_id
            and public.is_business_member(c.business_id)
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'client_manager_assignments'
      and policyname = 'client_manager_assignments_write_for_business_owners_managers'
  ) then
    create policy "client_manager_assignments_write_for_business_owners_managers"
      on public.client_manager_assignments
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.clients c
          where c.id = client_manager_assignments.client_id
            and public.crm_is_business_owner_or_manager(c.business_id)
        )
      )
      with check (
        exists (
          select 1
          from public.clients c
          where c.id = client_manager_assignments.client_id
            and public.crm_is_business_owner_or_manager(c.business_id)
        )
      );
  end if;
end
$$;

comment on table public.clients is
  'CRM client root entity (individual or company) scoped to business/workspace.';

comment on table public.client_individual_profiles is
  'Individual-specific profile fields for clients.client_type = individual.';

comment on table public.client_company_profiles is
  'Company-specific profile fields for clients.client_type = company.';

comment on table public.client_contacts is
  'Contact persons for company clients (and optional extra contacts for any client).';

comment on table public.client_manager_assignments is
  'Client ownership history. Exactly one active assignment per client is enforced.';

comment on column public.orders.client_id is
  'Normalized CRM client link. Legacy order-level client fields are kept for compatibility.';

comment on column public.orders.contact_id is
  'Optional contact person linked to orders.client_id for company workflows.';
