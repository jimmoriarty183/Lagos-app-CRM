"use client";

import { ArrowRight, SlidersHorizontal } from "lucide-react";

type Props = {
  totalCount: number;
  overdueCount: number;
  waitingPaymentCount: number;
  activeAmountLabel: string;
  hasActiveFilters: boolean;
  clearHref: string;
};

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "red" | "amber" | "green";
}) {
  const toneCls =
    tone === "blue"
      ? "border-blue-100 bg-blue-50 text-blue-700"
      : tone === "red"
        ? "border-red-100 bg-red-50 text-red-700"
        : tone === "amber"
          ? "border-amber-100 bg-amber-50 text-amber-700"
          : "border-emerald-100 bg-emerald-50 text-emerald-700";

  return (
    <div className={`rounded-2xl border p-3 ${toneCls}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-80">
        {label}
      </div>
      <div className="mt-1 text-lg font-extrabold tabular-nums text-gray-900">
        {value}
      </div>
    </div>
  );
}

export default function MobileSummaryBar({
  totalCount,
  overdueCount,
  waitingPaymentCount,
  activeAmountLabel,
  hasActiveFilters,
  clearHref,
}: Props) {
  const openFilters = () => {
    window.dispatchEvent(new CustomEvent("orders-mobile-open-filters"));
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
            Orders
          </div>
          <div className="mt-1 text-lg font-extrabold text-gray-900">
            {totalCount} shown in list
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {hasActiveFilters ? "Filtered results" : "All current orders"}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <button
            type="button"
            onClick={openFilters}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700"
          >
            <SlidersHorizontal className="h-4 w-4 text-gray-400" />
            Filters
          </button>

          {hasActiveFilters ? (
            <a
              href={clearHref}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500"
            >
              Clear active
              <ArrowRight className="h-3 w-3" />
            </a>
          ) : (
            <span className="text-[11px] font-semibold text-gray-400">
              No filters
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatCard label="Orders" value={String(totalCount)} tone="blue" />
        <StatCard label="Overdue" value={String(overdueCount)} tone="red" />
        <StatCard label="Waiting" value={String(waitingPaymentCount)} tone="amber" />
        <StatCard label="Active" value={`UAH ${activeAmountLabel}`} tone="green" />
      </div>
    </section>
  );
}
