-- Make audit trigger tolerant for legacy tables that do not have full audit columns.
-- This is required because trg_orders_set_audit_fields may run on historical orders
-- schemas where created_by/updated_by/version are absent.

create or replace function app.set_audit_fields()
returns trigger
language plpgsql
as $$
declare
  v_actor uuid;
  v_has_created_at boolean := false;
  v_has_updated_at boolean := false;
  v_has_created_by boolean := false;
  v_has_updated_by boolean := false;
  v_has_version boolean := false;
begin
  v_actor := app.current_actor_id();

  select exists (
    select 1
    from pg_attribute
    where attrelid = tg_relid
      and attname = 'created_at'
      and not attisdropped
  ) into v_has_created_at;

  select exists (
    select 1
    from pg_attribute
    where attrelid = tg_relid
      and attname = 'updated_at'
      and not attisdropped
  ) into v_has_updated_at;

  select exists (
    select 1
    from pg_attribute
    where attrelid = tg_relid
      and attname = 'created_by'
      and not attisdropped
  ) into v_has_created_by;

  select exists (
    select 1
    from pg_attribute
    where attrelid = tg_relid
      and attname = 'updated_by'
      and not attisdropped
  ) into v_has_updated_by;

  select exists (
    select 1
    from pg_attribute
    where attrelid = tg_relid
      and attname = 'version'
      and not attisdropped
  ) into v_has_version;

  if tg_op = 'INSERT' then
    if v_has_created_at then
      new.created_at := coalesce(new.created_at, now());
    end if;
    if v_has_updated_at then
      new.updated_at := coalesce(new.updated_at, now());
    end if;
    if v_has_created_by then
      new.created_by := coalesce(new.created_by, v_actor);
    end if;
    if v_has_updated_by then
      new.updated_by := coalesce(new.updated_by, v_actor);
    end if;
    if v_has_version then
      new.version := coalesce(new.version, 1);
    end if;
    return new;
  end if;

  if v_has_created_at then
    new.created_at := old.created_at;
  end if;
  if v_has_created_by then
    new.created_by := old.created_by;
  end if;
  if v_has_updated_at then
    new.updated_at := now();
  end if;
  if v_has_updated_by then
    new.updated_by := coalesce(new.updated_by, v_actor);
  end if;
  if v_has_version then
    new.version := coalesce(old.version, 1) + 1;
  end if;
  return new;
end;
$$;

