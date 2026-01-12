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

type Props = {
  list: OrderRow[];
  todayISO: string;
  businessSlug: string;
  phoneRaw: string;
  canManage: boolean;
  canEdit: boolean;
};

export default function DesktopOrdersTable({
  list,
  todayISO,
  businessSlug,
  phoneRaw,
  canManage,
  canEdit,
}: Props) {
  return (
    <div className="desktopOnly" style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #eef2f7" }}>
            <th style={{ padding: "10px 6px" }}>Client</th>
            <th style={{ padding: "10px 6px" }}>Amount</th>
            <th style={{ padding: "10px 6px" }}>Due</th>
            <th style={{ padding: "10px 6px" }}>Status</th>
            <th style={{ padding: "10px 6px" }}>Actions</th>
          </tr>
        </thead>

        <tbody>
          {list.map((o) => {
            const dueISO = o.due_date ? String(o.due_date).slice(0, 10) : null;

            const isOverdue =
              !!dueISO &&
              dueISO < todayISO &&
              (o.status === "NEW" || o.status === "IN_PROGRESS");

            return (
              <tr
                key={o.id}
                style={{
                  borderBottom: "1px solid #f1f5f9",
                  background: isOverdue ? "#fff5f5" : "transparent",
                }}
              >
                <td style={{ padding: "12px 6px" }}>
                  <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>
                    <strong>Order #{o.order_number ?? "-"}</strong> · Created:{" "}
                    {new Date(o.created_at).toLocaleString("en-NG", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>

                  <div style={{ fontWeight: 700 }}>{o.client_name}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {o.client_phone || ""}
                  </div>

                  {o.description ? (
                    <details style={{ marginTop: 6 }}>
                      <summary
                        style={{
                          cursor: "pointer",
                          fontSize: 14,
                          fontWeight: 700,
                          color: "#111",
                          listStyle: "none",
                          WebkitAppearance: "none",
                          textDecoration: "underline",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          opacity: 0.9,
                        }}
                      >
                        <span aria-hidden style={{ fontSize: 14 }}>
                          📝
                        </span>
                        <span>Show description</span>
                      </summary>

                      <div
                        style={{
                          marginTop: 8,
                          paddingLeft: 12,
                          fontSize: 15,
                          lineHeight: 1.5,
                          opacity: 0.95,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {o.description}
                      </div>
                    </details>
                  ) : null}
                </td>

                <td style={{ padding: "12px 6px", fontWeight: 800 }}>
                  {fmtAmount(Number(o.amount))}
                </td>

                <td style={{ padding: "12px 6px" }}>
                  <div
                    style={{
                      color: isOverdue ? "#b91c1c" : undefined,
                      fontWeight: isOverdue ? 700 : 500,
                    }}
                  >
                    {o.due_date || ""}
                  </div>

                  {isOverdue && (
                    <div
                      style={{ fontSize: 11, color: "#b91c1c", opacity: 0.8 }}
                    >
                      Overdue
                    </div>
                  )}
                </td>

                <td style={{ padding: "12px 6px" }}>
                  <StatusCell
                    orderId={o.id}
                    value={o.status}
                    canManage={canManage}
                  />
                </td>

                <td style={{ padding: "12px 6px" }}>
                  {canEdit ? (
                    <a
                      href={`/b/${businessSlug}/o/${
                        o.id
                      }?u=${encodeURIComponent(phoneRaw)}`}
                      style={{
                        height: 32,
                        padding: "0 12px",
                        borderRadius: 12,
                        border: "1px solid #e5e7eb",
                        background: "white",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        textDecoration: "none",
                        color: "#111",
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      Edit
                    </a>
                  ) : (
                    <span style={{ opacity: 0.5 }}>—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
