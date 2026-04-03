-- Add due_at timestamptz column to follow_ups for precise time support
-- This allows follow-ups to appear in timed calendar slots
-- Backward compatible: existing follow-ups without time remain all-day

-- Add the new nullable column
alter table public.follow_ups
  add column if not exists due_at timestamptz null;
-- Add index for efficient calendar queries
create index if not exists follow_ups_due_at_idx
  on public.follow_ups (due_at)
  where due_at is not null;
-- Update the apply_defaults trigger to handle due_at
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
comment on column public.follow_ups.due_at is
  'Optional precise due date/time for timed calendar events. When null, due_date is used for all-day events.';
