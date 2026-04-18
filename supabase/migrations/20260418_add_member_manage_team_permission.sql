-- Phase 3: Per-member permission flag `can_manage_team`.
--
-- Allows promoting a MANAGER so they can invite/remove team members
-- without giving them OWNER privileges (billing, business creation, etc).
--
-- Additive: default false → existing behaviour unchanged (only OWNER manages team).
-- Idempotent & safe to rerun.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'memberships'
      and column_name = 'can_manage_team'
  ) then
    alter table public.memberships
      add column can_manage_team boolean not null default false;
  end if;
end
$$;

-- Helper: can a user manage team (invite/remove) within an account?
-- Returns true if the user is OWNER in any business of the account,
-- OR MANAGER with can_manage_team=true in any business of the account.
create or replace function public.user_can_manage_team(
  p_user_id uuid,
  p_account_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    join public.businesses b on b.id = m.business_id
    where m.user_id = p_user_id
      and b.account_id = p_account_id
      and (
        upper(coalesce(m.role, '')) = 'OWNER'
        or (
          upper(coalesce(m.role, '')) = 'MANAGER'
          and coalesce(m.can_manage_team, false) = true
        )
      )
  );
$$;

grant execute on function public.user_can_manage_team(uuid, uuid) to anon, authenticated, service_role;
