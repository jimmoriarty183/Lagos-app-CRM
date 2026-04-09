-- Client billing/payment structure and enriched company contacts for CRM operations.

alter table if exists public.client_contacts
  add column if not exists is_billing_contact boolean not null default false,
  add column if not exists is_decision_maker boolean not null default false;

create index if not exists client_contacts_billing_contact_idx
  on public.client_contacts (client_id)
  where is_billing_contact = true and is_active = true;

create table if not exists public.client_billing_profiles (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  profile_name text not null default 'Default',
  is_default boolean not null default true,
  legal_entity_name text null,
  registration_number text null,
  vat_number text null,
  tax_id text null,
  legal_address text null,
  postcode text null,
  same_as_company_profile boolean not null default false,
  bank_name text null,
  account_number text null,
  swift_bic text null,
  currency_code text not null default 'UAH',
  payment_method text not null default 'bank_transfer',
  payment_terms text not null default 'prepaid',
  payment_terms_custom text null,
  primary_email text null,
  primary_email_source text not null default 'custom',
  invoice_email text null,
  invoice_email_source text not null default 'custom',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_billing_profiles_name_not_blank check (btrim(profile_name) <> ''),
  constraint client_billing_profiles_metadata_object_check check (jsonb_typeof(metadata) = 'object'),
  constraint client_billing_profiles_currency_check check (currency_code in ('UAH', 'EUR', 'USD')),
  constraint client_billing_profiles_payment_method_check check (payment_method in ('bank_transfer', 'cash', 'card')),
  constraint client_billing_profiles_payment_terms_check check (payment_terms in ('prepaid', 'net_7', 'net_14', 'net_30', 'custom')),
  constraint client_billing_profiles_primary_email_source_check check (primary_email_source in ('primary_contact', 'custom')),
  constraint client_billing_profiles_invoice_email_source_check check (invoice_email_source in ('primary_contact', 'custom')),
  constraint client_billing_profiles_custom_terms_required check (
    payment_terms <> 'custom' or nullif(btrim(coalesce(payment_terms_custom, '')), '') is not null
  )
);

create index if not exists client_billing_profiles_client_id_idx
  on public.client_billing_profiles (client_id, created_at desc);

create unique index if not exists client_billing_profiles_default_per_client_idx
  on public.client_billing_profiles (client_id)
  where is_default = true;

drop trigger if exists crm_touch_updated_at_client_billing_profiles on public.client_billing_profiles;
create trigger crm_touch_updated_at_client_billing_profiles
before update on public.client_billing_profiles
for each row
execute function public.crm_touch_updated_at();

do $$
begin
  alter table public.client_billing_profiles enable row level security;
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
      and tablename = 'client_billing_profiles'
      and policyname = 'client_billing_profiles_select_for_business_members'
  ) then
    create policy "client_billing_profiles_select_for_business_members"
      on public.client_billing_profiles
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.clients c
          where c.id = client_billing_profiles.client_id
            and public.is_business_member(c.business_id)
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'client_billing_profiles'
      and policyname = 'client_billing_profiles_write_for_business_owners_managers'
  ) then
    create policy "client_billing_profiles_write_for_business_owners_managers"
      on public.client_billing_profiles
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.clients c
          where c.id = client_billing_profiles.client_id
            and public.crm_is_business_owner_or_manager(c.business_id)
        )
      )
      with check (
        exists (
          select 1
          from public.clients c
          where c.id = client_billing_profiles.client_id
            and public.crm_is_business_owner_or_manager(c.business_id)
        )
      );
  end if;
end
$$;
