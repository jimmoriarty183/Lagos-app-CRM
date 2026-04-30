"use client";

import { format, isSameDay, isToday } from "date-fns";

import type { TodoCalendarItem } from "@/app/b/[slug]/today/todo-calendar/types";
import {
  buildTimedLanes,
  CALENDAR_HOUR_COUNT,
  CALENDAR_HOUR_START,
  CALENDAR_TIMELINE_HEIGHT,
  getItemsForDate,
  getNowIndicatorTop,
  getWeekDays,
  isCurrentHourVisible,
  isTimedItem,
} from "@/app/b/[slug]/today/todo-calendar/utils";
import { TodoCalendarItem as TodoCalendarItemCard } from "@/app/b/[slug]/today/todo-calendar/TodoCalendarItem";
import { cn } from "@/components/ui/utils";

function HourLabels() {
  return (
    <div className="relative w-[72px] shrink-0 border-r border-[#F2F4F7] bg-[#FCFCFD]">
      {Array.from({ length: CALENDAR_HOUR_COUNT + 1 }).map((_, index) => {
        const hour = CALENDAR_HOUR_START + index;
        return (
          <div
            key={hour}
            className="absolute left-0 right-0 -translate-y-1/2 px-3 text-[11px] font-medium text-[#98A2B3] dark:text-white/45"
            style={{ top: index * 64 }}
          >
            {format(new Date(2026, 0, 1, hour), "h a")}
          </div>
        );
      })}
    </div>
  );
}

export function TodoWeekView({
  anchorDate,
  items,
  selectedDate,
  selectedItemId,
  onSelectDate,
  onSelectItem,
}: {
  anchorDate: Date;
  items: TodoCalendarItem[];
  selectedDate: Date;
  selectedItemId: string | null;
  onSelectDate: (date: Date) => void;
  onSelectItem: (item: TodoCalendarItem) => void;
}) {
  const days = getWeekDays(anchorDate);

  return (
    <div className="overflow-hidden rounded-[22px] border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))] border-b border-[#F2F4F7] bg-[#FCFCFD]">
        <div className="border-r border-[#F2F4F7] px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#98A2B3] dark:text-white/45">
          Time
        </div>
        {days.map((day) => {
          const selected = isSameDay(day, selectedDate);
          const today = isToday(day);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDate(day)}
              className={cn(
                "border-r border-[#F2F4F7] px-3 py-3 text-left transition hover:bg-[#F9FAFB]",
                selected && "bg-[#F9FAFF]",
              )}
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#98A2B3] dark:text-white/45">{format(day, "EEE")}</div>
              <div className={cn("mt-1 text-[16px] font-semibold text-[#111827]", today && "text-[#3645A0] dark:text-[var(--brand-300)]")}>{format(day, "d")}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))] border-b border-[#F2F4F7]">
        <div className="border-r border-[#F2F4F7] px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#98A2B3] dark:text-white/45">
          All day
        </div>
        {days.map((day) => {
          const dayItems = getItemsForDate(items, day).filter((item) => item.allDay || !isTimedItem(item));
          return (
            <div key={day.toISOString()} className="min-h-[88px] border-r border-[#F2F4F7] px-2 py-2">
              <div className="space-y-1.5">
                {dayItems.length === 0 ? (
                  <div className="rounded-[12px] border border-dashed border-[#E5E7EB] dark:border-white/10 px-2 py-2 text-[11px] text-[#98A2B3] dark:text-white/45">No all-day items</div>
                ) : (
                  dayItems.map((item) => (
                    <TodoCalendarItemCard
                      key={item.id}
                      item={item}
                      compact
                      selected={selectedItemId === item.id}
                      onClick={() => onSelectItem(item)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[980px] grid-cols-[72px_repeat(7,minmax(0,1fr))]">
          <HourLabels />
          {days.map((day) => {
            const dayItems = getItemsForDate(items, day).filter(isTimedItem);
            const lanes = buildTimedLanes(dayItems);
            const showNow = isToday(day) && isCurrentHourVisible();

            return (
              <div key={day.toISOString()} className="relative border-r border-[#F2F4F7]" style={{ height: CALENDAR_TIMELINE_HEIGHT }}>
                {Array.from({ length: CALENDAR_HOUR_COUNT }).map((_, index) => (
                  <div
                    key={index}
                    className="absolute left-0 right-0 border-t border-[#F2F4F7]"
                    style={{ top: index * 64 }}
                  />
                ))}

                {showNow ? (
                  <div className="absolute left-0 right-0 z-20 border-t border-[#EF4444]" style={{ top: getNowIndicatorTop() }}>
                    <span className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full bg-[#EF4444]" />
                  </div>
                ) : null}

                {lanes.map((lane) => {
                  const width = `${100 / lane.laneCount}%`;
                  const left = `${(100 / lane.laneCount) * lane.lane}%`;
                  return (
                    <div
                      key={lane.item.id}
                      className="absolute px-1"
                      style={{ top: lane.top, left, width, height: lane.height }}
                    >
                      <TodoCalendarItemCard
                        item={lane.item}
                        selected={selectedItemId === lane.item.id}
                        onClick={() => onSelectItem(lane.item)}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
