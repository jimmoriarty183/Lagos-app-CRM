create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  workspace_id uuid null,
  order_id uuid null references public.orders(id) on delete set null,
  title text not null,
  due_date date not null,
  status text not null default 'open',
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null references public.profiles(id) on delete set null,
  note text null,
  source text null default 'manual'
);

alter table public.follow_ups
  add column if not exists business_id uuid,
  add column if not exists workspace_id uuid,
  add column if not exists order_id uuid,
  add column if not exists title text,
  add column if not exists due_date date,
  add column if not exists status text,
  add column if not exists completed_at timestamptz,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz,
  add column if not exists created_by uuid,
  add column if not exists note text,
  add column if not exists source text;

update public.follow_ups
set
  workspace_id = coalesce(workspace_id, business_id),
  status = coalesce(nullif(btrim(status), ''), 'open'),
  source = coalesce(nullif(btrim(source), ''), 'manual'),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now())
where workspace_id is null
   or status is null
   or source is null
   or created_at is null
   or updated_at is null;

alter table public.follow_ups
  alter column business_id set not null,
  alter column due_date set not null,
  alter column title set not null,
  alter column status set not null,
  alter column status set default 'open',
  alter column created_at set not null,
  alter column created_at set default now(),
  alter column updated_at set not null,
  alter column updated_at set default now(),
  alter column source set default 'manual';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'follow_ups_status_check'
  ) then
    alter table public.follow_ups
      add constraint follow_ups_status_check
      check (status in ('open', 'done', 'cancelled'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'follow_ups_title_check'
  ) then
    alter table public.follow_ups
      add constraint follow_ups_title_check
      check (btrim(title) <> '');
  end if;
end
$$;

create index if not exists follow_ups_business_due_status_idx
  on public.follow_ups (business_id, status, due_date);

create index if not exists follow_ups_order_status_due_idx
  on public.follow_ups (order_id, status, due_date)
  where order_id is not null;

create index if not exists follow_ups_workspace_due_idx
  on public.follow_ups (workspace_id, due_date desc)
  where workspace_id is not null;

create or replace function public.follow_ups_apply_defaults()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.title := btrim(coalesce(new.title, ''));
  new.workspace_id := coalesce(new.workspace_id, new.business_id);
  new.status := lower(coalesce(nullif(btrim(new.status), ''), 'open'));
  new.source := coalesce(nullif(btrim(new.source), ''), 'manual');
  new.updated_at := now();

  if tg_op = 'INSERT' then
    if new.created_by is null then
      new.created_by := auth.uid();
    end if;
    if new.created_at is null then
      new.created_at := now();
    end if;
  end if;

  if new.status = 'done' then
    new.completed_at := coalesce(new.completed_at, now());
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists follow_ups_apply_defaults_before_write on public.follow_ups;
create trigger follow_ups_apply_defaults_before_write
before insert or update on public.follow_ups
for each row
execute function public.follow_ups_apply_defaults();

alter table public.follow_ups enable row level security;

revoke insert, update, delete on public.follow_ups from anon, authenticated;

drop policy if exists "follow_ups_select_for_business_members" on public.follow_ups;
create policy "follow_ups_select_for_business_members"
on public.follow_ups
for select
to authenticated
using (public.is_business_member(business_id));

comment on table public.follow_ups is
  'Future planned actions for Ordo CRM. Separate from notes, activity, and order checklist.';

