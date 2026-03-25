export type FollowUpStatus = "open" | "done" | "cancelled";
export type FollowUpSource = "manual" | "end_of_day" | "order";
export type FollowUpActionType =
  | "meeting"
  | "reminder"
  | "task"
  | "message"
  | "manual";

export type FollowUpRow = {
  id: string;
  business_id: string;
  workspace_id: string | null;
  order_id: string | null;
  title: string;
  due_date: string;
  due_at: string | null;
  status: FollowUpStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  completed_by: string | null;
  next_follow_up_id: string | null;
  note: string | null;
  completion_note: string | null;
  source: string | null;
  action_type: FollowUpActionType | null;
  action_payload: Record<string, unknown> | null;
};

export function normalizeDateOnly(value: string | null | undefined) {
  const match = String(value ?? "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function formatDateOnlyForStorage(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfLocalDay(input = new Date()) {
  return new Date(input.getFullYear(), input.getMonth(), input.getDate());
}

export function getTodayDateOnly() {
  return formatDateOnlyForStorage(startOfLocalDay());
}

export function getTomorrowDateOnly() {
  return formatDateOnlyForStorage(addDays(startOfLocalDay(), 1));
}

export function compareDateOnly(a: string, b: string) {
  return a.localeCompare(b);
}

export function isOverdueDateOnly(value: string, today = getTodayDateOnly()) {
  return compareDateOnly(value, today) < 0;
}

export function formatFollowUpDate(value: string, locale = "en-US") {
  const date = normalizeDateOnly(value);
  if (!date) return value;

  const now = new Date();
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  }).format(date);
}

export function getRelativeFollowUpLabel(
  value: string,
  today = getTodayDateOnly(),
) {
  if (value === today) return "Today";
  if (value === getTomorrowDateOnly()) return "Tomorrow";
  if (isOverdueDateOnly(value, today)) return "Overdue";
  return formatFollowUpDate(value);
}

export function normalizeDateTime(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  
  // If it's already an ISO string with time, parse it
  if (trimmed.includes("T") || trimmed.includes(" ")) {
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  }
  
  // If it's just a date, treat as all-day (no time)
  return null;
}

export function formatDateTimeForStorage(date: Date) {
  return date.toISOString();
}

export function formatDateTimeLocalInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function parseDateTimeLocalInput(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function isFollowUpAllDay(followUp: { due_at?: string | null }): boolean {
  return !followUp.due_at;
}

export function getFollowUpStartsAt(followUp: { due_date: string; due_at?: string | null }): string | undefined {
  if (followUp.due_at) return followUp.due_at;
  return undefined;
}

export function formatFollowUpDateTime(value: string | null | undefined, locale = "en-US") {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatFollowUpDateTimeWithDate(value: string | null | undefined, locale = "en-US") {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/**
 * Check if a follow-up item has a specific time set
 */
export function hasFollowUpTime(followUp: { due_at?: string | null }): boolean {
  return Boolean(followUp.due_at);
}

/**
 * Sort follow-up items by time presence and value:
 * - First: items WITH time (sorted ascending by time)
 * - Then: items WITHOUT time (sorted by created_at descending)
 */
export function sortFollowUpItems<T extends FollowUpRow>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aHasTime = hasFollowUpTime(a);
    const bHasTime = hasFollowUpTime(b);

    // Items with time come first
    if (aHasTime && !bHasTime) return -1;
    if (!aHasTime && bHasTime) return 1;

    // Both have time: sort by time ascending
    if (aHasTime && bHasTime && a.due_at && b.due_at) {
      return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
    }

    // Both without time: sort by created_at descending (newer first)
    return b.created_at.localeCompare(a.created_at);
  });
}
