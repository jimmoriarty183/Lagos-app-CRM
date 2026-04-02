-- Local/dev seed (idempotent) for billing fixed plans and monthly prices.
-- This file is referenced by supabase/config.toml [db.seed].sql_paths.

do $$
begin
  if to_regclass('public.plans') is null then
    raise notice 'Skipping seed.sql billing plans: table public.plans does not exist.';
    return;
  end if;

  if to_regclass('public.plan_prices') is null then
    raise notice 'Skipping seed.sql billing plans: table public.plan_prices does not exist.';
    return;
  end if;

  insert into public.plans (code, name, description, is_active, created_at, updated_at)
  values
    ('solo', 'SOLO', 'SOLO plan', true, now(), now()),
    ('starter', 'STARTER', 'STARTER plan', true, now(), now()),
    ('business', 'BUSINESS', 'BUSINESS plan', true, now(), now()),
    ('pro', 'PRO', 'PRO plan', true, now(), now())
  on conflict (code) do update
    set
      name = excluded.name,
      is_active = true,
      updated_at = now();

  insert into public.plan_prices (
    plan_id, billing_interval, currency_code, unit_amount_cents,
    paddle_product_id, paddle_price_id, is_active, created_at, updated_at
  )
  select
    p.id,
    'month'::billing_interval_enum,
    'GBP',
    case p.code
      when 'solo' then 800
      when 'starter' then 3900
      when 'business' then 7900
      when 'pro' then 14900
    end as unit_amount_cents,
    null,
    null,
    true,
    now(),
    now()
  from public.plans p
  where p.code in ('solo', 'starter', 'business', 'pro')
    and not exists (
      select 1
      from public.plan_prices pp
      where pp.plan_id = p.id
        and pp.billing_interval = 'month'::billing_interval_enum
    );

  -- Keep one monthly price active for each fixed plan.
  update public.plan_prices pp
  set
    is_active = true,
    currency_code = coalesce(pp.currency_code, 'GBP'),
    unit_amount_cents = coalesce(
      pp.unit_amount_cents,
      case p.code
        when 'solo' then 800
        when 'starter' then 3900
        when 'business' then 7900
        when 'pro' then 14900
      end
    ),
    updated_at = now()
  from public.plans p
  where pp.plan_id = p.id
    and p.code in ('solo', 'starter', 'business', 'pro')
    and pp.billing_interval = 'month'::billing_interval_enum
    and pp.id = (
      select pp2.id
      from public.plan_prices pp2
      where pp2.plan_id = p.id
        and pp2.billing_interval = 'month'::billing_interval_enum
      order by pp2.created_at asc, pp2.id asc
      limit 1
    );
end $$;
