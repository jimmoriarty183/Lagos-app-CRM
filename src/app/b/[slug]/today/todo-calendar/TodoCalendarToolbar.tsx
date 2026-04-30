"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";

import type { TodoCalendarView } from "@/app/b/[slug]/today/todo-calendar/types";
import { TodoViewModeSwitch } from "@/app/b/[slug]/today/todo-calendar/TodoViewModeSwitch";

export function TodoCalendarToolbar({
  periodLabel,
  view,
  onViewChange,
  onToday,
  onPrevious,
  onNext,
  actions,
}: {
  periodLabel: string;
  view: TodoCalendarView;
  onViewChange: (value: TodoCalendarView) => void;
  onToday: () => void;
  onPrevious: () => void;
  onNext: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[24px] border border-[#DDE3F1] bg-[linear-gradient(125deg,#FFFFFF_0%,#F8FAFF_55%,#F1F5FF_100%)] px-4 py-4 shadow-[0_16px_34px_rgba(15,23,42,0.08)] lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="inline-flex rounded-[16px] border border-[#D8DFEA] bg-white dark:bg-white/[0.03] p-1 shadow-[0_4px_14px_rgba(15,23,42,0.08)]">
          <button
            type="button"
            onClick={onPrevious}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[12px] text-[#667085] transition hover:bg-[#EEF2FF] hover:text-[#3645A0]"
            aria-label="Previous period"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onNext}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[12px] text-[#667085] transition hover:bg-[#EEF2FF] hover:text-[#3645A0]"
            aria-label="Next period"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onToday}
          className="inline-flex h-10 items-center rounded-[14px] border border-[#CBD5E1] bg-white dark:bg-white/[0.03] px-3.5 text-[13px] font-semibold text-[#1E293B] dark:text-white/90 shadow-[0_3px_12px_rgba(15,23,42,0.06)] transition hover:border-[#C7D2FE] hover:text-[#3645A0]"
        >
          Today
        </button>

        <div>
          <div className="product-section-label text-[#667085]">Calendar</div>
          <div className="mt-0.5 text-[18px] font-semibold text-[#0F172A] dark:text-white">{periodLabel}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {actions}
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
    </div>
  );
}
