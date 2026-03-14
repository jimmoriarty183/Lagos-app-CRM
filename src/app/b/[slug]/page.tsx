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

import {
  DEFAULT_SUMMARY_RANGE,
  filterOrdersByCreatedAt,
  formatDateInput,
  formatMetricComparison,
  getDashboardPeriod,
  getMetricSnapshot,
  isOrderOverdue,
  resolveDashboardRangeInput,
  SUMMARY_RANGE_OPTIONS,
  type DashboardRange,
  type TrendDirection,
  type TrendTone,
} from "@/lib/order-dashboard-summary";
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

type StatusFilterValue = Status | "OVERDUE";

type Filters = {
  q: string;
  statuses: StatusFilterValue[];
  range: DashboardRange;
  startDate: string | null;
  endDate: string | null;
  actor: string;
};

type SummaryPeriodOption = {
  label: string;
  shortLabel: string;
  href: string;
  active: boolean;
};

type SummaryCardData = {
  label: string;
  value: string;
  trendText: string | null;
  trendDirection: TrendDirection;
  trendTone: TrendTone;
  tone: "neutral" | "blue" | "green" | "red";
};

type SummaryCardSeed = {
  label: string;
  value: string;
  tone: "neutral" | "blue" | "green" | "red";
  comparison: ReturnType<typeof formatMetricComparison>;
};

type PageProps = {
  params: { slug: string };
  searchParams?: {
    u?: string;
    q?: string;
    status?: string | string[];
    range?: string;
    srange?: string;
    start?: string;
    end?: string;
    sstart?: string;
    send?: string;
    page?: string;
    perPage?: string;
    actor?: string;
  };
};

type TeamActor = {
  id: string;
  label: string;
  kind: "OWNER" | "MANAGER";
};

type OrderListItem = any & {
  manager_id: string | null;
  manager_name: string | null;
};

function upperRole(r: any): "OWNER" | "MANAGER" | "GUEST" {
  const s = String(r || "").toUpperCase();
  if (s === "OWNER") return "OWNER";
  if (s === "MANAGER") return "MANAGER";
  return "GUEST";
}

function normalizeStatusFilters(
  value: string | string[] | undefined,
  allowedStatuses: readonly StatusFilterValue[],
) {
  const normalized = (Array.isArray(value) ? value : [value])
    .flatMap((item) => String(item ?? "").split(","))
    .map((item) => item.trim().toUpperCase())
    .filter((item): item is StatusFilterValue =>
      allowedStatuses.includes(item as StatusFilterValue),
    );

  return Array.from(new Set(normalized));
}

const PAGE_SIZE_OPTIONS = [20, 50, 100, 500] as const;

function normalizePageSize(value: string | undefined) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return PAGE_SIZE_OPTIONS.includes(parsed as (typeof PAGE_SIZE_OPTIONS)[number]) ? parsed : 20;
}

function normalizePageNumber(value: string | undefined) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
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
  const currentUserId = user?.id ?? null;

  const phoneRaw = String(sp.u ?? "");
  const allowedStatuses = [
    "NEW",
    "IN_PROGRESS",
    "WAITING_PAYMENT",
    "DONE",
    "CANCELED",
    "DUPLICATE",
    "OVERDUE",
  ] as const;
  const rangeInput = resolveDashboardRangeInput({
    range: sp.range,
    startDate: sp.start,
    endDate: sp.end,
    fallbackRange: "ALL",
  });
  const summaryRangeInput = resolveDashboardRangeInput({
    range: sp.srange,
    startDate: sp.sstart,
    endDate: sp.send,
    fallbackRange: DEFAULT_SUMMARY_RANGE,
  });
  const customStartDate = rangeInput.range === "custom" ? rangeInput.startDate : null;
  const customEndDate = rangeInput.range === "custom" ? rangeInput.endDate : null;
  const summaryCustomStartDate =
    summaryRangeInput.range === "custom" ? summaryRangeInput.startDate : null;
  const summaryCustomEndDate =
    summaryRangeInput.range === "custom" ? summaryRangeInput.endDate : null;

  const filters: Filters = {
    q: String(sp.q ?? "").trim(),
    statuses: normalizeStatusFilters(sp.status, allowedStatuses),
    range: rangeInput.range,
    startDate: customStartDate,
    endDate: customEndDate,
    actor: String(sp.actor ?? "ALL"),
  };
  const perPage = normalizePageSize(sp.perPage);
  const hasCustomRange = filters.range === "custom" && !!filters.startDate && !!filters.endDate;
  const rangeIsDefault = filters.range === "ALL" && !hasCustomRange;
  const isRangeFilterActive = !rangeIsDefault;
  const summaryRange = summaryRangeInput.range;

  const hasActiveFilters =
    !!filters.q ||
    filters.statuses.length > 0 ||
    isRangeFilterActive ||
    filters.actor !== "ALL";
  const activeFiltersCount = [
    filters.q ? 1 : 0,
    filters.statuses.length > 0 ? 1 : 0,
    isRangeFilterActive ? 1 : 0,
    filters.actor !== "ALL" ? 1 : 0,
  ].reduce((sum, count) => sum + count, 0);

  const clearHref = (() => {
    const params = new URLSearchParams();
    if (phoneRaw && phoneRaw.length > 0) params.set("u", phoneRaw);
    params.set("perPage", String(perPage));
    if (summaryRange !== DEFAULT_SUMMARY_RANGE) params.set("srange", summaryRange);
    if (summaryRange === "custom" && summaryCustomStartDate) params.set("sstart", summaryCustomStartDate);
    if (summaryRange === "custom" && summaryCustomEndDate) params.set("send", summaryCustomEndDate);
    const qs = params.toString();
    return qs ? `/b/${slug}?${qs}` : `/b/${slug}`;
  })();
  const businessHref =
    phoneRaw && phoneRaw.length > 0
      ? `/b/${slug}/settings/team?u=${encodeURIComponent(phoneRaw)}`
      : `/b/${slug}/settings/team`;

  const makeSummaryHref = (nextSummaryRange: DashboardRange) => {
    const params = new URLSearchParams();
    if (phoneRaw && phoneRaw.length > 0) params.set("u", phoneRaw);
    params.set("perPage", String(perPage));
    if (filters.q) params.set("q", filters.q);
    for (const status of filters.statuses) params.append("status", status);
    if (filters.range !== "ALL") params.set("range", filters.range);
    if (filters.startDate) params.set("start", filters.startDate);
    if (filters.endDate) params.set("end", filters.endDate);
    if (filters.actor !== "ALL") params.set("actor", filters.actor);
    if (nextSummaryRange !== DEFAULT_SUMMARY_RANGE) params.set("srange", nextSummaryRange);
    if (nextSummaryRange === "custom" && summaryCustomStartDate) params.set("sstart", summaryCustomStartDate);
    if (nextSummaryRange === "custom" && summaryCustomEndDate) params.set("send", summaryCustomEndDate);
    const qs = params.toString();
    return qs ? `/b/${slug}?${qs}` : `/b/${slug}`;
  };

  const summaryPeriodOptions: SummaryPeriodOption[] = SUMMARY_RANGE_OPTIONS.map((option) => ({
    label: option.label,
    shortLabel: option.shortLabel,
    href: makeSummaryHref(option.value),
    active: summaryRange === option.value,
  }));
  const summaryExtendedOptions: SummaryPeriodOption[] =
    userRole === "OWNER"
      ? [
          { label: "Last 90 days", shortLabel: "90D", href: makeSummaryHref("last90Days"), active: summaryRange === "last90Days" },
          { label: "Last year", shortLabel: "1Y", href: makeSummaryHref("last1Year"), active: summaryRange === "last1Year" },
          { label: "Custom range", shortLabel: "Custom", href: makeSummaryHref("custom"), active: summaryRange === "custom" },
        ]
      : [];

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

  const { data: orders, error: oErr } = await dataClient
    .from("orders")
    .select("*")
    .eq("business_id", currentBusiness.id)
    .order("created_at", { ascending: false });
  if (oErr && !bypassMode) throw oErr;

  const listRaw: any[] = orders ?? [];
  const actorNameById = new Map<string, string>();
  for (const actor of teamActors) {
    if (actor?.id) actorNameById.set(String(actor.id), String(actor.label ?? ""));
  }

  const now = new Date();
  const todayISO = formatDateInput(now);
  const qNeedle = String(filters.q ?? "").trim().toLowerCase();

  const actorFilteredList: any[] =
    filters.actor === "ALL"
      ? listRaw
      : filters.actor === "ME"
        ? listRaw.filter((o) => String(o.created_by ?? "") === String(currentUserId ?? ""))
        : filters.actor === "UNASSIGNED"
          ? listRaw.filter((o) => !String(o.created_by ?? "").trim())
      : filters.actor === "OWNER"
        ? listRaw.filter((o) => ownerIds.includes(String(o.created_by ?? "")))
        : filters.actor === "MANAGER"
          ? listRaw.filter((o) => managerIds.includes(String(o.created_by ?? "")))
          : filters.actor.startsWith("user:")
            ? listRaw.filter((o) => String(o.created_by ?? "") === filters.actor.slice(5))
            : listRaw;

  const searchedList: any[] = qNeedle
    ? actorFilteredList.filter((o) => {
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
    : actorFilteredList;

  const applyStatusFilter = (rows: any[]) =>
    filters.statuses.length === 0
      ? rows
      : rows.filter((o) =>
          filters.statuses.some((status) =>
            status === "OVERDUE"
              ? isOrderOverdue(o, todayISO)
              : o.status === status,
          ),
        );

  const tablePeriod = getDashboardPeriod(filters.range, {
    now,
    startDate: filters.startDate,
    endDate: filters.endDate,
  });
  const summaryPeriod = getDashboardPeriod(summaryRange, {
    now,
    startDate: summaryCustomStartDate,
    endDate: summaryCustomEndDate,
  });
  const currentPeriodRows = filterOrdersByCreatedAt(searchedList, tablePeriod.current);
  const summaryCurrentRows = filterOrdersByCreatedAt(listRaw, summaryPeriod.current);
  const previousPeriodRows = summaryPeriod.previous
    ? filterOrdersByCreatedAt(listRaw, summaryPeriod.previous)
    : [];

  const list: OrderListItem[] = applyStatusFilter(currentPeriodRows).map((order) => ({
    ...order,
    manager_id: order.created_by ? String(order.created_by) : null,
    manager_name: actorNameById.get(String(order.created_by ?? "")) || null,
  }));
  const resultCount = list.length;
  const requestedPage = normalizePageNumber(sp.page);
  const totalPages = Math.max(1, Math.ceil(resultCount / perPage));
  const currentPage = Math.min(requestedPage, totalPages);
  const pageStart = (currentPage - 1) * perPage;
  const paginatedList = list.slice(pageStart, pageStart + perPage);
  const previousList: any[] = previousPeriodRows;

  const currentSnapshot = getMetricSnapshot(summaryCurrentRows, todayISO);
  const previousSnapshot = summaryPeriod.previous ? getMetricSnapshot(previousList, todayISO) : null;

  const fmtRevenue = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);
  const fmtSignedRevenue = (n: number) => `${n >= 0 ? "+" : "-"}${fmtRevenue(Math.abs(Math.round(n)))}`;
  const fmtSignedCount = (n: number) => `${n >= 0 ? "+" : "-"}${Math.abs(Math.round(n))}`;

  const summaryCards: SummaryCardData[] = ([
    {
      label: "Total Orders",
      value: String(currentSnapshot.totalOrders),
      tone: "blue",
      comparison: formatMetricComparison({
        current: currentSnapshot.totalOrders,
        previous: previousSnapshot?.totalOrders ?? null,
        comparisonLabel: summaryPeriod.comparisonLabel,
        mode: "percent",
        improvement: "up",
        zeroPreviousBehavior: "absolute",
        formatAbsoluteValue: fmtSignedCount,
      }),
    },
    {
      label: "Total Revenue",
      value: fmtRevenue(Math.round(currentSnapshot.totalRevenue)),
      tone: "neutral",
      comparison: formatMetricComparison({
        current: currentSnapshot.totalRevenue,
        previous: previousSnapshot?.totalRevenue ?? null,
        comparisonLabel: summaryPeriod.comparisonLabel,
        mode: "percent",
        improvement: "up",
        zeroPreviousBehavior: "absolute",
        formatAbsoluteValue: fmtSignedRevenue,
      }),
    },
    {
      label: "Active Orders",
      value: String(currentSnapshot.activeOrders),
      tone: "green",
      comparison: formatMetricComparison({
        current: currentSnapshot.activeOrders,
        previous: previousSnapshot?.activeOrders ?? null,
        comparisonLabel: summaryPeriod.comparisonLabel,
        mode: "absolute",
        improvement: "up",
      }),
    },
    {
      label: "Overdue Orders",
      value: String(currentSnapshot.overdueOrders),
      tone: "red",
      comparison: formatMetricComparison({
        current: currentSnapshot.overdueOrders,
        previous: previousSnapshot?.overdueOrders ?? null,
        comparisonLabel: summaryPeriod.comparisonLabel,
        mode: "absolute",
        improvement: "down",
      }),
    },
  ] as SummaryCardSeed[]).map(({ comparison, ...card }) => ({
    ...card,
    trendText: comparison.text,
    trendDirection: comparison.direction,
    trendTone: comparison.tone,
  }));

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
            key={`desktop-rail-${filters.range}-${filters.startDate ?? ""}-${filters.endDate ?? ""}`}
            phoneRaw={phoneRaw}
            q={filters.q}
            statuses={filters.statuses}
            range={filters.range}
            summaryRange={summaryRange}
            startDate={filters.startDate}
            endDate={filters.endDate}
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
              cards={summaryCards}
              periodLabel={summaryPeriod.current.label}
              comparisonLabel={summaryPeriod.comparisonLabel}
              hasComparison={Boolean(summaryPeriod.previous)}
              hasOrdersEver={listRaw.length > 0}
              periodOptions={summaryPeriodOptions}
              extendedOptions={summaryExtendedOptions}
              customRange={{
                active: summaryRange === "custom",
                startDate: summaryCustomStartDate,
                endDate: summaryCustomEndDate,
                phoneRaw,
                tableQuery: {
                  q: filters.q,
                  statuses: filters.statuses,
                  range: filters.range,
                  startDate: filters.startDate,
                  endDate: filters.endDate,
                  actor: filters.actor,
                },
              }}
            />

            <DesktopCreateOrderAccordion
              businessId={String(currentBusiness.id)}
              businessSlug={String(currentBusiness.slug)}
            />

            <DesktopOrdersTable
              key={`desktop-orders-${filters.q}-${filters.statuses.join(",")}-${filters.actor}-${filters.range}-${filters.startDate ?? ""}-${filters.endDate ?? ""}`}
              list={paginatedList}
              todayISO={todayISO}
              businessSlug={String(currentBusiness.slug)}
              businessId={String(currentBusiness.id)}
              phoneRaw={phoneRaw}
              searchQuery={filters.q}
              statusFilter={filters.statuses}
              rangeFilter={filters.range}
              summaryRange={summaryRange}
              rangeStartDate={filters.startDate}
              rangeEndDate={filters.endDate}
              actorFilter={filters.actor}
              clearHref={clearHref}
              hasActiveFilters={hasActiveFilters}
              resultCount={resultCount}
              currentPage={currentPage}
              perPage={perPage}
              totalPages={totalPages}
              canManage={canManage}
              canEdit={canEdit}
              userRole={userRole}
              actors={teamActors}
              currentUserId={currentUserId}
            />
          </div>
        </div>

        <div className="space-y-4 lg:hidden">
          <MobileSummaryBar
            cards={summaryCards}
            periodLabel={summaryPeriod.current.label}
            comparisonLabel={summaryPeriod.comparisonLabel}
            hasComparison={Boolean(summaryPeriod.previous)}
            periodOptions={summaryPeriodOptions}
            extendedOptions={summaryExtendedOptions}
            customRange={{
              active: summaryRange === "custom",
              startDate: summaryCustomStartDate,
              endDate: summaryCustomEndDate,
              phoneRaw,
              tableQuery: {
                q: filters.q,
                statuses: filters.statuses,
                range: filters.range,
                startDate: filters.startDate,
                endDate: filters.endDate,
                actor: filters.actor,
              },
            }}
          />

          <MobileCreateOrderAccordion
            businessId={String(currentBusiness.id)}
            businessSlug={String(currentBusiness.slug)}
          />

          <MobileFiltersAccordion
            key={`mobile-filters-${filters.range}-${filters.startDate ?? ""}-${filters.endDate ?? ""}`}
            phoneRaw={phoneRaw}
            filters={filters}
            summaryRange={summaryRange}
            clearHref={clearHref}
            hasActiveFilters={hasActiveFilters}
            actor={filters.actor}
            actors={teamActors}
          />
          <MobileOrdersList
            key={`mobile-orders-${filters.q}-${filters.statuses.join(",")}-${filters.actor}-${filters.range}-${filters.startDate ?? ""}-${filters.endDate ?? ""}`}
            list={paginatedList}
            todayISO={todayISO}
            businessSlug={String(currentBusiness.slug)}
            businessId={String(currentBusiness.id)}
            phoneRaw={phoneRaw}
            resultsCount={resultCount}
            currentPage={currentPage}
            perPage={perPage}
            totalPages={totalPages}
            canManage={canManage}
            canEdit={canEdit}
            userRole={userRole}
            actors={teamActors}
            currentUserId={currentUserId}
            searchQuery={filters.q}
            statusFilter={filters.statuses}
            summaryRange={summaryRange}
            rangeFilter={filters.range}
            rangeStartDate={filters.startDate}
            rangeEndDate={filters.endDate}
            actorFilter={filters.actor}
          />
        </div>
      </main>
    </div>
  );
}
