import type { ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  CircleDollarSign,
  Package2,
  PlayCircle,
} from "lucide-react";

type Props = {
  totalOrders: number;
  totalRevenue: number;
  activeOrders: number;
  overdueCount: number;
  fmtRevenue: (n: number) => string;
};

type MetricTone = "neutral" | "blue" | "green" | "red";

function SummaryCard({
  label,
  value,
  meta,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  meta: string;
  tone?: MetricTone;
  icon: ReactNode;
}) {
  const toneClasses =
    tone === "blue"
      ? {
          iconWrap: "bg-[#eef4ff] text-[#2459d3]",
          value: "text-[#111827]",
          meta: "text-[#667085]",
        }
      : tone === "green"
        ? {
            iconWrap: "bg-[#ecfdf3] text-[#067647]",
            value: "text-[#111827]",
            meta: "text-[#667085]",
          }
        : tone === "red"
          ? {
              iconWrap: "bg-[#fef3f2] text-[#d92d20]",
              value: "text-[#d92d20]",
              meta: "text-[#b42318]",
            }
          : {
              iconWrap: "bg-[#f2f4f7] text-[#667085]",
              value: "text-[#111827]",
              meta: "text-[#667085]",
            };

  return (
    <article className="flex h-full min-w-0 flex-col rounded-3xl border border-[#dde3ee] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[12px] font-semibold tracking-[-0.01em] text-[#667085]">
          {label}
        </div>
        <div
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${toneClasses.iconWrap}`}
        >
          {icon}
        </div>
      </div>

      <div className={`mt-5 text-[30px] font-bold leading-none tracking-[-0.04em] tabular-nums ${toneClasses.value}`}>
        {value}
      </div>

      <div className={`mt-3 text-[12px] font-medium ${toneClasses.meta}`}>{meta}</div>
    </article>
  );
}

export default function DesktopAnalyticsCard({
  totalOrders,
  totalRevenue,
  activeOrders,
  overdueCount,
  fmtRevenue,
}: Props) {
  return (
    <section id="analytics" className="min-w-0 space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-[#111827]">
          <BarChart3 className="h-4 w-4 text-[#98a2b3]" />
          Summary
        </div>
        <div className="text-[11px] font-medium text-[#98a2b3]">Current filter set</div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Orders"
          value={String(totalOrders)}
          meta="All orders in the current result set"
          tone="blue"
          icon={<Package2 className="h-5 w-5" />}
        />
        <SummaryCard
          label="Total Revenue"
          value={fmtRevenue(Math.round(totalRevenue))}
          meta="Sum of visible order amounts"
          tone="neutral"
          icon={<CircleDollarSign className="h-5 w-5" />}
        />
        <SummaryCard
          label="Active Orders"
          value={String(activeOrders)}
          meta="Open work currently in motion"
          tone="green"
          icon={<PlayCircle className="h-5 w-5" />}
        />
        <SummaryCard
          label="Overdue Orders"
          value={String(overdueCount)}
          meta="Past due and still unresolved"
          tone="red"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
      </div>
    </section>
  );
}
