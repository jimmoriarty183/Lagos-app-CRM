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

type SidebarStatus = Status | "OVERDUE";
type TeamActor = {
  id: string;
  label: string;
  kind: "OWNER" | "MANAGER";
};

const STATUS_OPTIONS: { value: SidebarStatus; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "WAITING_PAYMENT", label: "Waiting payment" },
  { value: "DONE", label: "Done" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "CANCELED", label: "Canceled" },
  { value: "DUPLICATE", label: "Duplicate" },
];

type Props = {
  phoneRaw: string;
  q: string;
  statuses: SidebarStatus[];
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
  statuses,
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
                  defaultChecked={statuses.includes(option.value)}
                  className="peer sr-only"
                />
                <span className="inline-flex min-h-9 items-center rounded-full border border-[#dde3ee] bg-white px-3 py-2 text-[12px] font-medium leading-4 text-[#475467] shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition peer-checked:border-[#111827] peer-checked:bg-[#111827] peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-[#111827]/20">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
          <div className="mt-1.5 text-[11px] font-medium text-gray-500">
            Choose one or several statuses. If none selected, all statuses are shown.
          </div>
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
          <Button
            type="submit"
            size="sm"
            className="h-10 w-full justify-center"
          >
            Apply filters
          </Button>
        )}
      </form>
    </section>
  );
}
