import { BarChart3 } from "lucide-react";

type Props = {
  canSeeAnalytics: boolean;

  // старые пропсы оставил для совместимости
  card?: React.CSSProperties;
  cardHeader?: React.CSSProperties;
  cardTitle?: React.CSSProperties;

  // data
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
  const toneBg =
    tone === "blue"
      ? "bg-blue-50/60"
      : tone === "amber"
      ? "bg-amber-50/60"
      : tone === "green"
      ? "bg-green-50/60"
      : "bg-white";

  const border =
    tone === "blue"
      ? "border-blue-100"
      : tone === "amber"
      ? "border-amber-100"
      : tone === "green"
      ? "border-green-100"
      : "border-gray-200";

  return (
    <div className={`rounded-xl border ${border} p-4 ${toneBg}`}>
      <div className="text-xs sm:text-sm text-gray-500 font-semibold">
        {title}
      </div>
      <div className="mt-1 text-xl sm:text-2xl font-extrabold text-gray-900 tabular-nums">
        {value}
      </div>
      {sub ? (
        <div className="mt-2 text-xs sm:text-sm text-gray-500">{sub}</div>
      ) : null}
    </div>
  );
}

export default function DesktopAnalyticsCard(props: Props) {
  const {
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
  } = props;

  if (!canSeeAnalytics) return null;

  return (
    <section
      id="analytics"
      className="desktopOnly bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-gray-400" />
          <div className="text-base sm:text-lg font-semibold text-gray-900">
            Analytics
          </div>
        </div>
        <div className="text-xs text-gray-500">Based on current filters</div>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <MetricCard
          title="Total orders"
          value={String(totalOrders)}
          tone="blue"
        />
        <MetricCard
          title="Total amount"
          value={fmtAmount(Math.round(totalAmount))}
          tone="blue"
        />
        <MetricCard
          title="Overdue (NEW+IN_PROGRESS)"
          value={String(overdueCount)}
          tone="amber"
        />
        <MetricCard
          title="Waiting payment"
          value={String(waitingPaymentCount)}
          sub={`Amount: ${fmtAmount(Math.round(waitingPaymentAmount))}`}
          tone="amber"
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
          sub={`Canceled: ${canceledCount} · Duplicate: ${duplicateCount}`}
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
