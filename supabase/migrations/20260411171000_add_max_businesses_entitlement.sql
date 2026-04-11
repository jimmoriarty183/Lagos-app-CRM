-- Add max_businesses entitlement and owner-count performance index.
-- This migration is idempotent and safe to rerun.

do $$
declare
  v_feature_id uuid;
begin
  if to_regclass('public.features') is null
     or to_regclass('public.plans') is null
     or to_regclass('public.plan_features') is null then
    raise notice 'Skipping max_businesses seed: required billing tables are missing.';
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'features' and column_name in ('id', 'code', 'name', 'description', 'value_type', 'created_at', 'updated_at')
    group by table_schema, table_name
    having count(*) = 7
  ) then
    raise notice 'Skipping max_businesses seed: features table shape is incompatible.';
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'plans' and column_name in ('id', 'code')
    group by table_schema, table_name
    having count(*) = 2
  ) then
    raise notice 'Skipping max_businesses seed: plans table shape is incompatible.';
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'plan_features' and column_name in ('plan_id', 'feature_id', 'value_bool', 'value_int', 'value_text', 'created_at', 'updated_at')
    group by table_schema, table_name
    having count(*) = 7
  ) then
    raise notice 'Skipping max_businesses seed: plan_features table shape is incompatible.';
    return;
  end if;

  select f.id
  into v_feature_id
  from public.features f
  where f.code = 'max_businesses'
  limit 1;

  if v_feature_id is null then
    insert into public.features (code, name, description, value_type, created_at, updated_at)
    values (
      'max_businesses',
      'Max businesses',
      'Maximum number of businesses where the user can be OWNER. NULL means unlimited.',
      'integer',
      now(),
      now()
    )
    returning id into v_feature_id;
  else
    update public.features
    set
      name = 'Max businesses',
      description = 'Maximum number of businesses where the user can be OWNER. NULL means unlimited.',
      value_type = 'integer',
      updated_at = now()
    where id = v_feature_id;
  end if;

  with plan_limits as (
    select
      p.id as plan_id,
      case p.code
        when 'solo' then 1
        when 'starter' then 3
        when 'business' then 10
        when 'pro' then null
        else null
      end::integer as value_int
    from public.plans p
    where p.code in ('solo', 'starter', 'business', 'pro')
  )
  update public.plan_features pf
  set
    value_bool = null,
    value_int = pl.value_int,
    value_text = null,
    updated_at = now()
  from plan_limits pl
  where pf.plan_id = pl.plan_id
    and pf.feature_id = v_feature_id;

  with plan_limits as (
    select
      p.id as plan_id,
      case p.code
        when 'solo' then 1
        when 'starter' then 3
        when 'business' then 10
        when 'pro' then null
        else null
      end::integer as value_int
    from public.plans p
    where p.code in ('solo', 'starter', 'business', 'pro')
  )
  insert into public.plan_features (
    plan_id,
    feature_id,
    value_bool,
    value_int,
    value_text,
    created_at,
    updated_at
  )
  select
    pl.plan_id,
    v_feature_id,
    null,
    pl.value_int,
    null,
    now(),
    now()
  from plan_limits pl
  where not exists (
    select 1
    from public.plan_features pf
    where pf.plan_id = pl.plan_id
      and pf.feature_id = v_feature_id
  );
end
$$;

create index if not exists idx_memberships_owner_user_business
on public.memberships (user_id, business_id)
where upper(coalesce(role, '')) = 'OWNER';
