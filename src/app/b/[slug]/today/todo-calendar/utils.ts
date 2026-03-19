import {
  addDays,
  addMonths,
  addWeeks,
  differenceInMinutes,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";

import type {
  TodoCalendarFilter,
  TodoCalendarItem,
  TodoCalendarItemSubtype,
  TodoCalendarItemType,
  TodoCalendarView,
} from "@/app/b/[slug]/today/todo-calendar/types";

export const CALENDAR_HOUR_START = 6;
export const CALENDAR_HOUR_END = 22;
export const CALENDAR_HOUR_COUNT = CALENDAR_HOUR_END - CALENDAR_HOUR_START;
export const CALENDAR_TIMELINE_HEIGHT = CALENDAR_HOUR_COUNT * 64;

export function parseDateOnly(value: string) {
  return parseISO(`${value}T00:00:00`);
}

export function parseCalendarDateTime(value: string) {
  return value.length <= 10 ? parseDateOnly(value) : parseISO(value);
}

export function getItemDate(item: TodoCalendarItem) {
  return parseDateOnly(item.date);
}

export function getItemStart(item: TodoCalendarItem) {
  return parseCalendarDateTime(item.startsAt ?? item.date);
}

export function getItemEnd(item: TodoCalendarItem) {
  if (item.endsAt) return parseCalendarDateTime(item.endsAt);
  if (item.allDay) {
    const nextDay = addDays(parseDateOnly(item.date), 1);
    return new Date(nextDay.getTime() - 1);
  }
  return new Date(getItemStart(item).getTime() + 60 * 60 * 1000);
}

export function isTimedItem(item: TodoCalendarItem) {
  return !item.allDay && Boolean(item.startsAt);
}

export function isItemOnDate(item: TodoCalendarItem, date: Date) {
  return isSameDay(getItemDate(item), date);
}

export function toDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function getMonthDays(anchor: Date) {
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

export function getWeekDays(anchor: Date) {
  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  const end = endOfWeek(anchor, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

export function getPeriodLabel(view: TodoCalendarView, anchor: Date) {
  if (view === "month") return format(anchor, "MMMM yyyy");
  if (view === "day") return format(anchor, "EEEE, MMMM d");

  const days = getWeekDays(anchor);
  const first = days[0];
  const last = days[days.length - 1];
  if (isSameMonth(first, last)) {
    return `${format(first, "MMMM d")} - ${format(last, "d, yyyy")}`;
  }
  return `${format(first, "MMM d")} - ${format(last, "MMM d, yyyy")}`;
}

export function moveAnchorDate(anchor: Date, view: TodoCalendarView, direction: -1 | 1) {
  if (view === "month") return direction > 0 ? addMonths(anchor, 1) : subMonths(anchor, 1);
  if (view === "week") return direction > 0 ? addWeeks(anchor, 1) : subWeeks(anchor, 1);
  return direction > 0 ? addDays(anchor, 1) : subDays(anchor, 1);
}

export function getItemsForDate(items: TodoCalendarItem[], date: Date) {
  return sortCalendarItems(items.filter((item) => isItemOnDate(item, date)));
}

export function sortCalendarItems(items: TodoCalendarItem[]) {
  return [...items].sort((left, right) => {
    if (left.allDay !== right.allDay) return left.allDay ? -1 : 1;
    const leftStart = getItemStart(left).getTime();
    const rightStart = getItemStart(right).getTime();
    if (leftStart !== rightStart) return leftStart - rightStart;
    return (left.createdAt ?? "").localeCompare(right.createdAt ?? "");
  });
}

export function getTimeLabel(item: TodoCalendarItem) {
  if (item.allDay) return "All day";

  const start = getItemStart(item);
  const end = getItemEnd(item);
  const startLabel = format(start, "h:mm a");
  if (!item.endsAt) return startLabel;
  return `${startLabel} - ${format(end, "h:mm a")}`;
}

export function getShortTimeLabel(item: TodoCalendarItem) {
  if (item.allDay) return "All day";
  return format(getItemStart(item), "h:mm a");
}

export function getItemTypeLabel(type: TodoCalendarItemType) {
  if (type === "follow_up") return "Follow-up";
  if (type === "order") return "Order";
  return "Checklist";
}

export function getItemTypeClasses(type: TodoCalendarItemType, status?: TodoCalendarItem["status"]) {
  if (status === "overdue") {
    return {
      tint: "bg-[#FEF2F2] text-[#B42318] border-[#FECACA]",
      dot: "bg-[#D92D20]",
      soft: "bg-[#FFF6F5]",
    };
  }

  if (type === "follow_up") {
    return {
      tint: "bg-[#EEF2FF] text-[#3645A0] border-[#C7D2FE]",
      dot: "bg-[#5558E3]",
      soft: "bg-[#F8FAFF]",
    };
  }

  if (type === "order") {
    return {
      tint: "bg-[#F3F4F6] text-[#475467] border-[#D0D5DD]",
      dot: "bg-[#667085]",
      soft: "bg-[#FBFCFE]",
    };
  }

  return {
    tint: "bg-[#ECFDF3] text-[#027A48] border-[#ABEFC6]",
    dot: "bg-[#12B76A]",
    soft: "bg-[#F4FFF8]",
  };
}

export function filterCalendarItems(items: TodoCalendarItem[], filter: TodoCalendarFilter) {
  if (filter === "all") return items;
  return items.filter((item) => item.type === filter);
}

export function getSelectedDateFallback(items: TodoCalendarItem[], fallback = new Date()) {
  if (items.length === 0) return toDateKey(fallback);
  return sortCalendarItems(items)[0]?.date ?? toDateKey(fallback);
}

export function inferFollowUpSubtype(title: string): TodoCalendarItemSubtype {
  const normalized = title.trim().toLowerCase();
  if (normalized.includes("call") || normalized.includes("phone")) return "call" satisfies TodoCalendarItemSubtype;
  if (normalized.includes("email") || normalized.includes("mail")) return "email" satisfies TodoCalendarItemSubtype;
  if (normalized.includes("meeting") || normalized.includes("visit")) return "meeting" satisfies TodoCalendarItemSubtype;
  if (normalized.includes("message") || normalized.includes("whatsapp") || normalized.includes("sms")) {
    return "message" satisfies TodoCalendarItemSubtype;
  }
  return "task" satisfies TodoCalendarItemSubtype;
}

type TimedLaneItem = {
  item: TodoCalendarItem;
  lane: number;
  laneCount: number;
  top: number;
  height: number;
};

export function buildTimedLanes(items: TodoCalendarItem[]) {
  const timed = sortCalendarItems(items.filter(isTimedItem));
  const lanes: Array<{ end: Date }> = [];
  const results: TimedLaneItem[] = [];

  for (const item of timed) {
    const start = getItemStart(item);
    const end = getItemEnd(item);
    let laneIndex = lanes.findIndex((lane) => lane.end <= start);
    if (laneIndex === -1) {
      laneIndex = lanes.length;
      lanes.push({ end });
    } else {
      lanes[laneIndex] = { end };
    }

    const minutesFromTop = differenceInMinutes(start, startOfDay(start)) - CALENDAR_HOUR_START * 60;
    const duration = Math.max(30, differenceInMinutes(end, start));

    results.push({
      item,
      lane: laneIndex,
      laneCount: 1,
      top: Math.max(0, (minutesFromTop / 60) * 64),
      height: Math.max(42, (duration / 60) * 64),
    });
  }

  for (const result of results) {
    const start = getItemStart(result.item);
    const end = getItemEnd(result.item);
    const overlapping = results.filter((candidate) => {
      if (candidate.item.id === result.item.id) return false;
      const candidateStart = getItemStart(candidate.item);
      const candidateEnd = getItemEnd(candidate.item);
      return candidateStart < end && candidateEnd > start;
    });
    result.laneCount = Math.max(result.lane + 1, ...overlapping.map((candidate) => candidate.lane + 1), 1);
  }

  return results;
}

export function isCurrentHourVisible() {
  const now = new Date();
  const hour = now.getHours();
  return hour >= CALENDAR_HOUR_START && hour <= CALENDAR_HOUR_END;
}

export function getNowIndicatorTop() {
  const now = new Date();
  const minutesFromTop = (now.getHours() - CALENDAR_HOUR_START) * 60 + now.getMinutes();
  return (minutesFromTop / 60) * 64;
}

export function isTodayDateKey(value: string) {
  return isToday(parseDateOnly(value));
}
