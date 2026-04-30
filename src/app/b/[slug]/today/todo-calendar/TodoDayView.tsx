"use client";

import { useEffect, useRef } from "react";
import { format, isToday } from "date-fns";

import type { TodoCalendarItem } from "@/app/b/[slug]/today/todo-calendar/types";
import {
  buildTimedLanes,
  CALENDAR_HOUR_COUNT,
  CALENDAR_HOUR_HEIGHT,
  CALENDAR_HOUR_START,
  CALENDAR_TIMELINE_HEIGHT,
  getItemsForDate,
  getNowIndicatorTop,
  isCurrentHourVisible,
  isTimedItem,
} from "@/app/b/[slug]/today/todo-calendar/utils";
import { TodoCalendarItem as TodoCalendarItemCard } from "@/app/b/[slug]/today/todo-calendar/TodoCalendarItem";

export function TodoDayView({
  anchorDate,
  items,
  selectedItemId,
  onSelectItem,
}: {
  anchorDate: Date;
  items: TodoCalendarItem[];
  selectedItemId: string | null;
  onSelectItem: (item: TodoCalendarItem) => void;
}) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const allItems = getItemsForDate(items, anchorDate);
  const allDayItems = allItems.filter(
    (item) => item.allDay || !isTimedItem(item),
  );
  const timedItems = buildTimedLanes(allItems.filter(isTimedItem));
  const showNow = isToday(anchorDate) && isCurrentHourVisible();

  useEffect(() => {
    const container = timelineRef.current;
    if (container) {
      requestAnimationFrame(() => {
        const scrollOffset = (12 - CALENDAR_HOUR_START) * CALENDAR_HOUR_HEIGHT;
        container.scrollTo({ top: scrollOffset, behavior: "auto" });
      });
    }
  }, []);

  return (
    <div className="overflow-hidden rounded-[22px] border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div className="border-b border-[#F2F4F7] bg-[#FCFCFD] px-4 py-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#98A2B3] dark:text-white/45">
          Focused day
        </div>
        <div className="mt-1 text-[20px] font-semibold text-[#111827]">
          {format(anchorDate, "EEEE, MMMM d")}
        </div>
      </div>

      <div className="border-b border-[#F2F4F7] px-4 py-4">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#98A2B3] dark:text-white/45">
          All day
        </div>
        <div className="space-y-2">
          {allDayItems.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-[#E5E7EB] dark:border-white/10 bg-[#FCFCFD] px-4 py-4 text-sm text-[#667085]">
              No all-day items planned.
            </div>
          ) : (
            allDayItems.map((item) => (
              <TodoCalendarItemCard
                key={item.id}
                item={item}
                selected={selectedItemId === item.id}
                onClick={() => onSelectItem(item)}
              />
            ))
          )}
        </div>
      </div>

      <div ref={timelineRef} className="overflow-x-auto overflow-y-auto">
        <div className="grid min-w-[720px] grid-cols-[72px_minmax(0,1fr)]">
          <div
            className="relative w-[72px] shrink-0 border-r border-[#F2F4F7] bg-[#FCFCFD]"
            style={{ height: CALENDAR_TIMELINE_HEIGHT }}
          >
            {Array.from({ length: CALENDAR_HOUR_COUNT }).map((_, index) => {
              const hour = CALENDAR_HOUR_START + index;
              return (
                <div
                  key={hour}
                  className="absolute left-0 right-0 -translate-y-1/2 px-3 text-[11px] font-medium text-[#98A2B3] dark:text-white/45"
                  style={{
                    top: index * CALENDAR_HOUR_HEIGHT + CALENDAR_HOUR_HEIGHT / 2,
                  }}
                >
                  {format(new Date(2026, 0, 1, hour), "h a")}
                </div>
              );
            })}
          </div>

          <div
            className="relative"
            style={{ height: CALENDAR_TIMELINE_HEIGHT }}
          >
            {Array.from({ length: CALENDAR_HOUR_COUNT }).map((_, index) => (
              <div
                key={index}
                className="absolute left-0 right-0 border-t border-[#F2F4F7]"
                style={{ top: index * CALENDAR_HOUR_HEIGHT }}
              />
            ))}

            {showNow ? (
              <div
                className="absolute left-0 right-0 z-20 border-t border-[#EF4444]"
                style={{ top: getNowIndicatorTop() }}
              >
                <span className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full bg-[#EF4444]" />
              </div>
            ) : null}

            {timedItems.length === 0 ? (
              <div className="absolute inset-x-4 top-6 rounded-[16px] border border-dashed border-[#E5E7EB] dark:border-white/10 bg-[#FCFCFD] px-4 py-5 text-sm text-[#667085]">
                No timed items for this day.
              </div>
            ) : (
              timedItems.map((lane) => {
                const width = `${100 / lane.laneCount}%`;
                const left = `${(100 / lane.laneCount) * lane.lane}%`;
                return (
                  <div
                    key={lane.item.id}
                    className="absolute px-2"
                    style={{ top: lane.top, left, width, height: lane.height }}
                  >
                    <TodoCalendarItemCard
                      item={lane.item}
                      selected={selectedItemId === lane.item.id}
                      onClick={() => onSelectItem(lane.item)}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
