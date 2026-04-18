-- Ensure every new business is linked to its owner's account.
--
-- Problem: the initial link migration (20260418_link_businesses_to_accounts.sql)
-- backfilled existing rows, but the creation RPC never started populating
-- businesses.account_id, so every business created since then has account_id=NULL.
-- That breaks the account-level team matrix, which filters by account_id.
--
-- This migration:
--   1. Creates accounts for OWNER users who don't have one yet (idempotent).
--   2. Re-runs the backfill for businesses whose account_id is still NULL.
--   3. Replaces create_business_with_owner_limit_guard so it sets account_id
--      inside the same transaction as the business insert.

-- Step 1: create accounts for any owner that still doesn't have one.
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

-- Step 2: backfill businesses.account_id via each business's OWNER -> account.
update public.businesses b
set account_id = a.id,
    updated_at = now()
from public.memberships m
join public.accounts a on a.primary_owner_user_id = m.user_id
where b.account_id is null
  and m.business_id = b.id
  and upper(coalesce(m.role,'')) = 'OWNER';

-- Step 3: replace the creation RPC so it sets account_id atomically.
create or replace function public.create_business_with_owner_limit_guard(
  p_owner_user_id uuid,
  p_base_slug text,
  p_max_businesses integer default null
)
returns table(
  ok boolean,
  slug text,
  business_id uuid,
  error_code text,
  error_message text,
  current_usage integer,
  limit_value integer
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_current_usage integer := 0;
  v_attempt integer := 0;
  v_slug text;
  v_business_id uuid;
  v_has_created_by boolean := false;
  v_has_account_id boolean := false;
  v_account_id uuid;
  v_anchor_slug text;
begin
  if p_owner_user_id is null then
    return query
    select
      false,
      null::text,
      null::uuid,
      'VALIDATION_ERROR'::text,
      'owner user id is required'::text,
      null::integer,
      p_max_businesses;
    return;
  end if;

  if coalesce(trim(p_base_slug), '') = '' then
    return query
    select
      false,
      null::text,
      null::uuid,
      'VALIDATION_ERROR'::text,
      'business slug is required'::text,
      null::integer,
      p_max_businesses;
    return;
  end if;

  -- Serialize create attempts for a single owner inside transaction.
  perform pg_advisory_xact_lock(hashtextextended(p_owner_user_id::text, 0));

  v_current_usage := public.count_owner_businesses_for_limit(p_owner_user_id);
  if p_max_businesses is not null and v_current_usage >= p_max_businesses then
    return query
    select
      false,
      null::text,
      null::uuid,
      'BUSINESS_LIMIT_REACHED'::text,
      'You have reached the maximum number of businesses for your plan'::text,
      v_current_usage,
      p_max_businesses;
    return;
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'businesses'
      and column_name = 'created_by'
  )
  into v_has_created_by;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'businesses'
      and column_name = 'account_id'
  )
  into v_has_account_id;

  -- Resolve (or create) the owner's account so we can stamp it on the new
  -- business row. Older DBs without account_id simply skip this branch.
  if v_has_account_id then
    select id into v_account_id
    from public.accounts
    where primary_owner_user_id = p_owner_user_id
    order by created_at asc nulls last
    limit 1;

    if v_account_id is null then
      v_anchor_slug := trim(p_base_slug);
      insert into public.accounts (slug, name, status, primary_owner_user_id, created_at, updated_at)
      values (
        case
          when not exists (select 1 from public.accounts a2 where a2.slug = v_anchor_slug)
            then v_anchor_slug
          else v_anchor_slug || '-' || substr(p_owner_user_id::text, 1, 6)
        end,
        v_anchor_slug,
        'active',
        p_owner_user_id,
        now(),
        now()
      )
      returning id into v_account_id;
    end if;
  end if;

  loop
    v_slug := case
      when v_attempt = 0 then trim(p_base_slug)
      else trim(p_base_slug) || '-' || (v_attempt + 2)::text
    end;

    begin
      if v_has_account_id and v_has_created_by then
        insert into public.businesses (slug, created_by, account_id)
        values (v_slug, p_owner_user_id, v_account_id)
        returning public.businesses.id into v_business_id;
      elsif v_has_account_id then
        insert into public.businesses (slug, account_id)
        values (v_slug, v_account_id)
        returning public.businesses.id into v_business_id;
      elsif v_has_created_by then
        insert into public.businesses (slug, created_by)
        values (v_slug, p_owner_user_id)
        returning public.businesses.id into v_business_id;
      else
        insert into public.businesses (slug)
        values (v_slug)
        returning public.businesses.id into v_business_id;
      end if;
      exit;
    exception
      when unique_violation then
        v_attempt := v_attempt + 1;
        if v_attempt >= 7 then
          return query
          select
            false,
            null::text,
            null::uuid,
            'BUSINESS_CREATE_FAILED'::text,
            'Could not create business. Try a slightly different name.'::text,
            v_current_usage,
            p_max_businesses;
          return;
        end if;
    end;
  end loop;

  insert into public.memberships (business_id, user_id, role)
  values (v_business_id, p_owner_user_id, 'OWNER')
  on conflict (business_id, user_id) do update
  set role = 'OWNER';

  return query
  select
    true,
    v_slug,
    v_business_id,
    null::text,
    null::text,
    v_current_usage,
    p_max_businesses;
end;
$$;
