-- Phase 8: Seed `export_csv` feature entitlement.
--
-- Pro (code='business', displayed "Pro") and Business (code='pro', displayed
-- "Business") get export. Solo/Starter do not.
--
-- Idempotent & safe to rerun.

insert into public.features (key, name, description, value_type, is_active)
values (
  'export_csv',
  'Export to CSV',
  'Allow downloading clients, products and orders as CSV files.',
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
      when 'business' then true
      when 'pro' then true
    end as bool_value
  from public.plans p
  cross join public.features f
  where p.code in ('solo', 'starter', 'business', 'pro')
    and f.key = 'export_csv'
)
insert into public.plan_features (plan_id, feature_id, value_type, bool_value)
select plan_id, feature_id, 'boolean'::feature_value_type_enum, bool_value
from targets
where bool_value is not null
on conflict (plan_id, feature_id) do update
  set value_type = excluded.value_type,
      bool_value = excluded.bool_value,
      int_value = null,
      decimal_value = null,
      text_value = null,
      json_value = null,
      updated_at = now();
