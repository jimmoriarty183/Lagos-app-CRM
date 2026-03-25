"use client";

import { format, isSameDay, isToday } from "date-fns";

import type { TodoCalendarItem } from "@/app/b/[slug]/today/todo-calendar/types";
import { getItemsForDate, getMonthDays } from "@/app/b/[slug]/today/todo-calendar/utils";
import { TodoCalendarItem as TodoCalendarItemCard } from "@/app/b/[slug]/today/todo-calendar/TodoCalendarItem";
import { cn } from "@/components/ui/utils";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function TodoMonthView({
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
  const days = getMonthDays(anchorDate);

  return (
    <div className="overflow-hidden rounded-[24px] border border-[#DDE3EA] bg-white shadow-[0_16px_34px_rgba(15,23,42,0.08)]">
      <div className="grid grid-cols-7 border-b border-[#EDEFF4] bg-[linear-gradient(180deg,#FCFDFE_0%,#F8FAFC_100%)]">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#667085]">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-7">
        {days.map((day) => {
          const dayItems = getItemsForDate(items, day);
          const visibleItems = dayItems.slice(0, 3);
          const hiddenCount = Math.max(0, dayItems.length - visibleItems.length);
          const selected = isSameDay(day, selectedDate);
          const today = isToday(day);
          const outside = day.getMonth() !== anchorDate.getMonth();

          return (
            <div
              key={day.toISOString()}
              role="button"
              tabIndex={0}
              onClick={() => onSelectDate(day)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectDate(day);
                }
              }}
              className={cn(
                "min-h-[166px] border-b border-r border-[#EDF0F5] px-3 py-3 text-left align-top transition",
                outside && "bg-[#FAFBFE]",
                selected
                  ? "bg-[#EEF3FF] shadow-[inset_0_0_0_1px_#C7D2FE]"
                  : "hover:bg-[#F8FAFD]",
              )}
            >
              <div className="mb-3 flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold",
                    today
                      ? "border border-[#C7D2FE] bg-[#E9EDFF] text-[#3645A0]"
                      : selected
                        ? "border border-[#BFC9D6] bg-white text-[#0F172A]"
                        : outside
                          ? "text-[#98A2B3]"
                          : "text-[#344054]",
                  )}
                >
                  {format(day, "d")}
                </span>
                {dayItems.length > 0 ? <span className="text-[11px] font-semibold text-[#98A2B3]">{dayItems.length}</span> : null}
              </div>

              <div className="space-y-1.5">
                {visibleItems.map((item) => (
                  <TodoCalendarItemCard
                    key={item.id}
                    item={item}
                    compact
                    selected={selectedItemId === item.id}
                    onClick={() => onSelectItem(item)}
                  />
                ))}

                {hiddenCount > 0 ? (
                  <div className="px-1 pt-0.5 text-[11px] font-semibold text-[#475467]">+{hiddenCount} more</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
