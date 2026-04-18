-- Phase 4: Account-scoped invites with multi-business access.
--
-- New model:
--   * Invites live at the account level (not per-business).
--   * One invite can grant access to several businesses of that account.
--   * If the invited email is already a team member (has membership in ANY
--     business of the account), we skip the invite flow and just create the
--     additional memberships directly.
--   * Seats = unique emails across all businesses of the account.
--
-- Legacy `business_invites` table is kept intact for backward compatibility.
-- Idempotent & safe to rerun.

-- 1. Tables
create table if not exists public.account_invites (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  email text not null,
  token text not null default encode(gen_random_bytes(32), 'hex'),
  status public.invite_status not null default 'pending',
  can_manage_team boolean not null default false,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '14 days'),
  constraint account_invites_email_not_empty check (length(trim(email)) > 0),
  constraint account_invites_token_unique unique (token)
);

-- One pending invite per (account, email) — partial unique index.
create unique index if not exists uq_account_invites_pending_per_email
  on public.account_invites (account_id, lower(trim(email)))
  where status = 'pending';

create index if not exists idx_account_invites_account
  on public.account_invites (account_id);

create index if not exists idx_account_invites_email_lower
  on public.account_invites (lower(trim(email)));

create index if not exists idx_account_invites_status
  on public.account_invites (status);

create table if not exists public.account_invite_business_access (
  invite_id uuid not null references public.account_invites(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (invite_id, business_id)
);

create index if not exists idx_account_invite_access_business
  on public.account_invite_business_access (business_id);

-- 2. Trigger to keep updated_at fresh.
create or replace function public.account_invites_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_account_invites_touch_updated_at on public.account_invites;
create trigger trg_account_invites_touch_updated_at
  before update on public.account_invites
  for each row execute function public.account_invites_touch_updated_at();

-- 3. RLS
alter table public.account_invites enable row level security;
alter table public.account_invite_business_access enable row level security;

-- Readable by: account owner/manager (via user_can_manage_team) OR by the invitee (by email).
drop policy if exists account_invites_select on public.account_invites;
create policy account_invites_select on public.account_invites
  for select
  to authenticated
  using (
    public.user_can_manage_team(auth.uid(), account_id)
    or lower(trim(email)) = lower(trim(coalesce((auth.jwt() ->> 'email')::text, '')))
  );

-- No direct INSERT/UPDATE/DELETE from clients — only through SECURITY DEFINER RPCs.
drop policy if exists account_invites_deny_writes on public.account_invites;
create policy account_invites_deny_writes on public.account_invites
  for all
  to authenticated
  using (false)
  with check (false);

drop policy if exists account_invite_access_select on public.account_invite_business_access;
create policy account_invite_access_select on public.account_invite_business_access
  for select
  to authenticated
  using (
    exists (
      select 1 from public.account_invites i
      where i.id = invite_id
        and (
          public.user_can_manage_team(auth.uid(), i.account_id)
          or lower(trim(i.email)) = lower(trim(coalesce((auth.jwt() ->> 'email')::text, '')))
        )
    )
  );

drop policy if exists account_invite_access_deny_writes on public.account_invite_business_access;
create policy account_invite_access_deny_writes on public.account_invite_business_access
  for all
  to authenticated
  using (false)
  with check (false);

-- 4. RPC: create or update account invite (with seat guard + smart reuse).
create or replace function public.create_or_update_account_invite(
  p_actor_user_id uuid,
  p_account_id uuid,
  p_email text,
  p_business_ids uuid[],
  p_can_manage_team boolean default false
)
returns table(
  ok boolean,
  invite_id uuid,
  token text,
  action text,
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
  v_email_norm text;
  v_existing_user_id uuid;
  v_current_seats integer := 0;
  v_seat_limit integer;
  v_biz_count integer := 0;
  v_valid_biz_count integer := 0;
  v_existing_invite_id uuid;
  v_existing_token text;
  v_invite_id uuid;
  v_token text;
  v_memberships_added integer := 0;
  v_business_access_added integer := 0;
begin
  -- Validation
  if p_account_id is null then
    return query select false, null::uuid, null::text, null::text,
      'VALIDATION_ERROR'::text, 'account_id is required'::text, null::integer, null::integer;
    return;
  end if;

  v_email_norm := lower(trim(coalesce(p_email, '')));
  if v_email_norm = '' or position('@' in v_email_norm) = 0 then
    return query select false, null::uuid, null::text, null::text,
      'VALIDATION_ERROR'::text, 'valid email is required'::text, null::integer, null::integer;
    return;
  end if;

  v_biz_count := coalesce(array_length(p_business_ids, 1), 0);
  if v_biz_count = 0 then
    return query select false, null::uuid, null::text, null::text,
      'VALIDATION_ERROR'::text, 'at least one business must be selected'::text, null::integer, null::integer;
    return;
  end if;

  -- Permission: actor must be able to manage team.
  if not public.user_can_manage_team(p_actor_user_id, p_account_id) then
    return query select false, null::uuid, null::text, null::text,
      'FORBIDDEN'::text, 'actor cannot manage team for this account'::text, null::integer, null::integer;
    return;
  end if;

  -- All requested businesses must belong to this account (isolation).
  select count(*) into v_valid_biz_count
  from public.businesses
  where id = any(p_business_ids) and account_id = p_account_id;

  if v_valid_biz_count <> v_biz_count then
    return query select false, null::uuid, null::text, null::text,
      'VALIDATION_ERROR'::text, 'one or more businesses do not belong to this account'::text, null::integer, null::integer;
    return;
  end if;

  -- Serialize per-account to avoid race conditions on seat limit.
  perform pg_advisory_xact_lock(hashtextextended(p_account_id::text, 42));

  -- Current seat usage + limit.
  v_current_seats := public.count_account_seats(p_account_id);
  v_seat_limit := public.resolve_account_int_limit(p_account_id, 'max_members_per_account');

  -- Does the email already belong to an active team member of this account?
  select m.user_id into v_existing_user_id
  from public.memberships m
  join public.businesses b on b.id = m.business_id
  join auth.users u on u.id = m.user_id
  where b.account_id = p_account_id
    and lower(trim(u.email)) = v_email_norm
  limit 1;

  -- Is there already a pending invite for this email?
  select i.id, i.token into v_existing_invite_id, v_existing_token
  from public.account_invites i
  where i.account_id = p_account_id
    and lower(trim(i.email)) = v_email_norm
    and i.status = 'pending'
  limit 1;

  -- Case A: email is already a team member → add memberships directly.
  if v_existing_user_id is not null then
    insert into public.memberships (business_id, user_id, role, can_manage_team)
    select b_id, v_existing_user_id, 'MANAGER', p_can_manage_team
    from unnest(p_business_ids) as b_id
    on conflict (business_id, user_id) do update
      set can_manage_team = excluded.can_manage_team,
          updated_at = now();

    get diagnostics v_memberships_added = row_count;

    return query select true, null::uuid, null::text, 'added_memberships'::text,
      null::text, null::text, v_current_seats, v_seat_limit;
    return;
  end if;

  -- Case B: pending invite exists → update business access list + flags.
  if v_existing_invite_id is not null then
    update public.account_invites
    set can_manage_team = p_can_manage_team,
        invited_by = coalesce(p_actor_user_id, invited_by),
        expires_at = greatest(expires_at, now() + interval '14 days')
    where id = v_existing_invite_id;

    insert into public.account_invite_business_access (invite_id, business_id)
    select v_existing_invite_id, b_id
    from unnest(p_business_ids) as b_id
    on conflict (invite_id, business_id) do nothing;

    get diagnostics v_business_access_added = row_count;

    return query select true, v_existing_invite_id, v_existing_token, 'updated_invite'::text,
      null::text, null::text, v_current_seats, v_seat_limit;
    return;
  end if;

  -- Case C: brand new invitee → seat limit check.
  if v_seat_limit is not null and v_current_seats + 1 > v_seat_limit then
    return query select false, null::uuid, null::text, null::text,
      'SEAT_LIMIT_REACHED'::text,
      'You have reached the maximum number of team members for your plan'::text,
      v_current_seats, v_seat_limit;
    return;
  end if;

  -- Create invite + business access rows.
  insert into public.account_invites (account_id, email, can_manage_team, invited_by)
  values (p_account_id, v_email_norm, p_can_manage_team, p_actor_user_id)
  returning id, token into v_invite_id, v_token;

  insert into public.account_invite_business_access (invite_id, business_id)
  select v_invite_id, b_id from unnest(p_business_ids) as b_id;

  return query select true, v_invite_id, v_token, 'invited'::text,
    null::text, null::text, v_current_seats + 1, v_seat_limit;
end;
$$;

-- 5. RPC: accept an account invite (called by the invitee).
create or replace function public.accept_account_invite(
  p_acceptor_user_id uuid,
  p_token text
)
returns table(
  ok boolean,
  account_id uuid,
  businesses_added integer,
  error_code text,
  error_message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.account_invites;
  v_acceptor_email text;
  v_count integer := 0;
begin
  if p_acceptor_user_id is null or p_token is null or length(trim(p_token)) = 0 then
    return query select false, null::uuid, 0,
      'VALIDATION_ERROR'::text, 'acceptor and token are required'::text;
    return;
  end if;

  select * into v_invite
  from public.account_invites
  where token = p_token
  limit 1;

  if not found then
    return query select false, null::uuid, 0,
      'INVITE_NOT_FOUND'::text, 'invite not found'::text;
    return;
  end if;

  if v_invite.status <> 'pending' then
    return query select false, v_invite.account_id, 0,
      'INVITE_NOT_PENDING'::text, 'invite is ' || v_invite.status::text;
    return;
  end if;

  if v_invite.expires_at < now() then
    update public.account_invites set status = 'expired' where id = v_invite.id;
    return query select false, v_invite.account_id, 0,
      'INVITE_EXPIRED'::text, 'invite has expired'::text;
    return;
  end if;

  -- Email must match the acceptor's auth.users email (case-insensitive).
  select lower(trim(email)) into v_acceptor_email
  from auth.users where id = p_acceptor_user_id limit 1;

  if v_acceptor_email is null or v_acceptor_email <> lower(trim(v_invite.email)) then
    return query select false, v_invite.account_id, 0,
      'EMAIL_MISMATCH'::text, 'acceptor email does not match the invite'::text;
    return;
  end if;

  -- Create memberships for every business listed on the invite.
  insert into public.memberships (business_id, user_id, role, can_manage_team)
  select a.business_id, p_acceptor_user_id, 'MANAGER', v_invite.can_manage_team
  from public.account_invite_business_access a
  where a.invite_id = v_invite.id
  on conflict (business_id, user_id) do update
    set can_manage_team = excluded.can_manage_team,
        updated_at = now();

  get diagnostics v_count = row_count;

  update public.account_invites
  set status = 'accepted',
      accepted_at = now(),
      accepted_by = p_acceptor_user_id
  where id = v_invite.id;

  return query select true, v_invite.account_id, v_count,
    null::text, null::text;
end;
$$;

-- 6. RPC: revoke a pending invite.
create or replace function public.revoke_account_invite(
  p_actor_user_id uuid,
  p_invite_id uuid
)
returns table(
  ok boolean,
  error_code text,
  error_message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_status public.invite_status;
begin
  if p_actor_user_id is null or p_invite_id is null then
    return query select false, 'VALIDATION_ERROR'::text, 'actor and invite_id are required'::text;
    return;
  end if;

  select account_id, status into v_account_id, v_status
  from public.account_invites where id = p_invite_id;

  if not found then
    return query select false, 'INVITE_NOT_FOUND'::text, 'invite not found'::text;
    return;
  end if;

  if not public.user_can_manage_team(p_actor_user_id, v_account_id) then
    return query select false, 'FORBIDDEN'::text, 'actor cannot manage team'::text;
    return;
  end if;

  if v_status <> 'pending' then
    return query select false, 'INVITE_NOT_PENDING'::text, 'invite is ' || v_status::text;
    return;
  end if;

  update public.account_invites
  set status = 'revoked',
      revoked_at = now(),
      revoked_by = p_actor_user_id
  where id = p_invite_id;

  return query select true, null::text, null::text;
end;
$$;

-- 7. Permissions
grant execute on function public.create_or_update_account_invite(uuid, uuid, text, uuid[], boolean)
  to anon, authenticated, service_role;
grant execute on function public.accept_account_invite(uuid, text)
  to anon, authenticated, service_role;
grant execute on function public.revoke_account_invite(uuid, uuid)
  to anon, authenticated, service_role;
