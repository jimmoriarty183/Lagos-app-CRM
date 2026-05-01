"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarPlus, Plus } from "lucide-react";

import { createFollowUp } from "@/app/b/[slug]/actions";
import { ClientOrderForm } from "@/app/b/[slug]/_components/orders/ClientOrderForm";
import { StyledDateInput } from "@/components/ui/styled-date-input";
import {
  type TodayFollowUpItem,
  type ManagerMonthlyPlanProgress,
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
  getItemDate,
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
import { Button } from "@/components/ui/button";
import { ClientErrorBoundary } from "@/components/ui/client-error-boundary";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TodoOrderOption = {
  id: string;
  label: string;
};

type FollowUpCreateKind = "meeting" | "reminder" | "task" | "message";

const FOLLOW_UP_KIND_OPTIONS: Array<{ value: FollowUpCreateKind; label: string }> = [
  { value: "meeting", label: "Meeting" },
  { value: "reminder", label: "Reminder" },
  { value: "task", label: "Task" },
  { value: "message", label: "Message" },
];

function toIsoDateTime(dateOnly: string, timeOnly: string) {
  const localValue = `${dateOnly}T${timeOnly}`;
  const parsed = new Date(localValue);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function TodoWorkspaceView({
  businessId,
  businessSlug,
  canManage,
  initialItems,
  calendarItems,
  orderOptions = [],
  initialMode,
  managerPlanProgress,
  isCleaning = false,
}: {
  businessId: string;
  businessSlug: string;
  canManage: boolean;
  initialItems: TodayFollowUpItem[];
  calendarItems: TodoCalendarItem[];
  orderOptions?: TodoOrderOption[];
  initialMode: TodoDisplayMode;
  managerPlanProgress?: ManagerMonthlyPlanProgress | null;
  isCleaning?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mode, setMode] = React.useState<TodoDisplayMode>(initialMode);
  const [calendarView, setCalendarView] = React.useState<TodoCalendarView>("month");
  const [calendarFilter, setCalendarFilter] = React.useState<TodoCalendarFilter>("all");
  const [anchorDate, setAnchorDate] = React.useState(() => new Date());
  const [detailsCollapsed, setDetailsCollapsed] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createOrderOpen, setCreateOrderOpen] = React.useState(false);
  const [createKind, setCreateKind] = React.useState<FollowUpCreateKind>("task");
  const [createTitle, setCreateTitle] = React.useState("");
  const [createDate, setCreateDate] = React.useState(() => toDateKey(new Date()));
  const [createTime, setCreateTime] = React.useState("");
  const [createOrderId, setCreateOrderId] = React.useState("");
  const [createNote, setCreateNote] = React.useState("");
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [createSaving, setCreateSaving] = React.useState(false);

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
  // The saved selection wins whenever it exists in the current filter — that
  // way clicking an overdue item from the side list shows its details below
  // without yanking the calendar's selected day to that item's date.
  // handleSelectDate keeps selectedItemId in sync when the user clicks a
  // different calendar cell, so we don't get stale selections from there.
  const savedSelectedItem = filteredItems.find(
    (item) => item.id === selectedItemId,
  );
  const itemsOnSelectedDate = getItemsForDate(filteredItems, selectedDate);
  const selectedItem =
    savedSelectedItem ?? itemsOnSelectedDate[0] ?? null;

  const handleSelectDate = React.useCallback((date: Date) => {
    const key = toDateKey(date);
    setSelectedDateKey(key);
    const nextItem = getItemsForDate(filteredItems, date)[0] ?? null;
    setSelectedItemId(nextItem?.id ?? null);
    setDetailsCollapsed(false);
  }, [filteredItems]);

  // Stable ref so the URL → state sync effect does not depend on
  // handleSelectDate's identity. handleSelectDate changes whenever
  // filteredItems change, which would otherwise cause this effect to
  // re-run and reset calendarView/anchorDate back to URL defaults
  // (snapping the user back to "day" + today after they navigate).
  const handleSelectDateRef = React.useRef(handleSelectDate);
  React.useEffect(() => {
    handleSelectDateRef.current = handleSelectDate;
  }, [handleSelectDate]);

  React.useEffect(() => {
    const modeParam = String(searchParams.get("mode") ?? "")
      .trim()
      .toLowerCase();
    if (modeParam !== "calendar") return;

    const viewParam = String(searchParams.get("view") ?? "")
      .trim()
      .toLowerCase();
    const hasViewParam =
      viewParam === "month" || viewParam === "week" || viewParam === "day";
    if (hasViewParam) {
      const nextView = viewParam as TodoCalendarView;
      setCalendarView((current) => (current === nextView ? current : nextView));
    }

    const rawDateParam = String(searchParams.get("date") ?? "").trim().toLowerCase();
    if (!rawDateParam) return;

    let targetDate: Date | null = null;
    if (rawDateParam === "today") {
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
    handleSelectDateRef.current(targetDate);
  }, [searchParams]);

  // Clicking any item in the side list always jumps the calendar grid to
  // that item's date, exactly like the "Show in calendar" button — otherwise
  // the right panel header reads "Saturday, April 11" while the visible grid
  // is still on May, which is confusing.
  const handleSelectItem = React.useCallback((item: TodoCalendarItem) => {
    const target = getItemDate(item);
    setAnchorDate(target);
    setSelectedDateKey(toDateKey(target));
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

  // Jump the calendar to the date of a specific item (typically the selected
  // detail) and switch to a wide-context view (month by default) so the user
  // can see the item in the timeline. Auto-selects the item once we land.
  const handleShowInCalendar = React.useCallback(
    (item: TodoCalendarItem, view: TodoCalendarView = "month") => {
      const target = getItemDate(item);
      setCalendarView(view);
      setAnchorDate(target);
      setSelectedDateKey(toDateKey(target));
      setSelectedItemId(item.id);
      setDetailsCollapsed(false);
    },
    [],
  );

  const openCreateFollowUp = React.useCallback(() => {
    const selected = selectedDateKey || toDateKey(new Date());
    setCreateKind("task");
    setCreateTitle("");
    setCreateDate(selected);
    setCreateTime("");
    setCreateOrderId("");
    setCreateNote("");
    setCreateError(null);
    setCreateOpen(true);
  }, [selectedDateKey]);

  const handleCreateFollowUp = React.useCallback(async () => {
    const title = createTitle.trim();
    if (!title) {
      setCreateError("Title is required");
      return;
    }
    if (!createDate) {
      setCreateError("Date is required");
      return;
    }

    const dueAt = createTime ? toIsoDateTime(createDate, createTime) : null;
    if (createTime && !dueAt) {
      setCreateError("Invalid date/time");
      return;
    }

    setCreateSaving(true);
    setCreateError(null);
    try {
      await createFollowUp({
        businessId,
        businessSlug,
        orderId: createOrderId || null,
        title,
        dueDate: createDate,
        dueAt,
        note: createNote.trim() || null,
        source: createOrderId ? "order" : "manual",
        actionType: createKind,
      });
      setSelectedDateKey(createDate);
      setCreateOpen(false);
      router.refresh();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Failed to create follow-up");
    } finally {
      setCreateSaving(false);
    }
  }, [
    businessId,
    businessSlug,
    createDate,
    createKind,
    createNote,
    createOrderId,
    createTime,
    createTitle,
    router,
  ]);

  return (
    <div className="relative space-y-5">
      {mode === "list" ? (
        <div className="mx-auto w-full max-w-[1180px]">
          <TodayFollowUpsView
            businessSlug={businessSlug}
            canManage={canManage}
            initialItems={initialItems}
            managerPlanProgress={managerPlanProgress}
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
          <div className="rounded-[24px] border border-[#D9E2FF] dark:border-white/10 bg-[#EEF2FF] dark:bg-white/[0.04] px-5 py-4.5 shadow-[0_16px_38px_rgba(15,23,42,0.08)] dark:shadow-[0_16px_38px_rgba(0,0,0,0.45)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="product-page-title text-[#0F172A] dark:text-white">Today</div>
                <p className="mt-1 product-body-sm text-[#475467] dark:text-white/70">
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
            actions={
              canManage ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-[14px] border-[#CBD5E1] bg-white dark:bg-white/[0.03] px-3.5 text-[13px] font-semibold text-[#1E293B] dark:text-white/90 shadow-[0_3px_12px_rgba(15,23,42,0.06)] hover:border-[#C7D2FE] dark:hover:border-[var(--brand-500)]/40 hover:text-[#3645A0]"
                    onClick={openCreateFollowUp}
                  >
                    <CalendarPlus className="mr-1.5 h-4 w-4" />
                    Follow-up
                  </Button>
                  <Button
                    type="button"
                    className="h-10 rounded-[14px] bg-[var(--brand-600)] px-3.5 text-[13px] font-semibold !text-white shadow-[0_6px_18px_rgba(79,70,229,0.26)] hover:bg-[var(--brand-700)] hover:!text-white"
                    onClick={() => setCreateOrderOpen(true)}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Order
                  </Button>
                </>
              ) : null
            }
            onToday={() => {
              const now = new Date();
              setAnchorDate(now);
              handleSelectDate(now);
            }}
            onPrevious={() => handleMovePeriod(-1)}
            onNext={() => handleMovePeriod(1)}
          />

          <div className="rounded-[24px] border border-[#E4E7EC] dark:border-white/10 bg-white dark:bg-white/[0.04] px-5 py-4 shadow-[0_14px_32px_rgba(15,23,42,0.06)] dark:shadow-[0_14px_32px_rgba(0,0,0,0.45)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="product-section-title">Planning calendar</div>
                <p className="mt-1 text-[13px] text-[#475467] dark:text-white/70">
                  Dated follow-ups, order deadlines, and checklist due dates stay on their original dates.
                </p>
              </div>
              <TodoCalendarFilters value={calendarFilter} counts={counts} onChange={setCalendarFilter} />
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[#D0D5DD] bg-white dark:bg-white/[0.03] px-6 py-12 text-center shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
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
                onShowInCalendar={handleShowInCalendar}
              />
            </div>
          )}
        </div>
      )}
      <Dialog
        open={createOpen}
        onOpenChange={(nextOpen) => {
          if (createSaving) return;
          setCreateOpen(nextOpen);
          if (!nextOpen) setCreateError(null);
        }}
      >
        <DialogContent className="max-w-[560px] rounded-[24px] border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-[#0E0E1B] p-0 shadow-[0_24px_64px_rgba(15,23,42,0.18)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.55)]">
          <div className="space-y-4 px-5 py-5">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-[19px] font-semibold text-[#111827] dark:text-white/90">
                Create follow-up
              </DialogTitle>
              <DialogDescription className="text-sm leading-6 text-[#6B7280] dark:text-white/55">
                Follow-up can be standalone or linked to an order.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#475467] dark:text-white/70">
                Type
                <select
                  value={createKind}
                  onChange={(event) =>
                    setCreateKind(event.currentTarget.value as FollowUpCreateKind)
                  }
                  className="h-10 rounded-xl border border-[#D0D5DD] dark:border-white/10 bg-white dark:bg-white/[0.04] px-3 text-[14px] text-[#111827] dark:text-white/90 placeholder:text-[#9CA3AF] dark:placeholder:text-white/40 outline-none focus:border-[var(--brand-500)] [color-scheme:light] dark:[color-scheme:dark]"
                >
                  {FOLLOW_UP_KIND_OPTIONS.map((option) => (
                    <option key={`follow-up-kind-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#475467] dark:text-white/70">
                Title
                <input
                  value={createTitle}
                  onChange={(event) => setCreateTitle(event.currentTarget.value)}
                  placeholder="Call client about proposal"
                  className="h-10 rounded-xl border border-[#D0D5DD] dark:border-white/10 bg-white dark:bg-white/[0.04] px-3 text-[14px] text-[#111827] dark:text-white/90 placeholder:text-[#9CA3AF] dark:placeholder:text-white/40 outline-none focus:border-[var(--brand-500)] [color-scheme:light] dark:[color-scheme:dark]"
                />
              </label>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#475467] dark:text-white/70">
                  Date
                  <StyledDateInput
                    value={createDate}
                    onChange={setCreateDate}
                    placeholder="Pick date"
                    ariaLabel="Follow-up date"
                    className="w-full"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#475467] dark:text-white/70">
                  Time (optional)
                  <input
                    type="time"
                    value={createTime}
                    onChange={(event) => setCreateTime(event.currentTarget.value)}
                    className="h-10 rounded-xl border border-[#D0D5DD] dark:border-white/10 bg-white dark:bg-white/[0.04] px-3 text-[14px] text-[#111827] dark:text-white/90 placeholder:text-[#9CA3AF] dark:placeholder:text-white/40 outline-none focus:border-[var(--brand-500)] [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#475467] dark:text-white/70">
                Link to order (optional)
                <select
                  value={createOrderId}
                  onChange={(event) => setCreateOrderId(event.currentTarget.value)}
                  className="h-10 rounded-xl border border-[#D0D5DD] dark:border-white/10 bg-white dark:bg-white/[0.04] px-3 text-[14px] text-[#111827] dark:text-white/90 placeholder:text-[#9CA3AF] dark:placeholder:text-white/40 outline-none focus:border-[var(--brand-500)] [color-scheme:light] dark:[color-scheme:dark]"
                >
                  <option value="">No order</option>
                  {orderOptions.map((option) => (
                    <option key={`calendar-follow-up-order-${option.id}`} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#475467] dark:text-white/70">
                Note (optional)
                <textarea
                  rows={3}
                  value={createNote}
                  onChange={(event) => setCreateNote(event.currentTarget.value)}
                  placeholder="Context, next step, expected outcome"
                  className="resize-y rounded-xl border border-[#D0D5DD] dark:border-white/10 bg-white dark:bg-white/[0.04] px-3 py-2 text-[14px] text-[#111827] dark:text-white/90 placeholder:text-[#9CA3AF] dark:placeholder:text-white/40 outline-none focus:border-[var(--brand-500)]"
                />
              </label>
            </div>

            {createError ? (
              <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] dark:bg-rose-500/10 px-3 py-2 text-[12px] text-[#B42318]">
                {createError}
              </div>
            ) : null}

            <DialogFooter className="gap-2 border-t border-[#F3F4F6] dark:border-white/10 pt-4 sm:justify-between">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl border-[#D0D5DD] dark:border-white/10 bg-white dark:bg-white/[0.04] px-4 text-sm font-semibold text-[#374151] dark:text-white/85 hover:bg-[#F9FAFB] dark:hover:bg-white/[0.08] hover:text-[#1F2937] dark:hover:text-white"
                disabled={createSaving}
                onClick={() => {
                  setCreateOpen(false);
                  setCreateError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-10 rounded-xl px-4 text-sm font-semibold !text-white hover:!text-white"
                disabled={createSaving}
                onClick={handleCreateFollowUp}
              >
                {createSaving ? "Creating..." : "Create follow-up"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={createOrderOpen}
        onOpenChange={(nextOpen) => {
          setCreateOrderOpen(nextOpen);
        }}
      >
        <DialogContent className="max-h-[92vh] w-[calc(100vw-24px)] overflow-hidden rounded-[24px] border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-[#0E0E1B] p-0 shadow-[0_24px_64px_rgba(15,23,42,0.18)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.55)] sm:w-full sm:max-w-[760px]">
          <div className="flex max-h-[92vh] flex-col">
            <DialogHeader className="space-y-1 border-b border-[#E5E7EB] dark:border-white/10 px-5 pb-3 pt-5 text-left">
              <DialogTitle className="text-[19px] font-semibold text-[#111827]">
                Create order
              </DialogTitle>
              <DialogDescription className="text-sm leading-6 text-[#6B7280] dark:text-white/55">
                Type-driven creation with live duplicate checking
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <ClientErrorBoundary
                resetKeys={[createOrderOpen, businessId, businessSlug]}
                fallback={({ error, reset }) => (
                  <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    <div className="font-medium">Create order form failed to render.</div>
                    {error?.message ? (
                      <div className="break-words text-xs text-rose-800">{error.message}</div>
                    ) : null}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={reset}
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-rose-300 bg-white dark:bg-white/[0.03] px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        Try again
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          reset();
                          router.refresh();
                        }}
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-rose-300 bg-white dark:bg-white/[0.03] px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        Refresh data
                      </button>
                    </div>
                  </div>
                )}
              >
                <ClientOrderForm
                  businessId={businessId}
                  businessSlug={businessSlug}
                  compact
                  isCleaning={isCleaning}
                  onCreated={() => {
                    router.refresh();
                    setCreateOrderOpen(false);
                  }}
                />
              </ClientErrorBoundary>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
