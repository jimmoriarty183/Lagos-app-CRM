-- Security / RLS hardening migration
-- Goals:
-- 1) Keep least-privilege access for authenticated users.
-- 2) Close direct client access for server-only tables.
-- 3) Avoid destructive changes and keep migration idempotent.

-- ---------------------------------------------------------------------------
-- A) Membership helper function check
-- ---------------------------------------------------------------------------
-- public.is_business_member(uuid) already exists and is used by existing RLS.
-- Keeping signature/logic intact for backward compatibility.

-- ---------------------------------------------------------------------------
-- B) Core business tables RLS + minimal policies
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.memberships') is not null then
    execute 'alter table public.memberships enable row level security';
  end if;
end
$$;

do $$
begin
  if to_regclass('public.memberships') is not null
     and not exists (
       select 1 from pg_policies
       where schemaname = 'public'
         and tablename = 'memberships'
         and policyname = 'memberships_select_for_business_members'
     ) then
    execute $sql$
      create policy "memberships_select_for_business_members"
      on public.memberships
      for select
      to authenticated
      using (public.is_business_member(business_id))
    $sql$;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.businesses') is not null then
    execute 'alter table public.businesses enable row level security';
  end if;
end
$$;

do $$
begin
  if to_regclass('public.businesses') is not null
     and not exists (
       select 1 from pg_policies
       where schemaname = 'public'
         and tablename = 'businesses'
         and policyname = 'businesses_select_for_members'
     ) then
    execute $sql$
      create policy "businesses_select_for_members"
      on public.businesses
      for select
      to authenticated
      using (public.is_business_member(id))
    $sql$;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.orders') is not null then
    execute 'alter table public.orders enable row level security';
  end if;
end
$$;

do $$
begin
  if to_regclass('public.orders') is not null
     and not exists (
       select 1 from pg_policies
       where schemaname = 'public'
         and tablename = 'orders'
         and policyname = 'orders_select_for_business_members'
     ) then
    execute $sql$
      create policy "orders_select_for_business_members"
      on public.orders
      for select
      to authenticated
      using (public.is_business_member(business_id))
    $sql$;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.orders') is not null
     and not exists (
       select 1 from pg_policies
       where schemaname = 'public'
         and tablename = 'orders'
         and policyname = 'orders_delete_for_business_owners'
     ) then
    execute $sql$
      create policy "orders_delete_for_business_owners"
      on public.orders
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.memberships m
          where m.business_id = orders.business_id
            and m.user_id = auth.uid()
            and upper(coalesce(m.role, '')) = 'OWNER'
        )
      )
    $sql$;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.follow_ups') is not null then
    execute 'alter table public.follow_ups enable row level security';
  end if;
end
$$;

do $$
begin
  if to_regclass('public.follow_ups') is not null
     and not exists (
       select 1 from pg_policies
       where schemaname = 'public'
         and tablename = 'follow_ups'
         and policyname = 'follow_ups_select_for_business_members'
     ) then
    execute $sql$
      create policy "follow_ups_select_for_business_members"
      on public.follow_ups
      for select
      to authenticated
      using (public.is_business_member(business_id))
    $sql$;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.business_statuses') is not null then
    execute 'alter table public.business_statuses enable row level security';
  end if;
end
$$;

do $$
begin
  if to_regclass('public.business_statuses') is not null
     and not exists (
       select 1 from pg_policies
       where schemaname = 'public'
         and tablename = 'business_statuses'
         and policyname = 'business_statuses_select_for_business_members'
     ) then
    execute $sql$
      create policy "business_statuses_select_for_business_members"
      on public.business_statuses
      for select
      to authenticated
      using (public.is_business_member(business_id))
    $sql$;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- C) Tables reported without RLS: enable RLS for all listed objects.
-- For server-only tables no policy is added (default deny for anon/authenticated).
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
  listed_tables text[] := array[
    'users',
    'event_log',
    'manager_invites',
    'workspaces',
    'activity_events',
    'campaign_target_roles',
    'user_roles',
    'campaigns',
    'campaign_channels',
    'survey_questions',
    'survey_options',
    'user_campaign_events',
    'user_campaign_states_backup_before_survey_sync',
    'sales_month_targets',
    'plans',
    'plan_prices',
    'plan_features',
    'features',
    'accounts',
    'subscriptions',
    'subscription_items',
    'manual_entitlement_overrides',
    'paddle_customers',
    'paddle_subscriptions',
    'billing_webhook_events',
    'audit_logs'
  ];
begin
  foreach t in array listed_tables loop
    if to_regclass(format('public.%s', t)) is not null then
      execute format('alter table public.%I enable row level security', t);
    end if;
  end loop;
end
$$;

-- event_log: authenticated users may read only their own actor/target events.
do $$
begin
  if to_regclass('public.event_log') is not null
     and not exists (
       select 1 from pg_policies
       where schemaname = 'public'
         and tablename = 'event_log'
         and policyname = 'event_log_select_own_events'
     ) then
    execute $sql$
      create policy "event_log_select_own_events"
      on public.event_log
      for select
      to authenticated
      using (
        actor_user_id = auth.uid()
        or target_user_id = auth.uid()
      )
    $sql$;
  end if;
end
$$;

-- user_roles: user can read only own role rows.
do $$
begin
  if to_regclass('public.user_roles') is not null
     and not exists (
       select 1 from pg_policies
       where schemaname = 'public'
         and tablename = 'user_roles'
         and policyname = 'user_roles_select_own'
     ) then
    execute $sql$
      create policy "user_roles_select_own"
      on public.user_roles
      for select
      to authenticated
      using (user_id = auth.uid())
    $sql$;
  end if;
end
$$;

-- Campaign read model for authenticated users:
-- Only campaigns delivered to the current user (via user_campaign_states), active only.
do $$
begin
  if to_regclass('public.campaigns') is not null
     and not exists (
       select 1 from pg_policies
       where schemaname = 'public'
         and tablename = 'campaigns'
         and policyname = 'campaigns_select_active_for_recipient'
     ) then
    execute $sql$
      create policy "campaigns_select_active_for_recipient"
      on public.campaigns
      for select
      to authenticated
      using (
        lower(coalesce(status::text, '')) = 'active'
        and exists (
          select 1
          from public.user_campaign_states ucs
          where ucs.campaign_id = campaigns.id
            and ucs.user_id = auth.uid()
        )
      )
    $sql$;
  end if;
end
$$;

-- Ensure user can read own campaign state rows (supports bell/popup flows).
do $$
begin
  if to_regclass('public.user_campaign_states') is not null then
    execute 'alter table public.user_campaign_states enable row level security';
  end if;
end
$$;

do $$
begin
  if to_regclass('public.user_campaign_states') is not null
     and not exists (
       select 1 from pg_policies
       where schemaname = 'public'
         and tablename = 'user_campaign_states'
         and policyname = 'user_campaign_states_select_own'
     ) then
    execute $sql$
      create policy "user_campaign_states_select_own"
      on public.user_campaign_states
      for select
      to authenticated
      using (user_id = auth.uid())
    $sql$;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.campaign_target_roles') is not null
     and not exists (
       select 1 from pg_policies
       where schemaname = 'public'
         and tablename = 'campaign_target_roles'
         and policyname = 'campaign_target_roles_select_for_visible_campaigns'
     ) then
    execute $sql$
      create policy "campaign_target_roles_select_for_visible_campaigns"
      on public.campaign_target_roles
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.campaigns c
          join public.user_campaign_states ucs
            on ucs.campaign_id = c.id
          where c.id = campaign_target_roles.campaign_id
            and lower(coalesce(c.status::text, '')) = 'active'
            and ucs.user_id = auth.uid()
        )
      )
    $sql$;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.survey_questions') is not null
     and not exists (
       select 1 from pg_policies
       where schemaname = 'public'
         and tablename = 'survey_questions'
         and policyname = 'survey_questions_select_for_visible_campaigns'
     ) then
    execute $sql$
      create policy "survey_questions_select_for_visible_campaigns"
      on public.survey_questions
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.campaigns c
          join public.user_campaign_states ucs
            on ucs.campaign_id = c.id
          where c.id = survey_questions.campaign_id
            and lower(coalesce(c.status::text, '')) = 'active'
            and ucs.user_id = auth.uid()
        )
      )
    $sql$;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.survey_options') is not null
     and not exists (
       select 1 from pg_policies
       where schemaname = 'public'
         and tablename = 'survey_options'
         and policyname = 'survey_options_select_for_visible_campaigns'
     ) then
    execute $sql$
      create policy "survey_options_select_for_visible_campaigns"
      on public.survey_options
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.survey_questions sq
          join public.campaigns c
            on c.id = sq.campaign_id
          join public.user_campaign_states ucs
            on ucs.campaign_id = c.id
          where sq.id = survey_options.question_id
            and lower(coalesce(c.status::text, '')) = 'active'
            and ucs.user_id = auth.uid()
        )
      )
    $sql$;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- D) SECURITY DEFINER view hardening
-- ---------------------------------------------------------------------------
-- Safe to switch these two feed/compat views to invoker semantics.
-- They are consumed through server routes using service-role client.

do $$
begin
  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'notifications_compat'
      and c.relkind = 'v'
  ) then
    execute 'alter view public.notifications_compat set (security_invoker = true)';
  end if;
end
$$;

do $$
begin
  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'campaign_notifications_feed'
      and c.relkind = 'v'
  ) then
    execute 'alter view public.campaign_notifications_feed set (security_invoker = true)';
  end if;
end
$$;

-- NOTE:
-- v_support_requests_admin / v_support_requests_summary are intentionally not
-- modified here. Their definitions are not versioned in this repository and
-- may be relied upon by admin pages that use authenticated (non-service) clients.
