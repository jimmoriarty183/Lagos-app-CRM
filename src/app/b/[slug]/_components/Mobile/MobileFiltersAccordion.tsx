"use client";

import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import Button from "../../Button";
import {
  DASHBOARD_RANGE_OPTIONS,
  type DashboardRange,
} from "@/lib/order-dashboard-summary";

type Status =
  | "NEW"
  | "IN_PROGRESS"
  | "WAITING_PAYMENT"
  | "DONE"
  | "CANCELED"
  | "DUPLICATE";

type StatusFilterValue = Status | "OVERDUE";

const STATUS_OPTIONS: { value: StatusFilterValue; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "WAITING_PAYMENT", label: "Waiting" },
  { value: "DONE", label: "Done" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "CANCELED", label: "Canceled" },
  { value: "DUPLICATE", label: "Duplicate" },
];

export type TeamActor = {
  id: string;
  label: string;
  kind: "OWNER" | "MANAGER";
};

export type Filters = {
  q: string;
  statuses: StatusFilterValue[];
  range: DashboardRange;
  startDate: string | null;
  endDate: string | null;
};

type Props = {
  phoneRaw: string;
  filters: Filters;
  summaryRange: DashboardRange;
  clearHref: string;
  hasActiveFilters: boolean;
  actor: string;
  actors?: TeamActor[];
};

export default function MobileFiltersAccordion({
  phoneRaw,
  filters,
  summaryRange,
  clearHref,
  hasActiveFilters,
  actor,
  actors = [],
}: Props) {
  const rootRef = useRef<HTMLElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [rangeValue, setRangeValue] = useState<DashboardRange>(filters.range);
  const [customStart, setCustomStart] = useState(filters.startDate ?? "");
  const [customEnd, setCustomEnd] = useState(filters.endDate ?? "");

  useEffect(() => {
    const onOpen = () => {
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => searchRef.current?.focus(), 120);
    };
    window.addEventListener("orders-mobile-open-filters", onOpen as EventListener);
    return () =>
      window.removeEventListener("orders-mobile-open-filters", onOpen as EventListener);
  }, []);

  const inputCls =
    "h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none " +
    "focus:border-gray-900 focus:ring-2 focus:ring-gray-900";

  const activeCount = [
    filters.q ? 1 : 0,
    filters.statuses.length > 0 ? 1 : 0,
    filters.range !== "ALL" ? 1 : 0,
    actor !== "ALL" ? 1 : 0,
  ].reduce((sum, item) => sum + item, 0);

  const hasFiltersApplied = activeCount > 0;
  const showCustomRange = rangeValue === "custom";

  return (
    <section id="mobile-filters" ref={rootRef} className="lg:hidden">
      <form
        method="get"
        className={[
          "rounded-xl border bg-white p-3 shadow-sm transition",
          hasFiltersApplied
            ? "border-blue-200 ring-1 ring-blue-100"
            : "border-gray-200",
        ].join(" ")}
      >
        <input type="hidden" name="u" value={phoneRaw} />
        <input type="hidden" name="srange" value={summaryRange} />
        <input type="hidden" name="page" value="1" />

        <div className="mb-2.5 flex items-center justify-between gap-2">
          <span className="inline-flex min-w-0 items-center gap-2">
            <span
              className={[
                "h-7 w-1 shrink-0 rounded-full",
                hasFiltersApplied ? "bg-blue-500" : "bg-gray-200",
              ].join(" ")}
              aria-hidden="true"
            />
            <span className="inline-flex items-center gap-2 text-sm font-bold text-gray-900">
              <SlidersHorizontal
                className={[
                  "h-4 w-4",
                  hasFiltersApplied ? "text-blue-500" : "text-gray-400",
                ].join(" ")}
              />
              Filters
            </span>
          </span>

          {hasActiveFilters ? (
            <a
              href={clearHref}
              className="rounded-full border border-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-600"
            >
              Reset
            </a>
          ) : (
            <span
              className={[
                "rounded-full px-2 py-1 text-[10px] font-medium",
                hasFiltersApplied
                  ? "bg-blue-50 text-blue-700"
                  : "border border-gray-200 bg-gray-50 text-gray-500",
              ].join(" ")}
            >
              {hasFiltersApplied ? `${activeCount} active` : "No filters"}
            </span>
          )}
        </div>

        <div className="grid gap-2">
          <div className="grid grid-cols-[minmax(0,1fr)_80px] gap-2">
            <input
              ref={searchRef}
              name="q"
              defaultValue={filters.q}
              placeholder="Client, phone, amount..."
              className={inputCls}
            />

            <Button
              type="submit"
              size="sm"
              className="h-10 w-full justify-center px-3 text-sm"
              disabled={showCustomRange && (!customStart || !customEnd)}
            >
              Apply
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              name="range"
              value={rangeValue}
              className={inputCls}
              onChange={(event) => {
                const next = event.currentTarget.value as DashboardRange;
                setRangeValue(next);
                if (next !== "custom") {
                  setCustomStart("");
                  setCustomEnd("");
                }
              }}
            >
              {DASHBOARD_RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              name="actor"
              defaultValue={actor}
              className={inputCls}
            >
              <option value="ALL">All team</option>
              <option value="OWNER">Owners</option>
              <option value="MANAGER">Managers</option>
              {actors.map((member) => (
                <option key={member.id} value={`user:${member.id}`}>
                  {member.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-[#fbfcfe] p-2">
            {STATUS_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="cursor-pointer"
              >
                <input
                  type="checkbox"
                  name="status"
                  value={option.value}
                  defaultChecked={filters.statuses.includes(option.value)}
                  className="peer sr-only"
                />
                <span className="inline-flex min-h-9 items-center rounded-full border border-[#dde3ee] bg-white px-3 py-2 text-[12px] font-medium leading-4 text-[#475467] shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition peer-checked:border-[#111827] peer-checked:bg-[#111827] peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-[#111827]/20">
                  {option.label}
                </span>
              </label>
            ))}
          </div>

          {showCustomRange ? (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                name="start"
                value={customStart}
                onChange={(event) => setCustomStart(event.currentTarget.value)}
                className={inputCls}
              />
              <input
                type="date"
                name="end"
                value={customEnd}
                onChange={(event) => setCustomEnd(event.currentTarget.value)}
                className={inputCls}
              />
            </div>
          ) : null}

          <div className={hasFiltersApplied ? "grid grid-cols-[minmax(0,1fr)_72px] gap-2" : "block"}>
            {hasFiltersApplied ? (
              <a
                href={clearHref}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 px-3 text-xs font-semibold text-gray-600"
              >
                Clear
              </a>
            ) : null}
          </div>

          <div className="text-[11px] font-medium text-gray-500">
            Choose one or several statuses. If none selected, all statuses are shown.
          </div>

          {showCustomRange ? (
            <div className="text-[11px] font-medium text-gray-500">
              {customStart && customEnd
                ? "Comparison will use the previous range of the same length."
                : "Select both dates to apply a custom range."}
            </div>
          ) : null}
        </div>
      </form>
    </section>
  );
}
