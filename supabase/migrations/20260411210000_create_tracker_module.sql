-- Separate Jira-like tracker module (independent from legacy CRM task logic)

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tracker_project_status') THEN
    CREATE TYPE public.tracker_project_status AS ENUM ('active','archived');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tracker_project_visibility') THEN
    CREATE TYPE public.tracker_project_visibility AS ENUM ('private','internal');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tracker_project_role') THEN
    CREATE TYPE public.tracker_project_role AS ENUM ('admin','owner','lead','member','viewer');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tracker_item_type') THEN
    CREATE TYPE public.tracker_item_type AS ENUM ('story','task','subtask','bug','improvement','research','support','chore');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tracker_item_status') THEN
    CREATE TYPE public.tracker_item_status AS ENUM ('backlog','selected','in_progress','review','blocked','done','canceled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tracker_item_priority') THEN
    CREATE TYPE public.tracker_item_priority AS ENUM ('low','medium','high','critical');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tracker_sprint_status') THEN
    CREATE TYPE public.tracker_sprint_status AS ENUM ('planned','active','closed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tracker_link_type') THEN
    CREATE TYPE public.tracker_link_type AS ENUM ('blocks','blocked_by','relates_to','duplicates','caused_by');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tracker_entity_type') THEN
    CREATE TYPE public.tracker_entity_type AS ENUM ('project','epic','item','sprint','comment');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.tracker_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.tracker_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  key text NOT NULL,
  name text NOT NULL,
  description text NULL,
  owner_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status public.tracker_project_status NOT NULL DEFAULT 'active',
  visibility public.tracker_project_visibility NOT NULL DEFAULT 'internal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tracker_projects_key_format CHECK (key ~ '^[A-Z][A-Z0-9_]{1,9}$'),
  CONSTRAINT tracker_projects_name_not_blank CHECK (btrim(name) <> '')
);
CREATE UNIQUE INDEX IF NOT EXISTS tracker_projects_business_key_uidx ON public.tracker_projects (business_id, key);
CREATE INDEX IF NOT EXISTS tracker_projects_owner_user_id_idx ON public.tracker_projects (owner_user_id);
CREATE INDEX IF NOT EXISTS tracker_projects_status_idx ON public.tracker_projects (status);

CREATE TABLE IF NOT EXISTS public.tracker_project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.tracker_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.tracker_project_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tracker_project_members_project_user_unique UNIQUE (project_id, user_id)
);
CREATE INDEX IF NOT EXISTS tracker_project_members_project_id_idx ON public.tracker_project_members (project_id);
CREATE INDEX IF NOT EXISTS tracker_project_members_user_id_idx ON public.tracker_project_members (user_id);

CREATE TABLE IF NOT EXISTS public.tracker_epics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.tracker_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NULL,
  owner_user_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  assignee_user_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  status public.tracker_item_status NOT NULL DEFAULT 'backlog',
  priority public.tracker_item_priority NOT NULL DEFAULT 'medium',
  due_date date NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tracker_epics_title_not_blank CHECK (btrim(title) <> '')
);
CREATE INDEX IF NOT EXISTS tracker_epics_project_id_idx ON public.tracker_epics (project_id);
CREATE INDEX IF NOT EXISTS tracker_epics_assignee_user_id_idx ON public.tracker_epics (assignee_user_id);
CREATE INDEX IF NOT EXISTS tracker_epics_status_idx ON public.tracker_epics (status);
CREATE INDEX IF NOT EXISTS tracker_epics_due_date_idx ON public.tracker_epics (due_date);

CREATE TABLE IF NOT EXISTS public.tracker_sprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.tracker_projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  goal text NULL,
  start_date date NULL,
  end_date date NULL,
  status public.tracker_sprint_status NOT NULL DEFAULT 'planned',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tracker_sprints_project_id_idx ON public.tracker_sprints (project_id);
CREATE INDEX IF NOT EXISTS tracker_sprints_status_idx ON public.tracker_sprints (status);

CREATE TABLE IF NOT EXISTS public.tracker_project_counters (
  project_id uuid PRIMARY KEY REFERENCES public.tracker_projects(id) ON DELETE CASCADE,
  last_value integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tracker_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.tracker_projects(id) ON DELETE CASCADE,
  epic_id uuid NULL REFERENCES public.tracker_epics(id) ON DELETE SET NULL,
  parent_item_id uuid NULL REFERENCES public.tracker_items(id) ON DELETE SET NULL,
  sprint_id uuid NULL REFERENCES public.tracker_sprints(id) ON DELETE SET NULL,
  type public.tracker_item_type NOT NULL DEFAULT 'task',
  code text NOT NULL,
  title text NOT NULL,
  description text NULL,
  status public.tracker_item_status NOT NULL DEFAULT 'backlog',
  priority public.tracker_item_priority NOT NULL DEFAULT 'medium',
  assignee_user_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  reporter_user_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  estimate_value numeric(10,2) NULL,
  estimate_unit text NULL,
  spent_time numeric(10,2) NULL,
  start_date date NULL,
  due_date date NULL,
  position numeric(12,4) NULL,
  story_points integer NULL,
  checklist_json jsonb NULL,
  metadata_json jsonb NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  CONSTRAINT tracker_items_title_not_blank CHECK (btrim(title) <> ''),
  CONSTRAINT tracker_items_code_format CHECK (code ~ '^[A-Z][A-Z0-9_]{1,9}-[0-9]+$')
);
CREATE UNIQUE INDEX IF NOT EXISTS tracker_items_project_code_uidx ON public.tracker_items (project_id, code);
CREATE INDEX IF NOT EXISTS tracker_items_project_id_idx ON public.tracker_items (project_id);
CREATE INDEX IF NOT EXISTS tracker_items_epic_id_idx ON public.tracker_items (epic_id);
CREATE INDEX IF NOT EXISTS tracker_items_parent_item_id_idx ON public.tracker_items (parent_item_id);
CREATE INDEX IF NOT EXISTS tracker_items_sprint_id_idx ON public.tracker_items (sprint_id);
CREATE INDEX IF NOT EXISTS tracker_items_assignee_user_id_idx ON public.tracker_items (assignee_user_id);
CREATE INDEX IF NOT EXISTS tracker_items_status_idx ON public.tracker_items (status);
CREATE INDEX IF NOT EXISTS tracker_items_due_date_idx ON public.tracker_items (due_date);
CREATE INDEX IF NOT EXISTS tracker_items_type_idx ON public.tracker_items (type);
CREATE INDEX IF NOT EXISTS tracker_items_project_status_position_idx ON public.tracker_items (project_id, status, position);

CREATE TABLE IF NOT EXISTS public.tracker_item_watchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.tracker_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tracker_item_watchers_item_user_unique UNIQUE (item_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.tracker_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.tracker_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tracker_comments_body_not_blank CHECK (btrim(body) <> '')
);

CREATE TABLE IF NOT EXISTS public.tracker_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type public.tracker_entity_type NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  old_value_json jsonb NULL,
  new_value_json jsonb NULL,
  user_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tracker_activity_log_entity_idx ON public.tracker_activity_log (entity_type, entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.tracker_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NULL REFERENCES public.tracker_projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS tracker_labels_global_name_uidx ON public.tracker_labels (lower(name)) WHERE project_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS tracker_labels_project_name_uidx ON public.tracker_labels (project_id, lower(name)) WHERE project_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.tracker_item_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.tracker_items(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES public.tracker_labels(id) ON DELETE CASCADE,
  CONSTRAINT tracker_item_labels_item_label_unique UNIQUE (item_id, label_id)
);

CREATE TABLE IF NOT EXISTS public.tracker_item_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_item_id uuid NOT NULL REFERENCES public.tracker_items(id) ON DELETE CASCADE,
  target_item_id uuid NOT NULL REFERENCES public.tracker_items(id) ON DELETE CASCADE,
  link_type public.tracker_link_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tracker_item_links_not_self CHECK (source_item_id <> target_item_id),
  CONSTRAINT tracker_item_links_unique UNIQUE (source_item_id, target_item_id, link_type)
);

CREATE TABLE IF NOT EXISTS public.tracker_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.tracker_items(id) ON DELETE CASCADE,
  file_id uuid NULL,
  storage_path text NULL,
  uploaded_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tracker_attachments_ref_present CHECK (file_id IS NOT NULL OR storage_path IS NOT NULL)
);

CREATE OR REPLACE FUNCTION public.tracker_ensure_owner_membership() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.tracker_project_members (project_id, user_id, role)
  VALUES (NEW.id, NEW.owner_user_id, 'owner')
  ON CONFLICT (project_id, user_id) DO UPDATE SET role = 'owner';
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tracker_next_item_code(p_project_id uuid) RETURNS text LANGUAGE plpgsql AS $$
DECLARE v_key text; v_next integer;
BEGIN
  SELECT key INTO v_key FROM public.tracker_projects WHERE id = p_project_id;
  IF v_key IS NULL THEN RAISE EXCEPTION 'project not found'; END IF;
  INSERT INTO public.tracker_project_counters (project_id, last_value) VALUES (p_project_id, 1)
  ON CONFLICT (project_id) DO UPDATE SET last_value = public.tracker_project_counters.last_value + 1
  RETURNING last_value INTO v_next;
  RETURN format('%s-%s', v_key, v_next);
END;
$$;

CREATE OR REPLACE FUNCTION public.tracker_assign_item_code() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.code IS NULL OR btrim(NEW.code) = '' THEN
    NEW.code := public.tracker_next_item_code(NEW.project_id);
  END IF;
  IF NEW.status = 'done' AND NEW.completed_at IS NULL THEN NEW.completed_at := now(); END IF;
  IF NEW.status <> 'done' THEN NEW.completed_at := NULL; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tracker_projects_touch_tgr ON public.tracker_projects;
CREATE TRIGGER tracker_projects_touch_tgr BEFORE UPDATE ON public.tracker_projects FOR EACH ROW EXECUTE FUNCTION public.tracker_touch_updated_at();
DROP TRIGGER IF EXISTS tracker_epics_touch_tgr ON public.tracker_epics;
CREATE TRIGGER tracker_epics_touch_tgr BEFORE UPDATE ON public.tracker_epics FOR EACH ROW EXECUTE FUNCTION public.tracker_touch_updated_at();
DROP TRIGGER IF EXISTS tracker_sprints_touch_tgr ON public.tracker_sprints;
CREATE TRIGGER tracker_sprints_touch_tgr BEFORE UPDATE ON public.tracker_sprints FOR EACH ROW EXECUTE FUNCTION public.tracker_touch_updated_at();
DROP TRIGGER IF EXISTS tracker_items_touch_tgr ON public.tracker_items;
CREATE TRIGGER tracker_items_touch_tgr BEFORE UPDATE ON public.tracker_items FOR EACH ROW EXECUTE FUNCTION public.tracker_touch_updated_at();
DROP TRIGGER IF EXISTS tracker_comments_touch_tgr ON public.tracker_comments;
CREATE TRIGGER tracker_comments_touch_tgr BEFORE UPDATE ON public.tracker_comments FOR EACH ROW EXECUTE FUNCTION public.tracker_touch_updated_at();
DROP TRIGGER IF EXISTS tracker_owner_member_tgr ON public.tracker_projects;
CREATE TRIGGER tracker_owner_member_tgr AFTER INSERT ON public.tracker_projects FOR EACH ROW EXECUTE FUNCTION public.tracker_ensure_owner_membership();
DROP TRIGGER IF EXISTS tracker_assign_item_code_tgr ON public.tracker_items;
CREATE TRIGGER tracker_assign_item_code_tgr BEFORE INSERT OR UPDATE OF code, status, project_id ON public.tracker_items FOR EACH ROW EXECUTE FUNCTION public.tracker_assign_item_code();

CREATE OR REPLACE FUNCTION public.tracker_is_project_member(target_project_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tracker_projects p
    WHERE p.id = target_project_id
      AND (p.owner_user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.tracker_project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      ))
  );
$$;

ALTER TABLE public.tracker_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracker_project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracker_epics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracker_sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracker_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracker_item_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracker_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracker_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracker_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracker_item_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracker_item_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracker_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracker_project_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tracker_projects_select ON public.tracker_projects;
CREATE POLICY tracker_projects_select ON public.tracker_projects FOR SELECT TO authenticated USING (public.tracker_is_project_member(id));
DROP POLICY IF EXISTS tracker_projects_insert ON public.tracker_projects;
CREATE POLICY tracker_projects_insert ON public.tracker_projects FOR INSERT TO authenticated WITH CHECK (owner_user_id = auth.uid());
DROP POLICY IF EXISTS tracker_projects_update ON public.tracker_projects;
CREATE POLICY tracker_projects_update ON public.tracker_projects FOR UPDATE TO authenticated USING (public.tracker_is_project_member(id)) WITH CHECK (public.tracker_is_project_member(id));

DROP POLICY IF EXISTS tracker_members_select ON public.tracker_project_members;
CREATE POLICY tracker_members_select ON public.tracker_project_members FOR SELECT TO authenticated USING (public.tracker_is_project_member(project_id));
DROP POLICY IF EXISTS tracker_members_write ON public.tracker_project_members;
CREATE POLICY tracker_members_write ON public.tracker_project_members FOR ALL TO authenticated USING (public.tracker_is_project_member(project_id)) WITH CHECK (public.tracker_is_project_member(project_id));

DROP POLICY IF EXISTS tracker_epics_all ON public.tracker_epics;
CREATE POLICY tracker_epics_all ON public.tracker_epics FOR ALL TO authenticated USING (public.tracker_is_project_member(project_id)) WITH CHECK (public.tracker_is_project_member(project_id));
DROP POLICY IF EXISTS tracker_sprints_all ON public.tracker_sprints;
CREATE POLICY tracker_sprints_all ON public.tracker_sprints FOR ALL TO authenticated USING (public.tracker_is_project_member(project_id)) WITH CHECK (public.tracker_is_project_member(project_id));
DROP POLICY IF EXISTS tracker_items_all ON public.tracker_items;
CREATE POLICY tracker_items_all ON public.tracker_items FOR ALL TO authenticated USING (public.tracker_is_project_member(project_id)) WITH CHECK (public.tracker_is_project_member(project_id));

DROP POLICY IF EXISTS tracker_watchers_all ON public.tracker_item_watchers;
CREATE POLICY tracker_watchers_all ON public.tracker_item_watchers FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.tracker_items i WHERE i.id = tracker_item_watchers.item_id AND public.tracker_is_project_member(i.project_id))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.tracker_items i WHERE i.id = tracker_item_watchers.item_id AND public.tracker_is_project_member(i.project_id))
);

DROP POLICY IF EXISTS tracker_comments_all ON public.tracker_comments;
CREATE POLICY tracker_comments_all ON public.tracker_comments FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.tracker_items i WHERE i.id = tracker_comments.item_id AND public.tracker_is_project_member(i.project_id))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.tracker_items i WHERE i.id = tracker_comments.item_id AND public.tracker_is_project_member(i.project_id))
);

DROP POLICY IF EXISTS tracker_activity_select ON public.tracker_activity_log;
CREATE POLICY tracker_activity_select ON public.tracker_activity_log FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS tracker_activity_insert ON public.tracker_activity_log;
CREATE POLICY tracker_activity_insert ON public.tracker_activity_log FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS tracker_labels_all ON public.tracker_labels;
CREATE POLICY tracker_labels_all ON public.tracker_labels FOR ALL TO authenticated USING (
  project_id IS NULL OR public.tracker_is_project_member(project_id)
) WITH CHECK (
  project_id IS NULL OR public.tracker_is_project_member(project_id)
);

DROP POLICY IF EXISTS tracker_item_labels_all ON public.tracker_item_labels;
CREATE POLICY tracker_item_labels_all ON public.tracker_item_labels FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.tracker_items i WHERE i.id = tracker_item_labels.item_id AND public.tracker_is_project_member(i.project_id))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.tracker_items i WHERE i.id = tracker_item_labels.item_id AND public.tracker_is_project_member(i.project_id))
);

DROP POLICY IF EXISTS tracker_item_links_all ON public.tracker_item_links;
CREATE POLICY tracker_item_links_all ON public.tracker_item_links FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.tracker_items i WHERE i.id = tracker_item_links.source_item_id AND public.tracker_is_project_member(i.project_id))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.tracker_items i WHERE i.id = tracker_item_links.source_item_id AND public.tracker_is_project_member(i.project_id))
);

DROP POLICY IF EXISTS tracker_attachments_all ON public.tracker_attachments;
CREATE POLICY tracker_attachments_all ON public.tracker_attachments FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.tracker_items i WHERE i.id = tracker_attachments.item_id AND public.tracker_is_project_member(i.project_id))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.tracker_items i WHERE i.id = tracker_attachments.item_id AND public.tracker_is_project_member(i.project_id))
);

DROP POLICY IF EXISTS tracker_counters_block ON public.tracker_project_counters;
CREATE POLICY tracker_counters_block ON public.tracker_project_counters FOR ALL TO authenticated USING (false) WITH CHECK (false);
