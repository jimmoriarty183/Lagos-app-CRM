"use client";

import type { ReactNode } from "react";
import { ArrowRight, AlertTriangle, CircleDollarSign, Package2, PlayCircle, SlidersHorizontal } from "lucide-react";

type Props = {
  totalOrders: number;
  totalRevenue: number;
  activeOrders: number;
  overdueCount: number;
  hasActiveFilters: boolean;
  clearHref: string;
};

type StatTone = "blue" | "neutral" | "green" | "red";

function StatCard({
  label,
  value,
  meta,
  tone,
  icon,
}: {
  label: string;
  value: string;
  meta: string;
  tone: StatTone;
  icon: ReactNode;
}) {
  const toneCls =
    tone === "blue"
      ? "bg-[#eef4ff] text-[#2459d3]"
      : tone === "green"
        ? "bg-[#ecfdf3] text-[#067647]"
        : tone === "red"
          ? "bg-[#fef3f2] text-[#d92d20]"
          : "bg-[#f2f4f7] text-[#667085]";

  const valueCls = tone === "red" ? "text-[#d92d20]" : "text-[#111827]";
  const metaCls = tone === "red" ? "text-[#b42318]" : "text-[#667085]";

  return (
    <div className="flex min-h-[138px] flex-col rounded-3xl border border-[#dde3ee] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[12px] font-semibold tracking-[-0.01em] text-[#667085]">
          {label}
        </div>
        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl ${toneCls}`}>
          {icon}
        </div>
      </div>
      <div className={`mt-4 text-[24px] font-bold tracking-[-0.03em] tabular-nums ${valueCls}`}>
        {value}
      </div>
      <div className={`mt-2 text-[12px] font-medium ${metaCls}`}>{meta}</div>
    </div>
  );
}

export default function MobileSummaryBar({
  totalOrders,
  totalRevenue,
  activeOrders,
  overdueCount,
  hasActiveFilters,
  clearHref,
}: Props) {
  const revenueLabel = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(totalRevenue));

  const openFilters = () => {
    window.dispatchEvent(new CustomEvent("orders-mobile-open-filters"));
  };

  return (
    <section className="rounded-[28px] border border-[#dde3ee] bg-[#f8fafc]/92 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur lg:hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#667085]">
            Orders
          </div>
          <div className="mt-1 text-lg font-bold tracking-[-0.02em] text-[#111827]">
            Summary
          </div>
          <div className="mt-1 text-xs text-[#667085]">
            {hasActiveFilters ? "Based on filtered results" : "Based on all current orders"}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <button
            type="button"
            onClick={openFilters}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dde3ee] bg-white px-3 text-xs font-semibold text-[#475467]"
          >
            <SlidersHorizontal className="h-4 w-4 text-[#98a2b3]" />
            Filters
          </button>

          {hasActiveFilters ? (
            <a
              href={clearHref}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#667085]"
            >
              Clear active
              <ArrowRight className="h-3 w-3" />
            </a>
          ) : (
            <span className="text-[11px] font-semibold text-[#98a2b3]">No filters</span>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard
          label="Total Orders"
          value={String(totalOrders)}
          meta="All orders in the current result set"
          tone="blue"
          icon={<Package2 className="h-4 w-4" />}
        />
        <StatCard
          label="Total Revenue"
          value={revenueLabel}
          meta="Sum of visible order amounts"
          tone="neutral"
          icon={<CircleDollarSign className="h-4 w-4" />}
        />
        <StatCard
          label="Active Orders"
          value={String(activeOrders)}
          meta="Open work currently in motion"
          tone="green"
          icon={<PlayCircle className="h-4 w-4" />}
        />
        <StatCard
          label="Overdue Orders"
          value={String(overdueCount)}
          meta="Past due and still unresolved"
          tone="red"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>
    </section>
  );
}
