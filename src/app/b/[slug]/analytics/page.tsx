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
  }>;
};

type MembershipRow = {
  business_id: string;
  role: string | null;
  created_at?: string | null;
  user_id?: string | null;
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
  const reportFromDate = /^\d{4}-\d{2}-\d{2}$/.test(reportFromRaw)
    ? reportFromRaw
    : "";
  const reportToDate = /^\d{4}-\d{2}-\d{2}$/.test(reportToRaw)
    ? reportToRaw
    : "";
  const reportManagerId = reportManagerRaw;
  const analyticsView:
    | "overview"
    | "managers"
    | "alerts"
    | "reports"
    | "productivity" =
    tabRaw === "managers" ||
    tabRaw === "alerts" ||
    tabRaw === "reports" ||
    tabRaw === "productivity"
      ? (tabRaw as "managers" | "alerts" | "reports" | "productivity")
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
    tab: "overview" | "managers" | "alerts" | "reports" | "productivity",
  ) => {
    const params = new URLSearchParams();
    if (phoneRaw) params.set("u", phoneRaw);
    if (tab !== "overview") params.set("tab", tab);
    if (tab === "productivity") params.set("period", productivityPeriod);
    if (reportFromDate) params.set("rfrom", reportFromDate);
    if (reportToDate) params.set("rto", reportToDate);
    if (reportManagerId) params.set("rmanager", reportManagerId);
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

  const { count: todoCountRaw } = await admin
    .from("follow_ups")
    .select("id", { count: "exact", head: true })
    .eq("business_id", String(currentBusiness.id))
    .eq("status", "open")
    .lte("due_date", getTodayDateOnly());
  const todoCount = Number(todoCountRaw ?? 0);

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
  });

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
          />
        </div>
      </main>
    </div>
  );
}
