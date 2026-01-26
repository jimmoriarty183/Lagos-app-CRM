import React from "react";
import { redirect } from "next/navigation";

import TopBar from "./_components/topbar/TopBar";
import DesktopSidebar from "./_components/Desktop/DesktopSidebar";
import DesktopAnalyticsCard from "./_components/Desktop/DesktopAnalyticsCard";
import DesktopBusinessCard from "./_components/Desktop/DesktopBusinessCard";
import DesktopCreateOrderAccordion from "./_components/Desktop/DesktopCreateOrderAccordion";
import DesktopFilters from "./_components/Desktop/DesktopFilters";
import DesktopOrdersTable from "./_components/Desktop/DesktopOrdersTable";

import MobileOrdersList from "./_components/Mobile/MobileOrdersList";
import MobileCreateOrderAccordion from "./_components/Mobile/MobileCreateOrderAccordion";
import MobileFiltersAccordion from "./_components/Mobile/MobileFiltersAccordion";

import { supabaseServerReadOnly } from "@/lib/supabase/server";

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

type PageProps = {
  params: { slug: string };
  searchParams?: {
    u?: string;
    q?: string;
    status?: string;
    range?: string;
    page?: string;
  };
};

function upperRole(r: any): "OWNER" | "MANAGER" | "GUEST" {
  const s = String(r || "").toUpperCase();
  if (s === "OWNER") return "OWNER";
  if (s === "MANAGER") return "MANAGER";
  return "GUEST";
}

export default async function Page({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = (await searchParams) ?? {};

  const supabase = await supabaseServerReadOnly();

  // auth required
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect("/login");

  // memberships пользователя
  const { data: memberships, error: memErr } = await supabase
    .from("memberships")
    .select("business_id, role, created_at")
    .eq("user_id", user.id);

  if (memErr) throw memErr;

  const businessIds = (memberships ?? []).map((m: any) => m.business_id);
  if (businessIds.length === 0) redirect("/login");

  // бизнесы пользователя (ВАЖНО: name нужен для switcher)
  const { data: businesses, error: bErr } = await supabase
    .from("businesses")
    .select("id, slug, plan, owner_phone, manager_phone")
    .in("id", businessIds);

  if (bErr) throw bErr;

  const currentBusiness = (businesses ?? []).find((b: any) => b.slug === slug);
  if (!currentBusiness) {
    const first = businesses?.[0];
    if (first?.slug) redirect(`/b/${first.slug}`);
    redirect("/login");
  }

  const myRoleRaw =
    (memberships ?? []).find((m: any) => m.business_id === currentBusiness.id)
      ?.role ?? "GUEST";

  const userRole = upperRole(myRoleRaw);
  const canManage = userRole === "OWNER" || userRole === "MANAGER";
  const canEdit = canManage;
  const canSeeAnalytics = userRole === "OWNER";

  // phoneRaw для старых форм (filters/create) — берём из query ?u=
  const phoneRaw = String(sp.u ?? "");

  // Filters (компоненты ждут именно q/status/range)
  const filters: Filters = {
    q: String(sp.q ?? "").trim(),
    status: (String(sp.status ?? "ALL").toUpperCase() as any) ?? "ALL",
    range: (String(sp.range ?? "ALL") as any) ?? "ALL",
  };

  const hasActiveFilters =
    !!filters.q || filters.status !== "ALL" || filters.range !== "ALL";

  const clearHref =
    phoneRaw && phoneRaw.length > 0
      ? `/b/${slug}?u=${encodeURIComponent(phoneRaw)}`
      : `/b/${slug}`;

  // ✅ Business switcher options: id/slug/name/role
  const businessOptions = (businesses ?? [])
    .map((b: any) => {
      const roleForBiz =
        (memberships ?? []).find((m: any) => m.business_id === b.id)?.role ??
        "GUEST";

      return {
        id: String(b.id),
        slug: String(b.slug),
        name: String(b.slug),
        role: upperRole(roleForBiz),
      };
    })
    .sort((a: any, b: any) => a.name.localeCompare(b.name));

  // Orders query
  let ordersQuery = supabase
    .from("orders")
    .select("*")
    .eq("business_id", currentBusiness.id)
    .order("created_at", { ascending: false });

  if (filters.q)
    ordersQuery = ordersQuery.ilike("search_text", `%${filters.q}%`);
  if (filters.status !== "ALL")
    ordersQuery = ordersQuery.eq("status", filters.status);

  // range-логика у тебя может быть отдельно — пока оставляем ALL
  const { data: orders, error: oErr } = await ordersQuery;
  if (oErr) throw oErr;

  const list: any[] = orders ?? [];

  // Analytics
  const totalOrders = list.length;

  const sumAmount = (rows: any[]) =>
    rows.reduce((s, o) => s + Number(o.amount || 0), 0);

  const totalAmount = sumAmount(list);

  const overdueCount = list.filter(
    (o) => o.status === "NEW" || o.status === "IN_PROGRESS"
  ).length;

  const waitingPaymentRows = list.filter((o) => o.status === "WAITING_PAYMENT");
  const waitingPaymentCount = waitingPaymentRows.length;
  const waitingPaymentAmount = sumAmount(waitingPaymentRows);

  const doneRows = list.filter((o) => o.status === "DONE");
  const doneCount = doneRows.length;
  const doneAmount = sumAmount(doneRows);

  const inProgressCount = list.filter((o) => o.status === "IN_PROGRESS").length;
  const newCount = list.filter((o) => o.status === "NEW").length;
  const canceledCount = list.filter((o) => o.status === "CANCELED").length;
  const duplicateCount = list.filter((o) => o.status === "DUPLICATE").length;

  const activeAmount = sumAmount(
    list.filter((o) => o.status === "NEW" || o.status === "IN_PROGRESS")
  );

  const fmtAmount = (n: number) => new Intl.NumberFormat("uk-UA").format(n);

  const todayISO = new Date().toISOString().slice(0, 10);

  // Owner/Manager phone UI logic
  const isOwnerManager =
    currentBusiness.owner_phone &&
    currentBusiness.manager_phone &&
    String(currentBusiness.owner_phone) ===
      String(currentBusiness.manager_phone);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-gray-50">
      <TopBar
        businessSlug={slug}
        plan={currentBusiness.plan || "beta"}
        role={userRole}
        businesses={businessOptions}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="hidden lg:grid grid-cols-12 gap-6">
          <div className="col-span-3">
            <DesktopSidebar
              clearHref={clearHref}
              totalCount={totalOrders}
              canSeeAnalytics={canSeeAnalytics}
            />

            <div className="mt-6">
              <DesktopBusinessCard
                business={{
                  slug: String(currentBusiness.slug),
                  owner_phone: String(currentBusiness.owner_phone),
                  manager_phone: currentBusiness.manager_phone
                    ? String(currentBusiness.manager_phone)
                    : null,
                }}
                role={userRole}
                phone={phoneRaw}
                isOwnerManager={!!isOwnerManager}
              />
            </div>
          </div>

          <div className="col-span-9 space-y-6">
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

            <DesktopCreateOrderAccordion
              businessId={String(currentBusiness.id)}
              businessSlug={String(currentBusiness.slug)}
            />

            <DesktopFilters
              phoneRaw={phoneRaw}
              filters={filters}
              clearHref={clearHref}
              hasActiveFilters={hasActiveFilters}
            />

            <DesktopOrdersTable
              list={list as any}
              todayISO={todayISO}
              businessSlug={String(currentBusiness.slug)}
              businessId={String(currentBusiness.id)}
              phoneRaw={phoneRaw}
              canManage={canManage}
              canEdit={canEdit}
              userRole={userRole}
            />
          </div>
        </div>

        <div className="lg:hidden space-y-4">
          <MobileCreateOrderAccordion
            businessId={String(currentBusiness.id)}
            businessSlug={String(currentBusiness.slug)}
          />

          <MobileFiltersAccordion
            phoneRaw={phoneRaw}
            filters={filters}
            clearHref={clearHref}
            hasActiveFilters={hasActiveFilters}
          />

          <MobileOrdersList
            list={list as any}
            todayISO={todayISO}
            businessSlug={String(currentBusiness.slug)}
            businessId={String(currentBusiness.id)}
            phoneRaw={phoneRaw}
            canManage={canManage}
            canEdit={canEdit}
            userRole={userRole}
          />
        </div>
      </main>
    </div>
  );
}
