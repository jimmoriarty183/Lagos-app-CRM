create table if not exists public.work_days (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  workspace_id uuid null,
  user_id uuid not null references auth.users(id) on delete cascade,
  work_date date not null,
  status text not null default 'draft',
  started_at timestamptz null,
  paused_at timestamptz null,
  resumed_at timestamptz null,
  finished_at timestamptz null,
  total_pause_seconds integer not null default 0,
  daily_summary text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.work_days
  add column if not exists business_id uuid,
  add column if not exists workspace_id uuid,
  add column if not exists user_id uuid,
  add column if not exists work_date date,
  add column if not exists status text,
  add column if not exists started_at timestamptz,
  add column if not exists paused_at timestamptz,
  add column if not exists resumed_at timestamptz,
  add column if not exists finished_at timestamptz,
  add column if not exists total_pause_seconds integer,
  add column if not exists daily_summary text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;
update public.work_days
set
  workspace_id = coalesce(workspace_id, business_id),
  status = coalesce(nullif(btrim(status), ''), 'draft'),
  total_pause_seconds = coalesce(total_pause_seconds, 0),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now())
where workspace_id is null
   or status is null
   or total_pause_seconds is null
   or created_at is null
   or updated_at is null;

alter table public.work_days
  alter column business_id set not null,
  alter column user_id set not null,
  alter column work_date set not null,
  alter column status set not null,
  alter column status set default 'draft',
  alter column total_pause_seconds set not null,
  alter column total_pause_seconds set default 0,
  alter column created_at set not null,
  alter column created_at set default now(),
  alter column updated_at set not null,
  alter column updated_at set default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'work_days_status_check'
  ) then
    alter table public.work_days
      add constraint work_days_status_check
      check (status in ('draft', 'running', 'paused', 'finished'));
  end if;
end
$$;
alter table public.work_days enable row level security;

revoke insert, update, delete on public.work_days from anon, authenticated;

drop policy if exists "work_days_select_own_records" on public.work_days;
create policy "work_days_select_own_records"
on public.work_days
for select
to authenticated
using (
  public.is_business_member(business_id)
  and user_id = auth.uid()
);

comment on table public.work_days is
  'Foundation table for Ordo daily work tracking. Keeps one per-user per-day record without mixing with follow-ups.';

create unique index if not exists work_days_business_user_date_idx
  on public.work_days (business_id, user_id, work_date);

create index if not exists work_days_user_status_idx
  on public.work_days (user_id, status, work_date desc);

create or replace function public.work_days_apply_defaults()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.workspace_id := coalesce(new.workspace_id, new.business_id);
  new.status := lower(coalesce(nullif(btrim(new.status), ''), 'draft'));
  new.total_pause_seconds := coalesce(new.total_pause_seconds, 0);
  new.updated_at := now();

  if tg_op = 'INSERT' and new.created_at is null then
    new.created_at := now();
  end if;

  if new.status = 'finished' and new.finished_at is null then
    new.finished_at := now();
  end if;

  if new.status <> 'paused' then
    new.paused_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists work_days_apply_defaults_before_write on public.work_days;
create trigger work_days_apply_defaults_before_write
before insert or update on public.work_days
for each row
execute function public.work_days_apply_defaults();
