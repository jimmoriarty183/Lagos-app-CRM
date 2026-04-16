-- Migration 20260416_fix_billing_paddle_price_ids.sql
-- Purpose: Repair billing tables for production issue "No active plan" after successful Paddle payment
-- Root cause: 
--   1) plan_prices missing paddle_price_id and paddle_product_id values
--   2) Webhook processing incompatible with legacy schema columns
--   3) Missing fallback logic for account lookup without custom_data
--
-- This migration is idempotent and safe to retry.

begin;

-- ========================================================
-- Step 1: Ensure plans exist with correct codes
-- ========================================================
insert into public.plans (code, name, description, is_active, created_at, updated_at)
values
  ('solo', 'Solo', 'Solo plan', true, now(), now()),
  ('starter', 'Starter', 'Starter plan', true, now(), now()),
  ('business', 'Business', 'Business plan', true, now(), now()),
  ('pro', 'Pro', 'Pro plan', true, now(), now())
on conflict (code) do update
set
  is_active = true,
  updated_at = now()
where excluded.code in ('solo', 'starter', 'business', 'pro');

-- ========================================================
-- Step 2: Ensure plan_prices exist with correct paddle IDs
-- Map: per user request (Monthly + Yearly price IDs)
-- ========================================================

-- Helper: monthly prices for each plan
-- Monthly IDs from source of truth:
-- solo: pri_01kmncmgt9csnfq6hwvz6eg5m3
-- starter: pri_01kmncq914c512x590mj142cm9
-- business: pri_01kmncrvjyqb3y1rwf6w2zcpbq
-- pro: pri_01kmncvk1ytkmj0tar1wxb8cw4

-- First, insert monthly prices if they don't exist
with plan_mapping as (
  select
    p.id as plan_id,
    p.code,
    case p.code
      when 'solo' then 'pri_01kmncmgt9csnfq6hwvz6eg5m3'::text
      when 'starter' then 'pri_01kmncq914c512x590mj142cm9'::text
      when 'business' then 'pri_01kmncrvjyqb3y1rwf6w2zcpbq'::text
      when 'pro' then 'pri_01kmncvk1ytkmj0tar1wxb8cw4'::text
    end as paddle_price_id_monthly
  from public.plans p
  where p.code in ('solo', 'starter', 'business', 'pro')
)
insert into public.plan_prices (
  plan_id,
  billing_interval,
  currency_code,
  unit_amount_cents,
  paddle_price_id,
  is_active,
  created_at,
  updated_at
)
select
  m.plan_id,
  'month'::billing_interval_enum,
  'GBP',
  case m.code
    when 'solo' then 800
    when 'starter' then 3900
    when 'business' then 7900
    when 'pro' then 14900
  end,
  m.paddle_price_id_monthly,
  true,
  now(),
  now()
from plan_mapping m
where not exists (
  select 1
  from public.plan_prices pp
  where pp.plan_id = m.plan_id
    and pp.billing_interval = 'month'::billing_interval_enum
)
on conflict do nothing;

-- Update existing monthly prices with paddle IDs (if NULL)
with plan_mapping as (
  select
    p.id as plan_id,
    p.code,
    case p.code
      when 'solo' then 'pri_01kmncmgt9csnfq6hwvz6eg5m3'::text
      when 'starter' then 'pri_01kmncq914c512x590mj142cm9'::text
      when 'business' then 'pri_01kmncrvjyqb3y1rwf6w2zcpbq'::text
      when 'pro' then 'pri_01kmncvk1ytkmj0tar1wxb8cw4'::text
    end as paddle_price_id_monthly
  from public.plans p
  where p.code in ('solo', 'starter', 'business', 'pro')
)
update public.plan_prices pp
set
  paddle_price_id = m.paddle_price_id_monthly,
  is_active = true,
  updated_at = now()
from plan_mapping m
where pp.plan_id = m.plan_id
  and pp.billing_interval = 'month'::billing_interval_enum
  and (pp.paddle_price_id is null or pp.paddle_price_id = '');

-- Insert yearly prices if they don't exist
with plan_mapping as (
  select
    p.id as plan_id,
    p.code,
    case p.code
      when 'solo' then 'pri_01kn1ztvh3d8mf3c7msstc4yj4'::text
      when 'starter' then 'pri_01kn1zrysbhmecpa8dmn3mjkwv'::text
      when 'business' then 'pri_01kn1zq31rkhqbgxys3f1fgqgj'::text
      when 'pro' then 'pri_01kn1zmv87cs2he9v7xy01xpns'::text
    end as paddle_price_id_yearly
  from public.plans p
  where p.code in ('solo', 'starter', 'business', 'pro')
)
insert into public.plan_prices (
  plan_id,
  billing_interval,
  currency_code,
  unit_amount_cents,
  paddle_price_id,
  is_active,
  created_at,
  updated_at
)
select
  m.plan_id,
  'year'::billing_interval_enum,
  'GBP',
  case m.code
    when 'solo' then 8000
    when 'starter' then 39000
    when 'business' then 79000
    when 'pro' then 149000
  end,
  m.paddle_price_id_yearly,
  true,
  now(),
  now()
from plan_mapping m
where not exists (
  select 1
  from public.plan_prices pp
  where pp.plan_id = m.plan_id
    and pp.billing_interval = 'year'::billing_interval_enum
)
on conflict do nothing;

-- Update existing yearly prices with paddle IDs (if NULL)
with plan_mapping as (
  select
    p.id as plan_id,
    p.code,
    case p.code
      when 'solo' then 'pri_01kn1ztvh3d8mf3c7msstc4yj4'::text
      when 'starter' then 'pri_01kn1zrysbhmecpa8dmn3mjkwv'::text
      when 'business' then 'pri_01kn1zq31rkhqbgxys3f1fgqgj'::text
      when 'pro' then 'pri_01kn1zmv87cs2he9v7xy01xpns'::text
    end as paddle_price_id_yearly
  from public.plans p
  where p.code in ('solo', 'starter', 'business', 'pro')
)
update public.plan_prices pp
set
  paddle_price_id = m.paddle_price_id_yearly,
  is_active = true,
  updated_at = now()
from plan_mapping m
where pp.plan_id = m.plan_id
  and pp.billing_interval = 'year'::billing_interval_enum
  and (pp.paddle_price_id is null or pp.paddle_price_id = '');

-- ========================================================
-- Step 3: Verify and report on data
-- ========================================================
-- Do a final check to ensure all plans have both month and year prices
do $$
declare
  v_missing_monthly int;
  v_missing_yearly int;
  v_missing_paddle_id int;
begin
  select count(*) into v_missing_monthly
  from public.plans p
  where p.code in ('solo', 'starter', 'business', 'pro')
    and not exists (
      select 1
      from public.plan_prices pp
      where pp.plan_id = p.id
        and pp.billing_interval = 'month'::billing_interval_enum
        and pp.is_active = true
    );

  select count(*) into v_missing_yearly
  from public.plans p
  where p.code in ('solo', 'starter', 'business', 'pro')
    and not exists (
      select 1
      from public.plan_prices pp
      where pp.plan_id = p.id
        and pp.billing_interval = 'year'::billing_interval_enum
        and pp.is_active = true
    );

  select count(*) into v_missing_paddle_id
  from public.plan_prices pp
  where pp.plan_id in (
    select id from public.plans where code in ('solo', 'starter', 'business', 'pro')
  )
  and (pp.paddle_price_id is null or pp.paddle_price_id = '');

  if v_missing_monthly > 0 then
    raise warning 'WARNING: % plans missing active monthly prices', v_missing_monthly;
  end if;
  if v_missing_yearly > 0 then
    raise warning 'WARNING: % plans missing active yearly prices', v_missing_yearly;
  end if;
  if v_missing_paddle_id > 0 then
    raise warning 'WARNING: % plan_prices missing paddle_price_id', v_missing_paddle_id;
  end if;

  if v_missing_monthly = 0 and v_missing_yearly = 0 and v_missing_paddle_id = 0 then
    raise notice 'SUCCESS: All plans and prices configured correctly with Paddle IDs.';
  end if;
end $$;

commit;
