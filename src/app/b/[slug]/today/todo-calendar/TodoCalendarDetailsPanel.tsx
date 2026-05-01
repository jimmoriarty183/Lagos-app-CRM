"use client";

import Link from "next/link";
import { CalendarSearch, ExternalLink, PanelRightClose, PanelRightOpen } from "lucide-react";
import { format, isSameDay } from "date-fns";

import type {
  TodoCalendarItem,
  TodoCalendarView,
} from "@/app/b/[slug]/today/todo-calendar/types";
import { getItemsForDate } from "@/app/b/[slug]/today/todo-calendar/utils";
import { TodoCalendarItem as TodoCalendarItemCard } from "@/app/b/[slug]/today/todo-calendar/TodoCalendarItem";

function ItemRow({
  item,
  selected,
  onSelectItem,
  onShowInCalendar,
}: {
  item: TodoCalendarItem;
  selected: boolean;
  onSelectItem: (item: TodoCalendarItem) => void;
  onShowInCalendar?: (item: TodoCalendarItem, view?: TodoCalendarView) => void;
}) {
  return (
    <div className="group flex items-stretch gap-1.5">
      <div className="min-w-0 flex-1">
        <TodoCalendarItemCard
          item={item}
          selected={selected}
          showTypeBadge
          onClick={() => onSelectItem(item)}
        />
      </div>
      <div className="flex shrink-0 flex-col gap-1.5">
        {onShowInCalendar ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onShowInCalendar(item, "month");
            }}
            title="Show in calendar"
            aria-label="Show in calendar"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.04] text-[#475467] dark:text-white/65 transition hover:border-[var(--brand-200)] dark:hover:border-[var(--brand-500)]/40 hover:text-[var(--brand-700)] dark:hover:text-[var(--brand-300)]"
          >
            <CalendarSearch className="h-3.5 w-3.5" />
          </button>
        ) : null}
        {item.orderHref ? (
          <Link
            href={item.orderHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            title="Open full order in new tab"
            aria-label="Open full order in new tab"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.04] text-[#475467] dark:text-white/65 transition hover:border-[var(--brand-200)] dark:hover:border-[var(--brand-500)]/40 hover:text-[var(--brand-700)] dark:hover:text-[var(--brand-300)]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function TodoCalendarDetailsPanel({
  items,
  selectedDate,
  selectedItem,
  collapsed,
  onToggleCollapsed,
  onSelectItem,
  onShowInCalendar,
}: {
  items: TodoCalendarItem[];
  selectedDate: Date;
  selectedItem: TodoCalendarItem | null;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSelectItem: (item: TodoCalendarItem) => void;
  onShowInCalendar?: (item: TodoCalendarItem, view?: TodoCalendarView) => void;
}) {
  const today = new Date();
  const selectedIsToday = isSameDay(selectedDate, today);

  // "Today" — items on the actual current day. Always pinned at top so
  // navigating to an old order doesn't bury today's meeting in "Other items".
  const todayItems = getItemsForDate(items, today).filter(
    (item) => item.status !== "overdue",
  );
  const todayIds = new Set(todayItems.map((item) => item.id));

  // "On this day" — items on the selected day, only shown when the user
  // navigated away from today. Excludes items already pinned in "Today".
  const selectedDayItems = selectedIsToday
    ? []
    : getItemsForDate(items, selectedDate).filter(
        (item) => item.status !== "overdue" && !todayIds.has(item.id),
      );
  const selectedDayIds = new Set(selectedDayItems.map((item) => item.id));

  // "Overdue" — every overdue item, regardless of which day is selected.
  const overdueAll = items.filter((item) => item.status === "overdue");

  // "Other items" — non-overdue items that are neither today nor on the
  // selected day.
  const otherItems = items.filter(
    (item) =>
      item.status !== "overdue" &&
      !todayIds.has(item.id) &&
      !selectedDayIds.has(item.id),
  );

  const dayItems = getItemsForDate(items, selectedDate);
  const hasDayItems = todayItems.length + selectedDayItems.length > 0;

  if (collapsed) {
    return (
      <div className="hidden lg:block">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="sticky top-20 inline-flex h-12 items-center gap-2 rounded-[16px] border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-[12px] font-semibold text-[#475467] dark:text-white/70 shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition hover:text-[#111827] dark:text-white/90"
        >
          <PanelRightOpen className="h-4 w-4" />
          Details
        </button>
      </div>
    );
  }

  return (
    <aside className="rounded-[24px] border border-[#DDE3EA] dark:border-white/10 bg-white dark:bg-white/[0.04] shadow-[0_16px_34px_rgba(15,23,42,0.09)] dark:shadow-[0_16px_34px_rgba(0,0,0,0.45)]">
      <div className="flex items-start justify-between gap-3 border-b border-[#EDEFF4] dark:border-white/10 px-4 py-4">
        <div>
          <div className="product-section-label">Selected day</div>
          <div className="mt-1 text-[18px] font-semibold text-[#111827] dark:text-white/90">{format(selectedDate, "EEEE, MMMM d")}</div>
          <p className="mt-1 text-[12px] text-[#667085] dark:text-white/55">
            {dayItems.length === 0 ? "No scheduled items." : `${dayItems.length} item${dayItems.length === 1 ? "" : "s"} planned.`}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] border border-[#D8DFEA] dark:border-white/10 bg-white dark:bg-white/[0.04] text-[#667085] dark:text-white/55 transition hover:bg-[#EEF2FF] dark:hover:bg-[var(--brand-600)]/15 hover:text-[#3645A0] dark:hover:text-[var(--brand-300)]"
          aria-label="Collapse details panel"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div className="space-y-3">
          {todayItems.length > 0 ? (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--brand-700)] dark:text-[var(--brand-300)]">
                Today ({todayItems.length})
              </div>
              {todayItems.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  selected={selectedItem?.id === item.id}
                  onSelectItem={onSelectItem}
                  onShowInCalendar={onShowInCalendar}
                />
              ))}
            </div>
          ) : null}

          {selectedDayItems.length > 0 ? (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9CA3AF] dark:text-white/45">
                On {format(selectedDate, "MMM d")} ({selectedDayItems.length})
              </div>
              {selectedDayItems.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  selected={selectedItem?.id === item.id}
                  onSelectItem={onSelectItem}
                  onShowInCalendar={onShowInCalendar}
                />
              ))}
            </div>
          ) : null}

          {!hasDayItems && items.length === 0 ? (
            <div className="rounded-[16px] border border-dashed border-[#E5E7EB] dark:border-white/10 bg-[#FCFCFD] dark:bg-white/[0.03] px-4 py-5 text-sm text-[#667085] dark:text-white/55">
              Nothing is scheduled for this day.
            </div>
          ) : null}

          {overdueAll.length > 0 ? (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#B42318] dark:text-rose-300">
                Overdue ({overdueAll.length})
              </div>
              {overdueAll.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  selected={selectedItem?.id === item.id}
                  onSelectItem={onSelectItem}
                  onShowInCalendar={onShowInCalendar}
                />
              ))}
            </div>
          ) : null}

          {otherItems.length > 0 ? (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9CA3AF] dark:text-white/45">
                Other items ({otherItems.length})
              </div>
              {otherItems.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  selected={selectedItem?.id === item.id}
                  onSelectItem={onSelectItem}
                  onShowInCalendar={onShowInCalendar}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
