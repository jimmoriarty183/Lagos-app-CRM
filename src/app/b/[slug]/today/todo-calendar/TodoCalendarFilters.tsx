"use client";

import type { TodoCalendarFilter } from "@/app/b/[slug]/today/todo-calendar/types";
import { cn } from "@/components/ui/utils";

const FILTERS: Array<{ value: TodoCalendarFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "follow_up", label: "Follow-ups" },
  { value: "order", label: "Orders" },
  { value: "checklist", label: "Checklist" },
];

export function TodoCalendarFilters({
  value,
  counts,
  onChange,
}: {
  value: TodoCalendarFilter;
  counts: Record<TodoCalendarFilter, number>;
  onChange: (value: TodoCalendarFilter) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {FILTERS.map((filter) => {
        const active = filter.value === value;
        return (
          <button
            key={filter.value}
            type="button"
            onClick={() => onChange(filter.value)}
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[12px] font-semibold transition",
              active
                ? "border-[#C7D2FE] bg-[#EEF2FF] text-[#3645A0]"
                : "border-[#E5E7EB] bg-white text-[#667085] hover:border-[#D0D5DD] hover:text-[#344054]",
            )}
          >
            <span>{filter.label}</span>
            <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", active ? "bg-white/80" : "bg-[#F3F4F6]")}>
              {counts[filter.value] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}
