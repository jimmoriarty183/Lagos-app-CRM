"use client";

import { ArrowRight, SlidersHorizontal } from "lucide-react";

type Props = {
  totalOrders: number;
  totalRevenue: number;
  activeOrders: number;
  overdueCount: number;
  hasActiveFilters: boolean;
  clearHref: string;
};

function formatCompactRevenue(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
  }
  if (abs >= 1_000) {
    return `$${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function PreviewPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "red";
}) {
  return (
    <div
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        tone === "red"
          ? "border-[#ffd5d2] bg-[#fff5f4] text-[#d92d20]"
          : "border-[#dde3ee] bg-white text-[#475467]",
      ].join(" ")}
    >
      <span>{value}</span>
      <span className="text-[#98a2b3]">{label}</span>
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
  const compactRevenueLabel = formatCompactRevenue(Math.round(totalRevenue));

  const openFilters = () => {
    window.dispatchEvent(new CustomEvent("orders-mobile-open-filters"));
  };

  return (
    <section className="rounded-[24px] border border-[#dde3ee] bg-[#f8fafc]/92 p-3 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur lg:hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#667085]">
            Summary
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <PreviewPill label="Orders" value={String(totalOrders)} />
            <PreviewPill label="Revenue" value={compactRevenueLabel} />
            <PreviewPill label="Active" value={String(activeOrders)} />
            <PreviewPill label="Overdue" value={String(overdueCount)} tone="red" />
          </div>
          <div className="mt-2 text-[11px] font-medium text-[#98a2b3]">
            {hasActiveFilters ? "Filtered results" : "All current orders"}
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
              Clear
              <ArrowRight className="h-3 w-3" />
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
