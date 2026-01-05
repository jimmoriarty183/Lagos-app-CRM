import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { normalizePhone } from "@/lib/phone";
import { createOrder, setOrderPaid, setOrderStatus } from "./actions";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type BusinessRow = {
  id: string;
  slug: string;
  owner_phone: string;
  manager_phone: string | null;
  plan: string;
  expires_at: string;
};

type OrderRow = {
  id: string;
  client_name: string;
  client_phone: string | null;
  amount: number;
  due_date: string | null;
  status: "NEW" | "DONE";
  paid: boolean;
  created_at: string;
};

function fmtAmount(n: number) {
  // без валюты, просто разделители
  return new Intl.NumberFormat("uk-UA").format(n);
}

export default async function BusinessPage({ params, searchParams }: PageProps) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);

  if (!slug) notFound();

  // u — текущий “идентификатор” пользователя (телефон)
  const u = sp?.u; // normalizePhone НЕ трогаем, как ты сказал
  const phoneRaw =
    typeof u === "string"
      ? decodeURIComponent(u)
      : Array.isArray(u)
      ? decodeURIComponent(u[0] || "")
      : "";

  const phone = phoneRaw ? normalizePhone(phoneRaw) : "";

  // бизнес
  const { data: business, error: bErr } = await supabase
    .from("businesses")
    .select("id, slug, owner_phone, manager_phone, plan, expires_at")
    .eq("slug", slug)
    .single<BusinessRow>();

  if (bErr || !business) {
    return (
      <div style={{ padding: 24 }}>
        <b>Business not found:</b> {slug}
      </div>
    );
  }

  const ownerNorm = normalizePhone(business.owner_phone);
  const managerNorm = business.manager_phone ? normalizePhone(business.manager_phone) : "";

  const isOwner = !!phone && phone === ownerNorm;
  const isManager = !!phone && !!managerNorm && phone === managerNorm;

  const role: "OWNER" | "MANAGER" | "GUEST" = isOwner ? "OWNER" : isManager ? "MANAGER" : "GUEST";

  const canView = role === "OWNER" || role === "MANAGER";
  const canManage = role === "MANAGER"; // как ты и говорил

  if (!canView) {
    return (
      <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Business: {business.slug}</div>
          <div style={{ opacity: 0.75, marginTop: 4 }}>Role: {role}</div>
        </div>

        <div
          style={{
            border: "1px solid #e5e5e5",
            borderRadius: 12,
            padding: 16,
            background: "white",
          }}
        >
          <b>Access denied.</b>
          <div style={{ marginTop: 8, opacity: 0.8 }}>
            Открой ссылку через <code>/m/&lt;phone&gt;</code> или добавь <code>?u=380...</code>
          </div>
        </div>
      </div>
    );
  }

  // заказы
  const { data: orders } = await supabase
    .from("orders")
    .select("id, client_name, client_phone, amount, due_date, status, paid, created_at")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  const list = (orders || []) as OrderRow[];

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Business: {business.slug}</div>
        <div style={{ opacity: 0.75, marginTop: 4 }}>
          Plan: {business.plan} &nbsp;&nbsp; Owner: {business.owner_phone}
        </div>
      </div>

      {/* MANAGER: форма создания заказа */}
      {canManage ? (
        <div
          style={{
            border: "1px solid #e5e5e5",
            borderRadius: 12,
            padding: 16,
            background: "white",
            marginBottom: 16,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Add order</div>

          <form
            action={async (fd) => {
              "use server";
              const clientName = String(fd.get("client_name") || "").trim();
              const clientPhone = String(fd.get("client_phone") || "").trim();
              const amountRaw = String(fd.get("amount") || "").trim();
              const dueDate = String(fd.get("due_date") || "").trim(); // YYYY-MM-DD из input[type=date]

              const amount = Number(amountRaw);
              if (!clientName) throw new Error("Client name is required");
              if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be > 0");

              await createOrder({
                businessId: business.id,
                clientName,
                clientPhone: clientPhone || undefined,
                amount,
                dueDate: dueDate || undefined,
              });
            }}
          >
            <div style={{ display: "grid", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Client name *</span>
                <input
                  name="client_name"
                  placeholder="John"
                  style={{
                    height: 40,
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    padding: "0 12px",
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Client phone</span>
                <input
                  name="client_phone"
                  placeholder="+380..."
                  style={{
                    height: 40,
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    padding: "0 12px",
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Amount *</span>
                <input
                  name="amount"
                  placeholder="15000"
                  inputMode="numeric"
                  style={{
                    height: 40,
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    padding: "0 12px",
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Due date</span>
                <input
                  name="due_date"
                  type="date"
                  style={{
                    height: 40,
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    padding: "0 12px",
                  }}
                />
              </label>

              <button
                type="submit"
                style={{
                  height: 44,
                  borderRadius: 10,
                  border: "none",
                  background: "#111",
                  color: "white",
                  fontWeight: 700,
                  cursor: "pointer",
                  marginTop: 6,
                }}
              >
                Create
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Таблица заказов (видят и OWNER и MANAGER), но Actions только MANAGER */}
      <div
        style={{
          border: "1px solid #e5e5e5",
          borderRadius: 12,
          padding: 16,
          background: "white",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Orders</div>

        {list.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No orders yet</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                  <th style={{ padding: "10px 6px" }}>Client</th>
                  <th style={{ padding: "10px 6px" }}>Amount</th>
                  <th style={{ padding: "10px 6px" }}>Due</th>
                  <th style={{ padding: "10px 6px" }}>Status</th>
                  <th style={{ padding: "10px 6px" }}>Paid</th>
                  <th style={{ padding: "10px 6px" }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {list.map((o) => (
                  <tr key={o.id} style={{ borderBottom: "1px solid #f2f2f2" }}>
                    <td style={{ padding: "10px 6px" }}>
                      <div style={{ fontWeight: 600 }}>{o.client_name}</div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>{o.client_phone || ""}</div>
                    </td>

                    <td style={{ padding: "10px 6px", fontWeight: 700 }}>{fmtAmount(Number(o.amount))}</td>

                    <td style={{ padding: "10px 6px" }}>{o.due_date || ""}</td>

                    <td style={{ padding: "10px 6px", fontWeight: 700 }}>{o.status}</td>

                    <td style={{ padding: "10px 6px", opacity: 0.75 }}>{o.paid ? "paid" : "unpaid"}</td>

                    <td style={{ padding: "10px 6px" }}>
                      {canManage ? (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {/* статус */}
                          {o.status === "NEW" ? (
                            <form
                              action={async () => {
                                "use server";
                                await setOrderStatus({ orderId: o.id, status: "DONE" });
                              }}
                            >
                              <button
                                type="submit"
                                style={{
                                  height: 30,
                                  padding: "0 12px",
                                  borderRadius: 10,
                                  border: "1px solid #ddd",
                                  background: "white",
                                  cursor: "pointer",
                                }}
                              >
                                Done
                              </button>
                            </form>
                          ) : (
                            <form
                              action={async () => {
                                "use server";
                                await setOrderStatus({ orderId: o.id, status: "NEW" });
                              }}
                            >
                              <button
                                type="submit"
                                style={{
                                  height: 30,
                                  padding: "0 12px",
                                  borderRadius: 10,
                                  border: "1px solid #ddd",
                                  background: "white",
                                  cursor: "pointer",
                                }}
                              >
                                Back
                              </button>
                            </form>
                          )}

                          {/* paid */}
                          {o.paid ? (
                            <form
                              action={async () => {
                                "use server";
                                await setOrderPaid({ orderId: o.id, paid: false });
                              }}
                            >
                              <button
                                type="submit"
                                style={{
                                  height: 30,
                                  padding: "0 12px",
                                  borderRadius: 10,
                                  border: "1px solid #ddd",
                                  background: "white",
                                  cursor: "pointer",
                                }}
                              >
                                Unpaid
                              </button>
                            </form>
                          ) : (
                            <form
                              action={async () => {
                                "use server";
                                await setOrderPaid({ orderId: o.id, paid: true });
                              }}
                            >
                              <button
                                type="submit"
                                style={{
                                  height: 30,
                                  padding: "0 12px",
                                  borderRadius: 10,
                                  border: "1px solid #ddd",
                                  background: "white",
                                  cursor: "pointer",
                                }}
                              >
                                Paid
                              </button>
                            </form>
                          )}
                        </div>
                      ) : (
                        <span style={{ opacity: 0.5 }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
