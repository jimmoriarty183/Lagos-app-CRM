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
              "inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[12px] font-semibold transition shadow-[0_2px_8px_rgba(15,23,42,0.04)]",
              active
                ? "border-[#BFC9FF] dark:border-[var(--brand-500)]/40 bg-[#E8EDFF] dark:bg-[var(--brand-600)]/20 text-[#2F3E9E] dark:text-[var(--brand-300)]"
                : "border-[#DDE3EA] dark:border-white/10 bg-white dark:bg-white/[0.04] text-[#667085] dark:text-white/65 hover:border-[#C9D2E0] dark:hover:border-white/20 hover:text-[#334155] dark:hover:text-white",
            )}
          >
            <span>{filter.label}</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px]",
                active
                  ? "bg-white/85 dark:bg-white/[0.10] text-[#2F3E9E] dark:text-[var(--brand-300)]"
                  : "bg-[#F3F4F6] dark:bg-white/[0.06] text-[#64748B] dark:text-white/55",
              )}
            >
              {counts[filter.value] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}
