-- Hotfix: some legacy notification triggers can emit NULL actor_id during
-- server-side reassignment flows, which currently aborts order updates.
-- Make actor_id nullable to prevent transactional failures.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notifications'
      and column_name = 'actor_id'
  ) then
    execute 'alter table public.notifications alter column actor_id drop not null';
  end if;
end $$;

