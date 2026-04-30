import type { ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  CircleDollarSign,
  Package2,
  PlayCircle,
} from "lucide-react";

import MobileAccordion from "./MobileAccordion";

type Props = {
  canSeeAnalytics: boolean;
  totalOrders: number;
  totalRevenue: number;
  activeOrders: number;
  overdueCount: number;
  fmtRevenue: (n: number) => string;
};

type MetricTone = "blue" | "neutral" | "green" | "red";

function KpiCard({
  title,
  value,
  sub,
  tone = "neutral",
  icon,
}: {
  title: string;
  value: string;
  sub: string;
  tone?: MetricTone;
  icon: ReactNode;
}) {
  const toneBg =
    tone === "blue"
      ? "bg-[#eef4ff] text-[#2459d3]"
      : tone === "green"
        ? "bg-[#ecfdf3] text-[#067647]"
        : tone === "red"
          ? "bg-[#fef3f2] text-[#d92d20]"
          : "bg-[#f2f4f7] text-[#667085]";

  const valueCls = tone === "red" ? "text-[#d92d20]" : "text-[#111827]";
  const subCls = tone === "red" ? "text-[#b42318]" : "text-[#667085]";

  return (
    <div className="flex min-h-[136px] flex-col rounded-3xl border border-[#dde3ee] bg-white dark:bg-white/[0.03] p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold text-[#667085]">{title}</div>
        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl ${toneBg}`}>
          {icon}
        </div>
      </div>
      <div className={`mt-3 text-[22px] font-semibold tabular-nums ${valueCls}`}>
        {value}
      </div>
      <div className={`mt-2 text-xs font-medium ${subCls}`}>{sub}</div>
    </div>
  );
}

export default function MobileAnalyticsAccordion({
  canSeeAnalytics,
  totalOrders,
  totalRevenue,
  activeOrders,
  overdueCount,
  fmtRevenue,
}: Props) {
  if (!canSeeAnalytics) return null;

  return (
    <MobileAccordion
      title={
        <span className="inline-flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-gray-400 dark:text-white/45" />
          Summary
        </span>
      }
      defaultOpen={false}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <KpiCard
          title="Total Orders"
          value={String(totalOrders)}
          sub="All orders in the current result set"
          tone="blue"
          icon={<Package2 className="h-4 w-4" />}
        />
        <KpiCard
          title="Total Revenue"
          value={fmtRevenue(Math.round(totalRevenue))}
          sub="Sum of visible order amounts"
          tone="neutral"
          icon={<CircleDollarSign className="h-4 w-4" />}
        />
        <KpiCard
          title="Active Orders"
          value={String(activeOrders)}
          sub="Open work currently in motion"
          tone="green"
          icon={<PlayCircle className="h-4 w-4" />}
        />
        <KpiCard
          title="Overdue Orders"
          value={String(overdueCount)}
          sub="Past due and still unresolved"
          tone="red"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>
    </MobileAccordion>
  );
}
