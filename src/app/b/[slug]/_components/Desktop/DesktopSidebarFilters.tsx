"use client";

import { useState } from "react";
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

type SidebarStatus = "ALL" | "OVERDUE" | Status;
type TeamActor = {
  id: string;
  label: string;
  kind: "OWNER" | "MANAGER";
};

type Props = {
  phoneRaw: string;
  q: string;
  status: SidebarStatus;
  range: DashboardRange;
  summaryRange: DashboardRange;
  startDate: string | null;
  endDate: string | null;
  actor: string;
  actors?: TeamActor[];
  hasActiveFilters?: boolean;
  clearHref?: string;
};

export default function DesktopSidebarFilters({
  phoneRaw,
  q,
  status,
  range,
  summaryRange,
  startDate,
  endDate,
  actor,
  actors = [],
  hasActiveFilters = false,
  clearHref,
}: Props) {
  const [rangeValue, setRangeValue] = useState<DashboardRange>(range);
  const [customStart, setCustomStart] = useState(startDate ?? "");
  const [customEnd, setCustomEnd] = useState(endDate ?? "");
  const inputCls =
    "h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none " +
    "focus:border-gray-900 focus:ring-2 focus:ring-gray-900";
  const showCustomRange = rangeValue === "custom";
  const customRangeReady = !showCustomRange || (Boolean(customStart) && Boolean(customEnd));

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 pb-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
            Filters
          </div>
          <div className="mt-1 text-sm text-gray-600">
            Clear filter state for the orders list
          </div>
        </div>

        {hasActiveFilters && clearHref ? (
          <a
            href={clearHref}
            className="rounded-full border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900"
          >
            Reset
          </a>
        ) : null}
      </div>

      <form method="get" className="space-y-3 pb-3">
        <input type="hidden" name="u" value={phoneRaw} />
        <input type="hidden" name="srange" value={summaryRange} />
        <input type="hidden" name="page" value="1" />

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-gray-500">
            Search
          </span>
          <div className="flex items-center gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Name, phone, amount..."
              className={inputCls}
            />
            <Button
              type="submit"
              size="sm"
              className="h-10 shrink-0 px-4"
              disabled={!customRangeReady}
            >
              Search
            </Button>
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-gray-500">
            Status
          </span>
          <select
            name="status"
            defaultValue={status}
            className={inputCls}
            onChange={(event) => {
              if (customRangeReady) event.currentTarget.form?.requestSubmit();
            }}
          >
            <option value="ALL">All orders</option>
            <option value="NEW">New</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="WAITING_PAYMENT">Waiting payment</option>
            <option value="DONE">Done</option>
            <option value="OVERDUE">Overdue</option>
            <option value="CANCELED">Canceled</option>
            <option value="DUPLICATE">Duplicate</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-gray-500">
            Period
          </span>
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
                event.currentTarget.form?.requestSubmit();
              }
            }}
          >
            {DASHBOARD_RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {showCustomRange ? (
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-gray-500">Start date</span>
              <input
                type="date"
                name="start"
                value={customStart}
                onChange={(event) => setCustomStart(event.currentTarget.value)}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-gray-500">End date</span>
              <input
                type="date"
                name="end"
                value={customEnd}
                onChange={(event) => setCustomEnd(event.currentTarget.value)}
                className={inputCls}
              />
            </label>
          </div>
        ) : null}

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-gray-500">
            Team
          </span>
          <select
            name="actor"
            defaultValue={actor}
            className={inputCls}
            onChange={(event) => {
              if (customRangeReady) event.currentTarget.form?.requestSubmit();
            }}
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
        </label>

        {showCustomRange ? (
          <Button
            type="submit"
            size="sm"
            className="h-10 w-full justify-center"
            disabled={!customRangeReady}
          >
            Apply custom range
          </Button>
        ) : (
          <div aria-hidden="true" className="h-2" />
        )}
      </form>
    </section>
  );
}
