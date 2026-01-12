import Accordion from "../../Accordion";

function KpiCard({
  title,
  value,
  sub,
}: {
  title: string;
  value: string;
  sub?: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        padding: 12,
        minWidth: 160,
        background: "white",
      }}
    >
      <div style={{ opacity: 0.7, fontSize: 12, fontWeight: 700 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 900 }}>{value}</div>
      {sub ? (
        <div style={{ opacity: 0.65, fontSize: 12, marginTop: 2 }}>{sub}</div>
      ) : null}
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
    <Accordion title="Analytics" defaultOpen={false}>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <KpiCard title="Total orders" value={String(totalOrders)} />
          <KpiCard
            title="Total amount"
            value={fmtAmount(Math.round(totalAmount))}
          />
          <KpiCard
            title="Overdue (NEW+IN_PROGRESS)"
            value={String(overdueCount)}
          />
          <KpiCard
            title="Waiting payment"
            value={String(waitingPaymentCount)}
            sub={`Amount: ${fmtAmount(Math.round(waitingPaymentAmount))}`}
          />
          <KpiCard
            title="Done"
            value={String(doneCount)}
            sub={`Amount: ${fmtAmount(Math.round(doneAmount))}`}
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
          />
        </div>
        <div style={{ fontSize: 12, opacity: 0.65 }}>
          Based on current filters
        </div>
      </div>
    </Accordion>
  );
}
