-- Phase 2: Seed seat/business entitlements + account seat-counting RPC.
--
-- Fixes the previously-broken `20260411171000_add_max_businesses_entitlement.sql`
-- (which silently skipped due to column-name mismatches: features.code vs .key,
--  plan_features.value_int vs .int_value).
--
-- Seeds:
--   * max_businesses          (int) — per account
--   * max_members_per_account (int) — unique emails across all businesses
--
-- Plan values (matches final UK pricing grid):
--   solo     → businesses=1,  members=1
--   starter  → businesses=2,  members=5
--   business → businesses=5,  members=10   (will display as "Pro" after Phase 7 swap)
--   pro      → businesses=10, members=20   (will display as "Business" — top tier)
--
-- Adds RPCs:
--   count_account_seats(account_id)       — live usage
--   resolve_account_int_limit(acct, key)  — planned limit with override support
--
-- Idempotent & safe to rerun.

-- 1. Seed feature rows (use actual column names: key, value_type).
insert into public.features (key, name, description, value_type, unit, is_active)
values
  ('max_businesses',
   'Max businesses per account',
   'Maximum number of businesses that can exist under one account. NULL = unlimited.',
   'integer', 'businesses', true),
  ('max_members_per_account',
   'Max team members per account',
   'Maximum unique team members (by email) across all businesses of an account. NULL = unlimited.',
   'integer', 'members', true)
on conflict (key) do update
  set name = excluded.name,
      description = excluded.description,
      value_type = excluded.value_type,
      unit = excluded.unit,
      is_active = excluded.is_active,
      updated_at = now();

-- 2. Seed plan_features for all 4 plans × 2 features.
with targets as (
  select p.id as plan_id, p.code as plan_code, f.id as feature_id, f.key as feature_key,
    case
      when f.key = 'max_businesses' then
        case p.code
          when 'solo' then 1
          when 'starter' then 2
          when 'business' then 5
          when 'pro' then 10
        end
      when f.key = 'max_members_per_account' then
        case p.code
          when 'solo' then 1
          when 'starter' then 5
          when 'business' then 10
          when 'pro' then 20
        end
    end::bigint as int_value
  from public.plans p
  cross join public.features f
  where p.code in ('solo', 'starter', 'business', 'pro')
    and f.key in ('max_businesses', 'max_members_per_account')
)
insert into public.plan_features (plan_id, feature_id, value_type, int_value)
select plan_id, feature_id, 'integer'::feature_value_type_enum, int_value
from targets
where int_value is not null
on conflict (plan_id, feature_id) do update
  set value_type = excluded.value_type,
      int_value = excluded.int_value,
      bool_value = null,
      decimal_value = null,
      text_value = null,
      json_value = null,
      updated_at = now();

-- 3. RPC: count live seats for an account (unique emails across memberships + pending invites).
create or replace function public.count_account_seats(p_account_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  if p_account_id is null then
    return 0;
  end if;

  select count(*)::int into v_count
  from (
    select lower(trim(u.email)) as email
    from public.memberships m
    join public.businesses b on b.id = m.business_id
    join auth.users u on u.id = m.user_id
    where b.account_id = p_account_id
      and u.email is not null
      and length(trim(u.email)) > 0

    union

    select lower(trim(i.email)) as email
    from public.business_invites i
    join public.businesses b on b.id = i.business_id
    where b.account_id = p_account_id
      and lower(coalesce(i.status::text, '')) = 'pending'
      and i.revoked_at is null
      and (i.expires_at is null or i.expires_at > now())
      and i.email is not null
      and length(trim(i.email)) > 0
  ) distinct_emails;

  return coalesce(v_count, 0);
end;
$$;

-- 4. RPC: resolve the planned integer limit for a feature on an account.
--    Applies active manual override if present, otherwise reads from plan_features
--    via account's active subscription. Returns NULL = unlimited.
create or replace function public.resolve_account_int_limit(
  p_account_id uuid,
  p_feature_key text
)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_feature_id uuid;
  v_override_type text;
  v_override_int bigint;
  v_plan_int bigint;
  v_has_override boolean := false;
  v_has_plan_value boolean := false;
begin
  if p_account_id is null or p_feature_key is null then
    return null;
  end if;

  select id into v_feature_id
  from public.features
  where key = p_feature_key and is_active = true
  limit 1;

  if v_feature_id is null then
    return null;
  end if;

  -- 4a. Manual override (most recent active).
  select o.override_type::text, o.int_value
  into v_override_type, v_override_int
  from public.manual_entitlement_overrides o
  where o.account_id = p_account_id
    and o.feature_id = v_feature_id
    and o.revoked_at is null
    and (o.expires_at is null or o.expires_at > now())
  order by o.created_at desc
  limit 1;

  v_has_override := found;

  if v_has_override then
    -- revoke = blocked access → treat as 0 seats available
    if v_override_type = 'revoke' then
      return 0;
    end if;
    -- grant without int_value = unlimited
    if v_override_type = 'grant' and v_override_int is null then
      return null;
    end if;
    if v_override_int is not null then
      return v_override_int::integer;
    end if;
  end if;

  -- 4b. Plan value via active subscription.
  select pf.int_value
  into v_plan_int
  from public.subscriptions s
  join public.plan_prices pp on pp.id = s.plan_price_id
  join public.plan_features pf on pf.plan_id = pp.plan_id and pf.feature_id = v_feature_id
  where s.account_id = p_account_id
    and s.status in ('trialing', 'active', 'past_due')
  order by
    case s.status
      when 'active' then 0
      when 'trialing' then 1
      when 'past_due' then 2
    end,
    s.updated_at desc
  limit 1;

  v_has_plan_value := found;

  if v_has_plan_value then
    return v_plan_int::integer;
  end if;

  -- 4c. No subscription → default to solo plan values (most restrictive).
  select pf.int_value
  into v_plan_int
  from public.plans p
  join public.plan_features pf on pf.plan_id = p.id and pf.feature_id = v_feature_id
  where p.code = 'solo'
  limit 1;

  return v_plan_int::integer;
end;
$$;

-- 5. Permissions for app/anon roles (mirror existing RPC grants).
grant execute on function public.count_account_seats(uuid) to anon, authenticated, service_role;
grant execute on function public.resolve_account_int_limit(uuid, text) to anon, authenticated, service_role;
