"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import type { TodoCalendarView } from "@/app/b/[slug]/today/todo-calendar/types";
import { TodoViewModeSwitch } from "@/app/b/[slug]/today/todo-calendar/TodoViewModeSwitch";

export function TodoCalendarToolbar({
  periodLabel,
  view,
  onViewChange,
  onToday,
  onPrevious,
  onNext,
}: {
  periodLabel: string;
  view: TodoCalendarView;
  onViewChange: (value: TodoCalendarView) => void;
  onToday: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[22px] border border-[#E5E7EB] bg-[linear-gradient(180deg,#ffffff_0%,#F9FAFB_100%)] px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-[16px] border border-[#E5E7EB] bg-white p-1">
          <button
            type="button"
            onClick={onPrevious}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[12px] text-[#667085] transition hover:bg-[#F3F4F6] hover:text-[#111827]"
            aria-label="Previous period"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onNext}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[12px] text-[#667085] transition hover:bg-[#F3F4F6] hover:text-[#111827]"
            aria-label="Next period"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onToday}
          className="inline-flex h-10 items-center rounded-[14px] border border-[#E5E7EB] bg-white px-3.5 text-[13px] font-semibold text-[#344054] transition hover:border-[#D0D5DD] hover:text-[#111827]"
        >
          Today
        </button>

        <div>
          <div className="product-section-label">Calendar</div>
          <div className="mt-0.5 text-[18px] font-semibold text-[#111827]">{periodLabel}</div>
        </div>
      </div>

      <TodoViewModeSwitch
        value={view}
        size="sm"
        onChange={onViewChange}
        options={[
          { value: "month", label: "Month" },
          { value: "week", label: "Week" },
          { value: "day", label: "Day" },
        ]}
      />
    </div>
  );
}
