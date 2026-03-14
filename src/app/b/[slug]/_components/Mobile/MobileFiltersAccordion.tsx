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

export type TeamActor = {
  id: string;
  label: string;
  kind: "OWNER" | "MANAGER";
};

export type Filters = {
  q: string;
  status: "ALL" | "OVERDUE" | Status;
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
    filters.status !== "ALL" ? 1 : 0,
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
              name="status"
              defaultValue={filters.status}
              className={inputCls}
            >
              <option value="ALL">All</option>
              <option value="NEW">New</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="WAITING_PAYMENT">Waiting</option>
              <option value="DONE">Done</option>
              <option value="OVERDUE">Overdue</option>
              <option value="CANCELED">Canceled</option>
              <option value="DUPLICATE">Duplicate</option>
            </select>

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

          <div
            className={[
              "grid gap-2",
              hasFiltersApplied ? "grid-cols-[minmax(0,1fr)_72px]" : "grid-cols-1",
            ].join(" ")}
          >
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

            {hasFiltersApplied ? (
              <a
                href={clearHref}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 px-3 text-xs font-semibold text-gray-600"
              >
                Clear
              </a>
            ) : null}
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
