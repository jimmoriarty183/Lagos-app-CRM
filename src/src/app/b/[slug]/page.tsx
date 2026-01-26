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

import { supabaseServerComponent } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; status?: string; period?: string }>;
};

export default async function Page({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;

  const supabase = await supabaseServerComponent();

  // ✅ auth required
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect("/login");

  // memberships пользователя
  const { data: memberships, error: memErr } = await supabase
    .from("memberships")
    .select("business_id, role, created_at")
    .eq("user_id", user.id);

  if (memErr) throw memErr;

  const businessIds = (memberships ?? []).map((m) => m.business_id);
  if (businessIds.length === 0) {
    // пользователь залогинился, но бизнеса нет
    redirect("/login");
  }

  // бизнесы пользователя
  const { data: businesses, error: bErr } = await supabase
    .from("businesses")
    .select("id, slug, plan, owner_phone, manager_phone")
    .in("id", businessIds);

  if (bErr) throw bErr;

  const currentBusiness = (businesses ?? []).find((b) => b.slug === slug);
  if (!currentBusiness) {
    // если slug не принадлежит пользователю — перекидываем в первый доступный
    const first = businesses?.[0];
    if (first?.slug) redirect(`/b/${first.slug}`);
    redirect("/login");
  }

  const myRole =
    (memberships ?? []).find((m) => m.business_id === currentBusiness.id)
      ?.role ?? "guest";

  // ✅ свитчер: всегда
  const businessOptions = (businesses ?? [])
    .map((b) => ({ slug: b.slug, plan: b.plan || "beta" }))
    .sort((a, b) => a.slug.localeCompare(b.slug));

  // Orders
  const q = (sp.q ?? "").trim();
  const status = (sp.status ?? "all").trim();
  const period = (sp.period ?? "all").trim();

  let ordersQuery = supabase
    .from("orders")
    .select("*", { count: "exact" })
    .eq("business_id", currentBusiness.id)
    .order("created_at", { ascending: false });

  if (q) ordersQuery = ordersQuery.ilike("search_text", `%${q}%`);
  if (status !== "all") ordersQuery = ordersQuery.eq("status", status);

  // (если у тебя есть period-логика — вставь сюда)
  const { data: orders, error: oErr } = await ordersQuery;
  if (oErr) throw oErr;

  const ordersSafe = orders ?? [];

  // Analytics
  const totalOrders = ordersSafe.length;
  const totalAmount = ordersSafe.reduce(
    (sum, o: any) => sum + Number(o.amount || 0),
    0
  );

  const overdueStatuses = new Set(["NEW", "IN_PROGRESS"]);
  const overdueCount = ordersSafe.filter((o: any) =>
    overdueStatuses.has(o.status)
  ).length;

  const waitingPaymentCount = ordersSafe.filter(
    (o: any) => o.status === "WAITING_PAYMENT"
  ).length;
  const doneCount = ordersSafe.filter((o: any) => o.status === "DONE").length;

  const activeAmount = ordersSafe
    .filter((o: any) => overdueStatuses.has(o.status))
    .reduce((sum, o: any) => sum + Number(o.amount || 0), 0);

  // UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-gray-50">
      <TopBar
        businessSlug={slug}
        plan={currentBusiness.plan || "beta"}
        role={String(myRole).toUpperCase() as any}
        businesses={businessOptions}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="hidden lg:grid grid-cols-12 gap-6">
          <div className="col-span-3">
            <DesktopSidebar
              active="orders"
              role={String(myRole).toUpperCase() as any}
            />
            <div className="mt-6">
              <DesktopBusinessCard
                slug={currentBusiness.slug}
                ownerPhone={currentBusiness.owner_phone}
                managerPhone={currentBusiness.manager_phone}
                role={String(myRole).toUpperCase() as any}
              />
            </div>
          </div>

          <div className="col-span-9 space-y-6">
            <DesktopAnalyticsCard
              totalOrders={totalOrders}
              totalAmount={totalAmount}
              overdue={overdueCount}
              waitingPayment={waitingPaymentCount}
              done={doneCount}
              activeAmount={activeAmount}
            />

            <DesktopCreateOrderAccordion businessId={currentBusiness.id} />
            <DesktopFilters />
            <DesktopOrdersTable orders={ordersSafe as any} />
          </div>
        </div>

        <div className="lg:hidden space-y-4">
          <MobileCreateOrderAccordion businessId={currentBusiness.id} />
          <MobileFiltersAccordion />
          <MobileOrdersList orders={ordersSafe as any} />
        </div>
      </main>
    </div>
  );
}
