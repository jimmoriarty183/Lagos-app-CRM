import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { normalizePhone } from "@/lib/phone";
import { createOrder, setOrderPaid, setOrderStatus } from "./actions";
import { headers } from "next/headers";
import FiltersBar, { type Filters } from "./FiltersBar";

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
  description: string | null;
  due_date: string | null;
  status: "NEW" | "DONE";
  paid: boolean;
  order_number: number | null;
  created_at: string;
};

function fmtAmount(n: number) {
  // без валюты, просто разделители
  return new Intl.NumberFormat("uk-UA").format(n);
}

export default async function BusinessPage({
  params,
  searchParams,
}: PageProps) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);

  if (!slug) notFound();

  // u — текущий “идентификатор” пользователя (телефон)
  const u = sp?.u; // normalizePhone НЕ трогаем, как ты сказал
  const uStr = Array.isArray(u) ? u[0] : u; // string | undefined
  const clearHref = uStr
    ? `/b/${slug}?u=${encodeURIComponent(uStr)}`
    : `/b/${slug}`;
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
  const managerNorm = business.manager_phone
    ? normalizePhone(business.manager_phone)
    : "";

  const isOwner = !!phone && phone === ownerNorm;
  const isManager = !!phone && !!managerNorm && phone === managerNorm;

  const role: "OWNER" | "MANAGER" | "GUEST" = isOwner
    ? "OWNER"
    : isManager
    ? "MANAGER"
    : "GUEST";

  // тот самый случай owner_phone == manager_phone и user = этот номер
  const isOwnerManager = isOwner && isManager;

  const canView = role === "OWNER" || role === "MANAGER";
  const canManage = role === "MANAGER" || isOwnerManager; // ✅ full access (включая OWNER/MANAGER)
  const canSeeAnalytics = role === "OWNER" || isOwnerManager; // ✅ аналитика только OWNER или OWNER/MANAGER

  // ---- filters (from URL) ----
  // ⚠️ НЕ объявляем type Filters тут, используем тот что импортирован из ./FiltersBar

  function getSp(key: string): string {
    const v = (sp as any)?.[key];
    if (Array.isArray(v)) return String(v[0] ?? "");
    return String(v ?? "");
  }

  const filters: Filters = {
    q: getSp("q"),
    status: (getSp("status") || "ALL") as Filters["status"],
    paid: (getSp("paid") || "ALL") as Filters["paid"],
    range: (getSp("range") || "ALL") as Filters["range"],
  };

  const hasActiveFilters =
    !!filters.q?.trim() ||
    filters.status !== "ALL" ||
    filters.paid !== "ALL" ||
    filters.range !== "ALL";

  function getDateFromRange(range: Filters["range"]) {
    if (range === "ALL") return null;

    const d = new Date();
    if (range === "today") {
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    }
    if (range === "week") {
      d.setDate(d.getDate() - 7);
      return d.toISOString();
    }
    if (range === "month") {
      d.setMonth(d.getMonth() - 1);
      return d.toISOString();
    }
    return null;
  }

  // 🚫 GUEST ничего не видит вообще
  if (!canView) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <div className="rounded-2xl border p-6 text-center text-gray-500">
          Access restricted
        </div>
      </div>
    );
  }

  // заказы
  let query = supabase
    .from("orders")
    .select(
      "id, order_number, client_name, client_phone, amount, description, due_date, status, paid, created_at, search_text"
    )
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  if (filters.status !== "ALL") query = query.eq("status", filters.status);
  if (filters.paid === "1") query = query.eq("paid", true);
  if (filters.paid === "0") query = query.eq("paid", false);

  const dateFrom = getDateFromRange(filters.range);
  if (dateFrom) query = query.gte("created_at", dateFrom);

  const q = filters.q.trim().toLowerCase();
  if (q) query = query.ilike("search_text", `%${q}%`);

  const { data: orders, error: ordersError } = await query;

  if (ordersError) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <div className="rounded-2xl border p-6 text-center text-red-600">
          Orders query error: {ordersError.message}
        </div>
      </div>
    );
  }

  const list = (orders || []) as OrderRow[];

  // analytics
  const totalOrders = list.length;

  const totalAmount = list.reduce((sum, o) => sum + Number(o.amount ?? 0), 0);

  // overdue = due_date < today AND status === "NEW"
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const overdueCount = list.filter((o) => {
    if (!o.due_date) return false;
    const due = new Date(o.due_date);
    due.setHours(0, 0, 0, 0);
    return due < todayStart && o.status === "NEW";
  }).length;

  const todayISO = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>
          Business: {business.slug}
        </div>

        <div style={{ opacity: 0.75, marginTop: 4 }}>Plan: {business.plan}</div>

        <div style={{ opacity: 0.75, marginTop: 6 }}>
          Role: <b>{isOwnerManager ? "OWNER/MANAGER" : role}</b>
        </div>

        {/* Менеджер: только свой номер */}
        {role === "MANAGER" && !isOwnerManager && (
          <div style={{ opacity: 0.9, marginTop: 6 }}>
            Manager phone: <b>{business.manager_phone || phone}</b>
          </div>
        )}

        {/* Овнер: свой номер + номер менеджера */}
        {role === "OWNER" && !isOwnerManager && (
          <div style={{ opacity: 0.9, marginTop: 6 }}>
            Owner phone: <b>{business.owner_phone}</b>
            <span style={{ opacity: 0.7 }}> &nbsp;|&nbsp; </span>
            Manager phone: <b>{business.manager_phone || "—"}</b>
          </div>
        )}

        {/* VIP: owner==manager */}
        {isOwnerManager && (
          <div style={{ opacity: 0.9, marginTop: 6 }}>
            Owner/Manager phone: <b>{business.owner_phone}</b>
          </div>
        )}
      </div>

      {/* Analytics (только OWNER или OWNER/MANAGER) */}
      {canSeeAnalytics && (
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 12,
              minWidth: 160,
              background: "white",
            }}
          >
            <div style={{ opacity: 0.7, fontSize: 12 }}>Total orders</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{totalOrders}</div>
          </div>

          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 12,
              minWidth: 160,
              background: "white",
            }}
          >
            <div style={{ opacity: 0.7, fontSize: 12 }}>Total amount</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {totalAmount.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </div>
          </div>

          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 12,
              minWidth: 160,
              background: "white",
            }}
          >
            <div style={{ opacity: 0.7, fontSize: 12 }}>Overdue (NEW)</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{overdueCount}</div>
          </div>
        </div>
      )}

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
              const description = String(fd.get("description") || "").trim();

              const amount = Number(amountRaw);
              if (!clientName) throw new Error("Client name is required");
              if (!Number.isFinite(amount) || amount <= 0)
                throw new Error("Amount must be > 0");

              await createOrder({
                businessId: business.id,
                clientName,
                clientPhone: clientPhone || undefined,
                amount,
                dueDate: dueDate || undefined,
                description: description || undefined,
              });
            }}
          >
            <div style={{ display: "grid", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                  Client name *
                </span>
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
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                  Client phone
                </span>
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
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                  Description
                </span>
                <textarea
                  name="description"
                  placeholder="Например: доставка, адрес, коментар..."
                  rows={3}
                  style={{
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    padding: "10px 12px",
                    resize: "vertical",
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

      {/* 🔽 FILTERS BAR */}
      <form
        method="get"
        style={{
          border: "1px solid #e5e5e5",
          borderRadius: 12,
          padding: 16,
          background: "white",
          marginBottom: 16,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        {/* НЕ ЗАБУДЬ ПРО u */}
        <input type="hidden" name="u" value={phoneRaw} />

        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
            Search
          </div>
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Name, phone, amount…"
            style={{
              height: 40,
              width: "100%",
              borderRadius: 10,
              border: "1px solid #ddd",
              padding: "0 12px",
            }}
          />
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
            Status
          </div>
          <select
            name="status"
            defaultValue={filters.status}
            style={{ height: 40, borderRadius: 10, border: "1px solid #ddd" }}
          >
            <option value="ALL">All</option>
            <option value="NEW">NEW</option>
            <option value="DONE">DONE</option>
          </select>
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
            Paid
          </div>
          <select
            name="paid"
            defaultValue={filters.paid}
            style={{ height: 40, borderRadius: 10, border: "1px solid #ddd" }}
          >
            <option value="ALL">All</option>
            <option value="1">Paid</option>
            <option value="0">Unpaid</option>
          </select>
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
            Period
          </div>
          <select
            name="range"
            defaultValue={filters.range}
            style={{ height: 40, borderRadius: 10, border: "1px solid #ddd" }}
          >
            <option value="ALL">All time</option>
            <option value="today">Today</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>

        <button
          type="submit"
          style={{
            height: 40,
            borderRadius: 10,
            border: "none",
            background: "#111",
            color: "white",
            fontWeight: 700,
            padding: "0 16px",
            cursor: "pointer",
            alignSelf: "flex-end",
          }}
        >
          Apply
        </button>

        {hasActiveFilters && (
          <a
            href={clearHref}
            style={{
              height: 40,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 16px",
              borderRadius: 10,
              border: "1px solid #ddd",
              fontWeight: 600,
              background: "white",
              textDecoration: "none",
              color: "inherit",
              cursor: "pointer",
              alignSelf: "flex-end",
            }}
          >
            Clear
          </a>
        )}
      </form>

      {/* Таблица заказов (видят и OWNER и MANAGER), но Actions только MANAGER/OWNER-MANAGER */}
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
          <div style={{ textAlign: "center", padding: 32 }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
              {hasActiveFilters
                ? "No orders match your filters"
                : "No orders yet"}
            </div>

            <div style={{ opacity: 0.75, marginBottom: 14 }}>
              {hasActiveFilters
                ? "Try changing filters or clearing search."
                : "Create your first order to start tracking payments and deadlines."}
            </div>

            {hasActiveFilters ? (
              <a
                href={clearHref}
                style={{
                  display: "inline-block",
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid #ddd",
                  fontWeight: 600,
                  marginTop: 4,
                }}
              >
                Clear filters
              </a>
            ) : (
              <div style={{ fontSize: 12, opacity: 0.6 }}>
                Tip: add client name, amount, and due date.
              </div>
            )}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{ textAlign: "left", borderBottom: "1px solid #eee" }}
                >
                  <th style={{ padding: "10px 6px" }}>Client</th>
                  <th style={{ padding: "10px 6px" }}>Amount</th>
                  <th style={{ padding: "10px 6px" }}>Due</th>
                  <th style={{ padding: "10px 6px" }}>Status</th>
                  <th style={{ padding: "10px 6px" }}>Paid</th>
                  <th style={{ padding: "10px 6px" }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {list.map((o) => {
                  const dueISO = o.due_date
                    ? String(o.due_date).slice(0, 10)
                    : null;
                  const isOverdue =
                    !!dueISO && dueISO < todayISO && o.status === "NEW";

                  return (
                    <tr
                      key={o.id}
                      style={{
                        borderBottom: "1px solid #f2f2f2",
                        background: isOverdue ? "#fff5f5" : "transparent",
                      }}
                    >
                      <td style={{ padding: "10px 6px" }}>
                        {/* Order number + created */}
                        <div
                          style={{
                            fontSize: 12,
                            opacity: 0.6,
                            marginBottom: 4,
                          }}
                        >
                          <strong>Order #{o.order_number ?? "-"}</strong> ·
                          Created:{" "}
                          {new Date(o.created_at).toLocaleString("en-NG", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>

                        {/* Client */}
                        <div style={{ fontWeight: 600 }}>{o.client_name}</div>

                        <div style={{ fontSize: 12, opacity: 0.7 }}>
                          {o.client_phone || ""}
                        </div>

                        {o.description ? (
                          <details style={{ marginTop: 6 }}>
                            <summary
                              style={{
                                cursor: "pointer",
                                fontSize: 14,
                                fontWeight: 600,
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

                      <td style={{ padding: "10px 6px", fontWeight: 700 }}>
                        {fmtAmount(Number(o.amount))}
                      </td>

                      <td style={{ padding: "10px 6px" }}>
                        <div
                          style={{ color: isOverdue ? "#b91c1c" : undefined }}
                        >
                          {o.due_date || ""}
                        </div>

                        {isOverdue && (
                          <div
                            style={{
                              fontSize: 11,
                              color: "#b91c1c",
                              opacity: 0.8,
                            }}
                          >
                            Overdue
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "10px 6px", fontWeight: 700 }}>
                        {o.status}
                      </td>

                      <td style={{ padding: "10px 6px", opacity: 0.75 }}>
                        {o.paid ? "Paid" : "Not paid"}
                      </td>

                      <td style={{ padding: "10px 6px" }}>
                        {canManage ? (
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            <a
                              href={`/b/${business.slug}/o/${
                                o.id
                              }?u=${encodeURIComponent(phoneRaw)}`}
                              style={{
                                height: 30,
                                padding: "0 12px",
                                borderRadius: 10,
                                border: "1px solid #ddd",
                                background: "white",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                textDecoration: "none",
                                color: "#111",
                                fontSize: 13,
                              }}
                            >
                              Edit
                            </a>

                            {/* статус */}
                            {o.status === "NEW" ? (
                              <form
                                action={async () => {
                                  "use server";
                                  await setOrderStatus({
                                    orderId: o.id,
                                    status: "DONE",
                                  });
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
                                  await setOrderStatus({
                                    orderId: o.id,
                                    status: "NEW",
                                  });
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
                                  await setOrderPaid({
                                    orderId: o.id,
                                    paid: false,
                                  });
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
                                  await setOrderPaid({
                                    orderId: o.id,
                                    paid: true,
                                  });
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
