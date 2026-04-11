import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  TrackerActivity,
  TrackerComment,
  TrackerEpic,
  TrackerFilters,
  TrackerItem,
  TrackerProfile,
  TrackerProject,
  TrackerSprint,
} from "@/lib/tracker/types";

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

export async function listTrackerProjects(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("tracker_projects")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as TrackerProject[];
}

export async function getTrackerProjectById(
  supabase: SupabaseClient,
  projectId: string,
) {
  const { data, error } = await supabase
    .from("tracker_projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as TrackerProject | null;
}

export async function listTrackerEpics(
  supabase: SupabaseClient,
  projectId: string,
) {
  const { data, error } = await supabase
    .from("tracker_epics")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as TrackerEpic[];
}

export async function listTrackerSprints(
  supabase: SupabaseClient,
  projectId: string,
) {
  const { data, error } = await supabase
    .from("tracker_sprints")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as TrackerSprint[];
}

export async function listTrackerItems(
  supabase: SupabaseClient,
  projectId: string,
  filters: TrackerFilters = {},
) {
  let query = supabase
    .from("tracker_items")
    .select("*")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });

  if (filters.epicId) query = query.eq("epic_id", filters.epicId);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.type) query = query.eq("type", filters.type);
  if (filters.priority) query = query.eq("priority", filters.priority);
  if (filters.assigneeUserId) query = query.eq("assignee_user_id", filters.assigneeUserId);
  if (filters.sprintId) query = query.eq("sprint_id", filters.sprintId);
  if (filters.unassigned) query = query.is("assignee_user_id", null);

  const { data, error } = await query;
  if (error) throw error;

  let items = (data ?? []) as TrackerItem[];
  if (filters.overdue) {
    const nowDate = new Date().toISOString().slice(0, 10);
    items = items.filter(
      (item) =>
        Boolean(item.due_date && item.due_date < nowDate) &&
        item.status !== "done" &&
        item.status !== "canceled",
    );
  }

  const searchText = cleanString(filters.search);
  if (searchText) {
    const normalized = searchText.toLowerCase();
    items = items.filter((item) => {
      const haystack = `${item.code} ${item.title} ${item.description ?? ""}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }

  if (filters.labelIds?.length) {
    const { data: rows, error: labelsError } = await supabase
      .from("tracker_item_labels")
      .select("item_id,label_id")
      .in("label_id", filters.labelIds);
    if (labelsError) throw labelsError;
    const allowedIds = new Set((rows ?? []).map((row) => String(row.item_id)));
    items = items.filter((item) => allowedIds.has(item.id));
  }

  return items;
}

export async function listCommentsByProject(
  supabase: SupabaseClient,
  projectId: string,
) {
  const { data, error } = await supabase
    .from("tracker_comments")
    .select("*, tracker_items!inner(project_id)")
    .eq("tracker_items.project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return (data ?? []) as unknown as TrackerComment[];
}

export async function listActivityByProject(
  supabase: SupabaseClient,
  projectId: string,
) {
  const [itemsRes, epicsRes, sprintsRes] = await Promise.all([
    supabase.from("tracker_items").select("id").eq("project_id", projectId),
    supabase.from("tracker_epics").select("id").eq("project_id", projectId),
    supabase.from("tracker_sprints").select("id").eq("project_id", projectId),
  ]);

  if (itemsRes.error) throw itemsRes.error;
  if (epicsRes.error) throw epicsRes.error;
  if (sprintsRes.error) throw sprintsRes.error;

  const itemIds = (itemsRes.data ?? []).map((row) => String(row.id));
  const epicIds = (epicsRes.data ?? []).map((row) => String(row.id));
  const sprintIds = (sprintsRes.data ?? []).map((row) => String(row.id));

  const projectEntity = { entity_type: "project", entity_id: projectId };
  const entities = [
    projectEntity,
    ...itemIds.map((id) => ({ entity_type: "item", entity_id: id })),
    ...epicIds.map((id) => ({ entity_type: "epic", entity_id: id })),
    ...sprintIds.map((id) => ({ entity_type: "sprint", entity_id: id })),
  ];

  if (!entities.length) return [];

  const { data, error } = await supabase
    .from("tracker_activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;

  const allowed = new Set(entities.map((e) => `${e.entity_type}:${e.entity_id}`));
  return ((data ?? []) as TrackerActivity[]).filter((entry) =>
    allowed.has(`${entry.entity_type}:${entry.entity_id}`),
  );
}

export async function listTrackerProfilesForProject(
  supabase: SupabaseClient,
  project: TrackerProject,
) {
  const { data: members, error: membersError } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("business_id", project.business_id);
  if (membersError) throw membersError;

  const userIds = Array.from(
    new Set((members ?? []).map((row) => cleanString(row.user_id)).filter(Boolean)),
  );
  if (userIds.length === 0) return [] as TrackerProfile[];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, first_name, last_name, email, avatar_url")
    .in("id", userIds);
  if (profilesError) throw profilesError;

  return (profiles ?? []) as TrackerProfile[];
}

export async function createTrackerProject(
  supabase: SupabaseClient,
  input: {
    businessId: string;
    key: string;
    name: string;
    description?: string | null;
    ownerUserId: string;
    visibility?: "private" | "internal";
  },
) {
  const key = cleanString(input.key).toUpperCase();
  const name = cleanString(input.name);
  const description = cleanString(input.description);
  const { data, error } = await supabase
    .from("tracker_projects")
    .insert({
      business_id: input.businessId,
      key,
      name,
      description: description || null,
      owner_user_id: input.ownerUserId,
      visibility: input.visibility ?? "internal",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as TrackerProject;
}

export async function createTrackerItem(
  supabase: SupabaseClient,
  input: {
    projectId: string;
    epicId?: string | null;
    parentItemId?: string | null;
    sprintId?: string | null;
    type: TrackerItem["type"];
    title: string;
    description?: string | null;
    status?: TrackerItem["status"];
    priority?: TrackerItem["priority"];
    assigneeUserId?: string | null;
    reporterUserId?: string | null;
    dueDate?: string | null;
    position?: number | null;
  },
) {
  const { data, error } = await supabase
    .from("tracker_items")
    .insert({
      project_id: input.projectId,
      epic_id: input.epicId ?? null,
      parent_item_id: input.parentItemId ?? null,
      sprint_id: input.sprintId ?? null,
      type: input.type,
      code: "", // generated by trigger
      title: cleanString(input.title),
      description: cleanString(input.description) || null,
      status: input.status ?? "backlog",
      priority: input.priority ?? "medium",
      assignee_user_id: input.assigneeUserId ?? null,
      reporter_user_id: input.reporterUserId ?? null,
      due_date: input.dueDate ?? null,
      position: input.position ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as TrackerItem;
}

export async function patchTrackerItem(
  supabase: SupabaseClient,
  itemId: string,
  patch: Partial<TrackerItem>,
) {
  const payload = { ...patch };
  delete (payload as Partial<TrackerItem>).id;

  const { data, error } = await supabase
    .from("tracker_items")
    .update(payload)
    .eq("id", itemId)
    .select("*")
    .single();

  if (error) throw error;
  return data as TrackerItem;
}

export async function getTrackerItemById(
  supabase: SupabaseClient,
  itemId: string,
) {
  const { data, error } = await supabase
    .from("tracker_items")
    .select("*")
    .eq("id", itemId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as TrackerItem | null;
}

export async function addTrackerComment(
  supabase: SupabaseClient,
  input: { itemId: string; userId: string; body: string },
) {
  const { data, error } = await supabase
    .from("tracker_comments")
    .insert({
      item_id: input.itemId,
      user_id: input.userId,
      body: cleanString(input.body),
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as TrackerComment;
}

export async function insertTrackerActivity(
  supabase: SupabaseClient,
  input: {
    entityType: TrackerActivity["entity_type"];
    entityId: string;
    action: string;
    userId?: string | null;
    oldValue?: Record<string, unknown> | null;
    newValue?: Record<string, unknown> | null;
  },
) {
  const { error } = await supabase.from("tracker_activity_log").insert({
    entity_type: input.entityType,
    entity_id: input.entityId,
    action: cleanString(input.action),
    user_id: input.userId ?? null,
    old_value_json: input.oldValue ?? null,
    new_value_json: input.newValue ?? null,
  });
  if (error) throw error;
}

export async function moveTrackerItem(
  supabase: SupabaseClient,
  input: { itemId: string; status: TrackerItem["status"]; position?: number | null },
) {
  return patchTrackerItem(supabase, input.itemId, {
    status: input.status,
    position: input.position ?? null,
  });
}

export async function closeTrackerSprint(
  supabase: SupabaseClient,
  sprintId: string,
) {
  const { data: sprint, error: sprintError } = await supabase
    .from("tracker_sprints")
    .select("*")
    .eq("id", sprintId)
    .single();
  if (sprintError) throw sprintError;

  const { error: closeError } = await supabase
    .from("tracker_sprints")
    .update({ status: "closed" })
    .eq("id", sprintId);
  if (closeError) throw closeError;

  const { data: openItems, error: itemsError } = await supabase
    .from("tracker_items")
    .select("id,status")
    .eq("sprint_id", sprintId)
    .not("status", "in", "(done,canceled)");
  if (itemsError) throw itemsError;

  if ((openItems ?? []).length > 0) {
    const ids = (openItems ?? []).map((row) => String(row.id));
    const { error: rollbackError } = await supabase
      .from("tracker_items")
      .update({ sprint_id: null, status: "backlog" })
      .in("id", ids);
    if (rollbackError) throw rollbackError;
  }

  return sprint as TrackerSprint;
}
