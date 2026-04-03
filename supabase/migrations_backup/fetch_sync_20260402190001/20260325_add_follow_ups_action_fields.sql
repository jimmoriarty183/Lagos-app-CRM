alter table public.follow_ups
  add column if not exists action_type text null,
  add column if not exists action_payload jsonb null default '{}'::jsonb;
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'follow_ups_action_type_check'
  ) then
    alter table public.follow_ups
      add constraint follow_ups_action_type_check
      check (
        action_type is null
        or action_type in ('meeting', 'reminder', 'task', 'message', 'manual')
      );
  end if;
end
$$;
create index if not exists idx_follow_ups_action_type
  on public.follow_ups (action_type)
  where action_type is not null;
comment on column public.follow_ups.action_type is
  'Structured quick action type for analytics and activity: meeting|reminder|task|message|manual.';
comment on column public.follow_ups.action_payload is
  'Structured JSON payload for quick action metadata (duration, recipient, subject, etc.).';
update public.follow_ups
set action_type = case
  when title ilike 'Meeting:%' then 'meeting'
  when title ilike 'Reminder:%' then 'reminder'
  when title ilike 'Message:%' then 'message'
  when source = 'order' and btrim(coalesce(title, '')) <> '' then 'task'
  when btrim(coalesce(title, '')) <> '' then 'manual'
  else null
end
where action_type is null;
update public.follow_ups
set action_payload = '{}'::jsonb
where action_payload is null;
