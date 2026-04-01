"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  type TodayFollowUpItem,
  TodayFollowUpsView,
} from "@/app/b/[slug]/today/TodayFollowUpsView";
import { TodoCalendarDetailsPanel } from "@/app/b/[slug]/today/todo-calendar/TodoCalendarDetailsPanel";
import { TodoCalendarFilters } from "@/app/b/[slug]/today/todo-calendar/TodoCalendarFilters";
import { TodoCalendarToolbar } from "@/app/b/[slug]/today/todo-calendar/TodoCalendarToolbar";
import { TodoDayView } from "@/app/b/[slug]/today/todo-calendar/TodoDayView";
import { TodoMonthView } from "@/app/b/[slug]/today/todo-calendar/TodoMonthView";
import type {
  TodoCalendarFilter,
  TodoCalendarItem,
  TodoCalendarView,
  TodoDisplayMode,
} from "@/app/b/[slug]/today/todo-calendar/types";
import {
  filterCalendarItems,
  getItemsForDate,
  getPeriodLabel,
  getSelectedDateFallback,
  moveAnchorDate,
  parseDateOnly,
  sortCalendarItems,
  toDateKey,
} from "@/app/b/[slug]/today/todo-calendar/utils";
import { TodoViewModeSwitch } from "@/app/b/[slug]/today/todo-calendar/TodoViewModeSwitch";
import { TodoWeekView } from "@/app/b/[slug]/today/todo-calendar/TodoWeekView";

export function TodoWorkspaceView({
  businessSlug,
  canManage,
  initialItems,
  calendarItems,
  initialMode,
}: {
  businessSlug: string;
  canManage: boolean;
  initialItems: TodayFollowUpItem[];
  calendarItems: TodoCalendarItem[];
  initialMode: TodoDisplayMode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mode, setMode] = React.useState<TodoDisplayMode>(initialMode);
  const [calendarView, setCalendarView] = React.useState<TodoCalendarView>("month");
  const [calendarFilter, setCalendarFilter] = React.useState<TodoCalendarFilter>("all");
  const [anchorDate, setAnchorDate] = React.useState(() => new Date());
  const [detailsCollapsed, setDetailsCollapsed] = React.useState(false);

  const filteredItems = React.useMemo(
    () => sortCalendarItems(filterCalendarItems(calendarItems, calendarFilter)),
    [calendarFilter, calendarItems],
  );

  const [selectedDateKey, setSelectedDateKey] = React.useState(() =>
    getSelectedDateFallback(filteredItems, new Date()),
  );
  const [selectedItemId, setSelectedItemId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const modeParam = String(searchParams.get("mode") ?? "")
      .trim()
      .toLowerCase();
    const nextMode: TodoDisplayMode = modeParam === "calendar" ? "calendar" : "list";
    setMode((current) => (current === nextMode ? current : nextMode));
  }, [searchParams]);

  const handleModeChange = React.useCallback(
    (nextMode: TodoDisplayMode) => {
      setMode(nextMode);
      const params = new URLSearchParams(searchParams.toString());
      if (nextMode === "calendar") params.set("mode", "calendar");
      else params.delete("mode");
      const nextSearch = params.toString();
      const nextHref = `${pathname}${nextSearch ? `?${nextSearch}` : ""}`;
      router.replace(nextHref, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  React.useEffect(() => {
    if (filteredItems.length === 0) {
      setSelectedItemId(null);
      setSelectedDateKey(toDateKey(new Date()));
      return;
    }

    const stillVisible = selectedItemId
      ? filteredItems.some((item) => item.id === selectedItemId)
      : false;
    if (!stillVisible) setSelectedItemId(filteredItems[0]?.id ?? null);
  }, [filteredItems, selectedItemId]);

  const counts = React.useMemo(
    () => ({
      all: calendarItems.length,
      follow_up: calendarItems.filter((item) => item.type === "follow_up").length,
      order: calendarItems.filter((item) => item.type === "order").length,
      checklist: calendarItems.filter((item) => item.type === "checklist").length,
    }),
    [calendarItems],
  );

  const selectedDate = parseDateOnly(selectedDateKey);
  const selectedItem =
    filteredItems.find((item) => item.id === selectedItemId) ??
    getItemsForDate(filteredItems, selectedDate)[0] ??
    null;

  const handleSelectDate = React.useCallback((date: Date) => {
    const key = toDateKey(date);
    setSelectedDateKey(key);
    const nextItem = getItemsForDate(filteredItems, date)[0] ?? null;
    setSelectedItemId(nextItem?.id ?? null);
    setDetailsCollapsed(false);
  }, [filteredItems]);

  React.useEffect(() => {
    const modeParam = String(searchParams.get("mode") ?? "")
      .trim()
      .toLowerCase();
    if (modeParam !== "calendar") return;

    const viewParam = String(searchParams.get("view") ?? "")
      .trim()
      .toLowerCase();
    const nextView: TodoCalendarView =
      viewParam === "month" || viewParam === "week" || viewParam === "day"
        ? viewParam
        : "day";
    setCalendarView((current) => (current === nextView ? current : nextView));

    const rawDateParam = String(searchParams.get("date") ?? "").trim().toLowerCase();
    let targetDate: Date | null = null;
    if (!rawDateParam || rawDateParam === "today") {
      targetDate = new Date();
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(rawDateParam)) {
      const parsed = parseDateOnly(rawDateParam);
      if (!Number.isNaN(parsed.getTime())) targetDate = parsed;
    }

    if (!targetDate) return;
    setAnchorDate((current) =>
      toDateKey(current) === toDateKey(targetDate as Date)
        ? current
        : (targetDate as Date),
    );
    handleSelectDate(targetDate);
  }, [searchParams, handleSelectDate]);

  const handleSelectItem = React.useCallback((item: TodoCalendarItem) => {
    setSelectedDateKey(item.date);
    setSelectedItemId(item.id);
    setDetailsCollapsed(false);
  }, []);

  const handleViewChange = React.useCallback((nextView: TodoCalendarView) => {
    setCalendarView(nextView);
    if (nextView === "day") {
      handleSelectDate(anchorDate);
    }
  }, [anchorDate, handleSelectDate]);

  const handleMovePeriod = React.useCallback((direction: -1 | 1) => {
    const nextAnchor = moveAnchorDate(anchorDate, calendarView, direction);
    setAnchorDate(nextAnchor);
    if (calendarView === "day") {
      handleSelectDate(nextAnchor);
    }
  }, [anchorDate, calendarView, handleSelectDate]);

  return (
    <div className="relative space-y-5">
      {mode === "list" ? (
        <div className="mx-auto w-full max-w-[1180px]">
          <TodayFollowUpsView
            businessSlug={businessSlug}
            canManage={canManage}
            initialItems={initialItems}
            headerAction={
              <TodoViewModeSwitch
                value={mode}
                onChange={handleModeChange}
                options={[
                  { value: "list", label: "List" },
                  { value: "calendar", label: "Calendar" },
                ]}
              />
            }
          />
        </div>
      ) : (
        <div className="relative space-y-5">
          <div className="rounded-[24px] border border-[#D9E2FF] bg-[linear-gradient(135deg,#FFFFFF_0%,#F8FAFF_62%,#EEF2FF_100%)] px-5 py-4.5 shadow-[0_16px_38px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="product-page-title text-[#0F172A]">Today</div>
                <p className="mt-1 product-body-sm text-[#475467]">
                  Calendar mode is the planning surface for dated work. List mode stays compact and execution-focused.
                </p>
              </div>
              <TodoViewModeSwitch
                value={mode}
                onChange={handleModeChange}
                options={[
                  { value: "list", label: "List" },
                  { value: "calendar", label: "Calendar" },
                ]}
              />
            </div>
          </div>

          <TodoCalendarToolbar
            periodLabel={getPeriodLabel(calendarView, anchorDate)}
            view={calendarView}
            onViewChange={handleViewChange}
            onToday={() => {
              const now = new Date();
              setAnchorDate(now);
              handleSelectDate(now);
            }}
            onPrevious={() => handleMovePeriod(-1)}
            onNext={() => handleMovePeriod(1)}
          />

          <div className="rounded-[24px] border border-[#E4E7EC] bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FAFC_100%)] px-5 py-4 shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="product-section-title">Planning calendar</div>
                <p className="mt-1 text-[13px] text-[#475467]">
                  Dated follow-ups, order deadlines, and checklist due dates stay on their original dates.
                </p>
              </div>
              <TodoCalendarFilters value={calendarFilter} counts={counts} onChange={setCalendarFilter} />
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[#D0D5DD] bg-white px-6 py-12 text-center shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
              <div className="product-page-title text-[#111827]">No scheduled items yet</div>
              <p className="mt-2 text-[14px] text-[#667085]">
                Add due dates or follow-ups to see them on the calendar.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
              <div className="min-w-0">
                {calendarView === "month" ? (
                  <TodoMonthView
                    anchorDate={anchorDate}
                    items={filteredItems}
                    selectedDate={selectedDate}
                    selectedItemId={selectedItemId}
                    onSelectDate={handleSelectDate}
                    onSelectItem={handleSelectItem}
                  />
                ) : null}

                {calendarView === "week" ? (
                  <TodoWeekView
                    anchorDate={anchorDate}
                    items={filteredItems}
                    selectedDate={selectedDate}
                    selectedItemId={selectedItemId}
                    onSelectDate={handleSelectDate}
                    onSelectItem={handleSelectItem}
                  />
                ) : null}

                {calendarView === "day" ? (
                  <TodoDayView
                    anchorDate={selectedDate}
                    items={filteredItems}
                    selectedItemId={selectedItemId}
                    onSelectItem={handleSelectItem}
                  />
                ) : null}
              </div>

              <TodoCalendarDetailsPanel
                items={filteredItems}
                selectedDate={selectedDate}
                selectedItem={selectedItem}
                collapsed={detailsCollapsed}
                onToggleCollapsed={() => setDetailsCollapsed((current) => !current)}
                onSelectItem={handleSelectItem}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
