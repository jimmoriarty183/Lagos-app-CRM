-- =====================================================
-- DEMO OPS SEED (ORDERS / CHECKLIST / FOLLOW-UPS / CALENDAR / MANAGERS)
-- =====================================================
-- Safe, idempotent dataset focused on operational workflow.
-- Does NOT seed catalog products/services.
--
-- What it does:
-- 1) Picks one business and workspace
-- 2) Picks existing manager/owner users as manager stubs
-- 3) Enriches recent orders with manager_id + due_date
-- 4) Adds checklist items for those orders
-- 5) Adds follow-ups for those orders (with optional due_at/action fields)
-- 6) Adds work_days rows for manager calendar/today view
-- 7) Adds activity_events (if table exists) for timeline/analytics
--
-- Designed for mixed schemas (legacy/new) and re-runs.
-- =====================================================

set search_path = public, app;

do $$
declare
  v_business_id uuid;
  v_workspace_id uuid;
  v_manager_ids uuid[];
  v_manager_count int;

  v_orders_has_business_id boolean;
  v_orders_has_manager_id boolean;
  v_orders_has_due_date boolean;
  v_orders_has_status boolean;

  v_followups_has_workspace_id boolean;
  v_followups_has_created_by boolean;
  v_followups_has_due_at boolean;
  v_followups_has_action_type boolean;
  v_followups_has_action_payload boolean;

  v_checklist_has_due_date boolean;
  v_checklist_has_is_done boolean;
  v_checklist_has_done_at boolean;
  v_checklist_has_created_by boolean;
  v_checklist_has_completed_by boolean;

  v_work_days_exists boolean;
  v_follow_ups_exists boolean;
  v_checklist_exists boolean;
  v_activity_exists boolean;

  v_activity_has_workspace_id boolean;
  v_activity_has_follow_up_id boolean;
  v_activity_has_checklist_item_id boolean;

  v_order record;
  v_i int;
  v_manager_id uuid;
  v_due_date date;

  v_follow_up_id uuid;
  v_checklist_item_id uuid;
begin
  -- -----------------------------------------------------
  -- Resolve business/workspace and manager stubs
  -- -----------------------------------------------------
  select b.id
  into v_business_id
  from public.businesses b
  order by coalesce(b.last_activity_at, b.created_at, now()) desc
  limit 1;

  if v_business_id is null then
    raise notice '[DEMO OPS] No business found. Seed skipped.';
    return;
  end if;

  select w.id
  into v_workspace_id
  from public.workspaces w
  where w.id = v_business_id
  limit 1;

  if v_workspace_id is null then
    v_workspace_id := v_business_id;
  end if;

  select array_agg(x.user_id)
  into v_manager_ids
  from (
    select distinct m.user_id
    from public.memberships m
    where m.business_id = v_business_id
      and m.user_id is not null
      and upper(coalesce(m.role, '')) in ('OWNER', 'MANAGER')
    order by m.user_id
    limit 6
  ) x;

  if coalesce(array_length(v_manager_ids, 1), 0) = 0 then
    select array_agg(x.user_id)
    into v_manager_ids
    from (
      select distinct m.user_id
      from public.memberships m
      where m.business_id = v_business_id
        and m.user_id is not null
      order by m.user_id
      limit 3
    ) x;
  end if;

  v_manager_count := coalesce(array_length(v_manager_ids, 1), 0);

  -- -----------------------------------------------------
  -- Schema feature flags
  -- -----------------------------------------------------
  select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'follow_ups'
  ) into v_follow_ups_exists;

  select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'order_checklist_items'
  ) into v_checklist_exists;

  select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'work_days'
  ) into v_work_days_exists;

  select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'activity_events'
  ) into v_activity_exists;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'business_id'
  ) into v_orders_has_business_id;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'manager_id'
  ) into v_orders_has_manager_id;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'due_date'
  ) into v_orders_has_due_date;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'status'
  ) into v_orders_has_status;

  if v_follow_ups_exists then
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'follow_ups' and column_name = 'workspace_id'
    ) into v_followups_has_workspace_id;

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'follow_ups' and column_name = 'created_by'
    ) into v_followups_has_created_by;

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'follow_ups' and column_name = 'due_at'
    ) into v_followups_has_due_at;

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'follow_ups' and column_name = 'action_type'
    ) into v_followups_has_action_type;

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'follow_ups' and column_name = 'action_payload'
    ) into v_followups_has_action_payload;
  end if;

  if v_checklist_exists then
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'order_checklist_items' and column_name = 'due_date'
    ) into v_checklist_has_due_date;

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'order_checklist_items' and column_name = 'is_done'
    ) into v_checklist_has_is_done;

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'order_checklist_items' and column_name = 'done_at'
    ) into v_checklist_has_done_at;

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'order_checklist_items' and column_name = 'created_by'
    ) into v_checklist_has_created_by;

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'order_checklist_items' and column_name = 'completed_by'
    ) into v_checklist_has_completed_by;
  end if;

  if v_activity_exists then
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'activity_events' and column_name = 'workspace_id'
    ) into v_activity_has_workspace_id;

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'activity_events' and column_name = 'follow_up_id'
    ) into v_activity_has_follow_up_id;

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'activity_events' and column_name = 'checklist_item_id'
    ) into v_activity_has_checklist_item_id;
  end if;

  -- -----------------------------------------------------
  -- Pick recent orders (prefer open/in-progress style statuses)
  -- -----------------------------------------------------
  drop table if exists tmp_demo_ops_orders;

  if v_orders_has_business_id and v_orders_has_status then
    create temporary table tmp_demo_ops_orders on commit drop as
    select o.id,
           row_number() over (order by coalesce(o.updated_at, o.created_at, now()) desc) as rn
    from public.orders o
    where o.business_id = v_business_id
      and upper(coalesce(o.status, '')) not in ('CANCELLED', 'COMPLETED', 'DONE', 'ARCHIVED')
    order by coalesce(o.updated_at, o.created_at, now()) desc
    limit 8;
  elsif v_orders_has_business_id then
    create temporary table tmp_demo_ops_orders on commit drop as
    select o.id,
           row_number() over (order by coalesce(o.updated_at, o.created_at, now()) desc) as rn
    from public.orders o
    where o.business_id = v_business_id
    order by coalesce(o.updated_at, o.created_at, now()) desc
    limit 8;
  elsif v_orders_has_status then
    create temporary table tmp_demo_ops_orders on commit drop as
    select o.id,
           row_number() over (order by coalesce(o.updated_at, o.created_at, now()) desc) as rn
    from public.orders o
    where upper(coalesce(o.status, '')) not in ('CANCELLED', 'COMPLETED', 'DONE', 'ARCHIVED')
    order by coalesce(o.updated_at, o.created_at, now()) desc
    limit 8;
  else
    create temporary table tmp_demo_ops_orders on commit drop as
    select o.id,
           row_number() over (order by coalesce(o.updated_at, o.created_at, now()) desc) as rn
    from public.orders o
    order by coalesce(o.updated_at, o.created_at, now()) desc
    limit 8;
  end if;

  if not exists (select 1 from tmp_demo_ops_orders) then
    raise notice '[DEMO OPS] No orders found. Seed skipped.';
    return;
  end if;

  -- -----------------------------------------------------
  -- Enrich orders: manager + due_date
  -- -----------------------------------------------------
  for v_order in select id, rn from tmp_demo_ops_orders order by rn loop
    v_due_date := current_date + (1 + (v_order.rn % 9));

    if v_manager_count > 0 then
      v_manager_id := v_manager_ids[((v_order.rn - 1) % v_manager_count) + 1];
    else
      v_manager_id := null;
    end if;

    if v_orders_has_manager_id and v_manager_id is not null then
      update public.orders o
      set manager_id = v_manager_id
      where o.id = v_order.id
        and (o.manager_id is null or o.manager_id <> v_manager_id);
    end if;

    if v_orders_has_due_date then
      update public.orders o
      set due_date = coalesce(o.due_date, v_due_date)
      where o.id = v_order.id;
    end if;
  end loop;

  -- -----------------------------------------------------
  -- Insert checklist items (per order)
  -- -----------------------------------------------------
  if v_checklist_exists then
    for v_order in select id, rn from tmp_demo_ops_orders order by rn loop
      v_due_date := current_date + (v_order.rn % 7);
      if v_manager_count > 0 then
        v_manager_id := v_manager_ids[((v_order.rn - 1) % v_manager_count) + 1];
      else
        v_manager_id := null;
      end if;

      -- Item 1
      if not exists (
        select 1 from public.order_checklist_items ci
        where ci.order_id = v_order.id and ci.title = '[DEMO OPS] Confirm client details'
      ) then
        insert into public.order_checklist_items (
          order_id,
          business_id,
          title,
          created_at
        )
        values (
          v_order.id,
          v_business_id,
          '[DEMO OPS] Confirm client details',
          now()
        )
        returning id into v_checklist_item_id;

        if v_checklist_has_due_date then
          update public.order_checklist_items
          set due_date = v_due_date
          where id = v_checklist_item_id;
        end if;

        if v_checklist_has_is_done then
          update public.order_checklist_items
          set is_done = false
          where id = v_checklist_item_id;
        end if;

        if v_checklist_has_created_by and v_manager_id is not null then
          update public.order_checklist_items
          set created_by = v_manager_id
          where id = v_checklist_item_id;
        end if;
      end if;

      -- Item 2
      if not exists (
        select 1 from public.order_checklist_items ci
        where ci.order_id = v_order.id and ci.title = '[DEMO OPS] Prepare quote and payment terms'
      ) then
        insert into public.order_checklist_items (
          order_id,
          business_id,
          title,
          created_at
        )
        values (
          v_order.id,
          v_business_id,
          '[DEMO OPS] Prepare quote and payment terms',
          now()
        )
        returning id into v_checklist_item_id;

        if v_checklist_has_due_date then
          update public.order_checklist_items
          set due_date = v_due_date + 1
          where id = v_checklist_item_id;
        end if;

        if v_checklist_has_is_done then
          update public.order_checklist_items
          set is_done = false
          where id = v_checklist_item_id;
        end if;

        if v_checklist_has_created_by and v_manager_id is not null then
          update public.order_checklist_items
          set created_by = v_manager_id
          where id = v_checklist_item_id;
        end if;
      end if;

      -- Item 3
      if not exists (
        select 1 from public.order_checklist_items ci
        where ci.order_id = v_order.id and ci.title = '[DEMO OPS] Confirm logistics and delivery slot'
      ) then
        insert into public.order_checklist_items (
          order_id,
          business_id,
          title,
          created_at
        )
        values (
          v_order.id,
          v_business_id,
          '[DEMO OPS] Confirm logistics and delivery slot',
          now()
        )
        returning id into v_checklist_item_id;

        if v_checklist_has_due_date then
          update public.order_checklist_items
          set due_date = v_due_date + 2
          where id = v_checklist_item_id;
        end if;

        if v_checklist_has_is_done then
          update public.order_checklist_items
          set is_done = (v_order.rn % 3 = 0)
          where id = v_checklist_item_id;
        end if;

        if v_checklist_has_done_at and (v_order.rn % 3 = 0) then
          update public.order_checklist_items
          set done_at = now() - interval '1 day'
          where id = v_checklist_item_id;
        end if;

        if v_checklist_has_created_by and v_manager_id is not null then
          update public.order_checklist_items
          set created_by = v_manager_id
          where id = v_checklist_item_id;
        end if;

        if v_checklist_has_completed_by and (v_order.rn % 3 = 0) and v_manager_id is not null then
          update public.order_checklist_items
          set completed_by = v_manager_id
          where id = v_checklist_item_id;
        end if;
      end if;
    end loop;
  else
    raise notice '[DEMO OPS] order_checklist_items table not found, checklist seed skipped.';
  end if;

  -- -----------------------------------------------------
  -- Insert follow-ups (per order)
  -- -----------------------------------------------------
  if v_follow_ups_exists then
    for v_order in select id, rn from tmp_demo_ops_orders order by rn loop
      v_due_date := current_date + (v_order.rn % 10);
      if v_manager_count > 0 then
        v_manager_id := v_manager_ids[((v_order.rn - 1) % v_manager_count) + 1];
      else
        v_manager_id := null;
      end if;

      if not exists (
        select 1 from public.follow_ups f
        where f.order_id = v_order.id
          and f.title = '[DEMO OPS] Call client and confirm next milestone'
          and f.status = 'open'
      ) then
        insert into public.follow_ups (
          business_id,
          order_id,
          title,
          due_date,
          status,
          note,
          source,
          created_at,
          updated_at
        )
        values (
          v_business_id,
          v_order.id,
          '[DEMO OPS] Call client and confirm next milestone',
          v_due_date,
          'open',
          'Ops demo seed: manager callback for current order stage.',
          'demo_seed_ops',
          now(),
          now()
        )
        returning id into v_follow_up_id;

        if v_followups_has_workspace_id then
          update public.follow_ups
          set workspace_id = coalesce(workspace_id, v_workspace_id)
          where id = v_follow_up_id;
        end if;

        if v_followups_has_created_by and v_manager_id is not null then
          update public.follow_ups
          set created_by = coalesce(created_by, v_manager_id)
          where id = v_follow_up_id;
        end if;

        if v_followups_has_due_at then
          update public.follow_ups
          set due_at = coalesce(due_at, date_trunc('day', now()) + interval '11 hours')
          where id = v_follow_up_id;
        end if;

        if v_followups_has_action_type then
          update public.follow_ups
          set action_type = coalesce(action_type, 'call')
          where id = v_follow_up_id;
        end if;

        if v_followups_has_action_payload then
          update public.follow_ups
          set action_payload = coalesce(action_payload, jsonb_build_object('channel', 'phone', 'tag', 'demo_ops'))
          where id = v_follow_up_id;
        end if;

        if v_activity_exists and v_follow_up_id is not null then
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
            created_at
          )
          values (
            v_business_id,
            'follow_up',
            v_follow_up_id,
            v_order.id,
            v_manager_id,
            case when v_manager_id is null then 'system' else 'user' end,
            'follow_up.created',
            jsonb_build_object('title', '[DEMO OPS] Call client and confirm next milestone', 'due_date', v_due_date),
            'internal',
            'demo_seed_ops',
            now()
          );
        end if;
      end if;
    end loop;
  else
    raise notice '[DEMO OPS] follow_ups table not found, follow-up seed skipped.';
  end if;

  -- -----------------------------------------------------
  -- Insert work_days (calendar / today view)
  -- -----------------------------------------------------
  if v_work_days_exists and v_manager_count > 0 then
    for v_i in 1..v_manager_count loop
      v_manager_id := v_manager_ids[v_i];

      -- Yesterday finished day
      insert into public.work_days (
        business_id,
        workspace_id,
        user_id,
        work_date,
        status,
        started_at,
        finished_at,
        total_pause_seconds,
        daily_summary,
        created_at,
        updated_at
      )
      select
        v_business_id,
        v_workspace_id,
        v_manager_id,
        current_date - 1,
        'finished',
        (date_trunc('day', now()) - interval '1 day') + interval '09:05',
        (date_trunc('day', now()) - interval '1 day') + interval '17:40',
        1800,
        '[DEMO OPS] Closed 2 follow-ups and reviewed 3 order checklists.',
        now(),
        now()
      where not exists (
        select 1
        from public.work_days wd
        where wd.business_id = v_business_id
          and wd.user_id = v_manager_id
          and wd.work_date = current_date - 1
      );

      -- Today running day
      insert into public.work_days (
        business_id,
        workspace_id,
        user_id,
        work_date,
        status,
        started_at,
        paused_at,
        resumed_at,
        total_pause_seconds,
        daily_summary,
        created_at,
        updated_at
      )
      select
        v_business_id,
        v_workspace_id,
        v_manager_id,
        current_date,
        case when v_i % 2 = 0 then 'paused' else 'running' end,
        date_trunc('day', now()) + interval '09:10',
        case when v_i % 2 = 0 then date_trunc('day', now()) + interval '13:00' else null end,
        case when v_i % 2 = 0 then null else date_trunc('day', now()) + interval '13:35' end,
        case when v_i % 2 = 0 then 900 else 0 end,
        '[DEMO OPS] Focus: callbacks, due dates, and manager pipeline update.',
        now(),
        now()
      where not exists (
        select 1
        from public.work_days wd
        where wd.business_id = v_business_id
          and wd.user_id = v_manager_id
          and wd.work_date = current_date
      );
    end loop;
  elsif not v_work_days_exists then
    raise notice '[DEMO OPS] work_days table not found, calendar seed skipped.';
  end if;

  -- -----------------------------------------------------
  -- Optional activity for checklist creation visibility
  -- -----------------------------------------------------
  if v_activity_exists and v_checklist_exists then
    for v_order in
      select ci.id, ci.order_id
      from public.order_checklist_items ci
      where ci.business_id = v_business_id
        and ci.title like '[DEMO OPS] %'
      order by ci.created_at desc
      limit 20
    loop
      if not exists (
        select 1
        from public.activity_events ae
        where ae.business_id = v_business_id
          and ae.entity_type = 'order'
          and ae.entity_id = v_order.order_id
          and ae.event_type = 'checklist.created'
          and ae.source = 'demo_seed_ops'
          and (ae.payload ->> 'checklist_item_id') = v_order.id::text
      ) then
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
          created_at
        )
        values (
          v_business_id,
          'order',
          v_order.order_id,
          v_order.order_id,
          null,
          'system',
          'checklist.created',
          jsonb_build_object('checklist_item_id', v_order.id, 'tag', 'demo_ops'),
          'internal',
          'demo_seed_ops',
          now()
        );
      end if;
    end loop;
  end if;

  raise notice '[DEMO OPS] Completed for business %, orders seeded: %',
    v_business_id,
    (select count(*) from tmp_demo_ops_orders);
end
$$;

-- -------------------------------------------------------
-- Verification snapshot
-- -------------------------------------------------------
do $$
declare
  v_count bigint;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'due_date'
  ) then
    execute 'select count(*) from public.orders where due_date is not null' into v_count;
    raise notice '[DEMO OPS] orders_with_due_date=%', v_count;
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'order_checklist_items'
  ) then
    execute $q$select count(*) from public.order_checklist_items where title like '[DEMO OPS] %'$q$ into v_count;
    raise notice '[DEMO OPS] demo_ops_checklist_items=%', v_count;
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'follow_ups'
  ) then
    execute $q$select count(*) from public.follow_ups where title like '[DEMO OPS] %' and status = 'open'$q$ into v_count;
    raise notice '[DEMO OPS] demo_ops_followups_open=%', v_count;
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'work_days'
  ) then
    execute 'select count(*) from public.work_days where work_date = current_date' into v_count;
    raise notice '[DEMO OPS] work_days_today=%', v_count;
  end if;
end
$$;
