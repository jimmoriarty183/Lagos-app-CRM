"use client";

import * as React from "react";

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
}: {
  businessSlug: string;
  canManage: boolean;
  initialItems: TodayFollowUpItem[];
  calendarItems: TodoCalendarItem[];
}) {
  const [mode, setMode] = React.useState<TodoDisplayMode>("list");
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
    if (filteredItems.length === 0) {
      setSelectedItemId(null);
      setSelectedDateKey(toDateKey(new Date()));
      return;
    }

    const stillVisible = selectedItemId
      ? filteredItems.some((item) => item.id === selectedItemId)
      : false;
    if (!stillVisible) setSelectedItemId(filteredItems[0]?.id ?? null);

    const hasSelectedDay = filteredItems.some((item) => item.date === selectedDateKey);
    if (!hasSelectedDay) {
      setSelectedDateKey(getSelectedDateFallback(filteredItems, anchorDate));
    }
  }, [anchorDate, filteredItems, selectedDateKey, selectedItemId]);

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

  const handleSelectItem = React.useCallback((item: TodoCalendarItem) => {
    setSelectedDateKey(item.date);
    setSelectedItemId(item.id);
    setDetailsCollapsed(false);
  }, []);

  return (
    <div className="space-y-4">
      {mode === "list" ? (
        <TodayFollowUpsView
          businessSlug={businessSlug}
          canManage={canManage}
          initialItems={initialItems}
          headerAction={
            <TodoViewModeSwitch
              value={mode}
              onChange={setMode}
              options={[
                { value: "list", label: "List" },
                { value: "calendar", label: "Calendar" },
              ]}
            />
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-[#E5E7EB] bg-[linear-gradient(180deg,#ffffff_0%,#F9FAFB_100%)] px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="product-page-title text-[#111827]">Today</div>
                <p className="mt-1 product-body-sm text-[#6B7280]">
                  Calendar mode is the planning surface for dated work. List mode stays compact and execution-focused.
                </p>
              </div>
              <TodoViewModeSwitch
                value={mode}
                onChange={setMode}
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
            onViewChange={setCalendarView}
            onToday={() => {
              const now = new Date();
              setAnchorDate(now);
              handleSelectDate(now);
            }}
            onPrevious={() => setAnchorDate((current) => moveAnchorDate(current, calendarView, -1))}
            onNext={() => setAnchorDate((current) => moveAnchorDate(current, calendarView, 1))}
          />

          <div className="rounded-[22px] border border-[#E5E7EB] bg-white px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="product-section-title">Planning calendar</div>
                <p className="mt-1 text-[13px] text-[#667085]">
                  Dated follow-ups, order deadlines, and checklist due dates stay on their original dates.
                </p>
              </div>
              <TodoCalendarFilters value={calendarFilter} counts={counts} onChange={setCalendarFilter} />
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-[#D0D5DD] bg-white px-6 py-12 text-center shadow-[0_10px_30px_rgba(15,23,42,0.03)]">
              <div className="product-page-title text-[#111827]">No scheduled items yet</div>
              <p className="mt-2 text-[14px] text-[#667085]">
                Add due dates or follow-ups to see them on the calendar.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
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
