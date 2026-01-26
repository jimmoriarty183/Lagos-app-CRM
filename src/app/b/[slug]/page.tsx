import React from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { normalizePhone } from "@/lib/phone";

import DesktopSidebar from "./_components/Desktop/DesktopSidebar";
import DesktopBusinessCard from "./_components/Desktop/DesktopBusinessCard";
import DesktopCreateOrderAccordion from "./_components/Desktop/DesktopCreateOrderAccordion";
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
  const { data: business, error } = await supabase
    .from("businesses")
    .select("slug")
    .or(`owner_phone.eq.${phone},manager_phone.eq.${phone}`)
    .maybeSingle();

  if (error) {
    console.error("findBusinessSlugByPhone error:", error);
    return null;
  }

  return business?.slug ?? null;
}

/** ----------------- page ----------------- */
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug: slugOrPhone }, sp] = await Promise.all([params, searchParams]);

  const { supabase, missing } = getServerSupabase();

  if (!supabase) {
    return (
      <main className="p-6">
        <b>Missing env:</b>
        <pre className="mt-2 whitespace-pre-wrap">
          {JSON.stringify({ missing }, null, 2)}
        </pre>
      </main>
    );
  }

  // ✅ phone из ?u=
  const uStr = getSP(sp, "u");
  const phoneRaw = uStr ? decodeURIComponent(uStr) : "";
  const phoneNorm = phoneRaw ? normalizePhone(phoneRaw) : "";

  // ✅ Backward compatibility: /b/<phone>
  if (isPhone(slugOrPhone)) {
    const phone = slugOrPhone;

    const slug = await findBusinessSlugByPhone(supabase, phone);
    if (slug) {
      redirect(`/b/${slug}?u=${phone}`);
    }

    return (
      <main className="p-6">
        <b>Business not found:</b> {phone}
      </main>
    );
  }

  const slug = slugOrPhone;
  if (!slug) notFound();

  const clearHref = uStr
    ? `/b/${slug}?u=${encodeURIComponent(uStr)}&page=1`
    : `/b/${slug}?page=1`;

  // ✅ load business by slug
  const { data: biz, error: bErr } = await supabase
    .from("businesses")
    .select("id, slug, owner_phone, manager_phone, plan, expires_at")
    .eq("slug", slug)
    .single();

  const businessRow = biz as BusinessRow | null;

  if (bErr || !businessRow) {
    return (
      <main className="p-6">
        <b>Business not found:</b> {slug}
      </main>
    );
  }

  // ✅ role
  const ownerNorm = normalizePhone(businessRow.owner_phone);
  const managerNorm = businessRow.manager_phone
    ? normalizePhone(businessRow.manager_phone)
    : "";

  const isOwner = !!phoneNorm && phoneNorm === ownerNorm;
  const isManager = !!phoneNorm && !!managerNorm && phoneNorm === managerNorm;

  const role: "OWNER" | "MANAGER" | "GUEST" = isOwner
    ? "OWNER"
    : isManager
    ? "MANAGER"
    : "GUEST";

  const isOwnerManager =
    role === "OWNER" &&
    (!businessRow.manager_phone ||
      normalizePhone(businessRow.manager_phone) ===
        normalizePhone(businessRow.owner_phone));

  const canView = role === "OWNER" || role === "MANAGER";
  const canManage = role === "OWNER" || role === "MANAGER";
  const canEdit = canManage;
  const canSeeAnalytics = role === "OWNER";

  if (!canView) {
    return (
      <div className="min-h-screen bg-[#f5f7fb] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center text-gray-600">
          Access restricted
        </div>
      </div>
    );
  }

  // ✅ filters
  const filters: Filters = {
    q: getSP(sp, "q"),
    status: (getSP(sp, "status") || "ALL") as Filters["status"],
    range: (getSP(sp, "range") || "ALL") as Filters["range"],
  };

  const hasActiveFilters =
    !!filters.q?.trim() || filters.status !== "ALL" || filters.range !== "ALL";

  // ✅ pagination
  const PAGE_SIZE = 20;
  const pageRaw = Number(getSP(sp, "page") || "1");
  const page =
    Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;

  // ✅ orders query
  let query = supabase
    .from("orders")
    .select(
      "id, order_number, client_name, client_phone, amount, description, due_date, status, created_at, search_text",
      { count: "exact" }
    )
    .eq("business_id", businessRow.id)
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

  // ✅ analytics (как у тебя было)
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
      .eq("business_id", businessRow.id);

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

  // TopBar pill
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

  // ✅ business switcher list
  const { data: allBiz, error: allBizErr } = await supabase
    .from("businesses")
    .select("id, slug, owner_phone, manager_phone, plan")
    .or(`owner_phone.eq.${phoneNorm},manager_phone.eq.${phoneNorm}`)
    .order("slug", { ascending: true });

  if (allBizErr) console.error("Businesses list error:", allBizErr);

  const businesses =
    (allBiz ?? []).map((b: any) => ({
      id: b.id,
      slug: b.slug,
      name: b.slug,
      role: normalizePhone(b.owner_phone) === phoneNorm ? "OWNER" : "MANAGER",
    })) ?? [];

  return (
    <div className="relative min-h-screen bg-transparent">
      {/* Soft background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-56 -left-56 h-[520px] w-[520px] rounded-full bg-blue-100/25 blur-[160px]" />
        <div className="absolute -top-40 right-[-120px] h-[520px] w-[520px] rounded-full bg-emerald-100/20 blur-[180px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-white" />
      </div>

      <TopBar
        businessSlug={businessRow.slug}
        plan={businessRow.plan}
        role={role}
        pill={pill}
        businesses={businesses}
      />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 relative rounded-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-[16rem_1fr] gap-6 items-start">
          {/* Sidebar (desktop) */}
          <aside className="hidden lg:block sticky top-20 self-start">
            <div className="space-y-4">
              <DesktopSidebar
                clearHref={clearHref}
                totalCount={totalCount}
                canSeeAnalytics={canSeeAnalytics}
              />

              <DesktopBusinessCard
                business={businessRow}
                role={role}
                phone={phoneNorm}
                isOwnerManager={isOwnerManager}
              />
            </div>
          </aside>

          {/* Content */}
          <section className="space-y-6">
            {/* Analytics (desktop) */}
            <div className="hidden lg:block">
              <DesktopAnalyticsCard
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

            {/* Business + Analytics (mobile) */}
            <div className="lg:hidden grid gap-3">
              <MobileBusinessAccordion
                business={businessRow}
                role={role}
                phone={phoneNorm}
                isOwnerManager={isOwnerManager}
              />

              {canSeeAnalytics ? (
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
              ) : null}
            </div>

            {/* Create order */}
            {canManage ? (
              <>
                <div className="hidden lg:block">
                  <DesktopCreateOrderAccordion businessId={businessRow.id} />
                </div>

                <div className="lg:hidden">
                  <MobileCreateOrderAccordion businessId={businessRow.id} />
                </div>
              </>
            ) : null}

            {/* Filters desktop */}
            <div className="hidden lg:block">
              <DesktopFilters
                phoneRaw={phoneRaw}
                filters={filters}
                clearHref={clearHref}
                hasActiveFilters={hasActiveFilters}
              />
            </div>

            {/* Filters mobile */}
            <div className="lg:hidden">
              <MobileFiltersAccordion
                phoneRaw={phoneRaw}
                filters={filters}
                clearHref={clearHref}
                hasActiveFilters={hasActiveFilters}
              />
            </div>

            {/* Orders */}
            <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base sm:text-lg font-semibold text-gray-900">
                    Orders
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {totalCount} total
                    {hasActiveFilters ? " • filtered" : ""}
                  </div>
                </div>

                {hasActiveFilters ? (
                  <a
                    href={clearHref}
                    className="h-9 inline-flex items-center justify-center px-3 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    Clear
                  </a>
                ) : null}
              </div>

              <div className="mt-4">
                {list.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="text-lg font-extrabold text-gray-900">
                      {hasActiveFilters
                        ? "No orders match your filters"
                        : "No orders yet"}
                    </div>

                    <div className="mt-2 text-sm text-gray-500">
                      {hasActiveFilters
                        ? "Try changing filters or clearing search."
                        : "Create your first order to start tracking deadlines."}
                    </div>

                    {hasActiveFilters ? (
                      <a
                        href={clearHref}
                        className="mt-5 inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
                      >
                        Clear filters
                      </a>
                    ) : (
                      <div className="mt-4 text-xs text-gray-500">
                        Tip: add client name, amount, and due date.
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* ✅ Desktop */}
                    <div className="hidden lg:block">
                      <DesktopOrdersTable
                        list={list}
                        todayISO={todayISO}
                        businessSlug={businessRow.slug}
                        businessId={businessRow.id}
                        phoneRaw={phoneRaw}
                        canManage={canManage}
                        canEdit={canEdit}
                        userRole={role}
                      />
                    </div>

                    {/* ✅ Mobile */}
                    <div className="lg:hidden">
                      <MobileOrdersList
                        list={list}
                        todayISO={todayISO}
                        businessSlug={businessRow.slug}
                        businessId={businessRow.id}
                        phoneRaw={phoneRaw}
                        canManage={canManage}
                        canEdit={canEdit}
                        userRole={role}
                      />
                    </div>
                  </>
                )}
              </div>
            </section>
          </section>
        </div>
      </main>
    </div>
  );
}
