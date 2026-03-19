export type TodoCalendarItemType = "follow_up" | "order" | "checklist";

export type TodoCalendarItemSubtype =
  | "call"
  | "message"
  | "meeting"
  | "email"
  | "task";

export type TodoCalendarItemStatus = "open" | "done" | "overdue";

export type TodoCalendarView = "month" | "week" | "day";
export type TodoDisplayMode = "list" | "calendar";
export type TodoCalendarFilter = "all" | TodoCalendarItemType;

export type TodoCalendarItem = {
  id: string;
  type: TodoCalendarItemType;
  subtype?: TodoCalendarItemSubtype;
  title: string;
  startsAt?: string;
  endsAt?: string;
  date: string;
  allDay: boolean;
  status?: TodoCalendarItemStatus;
  orderId?: string;
  orderLabel?: string;
  orderHref?: string;
  sourceLabel?: string;
  statusLabel?: string;
  createdAt?: string;
};
