-- Phase 8b: Seed `import_csv` feature entitlement.
--
-- Only the top tier (code='pro', displayed as "Business") gets import.
-- Solo/Starter/Pro have only export.
--
-- Idempotent & safe to rerun.

insert into public.features (key, name, description, value_type, is_active)
values (
  'import_csv',
  'Import from CSV',
  'Allow uploading clients/products from CSV files using the Ordo template.',
  'boolean',
  true
)
on conflict (key) do update
  set name = excluded.name,
      description = excluded.description,
      value_type = excluded.value_type,
      is_active = excluded.is_active,
      updated_at = now();

with targets as (
  select p.id as plan_id, p.code as plan_code, f.id as feature_id,
    case p.code
      when 'solo' then false
      when 'starter' then false
      when 'business' then false  -- displayed as "Pro" — not entitled
      when 'pro' then true        -- displayed as "Business" — top tier
    end as bool_value
  from public.plans p
  cross join public.features f
  where p.code in ('solo', 'starter', 'business', 'pro')
    and f.key = 'import_csv'
)
insert into public.plan_features (plan_id, feature_id, value_type, bool_value)
select plan_id, feature_id, 'boolean'::feature_value_type_enum, bool_value
from targets
on conflict (plan_id, feature_id) do update
  set value_type = excluded.value_type,
      bool_value = excluded.bool_value,
      int_value = null,
      decimal_value = null,
      text_value = null,
      json_value = null,
      updated_at = now();
