import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { normalizePhone } from "@/lib/phone";
import { createOrder } from "./actions";
import Button from "./Button";
import Accordion from "./Accordion";
import { StatusCell } from "./InlineCells";

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

type Range = "ALL" | "today" | "week" | "month" | "year";
type Filters = {
  q: string;
  status: "ALL" | Status;
  range: Range;
};

function fmtAmount(n: number) {
  return new Intl.NumberFormat("uk-UA").format(n);
}

function getDateFromRange(range: Range) {
  if (range === "ALL") return null;

  const now = new Date();

  if (range === "today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }

  if (range === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d.toISOString();
  }

  if (range === "month") {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return d.toISOString();
  }

  if (range === "year") {
    const d = new Date(now.getFullYear(), 0, 1);
    return d.toISOString();
  }

  return null;
}

export default async function BusinessPage({
  params,
  searchParams,
}: PageProps) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);

  if (!slug) notFound();

  function getSp(key: string): string {
    const v = (sp as any)?.[key];
    if (Array.isArray(v)) return String(v[0] ?? "");
    return String(v ?? "");
  }

  // u — текущий “идентификатор” пользователя (телефон)
  const u = sp?.u;
  const uStr = Array.isArray(u) ? u[0] : u;

  const phoneRaw =
    typeof u === "string"
      ? decodeURIComponent(u)
      : Array.isArray(u)
      ? decodeURIComponent(u[0] || "")
      : "";

  const phone = phoneRaw ? normalizePhone(phoneRaw) : "";

  const clearHref = uStr
    ? `/b/${slug}?u=${encodeURIComponent(uStr)}&page=1`
    : `/b/${slug}?page=1`;

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

  const isOwnerManager = isOwner && isManager;

  const canView = role === "OWNER" || role === "MANAGER";

  // теперь OWNER тоже управляет
  const canManage = role === "OWNER" || role === "MANAGER";
  const canEdit = canManage; // ✅ добавь это
  // Edit тоже всем, кто canView
  const canSeeActions = canView;

  // аналитику оставим как было: только OWNER или OWNER/MANAGER (можешь расширить позже)
  const canSeeAnalytics = role === "OWNER" || isOwnerManager;

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

  // ---- filters (from URL) ----
  const filters: Filters = {
    q: getSp("q"),
    status: (getSp("status") || "ALL") as Filters["status"],
    range: (getSp("range") || "ALL") as Filters["range"],
  };

  const hasActiveFilters =
    !!filters.q?.trim() || filters.status !== "ALL" || filters.range !== "ALL";

  // ---- Orders + Pagination ----
  const PAGE_SIZE = 20;

  const pageRaw = Number(getSp("page") || "1");
  const page =
    Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;

  // 1) строим query
  let query = supabase
    .from("orders")
    .select(
      "id, order_number, client_name, client_phone, amount, description, due_date, status, created_at, search_text",
      { count: "exact" }
    )
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  // 2) применяем фильтры
  if (filters.status !== "ALL") query = query.eq("status", filters.status);

  const dateFrom = getDateFromRange(filters.range);
  if (dateFrom) query = query.gte("created_at", dateFrom);

  const q = filters.q.trim().toLowerCase();
  if (q) query = query.ilike("search_text", `%${q}%`);

  // 3) helper: загрузка конкретной страницы
  const runPage = async (p: number) => {
    const rangeFrom = (p - 1) * PAGE_SIZE;
    const rangeTo = rangeFrom + PAGE_SIZE - 1;
    return await query.range(rangeFrom, rangeTo);
  };

  // 4) первая загрузка: как попросили в URL
  let { data: orders, error: ordersError, count } = await runPage(page);

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  // 5) если page слишком большая — грузим последнюю валидную страницу
  if (safePage !== page) {
    const r = await runPage(safePage);
    orders = r.data;
    ordersError = r.error;
  }

  if (ordersError) console.error("Orders query error:", ordersError);

  const list = (orders || []) as OrderRow[];

  // ---- analytics (ALL matching rows, not just current page) ----
  let totalOrders = totalCount;
  let totalAmount = 0;

  let newCount = 0;
  let inProgressCount = 0;
  let waitingPaymentCount = 0;
  let doneCount = 0;
  let canceledCount = 0;
  let duplicateCount = 0;

  let doneAmount = 0;
  let activeAmount = 0; // NEW + IN_PROGRESS
  let waitingPaymentAmount = 0;

  let overdueCount = 0;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  if (canSeeAnalytics) {
    let aq = supabase
      .from("orders")
      .select("amount, due_date, status, created_at, search_text")
      .eq("business_id", business.id);

    if (filters.status !== "ALL") aq = aq.eq("status", filters.status);

    const dateFrom2 = getDateFromRange(filters.range);
    if (dateFrom2) aq = aq.gte("created_at", dateFrom2);

    const q2 = filters.q.trim().toLowerCase();
    if (q2) aq = aq.ilike("search_text", `%${q2}%`);

    const { data: rows, error: aErr } = await aq;

    if (aErr) {
      console.error("Analytics query error:", aErr);
    } else {
      for (const r of rows || []) {
        const amountNum = Number((r as any).amount ?? 0);
        const dueDate = (r as any).due_date as string | null;
        const status = (r as any).status as Status;

        totalAmount += amountNum;

        if (status === "NEW") newCount += 1;
        if (status === "IN_PROGRESS") inProgressCount += 1;

        if (status === "WAITING_PAYMENT") {
          waitingPaymentCount += 1;
          waitingPaymentAmount += amountNum;
        }

        if (status === "DONE") {
          doneCount += 1;
          doneAmount += amountNum;
        }

        if (status === "CANCELED") canceledCount += 1;
        if (status === "DUPLICATE") duplicateCount += 1;

        if (status === "NEW" || status === "IN_PROGRESS")
          activeAmount += amountNum;

        // overdue: due_date < today AND (NEW or IN_PROGRESS)
        if (dueDate && (status === "NEW" || status === "IN_PROGRESS")) {
          const due = new Date(dueDate);
          due.setHours(0, 0, 0, 0);
          if (due < todayStart) overdueCount += 1;
        }
      }
    }
  }

  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa" }}>
      {/* Top bar */}
      <header
        style={{
          height: 56,
          borderBottom: "1px solid #e5e7eb",
          background: "white",
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            height: "100%",
            padding: "0 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 18 }}>Ordero</div>
          <div style={{ fontSize: 14, opacity: 0.8 }}>{business.slug}</div>
        </div>
      </header>

      {/* Page content */}
      <main
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "24px 32px",
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            Business: {business.slug}
          </div>
          <div style={{ opacity: 0.75, marginTop: 4 }}>
            Plan: {business.plan}
          </div>
          <div style={{ opacity: 0.75, marginTop: 6 }}>
            Role: <b>{isOwnerManager ? "OWNER/MANAGER" : role}</b>
          </div>

          {role === "MANAGER" && !isOwnerManager && (
            <div style={{ opacity: 0.9, marginTop: 6 }}>
              Manager phone: <b>{business.manager_phone || phone}</b>
            </div>
          )}

          {role === "OWNER" && !isOwnerManager && (
            <div style={{ opacity: 0.9, marginTop: 6 }}>
              Owner phone: <b>{business.owner_phone}</b>
              <span style={{ opacity: 0.7 }}> &nbsp;|&nbsp; </span>
              Manager phone: <b>{business.manager_phone || "—"}</b>
            </div>
          )}

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
        )}

        {/* MANAGER: форма создания заказа */}
        {canManage ? (
          <div style={{ marginBottom: 16 }}>
            <Accordion title="Add order" defaultOpen={false}>
              <form
                action={async (fd) => {
                  "use server";
                  const clientName = String(fd.get("client_name") || "").trim();

                  const clientPhoneRaw = String(
                    fd.get("client_phone") || ""
                  ).trim();
                  const clientPhone = clientPhoneRaw.replace(/\s+/g, " ");

                  const amountRaw = String(fd.get("amount") || "").trim();
                  const dueDate = String(fd.get("due_date") || "").trim();
                  const description = String(
                    fd.get("description") || ""
                  ).trim();

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
                      autoComplete="name"
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
                      placeholder="+234 801 234 5678"
                      inputMode="tel"
                      autoComplete="tel"
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
                      placeholder="e.g. delivery, address, comment..."
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
                    <span style={{ fontSize: 12, fontWeight: 600 }}>
                      Amount *
                    </span>
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
                    <span style={{ fontSize: 12, fontWeight: 600 }}>
                      Due date
                    </span>
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
                    <span style={{ fontSize: 12, opacity: 0.6 }}>
                      Format: YYYY-MM-DD
                    </span>
                  </label>

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    style={{ marginTop: 6, width: "100%" }}
                  >
                    Create
                  </Button>
                </div>
              </form>
            </Accordion>
          </div>
        ) : null}

        {/* FILTERS */}
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
          <input type="hidden" name="u" value={phoneRaw} />
          <input type="hidden" name="page" value="1" />

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
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="WAITING_PAYMENT">WAITING PAYMENT</option>
              <option value="DONE">DONE</option>
              <option value="CANCELED">CANCELED</option>
              <option value="DUPLICATE">DUPLICATE</option>
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
              <option value="week">Last 7 days</option>
              <option value="month">This month</option>
              <option value="year">This year</option>
            </select>
          </div>

          <Button type="submit" size="sm" style={{ alignSelf: "flex-end" }}>
            Apply
          </Button>

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

        {/* Orders */}
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
                  : "Create your first order to start tracking deadlines and payments."}
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
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <th style={{ padding: "10px 6px" }}>Client</th>
                    <th style={{ padding: "10px 6px" }}>Amount</th>
                    <th style={{ padding: "10px 6px" }}>Due</th>
                    <th style={{ padding: "10px 6px" }}>Status</th>
                    <th style={{ padding: "10px 6px" }}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {list.map((o) => {
                    const dueISO = o.due_date
                      ? String(o.due_date).slice(0, 10)
                      : null;
                    const isOverdue =
                      !!dueISO &&
                      dueISO < todayISO &&
                      (o.status === "NEW" || o.status === "IN_PROGRESS");

                    return (
                      <tr
                        key={o.id}
                        style={{
                          borderBottom: "1px solid #f2f2f2",
                          background: isOverdue ? "#fff5f5" : "transparent",
                        }}
                      >
                        {/* CLIENT */}
                        <td style={{ padding: "10px 6px" }}>
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

                        {/* AMOUNT */}
                        <td style={{ padding: "10px 6px", fontWeight: 700 }}>
                          {fmtAmount(Number(o.amount))}
                        </td>

                        {/* DUE */}
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

                        {/* STATUS */}
                        <td style={{ padding: "10px 6px" }}>
                          <StatusCell
                            orderId={o.id}
                            value={o.status}
                            canManage={canManage}
                          />
                        </td>

                        {/* ACTIONS */}
                        <td style={{ padding: "10px 6px" }}>
                          {canEdit ? (
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
      </main>
    </div>
  );
}

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
        borderRadius: 12,
        padding: 12,
        minWidth: 160,
        background: "white",
      }}
    >
      <div style={{ opacity: 0.7, fontSize: 12 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
      {sub ? (
        <div style={{ opacity: 0.65, fontSize: 12, marginTop: 2 }}>{sub}</div>
      ) : null}
    </div>
  );
}
