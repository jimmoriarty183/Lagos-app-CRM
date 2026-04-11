-- Atomic owner business creation with entitlement limit guard.
-- Prevents race conditions across concurrent requests by locking per owner user.

create or replace function public.count_owner_businesses_for_limit(
  p_owner_user_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_filters text := '';
  v_count integer := 0;
begin
  if p_owner_user_id is null then
    return 0;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'businesses'
      and column_name = 'is_archived'
  ) then
    v_filters := v_filters || ' and coalesce(b.is_archived, false) = false';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'businesses'
      and column_name = 'archived_at'
  ) then
    v_filters := v_filters || ' and b.archived_at is null';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'businesses'
      and column_name = 'is_deleted'
  ) then
    v_filters := v_filters || ' and coalesce(b.is_deleted, false) = false';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'businesses'
      and column_name = 'deleted_at'
  ) then
    v_filters := v_filters || ' and b.deleted_at is null';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'businesses'
      and column_name = 'status'
  ) then
    v_filters := v_filters ||
      ' and lower(coalesce(b.status::text, '''')) not in (''archived'', ''deleted'')';
  end if;

  execute format(
    'select count(*)::int
     from public.memberships m
     join public.businesses b on b.id = m.business_id
     where m.user_id = $1
       and upper(coalesce(m.role, '''')) = ''OWNER''%s',
    v_filters
  )
  into v_count
  using p_owner_user_id;

  return coalesce(v_count, 0);
end;
$$;

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
declare
  v_current_usage integer := 0;
  v_attempt integer := 0;
  v_slug text;
  v_business_id uuid;
  v_has_created_by boolean := false;
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

  loop
    v_slug := case
      when v_attempt = 0 then trim(p_base_slug)
      else trim(p_base_slug) || '-' || (v_attempt + 2)::text
    end;

    begin
      if v_has_created_by then
        insert into public.businesses (slug, created_by)
        values (v_slug, p_owner_user_id)
        returning id into v_business_id;
      else
        insert into public.businesses (slug)
        values (v_slug)
        returning id into v_business_id;
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
