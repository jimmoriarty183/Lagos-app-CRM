"use client";

import Link from "next/link";
import { ChevronRight, PanelRightClose, PanelRightOpen } from "lucide-react";
import { format } from "date-fns";

import type { TodoCalendarItem } from "@/app/b/[slug]/today/todo-calendar/types";
import {
  getItemDate,
  getItemTypeClasses,
  getItemTypeLabel,
  getItemsForDate,
  getTimeLabel,
} from "@/app/b/[slug]/today/todo-calendar/utils";
import { TodoCalendarItem as TodoCalendarItemCard } from "@/app/b/[slug]/today/todo-calendar/TodoCalendarItem";

export function TodoCalendarDetailsPanel({
  items,
  selectedDate,
  selectedItem,
  collapsed,
  onToggleCollapsed,
  onSelectItem,
}: {
  items: TodoCalendarItem[];
  selectedDate: Date;
  selectedItem: TodoCalendarItem | null;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSelectItem: (item: TodoCalendarItem) => void;
}) {
  const dayItems = getItemsForDate(items, selectedDate);

  if (collapsed) {
    return (
      <div className="hidden lg:block">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="sticky top-20 inline-flex h-12 items-center gap-2 rounded-[16px] border border-[#E5E7EB] bg-white px-3 text-[12px] font-semibold text-[#475467] shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition hover:text-[#111827]"
        >
          <PanelRightOpen className="h-4 w-4" />
          Details
        </button>
      </div>
    );
  }

  const tone = selectedItem ? getItemTypeClasses(selectedItem.type, selectedItem.status) : null;

  return (
    <aside className="rounded-[22px] border border-[#E5E7EB] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-3 border-b border-[#F2F4F7] px-4 py-4">
        <div>
          <div className="product-section-label">Selected day</div>
          <div className="mt-1 text-[18px] font-semibold text-[#111827]">{format(selectedDate, "EEEE, MMMM d")}</div>
          <p className="mt-1 text-[12px] text-[#667085]">
            {dayItems.length === 0 ? "No scheduled items." : `${dayItems.length} item${dayItems.length === 1 ? "" : "s"} planned.`}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] border border-[#E5E7EB] text-[#667085] transition hover:bg-[#F9FAFB] hover:text-[#111827]"
          aria-label="Collapse details panel"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div className="space-y-2">
          {dayItems.length === 0 ? (
            <div className="rounded-[16px] border border-dashed border-[#E5E7EB] bg-[#FCFCFD] px-4 py-5 text-sm text-[#667085]">
              Nothing is scheduled for this day.
            </div>
          ) : (
            dayItems.map((item) => (
              <TodoCalendarItemCard
                key={item.id}
                item={item}
                selected={selectedItem?.id === item.id}
                onClick={() => onSelectItem(item)}
              />
            ))
          )}
        </div>

        <div className="rounded-[18px] border border-[#F2F4F7] bg-[#FCFCFD] p-4">
          {selectedItem ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone?.tint}`}>{getItemTypeLabel(selectedItem.type)}</span>
                {selectedItem.status === "overdue" ? (
                  <span className="inline-flex rounded-full border border-[#FECACA] bg-[#FEF2F2] px-2.5 py-1 text-[11px] font-semibold text-[#B42318]">
                    Overdue
                  </span>
                ) : null}
              </div>
              <div>
                <div className="text-[16px] font-semibold text-[#111827]">{selectedItem.title}</div>
                <p className="mt-1 text-[13px] text-[#667085]">
                  {getTimeLabel(selectedItem)} on {format(getItemDate(selectedItem), "MMMM d, yyyy")}
                </p>
              </div>
              <dl className="space-y-2 text-[13px]">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#667085]">Status</dt>
                  <dd className="font-medium text-[#111827]">{selectedItem.statusLabel ?? "Open"}</dd>
                </div>
                {selectedItem.orderLabel ? (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-[#667085]">Related order</dt>
                    <dd className="text-right font-medium text-[#111827]">{selectedItem.orderLabel}</dd>
                  </div>
                ) : null}
                {selectedItem.sourceLabel ? (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-[#667085]">Source</dt>
                    <dd className="font-medium text-[#111827]">{selectedItem.sourceLabel}</dd>
                  </div>
                ) : null}
              </dl>
              {selectedItem.orderHref ? (
                <Link
                  href={selectedItem.orderHref}
                  className="inline-flex h-10 items-center gap-2 rounded-[14px] border border-[#D0D5DD] bg-white px-3.5 text-[13px] font-semibold text-[#344054] transition hover:border-[#C7D2FE] hover:text-[#3645A0]"
                >
                  Open full order
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-[#667085]">Select an item to inspect its details.</div>
          )}
        </div>
      </div>
    </aside>
  );
}
