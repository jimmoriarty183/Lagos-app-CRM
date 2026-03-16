alter table if exists public.order_checklist_items
add column if not exists due_date date;

alter table if exists public.order_checklist_items
  add column if not exists created_by uuid,
  add column if not exists completed_by uuid;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'order_checklist_items'
  ) then
    if not exists (
      select 1 from pg_constraint where conname = 'order_checklist_items_created_by_fkey'
    ) then
      alter table public.order_checklist_items
        add constraint order_checklist_items_created_by_fkey
        foreign key (created_by) references public.profiles(id) on delete set null;
    end if;

    if not exists (
      select 1 from pg_constraint where conname = 'order_checklist_items_completed_by_fkey'
    ) then
      alter table public.order_checklist_items
        add constraint order_checklist_items_completed_by_fkey
        foreign key (completed_by) references public.profiles(id) on delete set null;
    end if;
  end if;
end
$$;

create or replace function public.order_checklist_items_stamp_actor()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.created_by is null then
      new.created_by := auth.uid();
    end if;
    return new;
  end if;

  if new.is_done is distinct from old.is_done then
    if new.is_done then
      new.completed_by := coalesce(auth.uid(), new.completed_by);
    else
      new.completed_by := null;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.order_checklist_items_write_activity_event()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_actor_type text;
  v_event_type text;
  v_payload jsonb;
  v_created_at timestamptz;
begin
  if tg_op = 'INSERT' then
    v_actor_id := new.created_by;
    v_event_type := 'checklist.created';
    v_payload := jsonb_build_object(
      'field', 'checklist_item',
      'itemId', new.id,
      'itemTitle', new.title
    );
    v_created_at := new.created_at;
  elsif tg_op = 'UPDATE' then
    if not (new.is_done is distinct from old.is_done and new.is_done = true) then
      return new;
    end if;

    v_actor_id := coalesce(new.completed_by, auth.uid());
    v_event_type := 'checklist.completed';
    v_payload := jsonb_build_object(
      'field', 'completed',
      'itemId', new.id,
      'itemTitle', new.title,
      'from', false,
      'to', true
    );
    v_created_at := coalesce(new.done_at, now());
  else
    v_actor_id := coalesce(auth.uid(), old.completed_by, old.created_by);
    v_event_type := 'checklist.deleted';
    v_payload := jsonb_build_object(
      'field', 'checklist_item',
      'itemId', old.id,
      'itemTitle', old.title
    );
    v_created_at := now();
  end if;

  v_actor_type := case when v_actor_id is null then 'system' else 'user' end;

  insert into public.activity_events (
    business_id,
    entity_type,
    entity_id,
    order_id,
    actor_id,
    actor_type,
    event_type,
    payload,
    visibility,
    source,
    correlation_id,
    created_at
  )
  values (
    coalesce(new.business_id, old.business_id),
    'order',
    coalesce(new.order_id, old.order_id),
    coalesce(new.order_id, old.order_id),
    v_actor_id,
    v_actor_type,
    v_event_type,
    v_payload,
    'internal',
    'order_checklist_items_trigger',
    null,
    v_created_at
  );

  return coalesce(new, old);
end;
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'order_checklist_items'
  ) then
    drop trigger if exists order_checklist_items_stamp_actor on public.order_checklist_items;
    create trigger order_checklist_items_stamp_actor
    before insert or update on public.order_checklist_items
    for each row
    execute function public.order_checklist_items_stamp_actor();

    drop trigger if exists order_checklist_items_write_activity_event on public.order_checklist_items;
    create trigger order_checklist_items_write_activity_event
    after insert or update or delete on public.order_checklist_items
    for each row
    execute function public.order_checklist_items_write_activity_event();
  end if;
end
$$;
