import React from "react";
import { redirect } from "next/navigation";

import TopBar from "./_components/topbar/TopBar";
import DesktopAnalyticsCard from "./_components/Desktop/DesktopAnalyticsCard";
import DesktopCreateOrderAccordion from "./_components/Desktop/DesktopCreateOrderAccordion";
import DesktopLeftRail from "./_components/Desktop/DesktopLeftRail";
import DesktopOrdersTable from "./_components/Desktop/DesktopOrdersTable";

import MobileOrdersList from "./_components/Mobile/MobileOrdersList";
import MobileCreateOrderAccordion from "./_components/Mobile/MobileCreateOrderAccordion";
import MobileFiltersAccordion from "./_components/Mobile/MobileFiltersAccordion";
import MobileSummaryBar from "./_components/Mobile/MobileSummaryBar";

import { supabaseServerReadOnly } from "@/lib/supabase/server";
import { resolveUserDisplay } from "@/lib/user-display";
import { supabaseAdmin } from "@/lib/supabase/admin";

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
  status: "ALL" | "OVERDUE" | Status;
  range: Range;
  actor: string;
};

type PageProps = {
  params: { slug: string };
  searchParams?: {
    u?: string;
    q?: string;
    status?: string;
    range?: string;
    page?: string;
    actor?: string;
  };
};

type TeamActor = {
  id: string;
  label: string;
  kind: "OWNER" | "MANAGER";
};

function isMissingColumnError(error: unknown, column: string) {
  const message = String((error as { message?: string } | null)?.message ?? "").toLowerCase();
  return message.includes(column.toLowerCase());
}

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

  const bypassUser = String(sp.u ?? "").trim();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user && !bypassUser) redirect("/login");

  const bypassMode = !user && Boolean(bypassUser);
  const canUseAdmin =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const admin = bypassMode && canUseAdmin ? supabaseAdmin() : null;
  const dataClient = admin ?? supabase;

  let memberships: any[] = [];
  let businesses: any[] = [];

  if (user) {
    const { data: membershipsData, error: memErr } = await supabase
      .from("memberships")
      .select("business_id, role, created_at, user_id")
      .eq("user_id", user.id);

    if (memErr) throw memErr;
    memberships = membershipsData ?? [];

    const businessIds = memberships.map((m: any) => m.business_id);
    if (businessIds.length > 0) {
      const { data: businessesData, error: bErr } = await supabase
        .from("businesses")
        .select("id, slug, name, plan, owner_phone, manager_phone")
        .in("id", businessIds);

      if (bErr) throw bErr;
      businesses = businessesData ?? [];
    }
  }

  let currentBusiness = (businesses ?? []).find((b: any) => b.slug === slug);
  if (!currentBusiness) {
    const { data: bySlug, error: slugErr } = await dataClient
      .from("businesses")
      .select("id, slug, name, plan, owner_phone, manager_phone")
      .eq("slug", slug)
      .maybeSingle();

    if (slugErr) {
      if (bypassMode) redirect("/login");
      throw slugErr;
    }

    if (bySlug) {
      currentBusiness = bySlug;
    } else if (user) {
      const first = businesses?.[0];
      if (first?.slug) redirect(`/b/${first.slug}`);
      redirect("/login");
    } else {
      redirect("/login");
    }
  }

  const myRoleRaw =
    (memberships ?? []).find((m: any) => m.business_id === currentBusiness.id)?.role ??
    (bypassUser ? "MANAGER" : "GUEST");

  const userRole = upperRole(myRoleRaw);
  const canManage = userRole === "OWNER" || userRole === "MANAGER";
  const canEdit = canManage;
  const canSeeAnalyticsNav = userRole === "OWNER";

  const phoneRaw = String(sp.u ?? "");
  const statusRaw = String(sp.status ?? "ALL").toUpperCase();
  const allowedStatuses = [
    "ALL",
    "NEW",
    "IN_PROGRESS",
    "WAITING_PAYMENT",
    "DONE",
    "CANCELED",
    "DUPLICATE",
    "OVERDUE",
  ] as const;

  const filters: Filters = {
    q: String(sp.q ?? "").trim(),
    status: allowedStatuses.includes(statusRaw as (typeof allowedStatuses)[number])
      ? (statusRaw as Filters["status"])
      : "ALL",
    range: (String(sp.range ?? "ALL") as Range) ?? "ALL",
    actor: String(sp.actor ?? "ALL"),
  };

  const hasActiveFilters =
    !!filters.q ||
    filters.status !== "ALL" ||
    filters.range !== "ALL" ||
    filters.actor !== "ALL";
  const activeFiltersCount = [
    filters.q ? 1 : 0,
    filters.status !== "ALL" ? 1 : 0,
    filters.range !== "ALL" ? 1 : 0,
    filters.actor !== "ALL" ? 1 : 0,
  ].reduce((sum, count) => sum + count, 0);

  const clearHref =
    phoneRaw && phoneRaw.length > 0
      ? `/b/${slug}?u=${encodeURIComponent(phoneRaw)}`
      : `/b/${slug}`;
  const businessHref =
    phoneRaw && phoneRaw.length > 0
      ? `/b/${slug}/settings/team?u=${encodeURIComponent(phoneRaw)}`
      : `/b/${slug}/settings/team`;

  let teamActors: TeamActor[] = [];
  let ownerIds: string[] = [];
  let managerIds: string[] = [];

  try {
    const { data: actorMemberships } = await dataClient
      .from("memberships")
      .select("user_id, role")
      .eq("business_id", currentBusiness.id)
      .in("role", ["OWNER", "MANAGER"]);

    const membershipRows = (actorMemberships ?? []).filter((m: any) => m?.user_id);
    const actorUserIds = Array.from(new Set(membershipRows.map((m: any) => String(m.user_id))));

    const profilesMap = new Map<
      string,
      {
        full_name: string | null;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      }
    >();

    if (actorUserIds.length > 0) {
      const { data: actorProfiles } = await dataClient
        .from("profiles")
        .select("id, full_name, first_name, last_name, email")
        .in("id", actorUserIds);

      for (const p of actorProfiles ?? []) {
        if (p?.id) {
          profilesMap.set(String(p.id), {
            full_name: p.full_name ?? null,
            first_name: p.first_name ?? null,
            last_name: p.last_name ?? null,
            email: p.email ?? null,
          });
        }
      }
    }

    ownerIds = membershipRows
      .filter((m: any) => upperRole(m.role) === "OWNER")
      .map((m: any) => String(m.user_id));
    managerIds = membershipRows
      .filter((m: any) => upperRole(m.role) === "MANAGER")
      .map((m: any) => String(m.user_id));

    teamActors = membershipRows.map((m: any) => {
      const id = String(m.user_id);
      const role = upperRole(m.role) === "OWNER" ? "OWNER" : "MANAGER";
      const profile = profilesMap.get(id);
      const userDisplay = resolveUserDisplay({
        full_name: profile?.full_name,
        first_name: profile?.first_name,
        last_name: profile?.last_name,
        email: profile?.email,
      });
      const label = userDisplay.primary || id;
      return { id, label, kind: role };
    });

  } catch {
    teamActors = [];
  }

  const businessOptions = (businesses ?? [])
    .map((b: any) => {
      const roleForBiz =
        (memberships ?? []).find((m: any) => m.business_id === b.id)?.role ?? "GUEST";

      return {
        id: String(b.id),
        slug: String(b.slug),
        name: String(b.name ?? b.slug),
        role: upperRole(roleForBiz),
      };
    })
    .sort((a: any, b: any) => a.name.localeCompare(b.name));

  const buildOrdersQuery = (withActorFilter: boolean) => {
    let query = dataClient
      .from("orders")
      .select("*")
      .eq("business_id", currentBusiness.id)
      .order("created_at", { ascending: false });

    if (filters.status !== "ALL" && filters.status !== "OVERDUE") {
      query = query.eq("status", filters.status);
    }

    if (withActorFilter && filters.actor !== "ALL") {
      if (filters.actor === "OWNER") {
        if (ownerIds.length > 0) query = query.in("created_by", ownerIds);
      } else if (filters.actor === "MANAGER") {
        if (managerIds.length > 0) query = query.in("created_by", managerIds);
      } else if (filters.actor.startsWith("user:")) {
        query = query.eq("created_by", filters.actor.slice(5));
      }
    }

    return query;
  };

  let ordersResult = await buildOrdersQuery(true);
  if (ordersResult.error && isMissingColumnError(ordersResult.error, "created_by")) {
    ordersResult = await buildOrdersQuery(false);
  }

  const { data: orders, error: oErr } = ordersResult;
  if (oErr && !bypassMode) throw oErr;

  const listRaw: any[] = orders ?? [];
  const actorNameById = new Map<string, string>();
  for (const actor of teamActors) {
    if (actor?.id) actorNameById.set(String(actor.id), String(actor.label ?? ""));
  }

  const todayISO = new Date().toISOString().slice(0, 10);
  const qNeedle = String(filters.q ?? "").trim().toLowerCase();

  const searchedList: any[] = qNeedle
    ? listRaw.filter((o) => {
        const actorName = actorNameById.get(String(o.created_by ?? "")) ?? "";
        const blob = [
          String(o.id ?? ""),
          String(o.search_text ?? ""),
          String(o.client_name ?? ""),
          String(o.client_phone ?? ""),
          String(o.amount ?? ""),
          String(o.description ?? ""),
          actorName,
        ]
          .join(" ")
          .toLowerCase();

        return blob.includes(qNeedle);
      })
    : listRaw;

  const isOrderOverdue = (o: any) => {
    const dueISO = o?.due_date ? String(o.due_date).slice(0, 10) : null;
    return (
      !!dueISO &&
      dueISO < todayISO &&
      (o?.status === "NEW" || o?.status === "IN_PROGRESS")
    );
  };

  const list: any[] =
    filters.status === "ALL"
      ? searchedList
      : filters.status === "OVERDUE"
        ? searchedList.filter((o) => isOrderOverdue(o))
        : searchedList.filter((o) => o.status === filters.status);

  const totalOrders = list.length;

  const sumAmount = (rows: any[]) => rows.reduce((s, o) => s + Number(o.amount || 0), 0);
  const totalAmount = sumAmount(list);
  const activeOrders = list.filter(
    (o) => o.status === "NEW" || o.status === "IN_PROGRESS",
  ).length;
  const overdueCount = list.filter((o) => isOrderOverdue(o)).length;

  const fmtRevenue = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="min-h-screen overflow-x-hidden bg-transparent text-slate-900">
      <TopBar
        businessSlug={slug}
        plan={currentBusiness.plan || "beta"}
        role={userRole}
        businesses={businessOptions}
        businessHref={businessHref}
        clearHref={clearHref}
        hasActiveFilters={hasActiveFilters}
      />

      <main className="mx-auto max-w-[1220px] overflow-x-hidden px-4 pb-8 pt-20 sm:px-6">
        <div className="hidden items-start lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-5">
          <DesktopLeftRail
            phoneRaw={phoneRaw}
            q={filters.q}
            status={filters.status}
            range={filters.range}
            actor={filters.actor}
            actors={teamActors}
            hasActiveFilters={hasActiveFilters}
            activeFiltersCount={activeFiltersCount}
            clearHref={clearHref}
            businessHref={businessHref}
            canSeeAnalytics={canSeeAnalyticsNav}
          />

          <div className="min-w-0 space-y-4">
            <DesktopAnalyticsCard
              totalOrders={totalOrders}
              totalRevenue={totalAmount}
              activeOrders={activeOrders}
              overdueCount={overdueCount}
              fmtRevenue={fmtRevenue}
            />

            <DesktopCreateOrderAccordion
              businessId={String(currentBusiness.id)}
              businessSlug={String(currentBusiness.slug)}
            />

            <DesktopOrdersTable
              list={list as any}
              todayISO={todayISO}
              businessSlug={String(currentBusiness.slug)}
              businessId={String(currentBusiness.id)}
              phoneRaw={phoneRaw}
              searchQuery={filters.q}
              statusFilter={filters.status}
              rangeFilter={filters.range}
              actorFilter={filters.actor}
              clearHref={clearHref}
              hasActiveFilters={hasActiveFilters}
              canManage={canManage}
              canEdit={canEdit}
              userRole={userRole}
            />
          </div>
        </div>

        <div className="space-y-4 lg:hidden">
          <MobileSummaryBar
            totalOrders={totalOrders}
            totalRevenue={totalAmount}
            activeOrders={activeOrders}
            overdueCount={overdueCount}
            hasActiveFilters={hasActiveFilters}
            clearHref={clearHref}
          />

          <MobileCreateOrderAccordion
            businessId={String(currentBusiness.id)}
            businessSlug={String(currentBusiness.slug)}
          />

          <MobileFiltersAccordion
            phoneRaw={phoneRaw}
            filters={filters}
            clearHref={clearHref}
            hasActiveFilters={hasActiveFilters}
            actor={filters.actor}
            actors={teamActors}
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
