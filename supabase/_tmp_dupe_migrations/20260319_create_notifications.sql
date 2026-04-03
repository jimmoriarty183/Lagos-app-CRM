-- ============================================================
-- Notifications Table (Linear-style Inbox)
-- ============================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid null references auth.users(id) on delete set null,
  type text not null,
  entity_type text not null,
  entity_id uuid not null,
  order_id uuid null references public.orders(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  read_at timestamptz null,
  created_at timestamptz not null default now()
);

-- Add constraints
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'notifications_type_check'
  ) then
    alter table public.notifications
      add constraint notifications_type_check
      check (type in (
        'mention_received',
        'order_assigned',
        'order_reassigned',
        'important_comment_received',
        'invitation_received'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'notifications_entity_type_check'
  ) then
    alter table public.notifications
      add constraint notifications_entity_type_check
      check (entity_type in ('order', 'comment', 'invitation'));
  end if;
end
$$;

-- Add indexes for performance
create index if not exists notifications_recipient_user_id_idx
  on public.notifications (recipient_user_id);

create index if not exists notifications_is_read_idx
  on public.notifications (is_read);

create index if not exists notifications_created_at_idx
  on public.notifications (created_at desc);

create index if not exists notifications_recipient_unread_idx
  on public.notifications (recipient_user_id, created_at desc)
  where is_read = false;

create index if not exists notifications_order_id_idx
  on public.notifications (order_id)
  where order_id is not null;

-- Add RLS policies
alter table public.notifications enable row level security;

revoke insert, update, delete on public.notifications from anon, authenticated;

drop policy if exists "notifications_select_own_records" on public.notifications;
create policy "notifications_select_own_records"
on public.notifications
for select
to authenticated
using (recipient_user_id = auth.uid());

drop policy if exists "notifications_insert_for_system" on public.notifications;
create policy "notifications_insert_for_system"
on public.notifications
for insert
to authenticated
with check (
  recipient_user_id = auth.uid()
  or exists (
    select 1 from public.workspace_members wm
    where wm.user_id = auth.uid()
    and wm.workspace_id = workspace_id
    and wm.role in ('OWNER', 'MANAGER')
  )
);

drop policy if exists "notifications_update_own_records" on public.notifications;
create policy "notifications_update_own_records"
on public.notifications
for update
to authenticated
using (recipient_user_id = auth.uid())
with check (recipient_user_id = auth.uid());

-- ============================================================
-- Helper function to create notification
-- ============================================================

create or replace function public.create_notification(
  p_workspace_id uuid,
  p_recipient_user_id uuid,
  p_actor_user_id uuid,
  p_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_order_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification_id uuid;
begin
  -- Prevent duplicate notifications for the same event
  if exists (
    select 1 from public.notifications n
    where n.recipient_user_id = p_recipient_user_id
    and n.type = p_type
    and n.entity_id = p_entity_id
    and n.created_at > now() - interval '5 seconds'
  ) then
    return null;
  end if;

  insert into public.notifications (
    workspace_id,
    recipient_user_id,
    actor_user_id,
    type,
    entity_type,
    entity_id,
    order_id,
    metadata
  )
  values (
    p_workspace_id,
    p_recipient_user_id,
    p_actor_user_id,
    p_type,
    p_entity_type,
    p_entity_id,
    p_order_id,
    p_metadata
  )
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

grant execute on function public.create_notification to authenticated;

-- ============================================================
-- Helper: Get user ID from phone number (for order_comments compatibility)
-- ============================================================

create or replace function public.get_user_id_from_phone(p_phone text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select id
  from auth.users
  where phone = p_phone
  limit 1;
$$;

-- ============================================================
-- Trigger: Create notification on mention in order_comments
-- ============================================================

create or replace function public.notifications_on_order_comment_mention()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mentioned_user_id uuid;
  v_order_id uuid;
  v_workspace_id uuid;
  v_order_number text;
  v_author_id uuid;
  v_mentioned_ids uuid[];
  v_body text;
begin
  -- Only process new comments
  if tg_op <> 'INSERT' then
    return new;
  end if;

  -- Get order info
  v_order_id := new.order_id;
  
  select o.workspace_id, o.order_number::text
  into v_workspace_id, v_order_number
  from public.orders o
  where o.id = v_order_id;
  
  if not found then
    return new;
  end if;

  -- Get author ID from phone
  v_author_id := public.get_user_id_from_phone(new.author_phone);
  
  -- Skip if author is mentioning themselves
  if v_author_id = auth.uid() then
    return new;
  end if;

  v_body := new.body;

  -- Parse mentions from comment body
  -- Format: @[user-id] (UUID format)
  select array_agg(distinct u.id)
  into v_mentioned_ids
  from unnest(regexp_matches(v_body, '@\[([a-f0-9-]{36})\]', 'g')) as match(user_id)
  join auth.users u on u.id::text = match.user_id
  where u.id != v_author_id;

  -- Create notifications for each mentioned user
  if v_mentioned_ids is not null and array_length(v_mentioned_ids, 1) > 0 then
    for i in array_lower(v_mentioned_ids, 1)..array_upper(v_mentioned_ids, 1)
    loop
      v_mentioned_user_id := v_mentioned_ids[i];
      
      -- Skip if mentioned user is the author
      if v_mentioned_user_id = v_author_id then
        continue;
      end if;

      -- Check if mentioned user has access to this workspace
      if exists (
        select 1 from public.workspace_members wm
        where wm.workspace_id = v_workspace_id
        and wm.user_id = v_mentioned_user_id
      ) then
        perform public.create_notification(
          v_workspace_id,
          v_mentioned_user_id,
          v_author_id,
          'mention_received',
          'comment',
          new.id,
          v_order_id,
          jsonb_build_object(
            'comment_id', new.id,
            'order_id', v_order_id,
            'order_number', v_order_number,
            'comment_body', left(v_body, 200),
            'author_id', v_author_id,
            'author_phone', new.author_phone
          )
        );
      end if;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists notifications_on_order_comment_mention on public.order_comments;
create trigger notifications_on_order_comment_mention
after insert on public.order_comments
for each row
execute function public.notifications_on_order_comment_mention();

-- ============================================================
-- Trigger: Create notification on order assignment
-- ============================================================

create or replace function public.notifications_on_order_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_number text;
  v_actor_id uuid;
begin
  -- Skip if no manager assigned
  if new.manager_id is null then
    return new;
  end if;

  -- Skip if manager is the same as before
  if old.manager_id = new.manager_id then
    return new;
  end if;

  -- Skip if the manager is assigning to themselves
  if new.manager_id = auth.uid() then
    return new;
  end if;

  -- Get order details
  select order_number::text
  into v_order_number
  from public.orders
  where id = new.id;

  -- Determine actor (who made the assignment)
  v_actor_id := coalesce(auth.uid(), new.manager_id);

  -- Determine notification type
  if old.manager_id is null then
    -- First assignment
    perform public.create_notification(
      new.workspace_id,
      new.manager_id,
      v_actor_id,
      'order_assigned',
      'order',
      new.id,
      new.id,
      jsonb_build_object(
        'order_number', v_order_number,
        'previous_manager_id', old.manager_id,
        'assigned_by', v_actor_id
      )
    );
  elsif old.manager_id is distinct from new.manager_id then
    -- Reassignment
    perform public.create_notification(
      new.workspace_id,
      new.manager_id,
      v_actor_id,
      'order_reassigned',
      'order',
      new.id,
      new.id,
      jsonb_build_object(
        'order_number', v_order_number,
        'previous_manager_id', old.manager_id,
        'assigned_by', v_actor_id
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists notifications_on_order_assignment on public.orders;
create trigger notifications_on_order_assignment
after update on public.orders
for each row
when (
  old.manager_id is distinct from new.manager_id
  and new.manager_id is not null
)
execute function public.notifications_on_order_assignment();

-- ============================================================
-- Trigger: Create notification on important comment (order_comments)
-- ============================================================

create or replace function public.notifications_on_order_comment_important()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_author_id uuid;
  v_actor_role text;
  v_is_owner boolean;
  v_is_manager boolean;
begin
  -- Only process new comments
  if tg_op <> 'INSERT' then
    return new;
  end if;

  -- Get order details
  select *
  into v_order
  from public.orders
  where id = new.order_id;

  if not found then
    return new;
  end if;

  -- Get author ID from phone
  v_author_id := public.get_user_id_from_phone(new.author_phone);

  -- Skip if author is commenting on their own order
  if v_author_id = auth.uid() then
    return new;
  end if;

  -- Check if comment author is owner or manager of the workspace
  if v_author_id is not null then
    select wm.role
    into v_actor_role
    from public.workspace_members wm
    where wm.workspace_id = v_order.workspace_id
    and wm.user_id = v_author_id;
  end if;

  if not found then
    -- If we can't find the author's role, use the role from the comment
    v_actor_role := coalesce(nullif(btrim(new.author_role), ''), 'GUEST');
  end if;

  v_is_owner := v_actor_role = 'OWNER';
  v_is_manager := v_actor_role = 'MANAGER';

  -- Notify order manager if:
  -- 1. Comment is from owner/admin, OR
  -- 2. Comment is from a manager, OR
  -- 3. Order manager exists and is different from author
  if v_order.manager_id is not null
     and v_order.manager_id != v_author_id
     and (v_is_owner or v_is_manager)
  then
    perform public.create_notification(
      v_order.workspace_id,
      v_order.manager_id,
      v_author_id,
      'important_comment_received',
      'comment',
      new.id,
      v_order.id,
      jsonb_build_object(
        'comment_id', new.id,
        'order_id', v_order.id,
        'order_number', v_order.order_number::text,
        'comment_body', left(new.body, 200),
        'author_id', v_author_id,
        'author_role', new.author_role,
        'author_phone', new.author_phone
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists notifications_on_order_comment_important on public.order_comments;
create trigger notifications_on_order_comment_important
after insert on public.order_comments
for each row
execute function public.notifications_on_order_comment_important();

-- ============================================================
-- Trigger: Create notification on invitation
-- ============================================================

create or replace function public.notifications_on_invitation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invited_user_id uuid;
  v_workspace_id uuid;
begin
  -- Only process new pending invitations
  if tg_op <> 'INSERT' or new.status <> 'PENDING' then
    return new;
  end if;

  -- Get user ID from email
  select id
  into v_invited_user_id
  from auth.users
  where email = new.email;

  if not found then
    return new;
  end if;

  -- Get workspace ID
  v_workspace_id := coalesce(new.workspace_id, new.business_id);

  if v_workspace_id is null then
    return new;
  end if;

  perform public.create_notification(
    v_workspace_id,
    v_invited_user_id,
    coalesce(new.invited_by, new.created_by),
    'invitation_received',
    'invitation',
    new.id,
    null,
    jsonb_build_object(
      'invite_id', new.id,
      'business_id', coalesce(new.business_id, v_workspace_id),
      'role', new.role,
      'invited_by', new.invited_by
    )
  );

  return new;
end;
$$;

drop trigger if exists notifications_on_invitation on public.business_invites;
create trigger notifications_on_invitation
after insert on public.business_invites
for each row
execute function public.notifications_on_invitation();

-- ============================================================
-- Comments: Support for mention syntax
-- ============================================================

-- Add a column to store parsed mentions if needed
alter table public.comments
add column if not exists mentioned_user_ids uuid[] default '{}';

comment on table public.notifications is
  'Linear-style high-signal inbox notifications. External signals that need user attention.';

comment on column public.notifications.type is
  'Notification type: mention_received, order_assigned, order_reassigned, important_comment_received, invitation_received';

comment on column public.notifications.metadata is
  'Structured JSON payload with notification-specific context';
