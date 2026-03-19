export type FollowUpStatus = "open" | "done" | "cancelled";
export type FollowUpSource = "manual" | "end_of_day" | "order";

export type FollowUpRow = {
  id: string;
  business_id: string;
  workspace_id: string | null;
  order_id: string | null;
  title: string;
  due_date: string;
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
