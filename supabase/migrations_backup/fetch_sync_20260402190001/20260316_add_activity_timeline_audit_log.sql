create or replace function public.is_business_member(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.business_id = target_business_id
      and m.user_id = auth.uid()
  );
$$;
create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  entity_type text not null,
  entity_id uuid not null,
  order_id uuid null,
  actor_id uuid null,
  actor_type text not null default 'user',
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  visibility text not null default 'internal',
  source text null,
  correlation_id text null,
  created_at timestamptz not null default now()
);
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  entity_type text not null default 'order',
  entity_id uuid not null,
  author_id uuid not null,
  body text not null,
  is_edited boolean not null default false,
  edited_at timestamptz null,
  deleted_at timestamptz null,
  created_at timestamptz not null default now()
);
alter table public.activity_events
  add column if not exists business_id uuid,
  add column if not exists entity_type text,
  add column if not exists entity_id uuid,
  add column if not exists order_id uuid,
  add column if not exists actor_id uuid,
  add column if not exists actor_type text,
  add column if not exists event_type text,
  add column if not exists payload jsonb,
  add column if not exists visibility text,
  add column if not exists source text,
  add column if not exists correlation_id text,
  add column if not exists created_at timestamptz;
alter table public.comments
  add column if not exists business_id uuid,
  add column if not exists entity_type text,
  add column if not exists entity_id uuid,
  add column if not exists author_id uuid,
  add column if not exists body text,
  add column if not exists is_edited boolean,
  add column if not exists edited_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists created_at timestamptz;
update public.activity_events
set actor_type = coalesce(actor_type, 'user'),
    payload = coalesce(payload, '{}'::jsonb),
    visibility = coalesce(visibility, 'internal'),
    created_at = coalesce(created_at, now())
where actor_type is null
   or payload is null
   or visibility is null
   or created_at is null;
update public.comments
set entity_type = coalesce(entity_type, 'order'),
    is_edited = coalesce(is_edited, false),
    created_at = coalesce(created_at, now())
where entity_type is null
   or is_edited is null
   or created_at is null;
alter table public.activity_events
  alter column business_id set not null,
  alter column entity_type set not null,
  alter column entity_id set not null,
  alter column actor_type set not null,
  alter column actor_type set default 'user',
  alter column event_type set not null,
  alter column payload set not null,
  alter column payload set default '{}'::jsonb,
  alter column visibility set not null,
  alter column visibility set default 'internal',
  alter column created_at set not null,
  alter column created_at set default now();
alter table public.comments
  alter column business_id set not null,
  alter column entity_type set not null,
  alter column entity_type set default 'order',
  alter column entity_id set not null,
  alter column author_id set not null,
  alter column body set not null,
  alter column is_edited set not null,
  alter column is_edited set default false,
  alter column created_at set not null,
  alter column created_at set default now();
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'activity_events_actor_type_check'
  ) then
    alter table public.activity_events
      add constraint activity_events_actor_type_check check (actor_type in ('user', 'system'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'activity_events_visibility_check'
  ) then
    alter table public.activity_events
      add constraint activity_events_visibility_check check (visibility in ('internal', 'public'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'activity_events_entity_type_check'
  ) then
    alter table public.activity_events
      add constraint activity_events_entity_type_check check (btrim(entity_type) <> '');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'activity_events_event_type_check'
  ) then
    alter table public.activity_events
      add constraint activity_events_event_type_check check (event_type ~ '^[a-z0-9]+(\.[a-z0-9_]+)+$');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'activity_events_payload_object_check'
  ) then
    alter table public.activity_events
      add constraint activity_events_payload_object_check check (jsonb_typeof(payload) = 'object');
  end if;
end
$$;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'comments_entity_type_check'
  ) then
    alter table public.comments
      add constraint comments_entity_type_check check (btrim(entity_type) <> '');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'comments_body_not_blank_check'
  ) then
    alter table public.comments
      add constraint comments_body_not_blank_check check (deleted_at is not null or btrim(body) <> '');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'activity_events_business_id_fkey'
  ) then
    alter table public.activity_events
      add constraint activity_events_business_id_fkey foreign key (business_id) references public.businesses(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'activity_events_order_id_fkey'
  ) then
    alter table public.activity_events
      add constraint activity_events_order_id_fkey foreign key (order_id) references public.orders(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'activity_events_actor_id_fkey'
  ) then
    alter table public.activity_events
      add constraint activity_events_actor_id_fkey foreign key (actor_id) references public.profiles(id) on delete set null;
  end if;
end
$$;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'comments_business_id_fkey'
  ) then
    alter table public.comments
      add constraint comments_business_id_fkey foreign key (business_id) references public.businesses(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'comments_author_id_fkey'
  ) then
    alter table public.comments
      add constraint comments_author_id_fkey foreign key (author_id) references public.profiles(id) on delete restrict;
  end if;
end
$$;
create index if not exists activity_events_entity_timeline_idx
  on public.activity_events (entity_type, entity_id, created_at desc);
create index if not exists activity_events_business_created_idx
  on public.activity_events (business_id, created_at desc);
create index if not exists activity_events_order_created_idx
  on public.activity_events (order_id, created_at desc);
create index if not exists activity_events_event_type_idx
  on public.activity_events (event_type);
create index if not exists activity_events_correlation_idx
  on public.activity_events (correlation_id)
  where correlation_id is not null;
create index if not exists comments_entity_timeline_idx
  on public.comments (entity_type, entity_id, created_at desc);
create index if not exists comments_business_idx
  on public.comments (business_id);
create or replace function public.comments_apply_write_rules()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.business_id is distinct from old.business_id
     or new.entity_type is distinct from old.entity_type
     or new.entity_id is distinct from old.entity_id
     or new.author_id is distinct from old.author_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Comment ownership and target columns are immutable';
  end if;

  if old.deleted_at is not null then
    raise exception 'Deleted comments are immutable';
  end if;

  if new.deleted_at is not null and old.deleted_at is null then
    if new.body is distinct from old.body then
      raise exception 'Soft delete must not modify comment body';
    end if;

    new.is_edited := old.is_edited;
    new.edited_at := old.edited_at;
    return new;
  end if;

  if new.body is distinct from old.body then
    if btrim(new.body) = '' then
      raise exception 'Comment body cannot be blank';
    end if;

    new.is_edited := true;
    new.edited_at := now();
  else
    new.is_edited := old.is_edited;
    new.edited_at := old.edited_at;
  end if;

  return new;
end;
$$;
create or replace function public.comments_prevent_hard_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Comments must be soft-deleted by setting deleted_at';
end;
$$;
create or replace function public.comments_write_activity_event()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_event_type text;
  v_payload jsonb;
  v_order_id uuid;
  v_created_at timestamptz;
begin
  if tg_op = 'INSERT' then
    v_event_type := 'comment.created';
    v_payload := jsonb_build_object('comment_id', new.id);
    v_created_at := new.created_at;
  elsif old.deleted_at is null and new.deleted_at is not null then
    v_event_type := 'comment.deleted';
    v_payload := jsonb_build_object('comment_id', new.id);
    v_created_at := new.deleted_at;
  elsif new.body is distinct from old.body then
    v_event_type := 'comment.edited';
    v_payload := jsonb_build_object(
      'comment_id', new.id,
      'changes', jsonb_build_array(
        jsonb_build_object('field', 'body', 'from', old.body, 'to', new.body)
      )
    );
    v_created_at := coalesce(new.edited_at, now());
  else
    return new;
  end if;

  v_order_id := case when new.entity_type = 'order' then new.entity_id else null end;
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
    new.business_id,
    new.entity_type,
    new.entity_id,
    v_order_id,
    new.author_id,
    'user',
    v_event_type,
    v_payload,
    'internal',
    'comments_trigger',
    null,
    v_created_at
  );

  return new;
end;
$$;
create or replace function public.edit_comment(p_comment_id uuid, p_body text)
returns public.comments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comment public.comments;
begin
  if p_body is null or btrim(p_body) = '' then
    raise exception 'Comment body cannot be blank';
  end if;

  select *
  into v_comment
  from public.comments
  where id = p_comment_id;

  if not found then
    raise exception 'Comment not found';
  end if;

  if v_comment.deleted_at is not null then
    raise exception 'Deleted comments cannot be edited';
  end if;

  if v_comment.author_id <> auth.uid() then
    raise exception 'Only the author can edit this comment';
  end if;

  if not public.is_business_member(v_comment.business_id) then
    raise exception 'You do not belong to this business';
  end if;

  update public.comments
  set body = p_body
  where id = p_comment_id
  returning * into v_comment;

  return v_comment;
end;
$$;
grant execute on function public.edit_comment(uuid, text) to authenticated;
create or replace function public.soft_delete_comment(p_comment_id uuid)
returns public.comments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comment public.comments;
begin
  select *
  into v_comment
  from public.comments
  where id = p_comment_id;
  if not found then
    raise exception 'Comment not found';
  end if;

  if v_comment.deleted_at is not null then
    return v_comment;
  end if;

  if v_comment.author_id <> auth.uid() then
    raise exception 'Only the author can delete this comment';
  end if;

  if not public.is_business_member(v_comment.business_id) then
    raise exception 'You do not belong to this business';
  end if;

  update public.comments
  set deleted_at = now()
  where id = p_comment_id
  returning * into v_comment;

  return v_comment;
end;
$$;
grant execute on function public.soft_delete_comment(uuid) to authenticated;
drop trigger if exists comments_apply_write_rules_before_update on public.comments;
create trigger comments_apply_write_rules_before_update
before update on public.comments
for each row
execute function public.comments_apply_write_rules();
drop trigger if exists comments_prevent_hard_delete_before_delete on public.comments;
create trigger comments_prevent_hard_delete_before_delete
before delete on public.comments
for each row
execute function public.comments_prevent_hard_delete();
drop trigger if exists comments_write_activity_event_after_insert_or_update on public.comments;
create trigger comments_write_activity_event_after_insert_or_update
after insert or update of body, deleted_at on public.comments
for each row
execute function public.comments_write_activity_event();
alter table public.activity_events enable row level security;
alter table public.comments enable row level security;
revoke insert, update, delete on public.activity_events from anon, authenticated;
revoke delete on public.comments from anon, authenticated;
revoke update on public.comments from anon, authenticated;
drop policy if exists "activity_events_select_for_business_members" on public.activity_events;
create policy "activity_events_select_for_business_members"
on public.activity_events
for select
to authenticated
using (public.is_business_member(business_id));
drop policy if exists "comments_select_for_business_members" on public.comments;
create policy "comments_select_for_business_members"
on public.comments
for select
to authenticated
using (public.is_business_member(business_id));
drop policy if exists "comments_insert_for_business_members" on public.comments;
create policy "comments_insert_for_business_members"
on public.comments
for insert
to authenticated
with check (
  author_id = auth.uid()
  and public.is_business_member(business_id)
);
comment on table public.activity_events is 'Unified immutable CRM event stream. Use activity_events only for timeline rendering.';
comment on column public.activity_events.payload is 'Structured JSONB payload for auditability, analytics, and future AI analysis.';
insert into storage.buckets (id, name, public, file_size_limit)
values ('activity-attachments', 'activity-attachments', false, 20971520)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;
