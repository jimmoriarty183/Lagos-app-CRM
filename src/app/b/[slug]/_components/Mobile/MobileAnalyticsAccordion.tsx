import Accordion from "../../Accordion";
import { BarChart3 } from "lucide-react";

function KpiCard({
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
  const toneBg =
    tone === "blue"
      ? "bg-blue-50/60 border-blue-100"
      : tone === "amber"
      ? "bg-amber-50/60 border-amber-100"
      : tone === "green"
      ? "bg-green-50/60 border-green-100"
      : "bg-white border-gray-200";

  return (
    <div className={`rounded-xl border ${toneBg} p-4`}>
      <div className="text-xs font-semibold text-gray-500">{title}</div>
      <div className="mt-1 text-xl font-extrabold text-gray-900 tabular-nums">
        {value}
      </div>
      {sub ? <div className="mt-2 text-xs text-gray-500">{sub}</div> : null}
    </div>
  );
}

type Props = {
  canSeeAnalytics: boolean;
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

export default function MobileAnalyticsAccordion({
  canSeeAnalytics,
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
  if (!canSeeAnalytics) return null;

  return (
    <Accordion
      title={
        (
          <span className="inline-flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-gray-400" />
            Analytics
          </span>
        ) as any
      }
      defaultOpen={false}
    >
      <div className="grid gap-3">
        <div className="grid grid-cols-1 gap-3">
          <KpiCard
            title="Total orders"
            value={String(totalOrders)}
            tone="blue"
          />
          <KpiCard
            title="Total amount"
            value={fmtAmount(Math.round(totalAmount))}
            tone="blue"
          />
          <KpiCard
            title="Overdue (NEW+IN_PROGRESS)"
            value={String(overdueCount)}
            tone="amber"
          />
          <KpiCard
            title="Waiting payment"
            value={String(waitingPaymentCount)}
            sub={`Amount: ${fmtAmount(Math.round(waitingPaymentAmount))}`}
            tone="amber"
          />
          <KpiCard
            title="Done"
            value={String(doneCount)}
            sub={`Amount: ${fmtAmount(Math.round(doneAmount))}`}
            tone="green"
          />
          <KpiCard title="In progress" value={String(inProgressCount)} />
          <KpiCard title="New" value={String(newCount)} />
          <KpiCard
            title="Removed"
            value={String(canceledCount + duplicateCount)}
            sub={`Canceled: ${canceledCount} · Duplicate: ${duplicateCount}`}
          />
          <KpiCard
            title="Active amount"
            value={fmtAmount(Math.round(activeAmount))}
            sub="NEW + IN PROGRESS"
            tone="blue"
          />
        </div>

        <div className="text-xs text-gray-500">Based on current filters</div>
      </div>
    </Accordion>
  );
}
