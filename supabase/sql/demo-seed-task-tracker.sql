-- Demo seed for tracker module.
-- Safe to run multiple times.

DO $$
DECLARE
  v_business_id uuid;
  v_project_id uuid;
  v_epic_crm_id uuid;
  v_epic_tracker_id uuid;
  v_admin uuid;
  v_owner uuid;
  v_lead uuid;
  v_dev uuid;
  v_qa uuid;
  v_tmp uuid;
BEGIN
  SELECT b.id
  INTO v_business_id
  FROM public.businesses b
  ORDER BY b.created_at ASC
  LIMIT 1;

  IF v_business_id IS NULL THEN
    RAISE NOTICE 'Tracker seed skipped: no businesses found';
    RETURN;
  END IF;

  SELECT user_id
  INTO v_admin
  FROM public.memberships m
  WHERE m.business_id = v_business_id
  ORDER BY m.created_at ASC, m.user_id ASC
  LIMIT 1 OFFSET 0;

  SELECT user_id
  INTO v_owner
  FROM public.memberships m
  WHERE m.business_id = v_business_id
  ORDER BY m.created_at ASC, m.user_id ASC
  LIMIT 1 OFFSET 1;

  SELECT user_id
  INTO v_lead
  FROM public.memberships m
  WHERE m.business_id = v_business_id
  ORDER BY m.created_at ASC, m.user_id ASC
  LIMIT 1 OFFSET 2;

  SELECT user_id
  INTO v_dev
  FROM public.memberships m
  WHERE m.business_id = v_business_id
  ORDER BY m.created_at ASC, m.user_id ASC
  LIMIT 1 OFFSET 3;

  SELECT user_id
  INTO v_qa
  FROM public.memberships m
  WHERE m.business_id = v_business_id
  ORDER BY m.created_at ASC, m.user_id ASC
  LIMIT 1 OFFSET 4;

  IF v_admin IS NULL THEN
    RAISE NOTICE 'Tracker seed skipped: no users in memberships for business %', v_business_id;
    RETURN;
  END IF;

  v_owner := COALESCE(v_owner, v_admin);
  v_lead := COALESCE(v_lead, v_owner, v_admin);
  v_dev := COALESCE(v_dev, v_lead, v_owner, v_admin);
  v_qa := COALESCE(v_qa, v_dev, v_lead, v_owner, v_admin);

  INSERT INTO public.tracker_projects (
    business_id, key, name, description, owner_user_id, status, visibility
  )
  VALUES (
    v_business_id,
    'DEV',
    'Product Development',
    'Internal product and platform execution board',
    v_owner,
    'active',
    'internal'
  )
  ON CONFLICT (business_id, key)
  DO UPDATE
  SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    owner_user_id = EXCLUDED.owner_user_id,
    status = 'active',
    visibility = 'internal',
    updated_at = now()
  RETURNING id INTO v_project_id;

  INSERT INTO public.tracker_project_members (project_id, user_id, role)
  VALUES
    (v_project_id, v_admin, 'admin'),
    (v_project_id, v_owner, 'owner'),
    (v_project_id, v_lead, 'lead'),
    (v_project_id, v_dev, 'member'),
    (v_project_id, v_qa, 'member')
  ON CONFLICT (project_id, user_id) DO NOTHING;

  INSERT INTO public.tracker_epics (
    project_id, title, description, owner_user_id, assignee_user_id, status, priority, sort_order
  )
  VALUES (
    v_project_id,
    'CRM Improvements',
    'Operational and quality improvements in existing CRM flows',
    v_owner,
    v_lead,
    'in_progress',
    'high',
    10
  )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.tracker_epics (
    project_id, title, description, owner_user_id, assignee_user_id, status, priority, sort_order
  )
  VALUES (
    v_project_id,
    'Internal Task Tracker',
    'Standalone Jira-like module implementation',
    v_owner,
    v_lead,
    'in_progress',
    'critical',
    20
  )
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_epic_crm_id
  FROM public.tracker_epics
  WHERE project_id = v_project_id AND title = 'CRM Improvements'
  LIMIT 1;

  SELECT id INTO v_epic_tracker_id
  FROM public.tracker_epics
  WHERE project_id = v_project_id AND title = 'Internal Task Tracker'
  LIMIT 1;

  INSERT INTO public.tracker_items (
    project_id, epic_id, type, title, description, status, priority, assignee_user_id, reporter_user_id, due_date, position
  )
  VALUES
    (v_project_id, v_epic_crm_id, 'story', 'Improve lead processing', 'Stabilize lead qualification and transfer flow.', 'selected', 'high', v_lead, v_owner, now()::date + 8, 100),
    (v_project_id, v_epic_crm_id, 'task', 'Add validation to lead form', 'Add strict server-side validation for lead create/update API.', 'in_progress', 'high', v_dev, v_lead, now()::date + 4, 110),
    (v_project_id, v_epic_crm_id, 'bug', 'Fix duplicate client creation', 'Avoid duplicated clients on parallel order creates.', 'blocked', 'critical', v_dev, v_lead, now()::date + 2, 120),
    (v_project_id, v_epic_tracker_id, 'story', 'Design board view', 'Kanban board with backlog/selected/in_progress/review/done columns.', 'in_progress', 'high', v_lead, v_owner, now()::date + 5, 130),
    (v_project_id, v_epic_tracker_id, 'task', 'Create backlog page', 'Backlog list grouped by epics with quick actions.', 'selected', 'medium', v_dev, v_lead, now()::date + 6, 140),
    (v_project_id, v_epic_tracker_id, 'task', 'Implement sprint planning', 'Select backlog items into active sprint with capacity limits.', 'backlog', 'high', v_dev, v_lead, now()::date + 10, 150)
  ON CONFLICT (project_id, code) DO NOTHING;

  SELECT id INTO v_tmp
  FROM public.tracker_items
  WHERE project_id = v_project_id AND title = 'Fix duplicate client creation'
  LIMIT 1;

  IF v_tmp IS NOT NULL THEN
    INSERT INTO public.tracker_items (
      project_id, epic_id, parent_item_id, type, title, description, status, priority, assignee_user_id, reporter_user_id, position
    )
    VALUES (
      v_project_id,
      v_epic_crm_id,
      v_tmp,
      'subtask',
      'handle duplicate phone normalization',
      'Normalize UK and international phone formats before dedupe matching.',
      'in_progress',
      'high',
      v_dev,
      v_lead,
      121
    )
    ON CONFLICT (project_id, code) DO NOTHING;
  END IF;

  SELECT id INTO v_tmp
  FROM public.tracker_items
  WHERE project_id = v_project_id AND title = 'Design board view'
  LIMIT 1;

  IF v_tmp IS NOT NULL THEN
    INSERT INTO public.tracker_items (
      project_id, epic_id, parent_item_id, type, title, description, status, priority, assignee_user_id, reporter_user_id, position
    )
    VALUES (
      v_project_id,
      v_epic_tracker_id,
      v_tmp,
      'subtask',
      'add drag and drop',
      'Persist card order and status transitions via API.',
      'selected',
      'medium',
      v_dev,
      v_lead,
      131
    )
    ON CONFLICT (project_id, code) DO NOTHING;
  END IF;

  INSERT INTO public.tracker_activity_log (entity_type, entity_id, action, new_value_json, user_id)
  VALUES
    ('project', v_project_id, 'seed_created_project', jsonb_build_object('project_key', 'DEV'), v_owner),
    ('epic', v_epic_crm_id, 'seed_created_epic', jsonb_build_object('title', 'CRM Improvements'), v_owner),
    ('epic', v_epic_tracker_id, 'seed_created_epic', jsonb_build_object('title', 'Internal Task Tracker'), v_owner)
  ON CONFLICT DO NOTHING;
END
$$;
