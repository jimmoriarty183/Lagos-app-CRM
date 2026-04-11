export const TRACKER_ITEM_TYPES = [
  "story",
  "task",
  "subtask",
  "bug",
  "improvement",
  "research",
  "support",
  "chore",
] as const;

export const TRACKER_ITEM_STATUSES = [
  "backlog",
  "selected",
  "in_progress",
  "review",
  "blocked",
  "done",
  "canceled",
] as const;

export const TRACKER_ITEM_PRIORITIES = [
  "low",
  "medium",
  "high",
  "critical",
] as const;

export const TRACKER_PROJECT_ROLES = [
  "admin",
  "owner",
  "lead",
  "member",
  "viewer",
] as const;

export const TRACKER_SPRINT_STATUSES = ["planned", "active", "closed"] as const;

export type TrackerItemType = (typeof TRACKER_ITEM_TYPES)[number];
export type TrackerItemStatus = (typeof TRACKER_ITEM_STATUSES)[number];
export type TrackerItemPriority = (typeof TRACKER_ITEM_PRIORITIES)[number];
export type TrackerProjectRole = (typeof TRACKER_PROJECT_ROLES)[number];
export type TrackerSprintStatus = (typeof TRACKER_SPRINT_STATUSES)[number];

export type TrackerProject = {
  id: string;
  business_id: string;
  key: string;
  name: string;
  description: string | null;
  owner_user_id: string;
  status: "active" | "archived";
  visibility: "private" | "internal";
  created_at: string;
  updated_at: string;
};

export type TrackerEpic = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  owner_user_id: string | null;
  assignee_user_id: string | null;
  status: TrackerItemStatus;
  priority: TrackerItemPriority;
  due_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TrackerSprint = {
  id: string;
  project_id: string;
  name: string;
  goal: string | null;
  start_date: string | null;
  end_date: string | null;
  status: TrackerSprintStatus;
  created_at: string;
  updated_at: string;
};

export type TrackerItem = {
  id: string;
  project_id: string;
  epic_id: string | null;
  parent_item_id: string | null;
  sprint_id: string | null;
  type: TrackerItemType;
  code: string;
  title: string;
  description: string | null;
  status: TrackerItemStatus;
  priority: TrackerItemPriority;
  assignee_user_id: string | null;
  reporter_user_id: string | null;
  estimate_value: number | null;
  estimate_unit: string | null;
  spent_time: number | null;
  start_date: string | null;
  due_date: string | null;
  position: number | null;
  story_points: number | null;
  checklist_json: unknown | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type TrackerComment = {
  id: string;
  item_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type TrackerActivity = {
  id: string;
  entity_type: "project" | "epic" | "item" | "sprint" | "comment";
  entity_id: string;
  action: string;
  old_value_json: Record<string, unknown> | null;
  new_value_json: Record<string, unknown> | null;
  user_id: string | null;
  created_at: string;
};

export type TrackerProfile = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

export type TrackerFilters = {
  projectId?: string | null;
  epicId?: string | null;
  type?: TrackerItemType | null;
  status?: TrackerItemStatus | null;
  priority?: TrackerItemPriority | null;
  assigneeUserId?: string | null;
  sprintId?: string | null;
  labelIds?: string[];
  overdue?: boolean;
  unassigned?: boolean;
  search?: string | null;
};

export type TrackerDashboardSummary = {
  myTasks: number;
  overdue: number;
  activeSprintItems: number;
  doneThisWeek: number;
  projectsCount: number;
};

export type TrackerProjectSnapshot = {
  project: TrackerProject;
  epics: TrackerEpic[];
  sprints: TrackerSprint[];
  items: TrackerItem[];
  comments: TrackerComment[];
  activity: TrackerActivity[];
  profiles: TrackerProfile[];
  summary: TrackerDashboardSummary;
};
