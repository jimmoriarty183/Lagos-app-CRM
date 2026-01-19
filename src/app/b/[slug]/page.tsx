import React from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { normalizePhone } from "@/lib/phone";

import DesktopSidebar from "./_components/Desktop/DesktopSidebar";
import DesktopBusinessCard from "./_components/Desktop/DesktopBusinessCard";
import DesktopCreateOrder from "./_components/Desktop/DesktopCreateOrder";
import DesktopFilters from "./_components/Desktop/DesktopFilters";
import DesktopOrdersTable from "./_components/Desktop/DesktopOrdersTable";
import DesktopAnalyticsCard from "./_components/Desktop/DesktopAnalyticsCard";

import MobileBusinessAccordion from "./_components/Mobile/MobileBusinessAccordion";
import MobileAnalyticsAccordion from "./_components/Mobile/MobileAnalyticsAccordion";
import MobileCreateOrderAccordion from "./_components/Mobile/MobileCreateOrderAccordion";
import MobileFiltersAccordion from "./_components/Mobile/MobileFiltersAccordion";
import MobileOrdersList from "./_components/Mobile/MobileOrdersList";
import TopBar from "./_components/topbar/TopBar";

/** ----------------- server supabase ----------------- */

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    const missing = [
      !url ? "NEXT_PUBLIC_SUPABASE_URL" : null,
      !key ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : null,
    ].filter(Boolean) as string[];

    return { supabase: null as any, missing };
  }

  return { supabase: createClient(url, key), missing: [] as string[] };
}

/** ----------------- helpers ----------------- */

function isPhone(value: string) {
  return /^\d{10,15}$/.test(value);
}

function getSP(
  sp: Record<string, string | string[] | undefined>,
  key: string
): string {
  const v = sp[key];
  if (Array.isArray(v)) return String(v[0] ?? "");
  return String(v ?? "");
}

function fmtAmount(n: number) {
  return new Intl.NumberFormat("uk-UA").format(n);
}

type Status =
  | "NEW"
  | "IN_PROGRESS"
  | "WAITING_PAYMENT"
  | "DONE"
  | "CANCELED"
  | "DUPLICATE";

type Range = "ALL" | "today" | "week" | "month" | "year";

type Filters = {
  q: string;
  status: "ALL" | Status;
  range: Range;
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
  status: Status;
  order_number: number | null;
  created_at: string;
};

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

async function findBusinessSlugByPhone(supabase: any, phone: string) {
  // phone НЕ нормализуем, потому что в БД лежит "380..."
  const { data, error } = await supabase
    .from("businesses")
    .select("slug")
    .or(`owner_phone.eq.${phone},manager_phone.eq.${phone}`)
    .maybeSingle();

  if (error) {
    console.error("findBusinessSlugByPhone error:", error);
    return null;
  }

  return data?.slug ?? null;
}

/** ----------------- page ----------------- */

export default async function Page({
  params,
  searchParams,
}: {
  // Next 16: params/searchParams приходят как Promise
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug: slugOrPhone }, sp] = await Promise.all([params, searchParams]);

  const { supabase, missing } = getServerSupabase();
  if (!supabase) {
    return (
      <main style={{ padding: 24 }}>
        <b>Missing env:</b>
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {JSON.stringify({ missing }, null, 2)}
        </pre>
      </main>
    );
  }

  // ✅ Backward compatibility: /b/<phone>
  if (isPhone(slugOrPhone)) {
    const phone = slugOrPhone;

    const slug = await findBusinessSlugByPhone(supabase, phone);
    if (slug) {
      redirect(`/b/${slug}?u=${phone}`);
    }

    return (
      <main style={{ padding: 24 }}>
        <b>Business not found:</b> {phone}
      </main>
    );
  }

  const slug = slugOrPhone;
  if (!slug) notFound();

  // read ?u=phone
  const uStr = getSP(sp, "u");
  const phoneRaw = uStr ? decodeURIComponent(uStr) : "";
  const phoneNorm = phoneRaw ? normalizePhone(phoneRaw) : "";

  const clearHref = uStr
    ? `/b/${slug}?u=${encodeURIComponent(uStr)}&page=1`
    : `/b/${slug}?page=1`;

  // load business
  const { data: business, error: bErr } = await supabase
    .from("businesses")
    .select("id, slug, owner_phone, manager_phone, plan, expires_at")
    .eq("slug", slug)
    .single();

  const businessRow = business as BusinessRow | null;

  if (bErr || !businessRow) {
    return (
      <main style={{ padding: 24 }}>
        <b>Business not found:</b> {slug}
      </main>
    );
  }

  // role
  const ownerNorm = normalizePhone(business.owner_phone);
  const managerNorm = business.manager_phone
    ? normalizePhone(business.manager_phone)
    : "";

  const isOwner = !!phoneNorm && phoneNorm === ownerNorm;
  const isManager = !!phoneNorm && !!managerNorm && phoneNorm === managerNorm;

  const role: "OWNER" | "MANAGER" | "GUEST" = isOwner
    ? "OWNER"
    : isManager
    ? "MANAGER"
    : "GUEST";

  const canView = role === "OWNER" || role === "MANAGER";
  const canManage = role === "OWNER" || role === "MANAGER";
  const canEdit = canManage;
  const canSeeAnalytics = role === "OWNER";

  if (!canView) {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: 24 }}>
        <div
          style={{
            borderRadius: 16,
            border: "1px solid #e5e7eb",
            padding: 24,
            textAlign: "center",
            color: "#64748b",
            background: "white",
          }}
        >
          Access restricted
        </div>
      </div>
    );
  }

  // filters
  const filters: Filters = {
    q: getSP(sp, "q"),
    status: (getSP(sp, "status") || "ALL") as Filters["status"],
    range: (getSP(sp, "range") || "ALL") as Filters["range"],
  };

  const hasActiveFilters =
    !!filters.q?.trim() || filters.status !== "ALL" || filters.range !== "ALL";

  // pagination
  const PAGE_SIZE = 20;
  const pageRaw = Number(getSP(sp, "page") || "1");
  const page =
    Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;

  // orders query
  let query = supabase
    .from("orders")
    .select(
      "id, order_number, client_name, client_phone, amount, description, due_date, status, created_at, search_text",
      { count: "exact" }
    )
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  if (filters.status !== "ALL") query = query.eq("status", filters.status);

  const dateFrom = getDateFromRange(filters.range);
  if (dateFrom) query = query.gte("created_at", dateFrom);

  const q = filters.q.trim().toLowerCase();
  if (q) query = query.ilike("search_text", `%${q}%`);

  const runPage = async (p: number) => {
    const rangeFrom = (p - 1) * PAGE_SIZE;
    const rangeTo = rangeFrom + PAGE_SIZE - 1;
    return await query.range(rangeFrom, rangeTo);
  };

  let { data: orders, error: ordersError, count } = await runPage(page);

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  if (safePage !== page) {
    const r = await runPage(safePage);
    orders = r.data;
    ordersError = r.error;
  }

  if (ordersError) console.error("Orders query error:", ordersError);

  const list = (orders || []) as OrderRow[];

  // analytics
  const totalOrders = totalCount;
  let totalAmount = 0;

  let newCount = 0;
  let inProgressCount = 0;
  let waitingPaymentCount = 0;
  let doneCount = 0;
  let canceledCount = 0;
  let duplicateCount = 0;

  let doneAmount = 0;
  let activeAmount = 0;
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

        if (dueDate && (status === "NEW" || status === "IN_PROGRESS")) {
          const due = new Date(dueDate);
          due.setHours(0, 0, 0, 0);
          if (due < todayStart) overdueCount += 1;
        }
      }
    }
  }

  const todayISO = new Date().toISOString().slice(0, 10);

  // styles
  const card: React.CSSProperties = {
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  };

  const cardHeader: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  };

  const cardTitle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: 0.2,
  };

  const pill: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    height: 28,
    padding: "0 10px",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    fontSize: 12,
    fontWeight: 800,
    color: "#0f172a",
  };

  const appShell: React.CSSProperties = {
    maxWidth: 1400,
    margin: "0 auto",
    padding: "16px 24px 24px",
  };

  const shellGrid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "260px 1fr",
    gap: 16,
    alignItems: "start",
  };

  const sidebarStyle: React.CSSProperties = {
    position: "sticky",
    top: 80,
    height: "calc(100vh - 96px)",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    background: "white",
    padding: 12,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    overflow: "auto",
  };

  const contentCol: React.CSSProperties = {
    display: "grid",
    gap: 16,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f6f7fb",
        overflowX: "hidden",
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .desktopOnly { display: block; }
            .mobileOnly { display: none; }
            @media (max-width: 768px) {
              .desktopOnly { display: none; }
              .mobileOnly { display: block; }
              .shellPad { padding: 12px 12px 18px !important; }
              .topPad { padding: 0 12px !important; }
              .shellGrid { grid-template-columns: 1fr !important; }
            }
          `,
        }}
      />

      <TopBar
        businessSlug={business.slug}
        plan={business.plan}
        role={role}
        pill={pill}
      />

      <main className="shellPad" style={appShell}>
        <div className="shellGrid" style={shellGrid}>
          <aside className="desktopOnly" style={sidebarStyle}>
            <DesktopSidebar
              clearHref={clearHref}
              totalCount={totalCount}
              canSeeAnalytics={canSeeAnalytics}
            />
          </aside>

          <section style={contentCol}>
            <DesktopBusinessCard
              business={business}
              role={role}
              phone={phoneNorm}
              isOwnerManager={false}
              card={card}
              cardHeader={cardHeader}
              cardTitle={cardTitle}
            />

            <DesktopAnalyticsCard
              canSeeAnalytics={canSeeAnalytics}
              card={card}
              cardHeader={cardHeader}
              cardTitle={cardTitle}
              totalOrders={totalOrders}
              totalAmount={totalAmount}
              overdueCount={overdueCount}
              waitingPaymentCount={waitingPaymentCount}
              waitingPaymentAmount={waitingPaymentAmount}
              doneCount={doneCount}
              doneAmount={doneAmount}
              inProgressCount={inProgressCount}
              newCount={newCount}
              canceledCount={canceledCount}
              duplicateCount={duplicateCount}
              activeAmount={activeAmount}
              fmtAmount={fmtAmount}
            />

            <section className="mobileOnly" style={card}>
              <div style={{ display: "grid", gap: 8 }}>
                <MobileBusinessAccordion
                  business={business}
                  role={role}
                  phone={phoneNorm}
                  isOwnerManager={false}
                />
                <MobileAnalyticsAccordion
                  canSeeAnalytics={canSeeAnalytics}
                  totalOrders={totalOrders}
                  totalAmount={totalAmount}
                  overdueCount={overdueCount}
                  waitingPaymentCount={waitingPaymentCount}
                  waitingPaymentAmount={waitingPaymentAmount}
                  doneCount={doneCount}
                  doneAmount={doneAmount}
                  inProgressCount={inProgressCount}
                  newCount={newCount}
                  canceledCount={canceledCount}
                  duplicateCount={duplicateCount}
                  activeAmount={activeAmount}
                  fmtAmount={fmtAmount}
                />
              </div>
            </section>

            {canManage ? (
              <>
                <DesktopCreateOrder
                  businessId={business.id}
                  card={card}
                  cardHeader={cardHeader}
                  cardTitle={cardTitle}
                />

                <section className="mobileOnly" style={card}>
                  <MobileCreateOrderAccordion businessId={business.id} />
                </section>
              </>
            ) : null}

            <DesktopFilters
              phoneRaw={phoneRaw}
              filters={filters}
              clearHref={clearHref}
              hasActiveFilters={hasActiveFilters}
              card={card}
              cardHeader={cardHeader}
              cardTitle={cardTitle}
            />

            <section className="mobileOnly" style={card}>
              <MobileFiltersAccordion
                phoneRaw={phoneRaw}
                filters={filters}
                clearHref={clearHref}
                hasActiveFilters={hasActiveFilters}
              />
            </section>

            <section style={card}>
              <div style={cardHeader}>
                <div style={cardTitle}>Orders</div>
                <div
                  className="desktopOnly"
                  style={{ fontSize: 12, opacity: 0.65 }}
                >
                  {totalCount} total
                </div>
              </div>

              {list.length === 0 ? (
                <div style={{ textAlign: "center", padding: 32 }}>
                  <div
                    style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}
                  >
                    {hasActiveFilters
                      ? "No orders match your filters"
                      : "No orders yet"}
                  </div>

                  <div style={{ opacity: 0.75, marginBottom: 14 }}>
                    {hasActiveFilters
                      ? "Try changing filters or clearing search."
                      : "Create your first order to start tracking deadlines."}
                  </div>

                  {hasActiveFilters ? (
                    <a
                      href={clearHref}
                      style={{
                        display: "inline-block",
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: "1px solid #e5e7eb",
                        fontWeight: 700,
                        marginTop: 4,
                        textDecoration: "none",
                        color: "inherit",
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
                <>
                  <div className="desktopOnly">
                    <DesktopOrdersTable
                      list={list}
                      todayISO={todayISO}
                      businessSlug={business.slug}
                      phoneRaw={phoneRaw}
                      canManage={canManage}
                      canEdit={canEdit}
                    />
                  </div>

                  <div className="mobileOnly">
                    <MobileOrdersList
                      list={list}
                      todayISO={todayISO}
                      businessSlug={business.slug}
                      phoneRaw={phoneRaw}
                      canManage={canManage}
                      canEdit={canEdit}
                    />
                  </div>
                </>
              )}
            </section>
          </section>
        </div>
      </main>
    </div>
  );
}
