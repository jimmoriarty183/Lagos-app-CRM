import { redirect } from "next/navigation";

import DesktopLeftRail from "@/app/b/[slug]/_components/Desktop/DesktopLeftRail";
import OwnerAnalyticsPanel from "@/app/b/[slug]/_components/Desktop/OwnerAnalyticsPanel";
import type { BusinessOption } from "@/app/b/[slug]/_components/topbar/BusinessSwitcher";
import TopBar from "@/app/b/[slug]/_components/topbar/TopBar";
import { getAdminUsersPath, isAdminEmail } from "@/lib/admin-access";
import { getTodayDateOnly } from "@/lib/follow-ups";
import { loadOwnerDashboardData } from "@/lib/owner-dashboard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServerReadOnly } from "@/lib/supabase/server";
import { resolveUserDisplay } from "@/lib/user-display";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    u?: string;
    tab?: string;
    period?: string;
    rfrom?: string;
    rto?: string;
    rmanager?: string;
    smonth?: string;
    smanager?: string;
  }>;
};

type MembershipRow = {
  business_id: string;
  role: string | null;
  created_at?: string | null;
  user_id?: string | null;
};

type MemberRoleRow = {
  user_id: string;
  role: string | null;
};

type ProfileLookupRow = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

type SalesMonthTargetRow = {
  month_start: string;
  manager_id: string | null;
  plan_amount: number | string | null;
  plan_closed_orders: number | string | null;
};

type BusinessRow = {
  id: string;
  slug: string;
  name: string | null;
  plan: string | null;
};

function upperRole(value: unknown): "OWNER" | "MANAGER" | "GUEST" {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();
  if (normalized === "OWNER") return "OWNER";
  if (normalized === "MANAGER") return "MANAGER";
  return "GUEST";
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function parseNumeric(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default async function OwnerAnalyticsPage({
  params,
  searchParams,
}: PageProps) {
  const emptySearchParams: Awaited<NonNullable<PageProps["searchParams"]>> = {};
  const [{ slug }, sp] = await Promise.all([
    params,
    searchParams ?? Promise.resolve(emptySearchParams),
  ]);
  const phoneRaw = cleanText(sp?.u);
  const tabRaw = cleanText(sp?.tab).toLowerCase();
  const periodRaw = cleanText(sp?.period).toLowerCase();
  const reportFromRaw = cleanText(sp?.rfrom);
  const reportToRaw = cleanText(sp?.rto);
  const reportManagerRaw = cleanText(sp?.rmanager);
  const salesMonthRaw = cleanText(sp?.smonth);
  const salesManagerRaw = cleanText(sp?.smanager);
  const reportFromDate = /^\d{4}-\d{2}-\d{2}$/.test(reportFromRaw)
    ? reportFromRaw
    : "";
  const reportToDate = /^\d{4}-\d{2}-\d{2}$/.test(reportToRaw)
    ? reportToRaw
    : "";
  const reportManagerId = reportManagerRaw;
  const salesMonth = /^\d{4}-\d{2}$/.test(salesMonthRaw)
    ? `${salesMonthRaw}-01`
    : /^\d{4}-\d{2}-\d{2}$/.test(salesMonthRaw)
      ? salesMonthRaw
      : "";
  const salesManagerId = salesManagerRaw;
  const analyticsView:
    | "overview"
    | "managers"
    | "alerts"
    | "reports"
    | "productivity"
    | "sales" =
    tabRaw === "managers" ||
    tabRaw === "alerts" ||
    tabRaw === "reports" ||
    tabRaw === "productivity" ||
    tabRaw === "sales"
      ? (tabRaw as "managers" | "alerts" | "reports" | "productivity" | "sales")
      : "overview";
  const productivityPeriod: "day" | "week" | "month" =
    periodRaw === "day" || periodRaw === "month"
      ? (periodRaw as "day" | "month")
      : "week";

  const supabase = await supabaseServerReadOnly();
  const admin = supabaseAdmin();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/b/${slug}/analytics`)}`);
  }

  const { data: membershipsData, error: membershipsError } = await supabase
    .from("memberships")
    .select("business_id, role, created_at, user_id")
    .eq("user_id", user.id);
  if (membershipsError) throw membershipsError;

  const memberships = (membershipsData ?? []) as MembershipRow[];
  const businessIds = memberships.map((m) => m.business_id);
  if (!businessIds.length) {
    redirect("/app/crm");
  }

  const { data: businessesData, error: businessError } = await supabase
    .from("businesses")
    .select("id, slug, name, plan")
    .in("id", businessIds);
  if (businessError) throw businessError;

  const businesses = (businessesData ?? []) as BusinessRow[];
  const currentBusiness = businesses.find((b) => b.slug === slug);
  if (!currentBusiness) {
    redirect("/app/crm");
  }

  const role = upperRole(
    memberships.find((m) => m.business_id === currentBusiness.id)?.role,
  );
  if (role !== "OWNER") {
    redirect(`/b/${slug}`);
  }

  const { data: profileRaw } = await admin
    .from("profiles")
    .select("full_name, first_name, last_name, email, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const currentUserName =
    resolveUserDisplay(profileRaw ?? {}).primary ||
    cleanText(user.email) ||
    "User";
  const currentUserAvatarUrl = cleanText(
    (profileRaw as { avatar_url?: string | null } | null)?.avatar_url,
  );
  const adminHref = isAdminEmail(user.email) ? getAdminUsersPath() : undefined;

  const businessOptions: BusinessOption[] = businesses
    .filter((entry) => cleanText(entry.slug))
    .map((entry) => ({
      id: entry.id,
      slug: entry.slug,
      name: cleanText(entry.name) || entry.slug,
      role: upperRole(
        memberships.find((membership) => membership.business_id === entry.id)
          ?.role,
      ),
      isAdmin: isAdminEmail(user.email),
    }));

  const businessHref =
    phoneRaw && phoneRaw.length > 0
      ? `/app/crm?u=${encodeURIComponent(phoneRaw)}`
      : "/app/crm";
  const settingsHref =
    phoneRaw && phoneRaw.length > 0
      ? `/app/settings?u=${encodeURIComponent(phoneRaw)}`
      : "/app/settings";
  const todayHref =
    phoneRaw && phoneRaw.length > 0
      ? `/b/${slug}/today?u=${encodeURIComponent(phoneRaw)}`
      : `/b/${slug}/today`;
  const analyticsHref =
    phoneRaw && phoneRaw.length > 0
      ? `/b/${slug}/analytics?u=${encodeURIComponent(phoneRaw)}`
      : `/b/${slug}/analytics`;
  const makeTabHref = (
    tab:
      | "overview"
      | "managers"
      | "alerts"
      | "reports"
      | "productivity"
      | "sales",
  ) => {
    const params = new URLSearchParams();
    if (phoneRaw) params.set("u", phoneRaw);
    if (tab !== "overview") params.set("tab", tab);
    if (tab === "productivity") params.set("period", productivityPeriod);
    if (reportFromDate) params.set("rfrom", reportFromDate);
    if (reportToDate) params.set("rto", reportToDate);
    if (reportManagerId) params.set("rmanager", reportManagerId);
    if (salesMonth) params.set("smonth", salesMonth);
    if (salesManagerId) params.set("smanager", salesManagerId);
    const qs = params.toString();
    return qs ? `/b/${slug}/analytics?${qs}` : `/b/${slug}/analytics`;
  };
  const makeProductivityHref = (period: "day" | "week" | "month") => {
    const params = new URLSearchParams();
    if (phoneRaw) params.set("u", phoneRaw);
    params.set("tab", "productivity");
    params.set("period", period);
    return `/b/${slug}/analytics?${params.toString()}`;
  };
  const managerBaseHref = makeTabHref("managers");
  const clearHref = analyticsHref;
  const defaultSalesMonth = `${getTodayDateOnly().slice(0, 7)}-01`;
  const selectedSalesMonth = salesMonth || defaultSalesMonth;
  const currentMonthStart = defaultSalesMonth;
  const nextMonthStart = (() => {
    const base = new Date(`${currentMonthStart}T00:00:00`);
    const next = new Date(base.getFullYear(), base.getMonth() + 1, 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`;
  })();

  const todayDate = getTodayDateOnly();
  const [{ count: overdueCountRaw }, { count: todayCountRaw }] =
    await Promise.all([
      admin
        .from("follow_ups")
        .select("id", { count: "exact", head: true })
        .eq("business_id", String(currentBusiness.id))
        .eq("status", "open")
        .lt("due_date", todayDate),
      admin
        .from("follow_ups")
        .select("id", { count: "exact", head: true })
        .eq("business_id", String(currentBusiness.id))
        .eq("status", "open")
        .eq("due_date", todayDate),
    ]);
  const overdueCount = Number(overdueCountRaw ?? 0);
  const todayCount = Number(todayCountRaw ?? 0);
  const todoCount = overdueCount + todayCount;

  const analyticsData = await loadOwnerDashboardData(admin, {
    businessId: String(currentBusiness.id),
    fromDate: null,
    toDate: null,
    asOfDate: getTodayDateOnly(),
    capacityPointsPerDay: 8,
    limitAlerts: 50,
    productivityPeriod,
    reportFromDate: reportFromDate || null,
    reportToDate: reportToDate || null,
    reportManagerId: reportManagerId || null,
    salesMonth: salesMonth || null,
    salesManagerId: salesManagerId || null,
  });

  const memberRolesRes = await admin
    .from("memberships")
    .select("user_id, role")
    .eq("business_id", String(currentBusiness.id));
  if (memberRolesRes.error) throw memberRolesRes.error;

  const memberRoles = ((memberRolesRes.data ?? []) as MemberRoleRow[]).filter(
    (row) => {
      const role = upperRole(row.role);
      return role === "OWNER" || role === "MANAGER";
    },
  );
  const memberIds = Array.from(
    new Set(
      memberRoles
        .map((row) => cleanText(row.user_id))
        .filter(Boolean),
    ),
  );
  let memberProfiles: ProfileLookupRow[] = [];
  if (memberIds.length > 0) {
    const profilesRes = await admin
      .from("profiles")
      .select("id, full_name, first_name, last_name, email")
      .in("id", memberIds);
    if (profilesRes.error) throw profilesRes.error;
    memberProfiles = (profilesRes.data ?? []) as ProfileLookupRow[];
  }
  const profileById = new Map(
    memberProfiles.map((row) => {
      const fullName = cleanText(row.full_name);
      const composed = `${cleanText(row.first_name)} ${cleanText(row.last_name)}`.trim();
      const fallback = cleanText(row.email) || row.id;
      return [row.id, fullName || composed || fallback];
    }),
  );

  const targetsRes = await admin
    .from("sales_month_targets")
    .select("month_start, manager_id, plan_amount, plan_closed_orders")
    .eq("business_id", String(currentBusiness.id))
    .in("month_start", [currentMonthStart, nextMonthStart]);
  if (targetsRes.error) throw targetsRes.error;
  const targets = (targetsRes.data ?? []) as SalesMonthTargetRow[];
  const buildParticipantsForMonth = (monthStart: string) => {
    const targetByManagerId = new Map(
      targets
        .filter(
          (row) =>
            row.month_start === monthStart && cleanText(row.manager_id),
        )
        .map((row) => [String(row.manager_id), row]),
    );
    return memberRoles
      .filter((row) => cleanText(row.user_id))
      .map((row) => {
        const id = String(row.user_id);
        const target = targetByManagerId.get(id);
        const roleLabel = upperRole(row.role);
        return {
          id,
          name: profileById.get(id) ?? id,
          role: roleLabel,
          isCurrentUser: id === user.id,
          included: Boolean(target),
          planAmount: Number(parseNumeric(target?.plan_amount).toFixed(2)),
          planClosedOrders: Math.max(
            0,
            Math.floor(parseNumeric(target?.plan_closed_orders)),
          ),
        };
      })
      .sort((a, b) => {
        if (a.role === "OWNER" && b.role !== "OWNER") return -1;
        if (a.role !== "OWNER" && b.role === "OWNER") return 1;
        return a.name.localeCompare(b.name);
      });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-transparent text-slate-900">
      <TopBar
        businessSlug={slug}
        role={role}
        currentUserName={currentUserName}
        currentUserAvatarUrl={currentUserAvatarUrl || undefined}
        businesses={businessOptions}
        businessId={String(currentBusiness.id)}
        businessHref={businessHref}
        todayHref={todayHref}
        settingsHref={settingsHref}
        adminHref={adminHref}
        clearHref={clearHref}
        hasActiveFilters={false}
        todoCount={todoCount}
        overdueCount={overdueCount}
        todayCount={todayCount}
      />

      <main className="mx-auto max-w-[1220px] overflow-x-hidden px-4 pb-8 pt-20 sm:px-6">
        <div className="hidden items-start gap-5 lg:grid lg:grid-cols-[auto_minmax(0,1fr)]">
          <div className="relative shrink-0">
            <DesktopLeftRail
              businessId={String(currentBusiness.id)}
              phoneRaw={phoneRaw}
              q=""
              statuses={[]}
              statusMode="default"
              range="ALL"
              summaryRange="thisMonth"
              startDate={null}
              endDate={null}
              actor="ALL"
              sort="default"
              actors={[]}
              currentUserId={user.id}
              hasActiveFilters={false}
              activeFiltersCount={0}
              clearHref={clearHref}
              businessHref={businessHref}
              analyticsHref={analyticsHref}
              todayHref={todayHref}
              settingsHref={settingsHref}
              adminHref={adminHref}
              canSeeAnalytics
              showFilters={false}
              activeSection="analytics"
            />
          </div>

          <div className="min-w-0 space-y-4 pl-2">
            <div className="inline-flex rounded-lg border border-[#E5E7EB] bg-white p-1">
              {(
                [
                  { key: "overview", label: "Overview" },
                  { key: "managers", label: "Managers" },
                  { key: "alerts", label: "Alerts" },
                  { key: "reports", label: "Reports" },
                  { key: "productivity", label: "Productivity" },
                  { key: "sales", label: "Sales" },
                ] as const
              ).map((tab) => (
                <a
                  key={tab.key}
                  href={makeTabHref(tab.key)}
                  className={[
                    "rounded-md px-3 py-1.5 text-[12px] font-semibold transition",
                    analyticsView === tab.key
                      ? "bg-[var(--brand-600)] text-white"
                      : "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#1F2937]",
                  ].join(" ")}
                >
                  {tab.label}
                </a>
              ))}
            </div>
            <OwnerAnalyticsPanel
              data={analyticsData}
              businessSlug={slug}
              phoneRaw={phoneRaw}
              view={analyticsView}
              managerBaseHref={managerBaseHref}
              reportFilter={{
                fromDate: reportFromDate,
                toDate: reportToDate,
                managerId: reportManagerId,
              }}
              productivityHrefs={{
                day: makeProductivityHref("day"),
                week: makeProductivityHref("week"),
                month: makeProductivityHref("month"),
              }}
              salesFilter={{
                month: salesMonth,
                managerId: salesManagerId,
              }}
              salesPlanEditor={{
                businessId: String(currentBusiness.id),
                selectedMonthStart: selectedSalesMonth,
                sections: [
                  {
                    key: "current",
                    label: "This month plan",
                    monthStart: currentMonthStart,
                    returnHref: (() => {
                      const params = new URLSearchParams();
                      if (phoneRaw) params.set("u", phoneRaw);
                      params.set("tab", "sales");
                      params.set("smonth", currentMonthStart);
                      if (salesManagerId) params.set("smanager", salesManagerId);
                      return `/b/${slug}/analytics?${params.toString()}`;
                    })(),
                    participants: buildParticipantsForMonth(currentMonthStart),
                  },
                  {
                    key: "next",
                    label: "Next month plan",
                    monthStart: nextMonthStart,
                    returnHref: (() => {
                      const params = new URLSearchParams();
                      if (phoneRaw) params.set("u", phoneRaw);
                      params.set("tab", "sales");
                      params.set("smonth", nextMonthStart);
                      if (salesManagerId) params.set("smanager", salesManagerId);
                      return `/b/${slug}/analytics?${params.toString()}`;
                    })(),
                    participants: buildParticipantsForMonth(nextMonthStart),
                  },
                ],
              }}
            />
          </div>
        </div>

        <div className="space-y-4 lg:hidden">
          <div className="inline-flex rounded-lg border border-[#E5E7EB] bg-white p-1">
            {(
              [
                { key: "overview", label: "Overview" },
                { key: "managers", label: "Managers" },
                { key: "alerts", label: "Alerts" },
                { key: "reports", label: "Reports" },
                { key: "productivity", label: "Productivity" },
                { key: "sales", label: "Sales" },
              ] as const
            ).map((tab) => (
              <a
                key={tab.key}
                href={makeTabHref(tab.key)}
                className={[
                  "rounded-md px-3 py-1.5 text-[12px] font-semibold transition",
                  analyticsView === tab.key
                    ? "bg-[var(--brand-600)] text-white"
                    : "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#1F2937]",
                ].join(" ")}
              >
                {tab.label}
              </a>
            ))}
          </div>
          <OwnerAnalyticsPanel
            data={analyticsData}
            businessSlug={slug}
            phoneRaw={phoneRaw}
            view={analyticsView}
            managerBaseHref={managerBaseHref}
            reportFilter={{
              fromDate: reportFromDate,
              toDate: reportToDate,
              managerId: reportManagerId,
            }}
            productivityHrefs={{
              day: makeProductivityHref("day"),
              week: makeProductivityHref("week"),
              month: makeProductivityHref("month"),
            }}
            salesFilter={{
              month: salesMonth,
              managerId: salesManagerId,
            }}
            salesPlanEditor={{
              businessId: String(currentBusiness.id),
              selectedMonthStart: selectedSalesMonth,
              sections: [
                {
                  key: "current",
                  label: "This month plan",
                  monthStart: currentMonthStart,
                  returnHref: (() => {
                    const params = new URLSearchParams();
                    if (phoneRaw) params.set("u", phoneRaw);
                    params.set("tab", "sales");
                    params.set("smonth", currentMonthStart);
                    if (salesManagerId) params.set("smanager", salesManagerId);
                    return `/b/${slug}/analytics?${params.toString()}`;
                  })(),
                  participants: buildParticipantsForMonth(currentMonthStart),
                },
                {
                  key: "next",
                  label: "Next month plan",
                  monthStart: nextMonthStart,
                  returnHref: (() => {
                    const params = new URLSearchParams();
                    if (phoneRaw) params.set("u", phoneRaw);
                    params.set("tab", "sales");
                    params.set("smonth", nextMonthStart);
                    if (salesManagerId) params.set("smanager", salesManagerId);
                    return `/b/${slug}/analytics?${params.toString()}`;
                  })(),
                  participants: buildParticipantsForMonth(nextMonthStart),
                },
              ],
            }}
          />
        </div>
      </main>
    </div>
  );
}
