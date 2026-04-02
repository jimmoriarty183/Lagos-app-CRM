-- Idempotent billing seed for fixed plans and monthly plan prices.
-- Uses only: solo, starter, business, pro.

do $$
begin
  if to_regclass('public.plans') is null then
    raise notice 'Skipping billing plan seed: table public.plans does not exist.';
    return;
  end if;

  if to_regclass('public.plan_prices') is null then
    raise notice 'Skipping billing plan seed: table public.plan_prices does not exist.';
    return;
  end if;

  -- 1) Seed fixed plans (idempotent by unique plans.code)
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

  -- 2) Ensure at least one active monthly price per plan
  -- SOLO
  insert into public.plan_prices (
    plan_id, billing_interval, currency_code, unit_amount_cents,
    paddle_product_id, paddle_price_id, is_active, created_at, updated_at
  )
  select
    p.id, 'month'::billing_interval_enum, 'GBP', 800,
    null, null, true, now(), now()
  from public.plans p
  where p.code = 'solo'
    and not exists (
      select 1
      from public.plan_prices pp
      where pp.plan_id = p.id
        and pp.billing_interval = 'month'::billing_interval_enum
    );

  update public.plan_prices pp
  set
    is_active = true,
    currency_code = coalesce(pp.currency_code, 'GBP'),
    unit_amount_cents = coalesce(pp.unit_amount_cents, 800),
    updated_at = now()
  where pp.id = (
    select pp2.id
    from public.plan_prices pp2
    join public.plans p on p.id = pp2.plan_id
    where p.code = 'solo'
      and pp2.billing_interval = 'month'::billing_interval_enum
    order by pp2.created_at asc, pp2.id asc
    limit 1
  );

  -- STARTER
  insert into public.plan_prices (
    plan_id, billing_interval, currency_code, unit_amount_cents,
    paddle_product_id, paddle_price_id, is_active, created_at, updated_at
  )
  select
    p.id, 'month'::billing_interval_enum, 'GBP', 3900,
    null, null, true, now(), now()
  from public.plans p
  where p.code = 'starter'
    and not exists (
      select 1
      from public.plan_prices pp
      where pp.plan_id = p.id
        and pp.billing_interval = 'month'::billing_interval_enum
    );

  update public.plan_prices pp
  set
    is_active = true,
    currency_code = coalesce(pp.currency_code, 'GBP'),
    unit_amount_cents = coalesce(pp.unit_amount_cents, 3900),
    updated_at = now()
  where pp.id = (
    select pp2.id
    from public.plan_prices pp2
    join public.plans p on p.id = pp2.plan_id
    where p.code = 'starter'
      and pp2.billing_interval = 'month'::billing_interval_enum
    order by pp2.created_at asc, pp2.id asc
    limit 1
  );

  -- BUSINESS
  insert into public.plan_prices (
    plan_id, billing_interval, currency_code, unit_amount_cents,
    paddle_product_id, paddle_price_id, is_active, created_at, updated_at
  )
  select
    p.id, 'month'::billing_interval_enum, 'GBP', 7900,
    null, null, true, now(), now()
  from public.plans p
  where p.code = 'business'
    and not exists (
      select 1
      from public.plan_prices pp
      where pp.plan_id = p.id
        and pp.billing_interval = 'month'::billing_interval_enum
    );

  update public.plan_prices pp
  set
    is_active = true,
    currency_code = coalesce(pp.currency_code, 'GBP'),
    unit_amount_cents = coalesce(pp.unit_amount_cents, 7900),
    updated_at = now()
  where pp.id = (
    select pp2.id
    from public.plan_prices pp2
    join public.plans p on p.id = pp2.plan_id
    where p.code = 'business'
      and pp2.billing_interval = 'month'::billing_interval_enum
    order by pp2.created_at asc, pp2.id asc
    limit 1
  );

  -- PRO
  insert into public.plan_prices (
    plan_id, billing_interval, currency_code, unit_amount_cents,
    paddle_product_id, paddle_price_id, is_active, created_at, updated_at
  )
  select
    p.id, 'month'::billing_interval_enum, 'GBP', 14900,
    null, null, true, now(), now()
  from public.plans p
  where p.code = 'pro'
    and not exists (
      select 1
      from public.plan_prices pp
      where pp.plan_id = p.id
        and pp.billing_interval = 'month'::billing_interval_enum
    );

  update public.plan_prices pp
  set
    is_active = true,
    currency_code = coalesce(pp.currency_code, 'GBP'),
    unit_amount_cents = coalesce(pp.unit_amount_cents, 14900),
    updated_at = now()
  where pp.id = (
    select pp2.id
    from public.plan_prices pp2
    join public.plans p on p.id = pp2.plan_id
    where p.code = 'pro'
      and pp2.billing_interval = 'month'::billing_interval_enum
    order by pp2.created_at asc, pp2.id asc
    limit 1
  );
end $$;
