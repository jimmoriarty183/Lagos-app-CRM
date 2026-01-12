import { StatusCell } from "../../InlineCells";

type Status =
  | "NEW"
  | "IN_PROGRESS"
  | "WAITING_PAYMENT"
  | "DONE"
  | "CANCELED"
  | "DUPLICATE";

type OrderRow = {
  id: string;
  client_name: string;
  client_phone: string | null;
  amount: number;
  description: string | null;
  due_date: string | null;
  status: Status;
  order_number: number | null;
  created_at: string;
};

function fmtAmount(n: number) {
  return new Intl.NumberFormat("uk-UA").format(n);
}

function clamp(s: string, max = 34) {
  const t = (s || "").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + "…";
}

function statusTone(status: Status) {
  if (status === "NEW")
    return { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" };
  if (status === "IN_PROGRESS")
    return { bg: "#fffbeb", border: "#fed7aa", text: "#b45309" };
  if (status === "WAITING_PAYMENT")
    return { bg: "#fffbeb", border: "#fed7aa", text: "#b45309" };
  if (status === "DONE")
    return { bg: "#ecfdf5", border: "#bbf7d0", text: "#047857" };
  if (status === "CANCELED")
    return { bg: "#fef2f2", border: "#fecaca", text: "#b91c1c" };
  return { bg: "#f8fafc", border: "#e5e7eb", text: "#0f172a" };
}

function MobileOrderCard({
  o,
  businessSlug,
  phoneRaw,
  canManage,
  canEdit,
  todayISO,
}: {
  o: OrderRow;
  businessSlug: string;
  phoneRaw: string;
  canManage: boolean;
  canEdit: boolean;
  todayISO: string;
}) {
  const dueISO = o.due_date ? String(o.due_date).slice(0, 10) : null;
  const isOverdue =
    !!dueISO &&
    dueISO < todayISO &&
    (o.status === "NEW" || o.status === "IN_PROGRESS");

  const st = statusTone(o.status);

  return (
    <div
      style={{
        background: "white",
        border: `1px solid ${isOverdue ? "#fecaca" : "#e5e7eb"}`,
        borderRadius: 16,
        padding: 14,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "flex-start",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 15 }}>
            {clamp(o.client_name || "—", 40)}
          </div>

          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.7 }}>
            <b>Order #{o.order_number ?? "-"}</b>{" "}
            <span style={{ opacity: 0.55 }}>·</span>{" "}
            {new Date(o.created_at).toLocaleString("en-NG", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>

        <div
          style={{
            borderRadius: 999,
            border: `1px solid ${st.border}`,
            background: st.bg,
            color: st.text,
            fontWeight: 900,
            fontSize: 12,
            padding: "8px 12px",
            minHeight: 36,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            whiteSpace: "nowrap",
          }}
        >
          <StatusCell orderId={o.id} value={o.status} canManage={canManage} />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          marginTop: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 12, opacity: 0.65 }}>Amount</div>
          <div style={{ fontSize: 18, fontWeight: 950 }}>
            {fmtAmount(Number(o.amount))}
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, opacity: 0.65 }}>Due</div>
          <div
            style={{
              fontWeight: isOverdue ? 900 : 800,
              color: isOverdue ? "#b91c1c" : "#0f172a",
            }}
          >
            {o.due_date || "—"}
          </div>
          {isOverdue ? (
            <div style={{ fontSize: 11, color: "#b91c1c", opacity: 0.85 }}>
              Overdue
            </div>
          ) : null}
        </div>
      </div>

      {o.client_phone ? (
        <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>
          📞 {o.client_phone}
        </div>
      ) : null}

      {o.description ? (
        <details style={{ marginTop: 10 }}>
          <summary
            style={{
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 800,
              textDecoration: "underline",
              opacity: 0.9,
              listStyle: "none",
              WebkitAppearance: "none",
            }}
          >
            📝 Show description
          </summary>
          <div
            style={{
              marginTop: 8,
              fontSize: 14,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
            }}
          >
            {o.description}
          </div>
        </details>
      ) : null}

      <div
        style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}
      >
        {canEdit ? (
          <a
            href={`/b/${businessSlug}/o/${o.id}?u=${encodeURIComponent(
              phoneRaw
            )}`}
            style={{
              height: 40,
              padding: "0 14px",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: "white",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              textDecoration: "none",
              color: "#111",
              fontSize: 13,
              fontWeight: 900,
            }}
          >
            Edit
          </a>
        ) : (
          <span style={{ opacity: 0.5 }}>—</span>
        )}
      </div>
    </div>
  );
}

type Props = {
  list: OrderRow[];
  todayISO: string;
  businessSlug: string;
  phoneRaw: string;
  canManage: boolean;
  canEdit: boolean;
};

export default function MobileOrdersList({
  list,
  todayISO,
  businessSlug,
  phoneRaw,
  canManage,
  canEdit,
}: Props) {
  return (
    <div className="mobileOnly" style={{ display: "grid", gap: 10 }}>
      {list.map((o) => (
        <MobileOrderCard
          key={o.id}
          o={o}
          businessSlug={businessSlug}
          phoneRaw={phoneRaw}
          canManage={canManage}
          canEdit={canEdit}
          todayISO={todayISO}
        />
      ))}
    </div>
  );
}
