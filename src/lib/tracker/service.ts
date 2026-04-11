import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addTrackerComment,
  closeTrackerSprint,
  createTrackerItem,
  createTrackerProject,
  getTrackerItemById,
  getTrackerProjectById,
  insertTrackerActivity,
  listActivityByProject,
  listCommentsByProject,
  listTrackerEpics,
  listTrackerItems,
  listTrackerProfilesForProject,
  listTrackerProjects,
  listTrackerSprints,
  moveTrackerItem,
  patchTrackerItem,
} from "@/lib/tracker/repository";
import type {
  TrackerDashboardSummary,
  TrackerFilters,
  TrackerItem,
  TrackerProjectSnapshot,
} from "@/lib/tracker/types";

function getDoneInLast7Days(items: TrackerItem[]) {
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return items.filter((item) => {
    if (!item.completed_at) return false;
    const completedAt = new Date(item.completed_at).getTime();
    return Number.isFinite(completedAt) && now - completedAt <= sevenDaysMs;
  }).length;
}

function isOverdue(item: TrackerItem) {
  if (!item.due_date) return false;
  if (item.status === "done" || item.status === "canceled") return false;
  return item.due_date < new Date().toISOString().slice(0, 10);
}

function buildSummary(args: {
  items: TrackerItem[];
  userId: string;
  projectsCount: number;
  activeSprintIds: string[];
}): TrackerDashboardSummary {
  const myTasks = args.items.filter((item) => item.assignee_user_id === args.userId).length;
  const overdue = args.items.filter(isOverdue).length;
  const activeSprintItems = args.items.filter(
    (item) => Boolean(item.sprint_id && args.activeSprintIds.includes(item.sprint_id)),
  ).length;
  const doneThisWeek = getDoneInLast7Days(args.items);

  return {
    myTasks,
    overdue,
    activeSprintItems,
    doneThisWeek,
    projectsCount: args.projectsCount,
  };
}

export async function getTrackerLandingData(
  supabase: SupabaseClient,
  userId: string,
) {
  const projects = await listTrackerProjects(supabase);
  const firstProject = projects[0];
  if (!firstProject) {
    return {
      projects: [],
      snapshot: null as TrackerProjectSnapshot | null,
    };
  }

  const snapshot = await getProjectSnapshot(supabase, {
    projectId: firstProject.id,
    filters: {},
    userId,
    projectsCount: projects.length,
  });

  return {
    projects,
    snapshot,
  };
}

export async function getProjectSnapshot(
  supabase: SupabaseClient,
  input: {
    projectId: string;
    userId: string;
    filters?: TrackerFilters;
    projectsCount?: number;
  },
) {
  const project = await getTrackerProjectById(supabase, input.projectId);
  if (!project) return null;

  const [epics, sprints, items, comments, activity, profiles] = await Promise.all([
    listTrackerEpics(supabase, project.id),
    listTrackerSprints(supabase, project.id),
    listTrackerItems(supabase, project.id, input.filters ?? {}),
    listCommentsByProject(supabase, project.id),
    listActivityByProject(supabase, project.id),
    listTrackerProfilesForProject(supabase, project),
  ]);

  const activeSprintIds = sprints
    .filter((sprint) => sprint.status === "active")
    .map((sprint) => sprint.id);

  const summary = buildSummary({
    items,
    userId: input.userId,
    projectsCount: input.projectsCount ?? 1,
    activeSprintIds,
  });

  return {
    project,
    epics,
    sprints,
    items,
    comments,
    activity,
    profiles,
    summary,
  } satisfies TrackerProjectSnapshot;
}

export async function createProjectWithAudit(
  supabase: SupabaseClient,
  input: {
    businessId: string;
    key: string;
    name: string;
    description?: string | null;
    ownerUserId: string;
  },
) {
  const project = await createTrackerProject(supabase, input);
  await insertTrackerActivity(supabase, {
    entityType: "project",
    entityId: project.id,
    action: "created",
    userId: input.ownerUserId,
    newValue: {
      key: project.key,
      name: project.name,
    },
  });
  return project;
}

export async function createItemWithAudit(
  supabase: SupabaseClient,
  input: {
    projectId: string;
    type: TrackerItem["type"];
    title: string;
    description?: string | null;
    status?: TrackerItem["status"];
    priority?: TrackerItem["priority"];
    assigneeUserId?: string | null;
    reporterUserId?: string | null;
    epicId?: string | null;
    parentItemId?: string | null;
    sprintId?: string | null;
    dueDate?: string | null;
    position?: number | null;
    actorUserId: string;
  },
) {
  const item = await createTrackerItem(supabase, input);
  await insertTrackerActivity(supabase, {
    entityType: "item",
    entityId: item.id,
    action: "created",
    userId: input.actorUserId,
    newValue: {
      code: item.code,
      title: item.title,
      status: item.status,
      priority: item.priority,
    },
  });
  return item;
}

export async function updateItemWithAudit(
  supabase: SupabaseClient,
  input: {
    itemId: string;
    patch: Partial<TrackerItem>;
    actorUserId: string;
  },
) {
  const before = await getTrackerItemById(supabase, input.itemId);
  if (!before) {
    throw new Error(`Tracker item ${input.itemId} not found`);
  }
  const next = await patchTrackerItem(supabase, input.itemId, input.patch);

  await insertTrackerActivity(supabase, {
    entityType: "item",
    entityId: next.id,
    action: "updated",
    userId: input.actorUserId,
    oldValue: {
      status: before.status,
      priority: before.priority,
      assignee_user_id: before.assignee_user_id,
      due_date: before.due_date,
      sprint_id: before.sprint_id,
      epic_id: before.epic_id,
      project_id: before.project_id,
      parent_item_id: before.parent_item_id,
    },
    newValue: {
      status: next.status,
      priority: next.priority,
      assignee_user_id: next.assignee_user_id,
      due_date: next.due_date,
      sprint_id: next.sprint_id,
      epic_id: next.epic_id,
      project_id: next.project_id,
      parent_item_id: next.parent_item_id,
    },
  });

  return next;
}

export async function moveItemWithAudit(
  supabase: SupabaseClient,
  input: {
    itemId: string;
    status: TrackerItem["status"];
    position?: number | null;
    actorUserId: string;
  },
) {
  const item = await moveTrackerItem(supabase, {
    itemId: input.itemId,
    status: input.status,
    position: input.position ?? null,
  });
  await insertTrackerActivity(supabase, {
    entityType: "item",
    entityId: item.id,
    action: "status_changed",
    userId: input.actorUserId,
    newValue: {
      status: item.status,
      position: item.position,
    },
  });
  return item;
}

export async function createCommentWithAudit(
  supabase: SupabaseClient,
  input: {
    itemId: string;
    userId: string;
    body: string;
  },
) {
  const comment = await addTrackerComment(supabase, input);
  await insertTrackerActivity(supabase, {
    entityType: "comment",
    entityId: comment.id,
    action: "created",
    userId: input.userId,
    newValue: {
      item_id: comment.item_id,
    },
  });
  return comment;
}

export async function closeSprintWithAudit(
  supabase: SupabaseClient,
  input: {
    sprintId: string;
    actorUserId: string;
  },
) {
  const sprint = await closeTrackerSprint(supabase, input.sprintId);
  await insertTrackerActivity(supabase, {
    entityType: "sprint",
    entityId: sprint.id,
    action: "closed",
    userId: input.actorUserId,
    newValue: {
      status: "closed",
      rollback_unfinished_to_backlog: true,
    },
  });
  return sprint;
}
