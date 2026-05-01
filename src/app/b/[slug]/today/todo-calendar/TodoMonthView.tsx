"use client";

import * as React from "react";
import { format, isSameDay, isToday } from "date-fns";

import type { TodoCalendarItem } from "@/app/b/[slug]/today/todo-calendar/types";
import { getItemsForDate, getMonthDays, toDateKey } from "@/app/b/[slug]/today/todo-calendar/utils";
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
  const selectedCellRef = React.useRef<HTMLDivElement | null>(null);
  const selectedKey = toDateKey(selectedDate);

  // When the selected day changes (e.g. user clicks an item from the side
  // list whose date is in a different week of the visible month), bring that
  // cell into the viewport so they aren't left staring at an empty top row.
  React.useEffect(() => {
    selectedCellRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [selectedKey]);

  return (
    <div className="overflow-hidden rounded-[24px] border border-[#DDE3EA] dark:border-white/10 bg-white dark:bg-white/[0.04] shadow-[0_16px_34px_rgba(15,23,42,0.08)] dark:shadow-[0_16px_34px_rgba(0,0,0,0.45)]">
      <div className="grid grid-cols-7 border-b border-[#EDEFF4] dark:border-white/10 bg-[#F8FAFC] dark:bg-white/[0.04]">
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
              ref={selected ? selectedCellRef : undefined}
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
                "min-h-[166px] border-b border-r border-[#EDF0F5] dark:border-white/10 px-3 py-3 text-left align-top transition",
                outside && "bg-[#FAFBFE] dark:bg-white/[0.02]",
                selected
                  ? "bg-[#EEF3FF] dark:bg-[var(--brand-600)]/15 shadow-[inset_0_0_0_1px_#C7D2FE] dark:shadow-[inset_0_0_0_1px_var(--brand-500)]/40"
                  : "hover:bg-[#F8FAFD] dark:hover:bg-white/[0.04]",
              )}
            >
              <div className="mb-3 flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold",
                    today
                      ? "border border-[#C7D2FE] dark:border-[var(--brand-500)]/40 bg-[#E9EDFF] dark:bg-[var(--brand-600)]/20 text-[#3645A0] dark:text-[var(--brand-300)]"
                      : selected
                        ? "border border-[#BFC9D6] dark:border-white/15 bg-white dark:bg-white/[0.06] text-[#0F172A] dark:text-white"
                        : outside
                          ? "text-[#98A2B3] dark:text-white/45"
                          : "text-[#344054] dark:text-white/85",
                  )}
                >
                  {format(day, "d")}
                </span>
                {dayItems.length > 0 ? <span className="text-[11px] font-semibold text-[#98A2B3] dark:text-white/45">{dayItems.length}</span> : null}
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
                  <div className="px-1 pt-0.5 text-[11px] font-semibold text-[#475467] dark:text-white/70">+{hiddenCount} more</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
