-- Phase 1: Link businesses to accounts via explicit FK.
-- Idempotent & non-destructive:
--   * adds nullable columns (no NOT NULL yet — separate follow-up PR)
--   * backfills accounts.primary_owner_user_id from slug-matched businesses
--   * creates accounts for owners that don't have one yet
--   * backfills businesses.account_id via each business's OWNER membership
--
-- Keeps existing slug-based resolution working (isAccountOwnedByUser, billing/auth.ts).
-- Safe to rerun; all steps guarded by `if not exists` / upserts.

do $$
declare
  v_has_primary_owner_col boolean;
  v_has_account_id_col boolean;
begin
  -- 1. accounts.primary_owner_user_id (nullable).
  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='accounts'
      and column_name='primary_owner_user_id'
  ) into v_has_primary_owner_col;

  if not v_has_primary_owner_col then
    alter table public.accounts
      add column primary_owner_user_id uuid references auth.users(id) on delete set null;
  end if;

  -- 2. businesses.account_id (nullable).
  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='businesses'
      and column_name='account_id'
  ) into v_has_account_id_col;

  if not v_has_account_id_col then
    alter table public.businesses
      add column account_id uuid references public.accounts(id) on delete restrict;
  end if;
end
$$;

-- 3. Indexes (idempotent).
create index if not exists idx_accounts_primary_owner_user_id
  on public.accounts(primary_owner_user_id)
  where primary_owner_user_id is not null;

create index if not exists idx_businesses_account_id
  on public.businesses(account_id)
  where account_id is not null;

-- 4. Backfill accounts.primary_owner_user_id from slug-matched businesses.
--    For each existing account whose slug matches a business, set primary_owner
--    to that business's OWNER (first by created_at if multiple).
update public.accounts a
set primary_owner_user_id = owner.user_id,
    updated_at = now()
from (
  select distinct on (b.slug)
    b.slug,
    m.user_id
  from public.businesses b
  join public.memberships m on m.business_id = b.id
  where upper(coalesce(m.role,'')) = 'OWNER'
  order by b.slug, m.created_at asc nulls last
) owner
where a.primary_owner_user_id is null
  and a.slug is not null
  and a.slug = owner.slug;

-- 5. Create accounts for OWNER users who don't have one yet.
--    One account per distinct owner user; slug = their first business's slug.
with owner_anchors as (
  select distinct on (m.user_id)
    m.user_id,
    b.slug as anchor_slug,
    coalesce(nullif(trim(b.name), ''), b.slug) as anchor_name
  from public.memberships m
  join public.businesses b on b.id = m.business_id
  where upper(coalesce(m.role,'')) = 'OWNER'
  order by m.user_id, m.created_at asc nulls last, b.created_at asc nulls last
),
owners_without_account as (
  select oa.*
  from owner_anchors oa
  where not exists (
    select 1 from public.accounts a
    where a.primary_owner_user_id = oa.user_id
  )
)
insert into public.accounts (slug, name, status, primary_owner_user_id, created_at, updated_at)
select
  -- Ensure unique slug: append short user-id suffix if anchor_slug already taken.
  case
    when not exists (select 1 from public.accounts a2 where a2.slug = o.anchor_slug)
      then o.anchor_slug
    else o.anchor_slug || '-' || substr(o.user_id::text, 1, 6)
  end as slug,
  o.anchor_name,
  'active',
  o.user_id,
  now(),
  now()
from owners_without_account o
on conflict do nothing;

-- 6. Backfill businesses.account_id via each business's OWNER → account.
update public.businesses b
set account_id = a.id,
    updated_at = now()
from public.memberships m
join public.accounts a on a.primary_owner_user_id = m.user_id
where b.account_id is null
  and m.business_id = b.id
  and upper(coalesce(m.role,'')) = 'OWNER';

-- 7. Verification helper (no-op, just raises notice for observability).
do $$
declare
  v_biz_total integer;
  v_biz_linked integer;
  v_biz_unlinked integer;
  v_acc_total integer;
  v_acc_with_owner integer;
begin
  select count(*) into v_biz_total from public.businesses;
  select count(*) into v_biz_linked from public.businesses where account_id is not null;
  select count(*) into v_biz_unlinked from public.businesses where account_id is null;
  select count(*) into v_acc_total from public.accounts;
  select count(*) into v_acc_with_owner from public.accounts where primary_owner_user_id is not null;

  raise notice 'account_link_migration: businesses=%/% linked (% unlinked), accounts=% (% with owner)',
    v_biz_linked, v_biz_total, v_biz_unlinked, v_acc_total, v_acc_with_owner;
end
$$;
