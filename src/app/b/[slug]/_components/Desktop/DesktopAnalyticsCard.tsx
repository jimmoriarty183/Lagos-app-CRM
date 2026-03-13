import { BarChart3 } from "lucide-react";

type Props = {
  totalOrders: number;
  totalAmount: number;
  overdueCount: number;
  waitingPaymentCount: number;
  waitingPaymentAmount: number;
  doneCount: number;
  doneAmount: number;
  inProgressCount: number;
  newCount: number;
  canceledCount: number;
  duplicateCount: number;
  activeAmount: number;
  fmtAmount: (n: number) => string;
};

function MetricCard({
  title,
  value,
  sub,
  tone = "neutral",
}: {
  title: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "blue" | "amber" | "green";
}) {
  const toneClasses =
    tone === "blue"
      ? "bg-[#ecf4ff]"
      : tone === "amber"
        ? "bg-[#fff3e8]"
        : tone === "green"
          ? "bg-[#ecfff4]"
          : "bg-white";

  return (
    <article
      className={`min-w-0 rounded-2xl border border-[#dde3ee] p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${toneClasses}`}
    >
      <div className="text-[11px] font-semibold tracking-[-0.01em] text-[#7c8798]">
        {title}
      </div>
      <div className="mt-1 text-[28px] font-bold leading-none tracking-[-0.04em] text-[#111827] tabular-nums">
        {value}
      </div>
      {sub ? (
        <div className="mt-2 text-[10px] font-medium uppercase tracking-[0.06em] text-[#98a2b3]">
          {sub}
        </div>
      ) : null}
    </article>
  );
}

export default function DesktopAnalyticsCard({
  totalOrders,
  totalAmount,
  overdueCount,
  waitingPaymentCount,
  waitingPaymentAmount,
  doneCount,
  doneAmount,
  inProgressCount,
  newCount,
  canceledCount,
  duplicateCount,
  activeAmount,
  fmtAmount,
}: Props) {
  return (
    <section id="analytics" className="min-w-0 space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-[#111827]">
          <BarChart3 className="h-4 w-4 text-[#98a2b3]" />
          Analytics
        </div>
        <div className="text-[11px] font-medium text-[#98a2b3]">Current filter set</div>
      </div>

      <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard title="Total orders" value={String(totalOrders)} tone="blue" />
        <MetricCard
          title="Total amount"
          value={fmtAmount(Math.round(totalAmount))}
          tone="blue"
        />
        <MetricCard
          title="Overdue"
          value={String(overdueCount)}
          sub="NEW+IN_PROGRESS"
        />
        <MetricCard
          title="Waiting payment"
          value={String(waitingPaymentCount)}
          sub={`Amount: ${fmtAmount(Math.round(waitingPaymentAmount))}`}
        />
        <MetricCard
          title="Done"
          value={String(doneCount)}
          sub={`Amount: ${fmtAmount(Math.round(doneAmount))}`}
          tone="green"
        />
        <MetricCard title="In progress" value={String(inProgressCount)} />
        <MetricCard title="New" value={String(newCount)} />
        <MetricCard
          title="Removed"
          value={String(canceledCount + duplicateCount)}
          sub={`Canceled: ${canceledCount} / Duplicate: ${duplicateCount}`}
        />
        <MetricCard
          title="Active amount"
          value={fmtAmount(Math.round(activeAmount))}
          sub="NEW + IN PROGRESS"
          tone="blue"
        />
      </div>
    </section>
  );
}
