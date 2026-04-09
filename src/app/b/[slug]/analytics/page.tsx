import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import ClientPeriodForm from "./ClientPeriodForm";
import DesktopLeftRail from "@/app/b/[slug]/_components/Desktop/DesktopLeftRail";
import OwnerAnalyticsPanel from "@/app/b/[slug]/_components/Desktop/OwnerAnalyticsPanel";
import type { BusinessOption } from "@/app/b/[slug]/_components/topbar/BusinessSwitcher";
import TopBar from "@/app/b/[slug]/_components/topbar/TopBar";
import { getAdminUsersPath, isAdminEmail } from "@/lib/admin-access";
import { getTodayDateOnly } from "@/lib/follow-ups";
import {
  loadOwnerDashboardData,
  type OwnerDashboardData,
} from "@/lib/owner-dashboard";
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
    cmode?: string;
    cmonth?: string;
    cyear?: string;
    cfrom?: string;
    cto?: string;
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

type ClientRow = {
  id: string;
  client_type: "individual" | "company";
  display_name: string;
  is_archived: boolean;
};

type IndividualProfileRow = {
  client_id: string;
  first_name: string | null;
  last_name: string | null;
};

type CompanyProfileRow = {
  client_id: string;
  company_name: string | null;
};

type CurrentAssignmentRow = {
  client_id: string;
  manager_id: string | null;
};

type ClientOrderRow = {
  client_id: string | null;
  amount: number | string | null;
  status: string | null;
  created_at: string;
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

function isTurnoverEligibleStatus(status: string | null | undefined) {
  const normalized = cleanText(status).toUpperCase();
  return !(
    normalized === "DEL" ||
    normalized === "DELETED" ||
    normalized === "CANCELLED" ||
    normalized === "CANCELED"
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value: string | null | undefined) {
  const text = cleanText(value);
  if (!text) return "—";
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;
  return parsed.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function parseDateOnly(value: string | undefined) {
  const text = cleanText(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function createEmptyOwnerDashboardData(): OwnerDashboardData {
  const today = getTodayDateOnly();
  return {
    summary: {
      active_tasks: 0,
      overdue_tasks: 0,
      due_7d: 0,
      on_time_completion_pct: null,
      team_workload_pct: 0,
      managers_at_risk: 0,
      generated_at: new Date().toISOString(),
    },
    deadline_control: {
      traffic_bar: {
        on_track: 0,
        at_risk: 0,
        overdue: 0,
        no_deadline: 0,
      },
      top_overdue_tasks: [],
    },
    managers: [],
    alerts: [],
    reports: [],
    productivity: {
      period: "week",
      start_date: today,
      end_date: today,
      team_closed_orders: 0,
      team_closed_followups: 0,
      team_total_closed: 0,
      managers: [],
    },
    sales: {
      period: "month",
      start_date: today,
      end_date: today,
      days_elapsed: 0,
      days_total: 0,
      selected_manager_id: null,
      team_plan_amount: 0,
      team_actual_amount: 0,
      team_forecast_amount: 0,
      team_plan_closed_orders: 0,
      team_closed_orders: 0,
      team_forecast_closed_orders: 0,
      achievement_pct: 0,
      forecast_achievement_pct: 0,
      forecast_gap_pct: 0,
      avg_deal_size: 0,
      managers: [],
    },
  };
}

const ANALYTICS_TABS = [
  { key: "overview", label: "Overview" },
  { key: "managers", label: "Managers" },
  { key: "alerts", label: "Alerts" },
  { key: "reports", label: "Reports" },
  { key: "productivity", label: "Productivity" },
  { key: "sales", label: "Sales" },
  { key: "clientManagers", label: "Client managers" },
  { key: "clients", label: "Clients" },
] as const;

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
  const clientModeRaw = cleanText(sp?.cmode).toLowerCase();
  const clientMonthRaw = cleanText(sp?.cmonth);
  const clientYearRaw = cleanText(sp?.cyear);
  const clientFromRaw = cleanText(sp?.cfrom);
  const clientToRaw = cleanText(sp?.cto);
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
    | "sales"
    | "clientManagers"
    | "clients" =
    tabRaw === "managers" ||
    tabRaw === "alerts" ||
    tabRaw === "reports" ||
    tabRaw === "productivity" ||
    tabRaw === "sales" ||
    tabRaw === "client-managers" ||
    tabRaw === "clients"
      ? ((tabRaw === "client-managers" ? "clientManagers" : tabRaw) as
          | "managers"
          | "alerts"
          | "reports"
          | "productivity"
          | "sales"
          | "clientManagers"
          | "clients")
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
      | "sales"
      | "clientManagers"
      | "clients",
  ) => {
    const params = new URLSearchParams();
    if (phoneRaw) params.set("u", phoneRaw);
    if (tab !== "overview") {
      params.set("tab", tab === "clientManagers" ? "client-managers" : tab);
    }
    if (tab === "productivity") params.set("period", productivityPeriod);
    if (reportFromDate) params.set("rfrom", reportFromDate);
    if (reportToDate) params.set("rto", reportToDate);
    if (reportManagerId) params.set("rmanager", reportManagerId);
    if (salesMonth) params.set("smonth", salesMonth);
    if (salesManagerId) params.set("smanager", salesManagerId);
    if (clientModeRaw) params.set("cmode", clientModeRaw);
    if (clientMonthRaw) params.set("cmonth", clientMonthRaw);
    if (clientYearRaw) params.set("cyear", clientYearRaw);
    if (clientFromRaw) params.set("cfrom", clientFromRaw);
    if (clientToRaw) params.set("cto", clientToRaw);
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
  const makeClientAnalyticsHref = (overrides: {
    mode?: "month" | "custom";
    month?: string;
    year?: string;
    from?: string;
    to?: string;
  }) => {
    const params = new URLSearchParams();
    if (phoneRaw) params.set("u", phoneRaw);
    params.set(
      "tab",
      analyticsView === "clients" ? "clients" : "client-managers",
    );
    const mode = overrides.mode ?? clientMode;
    params.set("cmode", mode);
    const monthValue = overrides.month ?? String(parsedClientMonth);
    const yearValue = overrides.year ?? String(parsedClientYear);
    if (mode === "month") {
      params.set("cmonth", monthValue);
      params.set("cyear", yearValue);
      params.delete("cfrom");
      params.delete("cto");
    } else {
      const fromValue = overrides.from ?? customFrom;
      const toValue = overrides.to ?? customTo;
      if (fromValue) params.set("cfrom", fromValue);
      if (toValue) params.set("cto", toValue);
      params.set("cmonth", monthValue);
      params.set("cyear", yearValue);
    }
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

  let analyticsData: OwnerDashboardData;
  try {
    analyticsData = await loadOwnerDashboardData(admin, {
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
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : String((error as { message?: unknown } | null)?.message ?? "unknown");
    console.error("[analytics] failed to load owner dashboard data", {
      businessId: String(currentBusiness.id),
      error: message,
    });
    analyticsData = createEmptyOwnerDashboardData();
  }

  const memberRolesRes = await admin
    .from("memberships")
    .select("user_id, role")
    .eq("business_id", String(currentBusiness.id));
  if (memberRolesRes.error) {
    console.error("[analytics] memberships roles query failed", {
      businessId: String(currentBusiness.id),
      error: memberRolesRes.error.message,
    });
  }

  const memberRoles = ((memberRolesRes.data ?? []) as MemberRoleRow[]).filter(
    (row) => {
      const role = upperRole(row.role);
      return role === "OWNER" || role === "MANAGER";
    },
  );
  const memberIds = Array.from(
    new Set(memberRoles.map((row) => cleanText(row.user_id)).filter(Boolean)),
  );
  let memberProfiles: ProfileLookupRow[] = [];
  if (memberIds.length > 0) {
    const profilesRes = await admin
      .from("profiles")
      .select("id, full_name, first_name, last_name, email")
      .in("id", memberIds);
    if (profilesRes.error) {
      console.error("[analytics] profiles lookup failed", {
        businessId: String(currentBusiness.id),
        error: profilesRes.error.message,
      });
    } else {
      memberProfiles = (profilesRes.data ?? []) as ProfileLookupRow[];
    }
  }
  const profileById = new Map(
    memberProfiles.map((row) => {
      const fullName = cleanText(row.full_name);
      const composed =
        `${cleanText(row.first_name)} ${cleanText(row.last_name)}`.trim();
      const fallback = cleanText(row.email) || row.id;
      return [row.id, fullName || composed || fallback];
    }),
  );

  const targetsRes = await admin
    .from("sales_month_targets")
    .select("month_start, manager_id, plan_amount, plan_closed_orders")
    .eq("business_id", String(currentBusiness.id))
    .in("month_start", [currentMonthStart, nextMonthStart]);
  if (targetsRes.error) {
    console.error("[analytics] sales month targets query failed", {
      businessId: String(currentBusiness.id),
      error: targetsRes.error.message,
    });
  }
  const targets = (targetsRes.data ?? []) as SalesMonthTargetRow[];
  const buildParticipantsForMonth = (monthStart: string) => {
    const targetByManagerId = new Map(
      targets
        .filter(
          (row) => row.month_start === monthStart && cleanText(row.manager_id),
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

  const now = new Date();
  const parsedClientMonthCandidate = Number(clientMonthRaw || now.getMonth() + 1);
  const parsedClientYearCandidate = Number(clientYearRaw || now.getFullYear());
  const parsedClientMonth =
    Number.isFinite(parsedClientMonthCandidate) &&
    parsedClientMonthCandidate >= 1 &&
    parsedClientMonthCandidate <= 12
      ? Math.floor(parsedClientMonthCandidate)
      : now.getMonth() + 1;
  const parsedClientYear =
    Number.isFinite(parsedClientYearCandidate) &&
    parsedClientYearCandidate >= 2000 &&
    parsedClientYearCandidate <= 2100
      ? Math.floor(parsedClientYearCandidate)
      : now.getFullYear();
  const clientMode = clientModeRaw === "custom" ? "custom" : "month";
  const defaultStart = new Date(parsedClientYear, parsedClientMonth - 1, 1);
  const defaultEndExclusive = new Date(parsedClientYear, parsedClientMonth, 1);
  const customFrom = parseDateOnly(clientFromRaw);
  const customTo = parseDateOnly(clientToRaw);
  const clientRangeStartIso =
    clientMode === "custom" && customFrom
      ? `${customFrom}T00:00:00.000Z`
      : defaultStart.toISOString();
  const clientRangeEndIso =
    clientMode === "custom" && customTo
      ? new Date(
          new Date(`${customTo}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000,
        ).toISOString()
      : defaultEndExclusive.toISOString();
  const clientRangeLabel =
    clientMode === "custom" && customFrom && customTo
      ? `${customFrom} — ${customTo}`
      : defaultStart.toLocaleDateString("en-GB", {
          month: "long",
          year: "numeric",
        });

  const clientsRes = await admin
    .from("clients")
    .select("id, client_type, display_name, is_archived")
    .eq("business_id", String(currentBusiness.id))
    .eq("is_archived", false);
  if (clientsRes.error) {
    console.error("[analytics] clients query failed", {
      businessId: String(currentBusiness.id),
      error: clientsRes.error.message,
    });
  }
  const clients = (clientsRes.data ?? []) as ClientRow[];
  const clientIds = clients.map((entry) => entry.id);
  const [indProfilesRes, compProfilesRes, assignmentsRes] = await Promise.all([
    clientIds.length > 0
      ? admin
          .from("client_individual_profiles")
          .select("client_id, first_name, last_name")
          .in("client_id", clientIds)
      : Promise.resolve({ data: [], error: null }),
    clientIds.length > 0
      ? admin
          .from("client_company_profiles")
          .select("client_id, company_name")
          .in("client_id", clientIds)
      : Promise.resolve({ data: [], error: null }),
    clientIds.length > 0
      ? admin
          .from("client_manager_assignments")
          .select("client_id, manager_id")
          .is("unassigned_at", null)
          .in("client_id", clientIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (indProfilesRes.error) {
    console.error("[analytics] individual profiles query failed", {
      businessId: String(currentBusiness.id),
      error: indProfilesRes.error.message,
    });
  }
  if (compProfilesRes.error) {
    console.error("[analytics] company profiles query failed", {
      businessId: String(currentBusiness.id),
      error: compProfilesRes.error.message,
    });
  }
  if (assignmentsRes.error) {
    console.error("[analytics] client assignments query failed", {
      businessId: String(currentBusiness.id),
      error: assignmentsRes.error.message,
    });
  }

  const individualByClientId = new Map(
    ((indProfilesRes.data ?? []) as IndividualProfileRow[]).map((entry) => [
      entry.client_id,
      entry,
    ]),
  );
  const companyByClientId = new Map(
    ((compProfilesRes.data ?? []) as CompanyProfileRow[]).map((entry) => [
      entry.client_id,
      entry,
    ]),
  );
  const assignmentByClientId = new Map(
    ((assignmentsRes.data ?? []) as CurrentAssignmentRow[]).map((entry) => [
      entry.client_id,
      entry,
    ]),
  );

  const scopedClientRows = clients
    .map((client) => {
      const assignment = assignmentByClientId.get(client.id) ?? null;
      const managerId = cleanText(assignment?.manager_id) || null;
      const managerName = managerId
        ? profileById.get(managerId) || managerId
        : "Unassigned";
      const individual = individualByClientId.get(client.id) ?? null;
      const company = companyByClientId.get(client.id) ?? null;
      const displayName =
        client.client_type === "company"
          ? cleanText(company?.company_name) || cleanText(client.display_name)
          : `${cleanText(individual?.first_name)} ${cleanText(individual?.last_name)}`.trim() ||
            cleanText(client.display_name);
      return {
        id: client.id,
        type: client.client_type,
        managerId,
        managerName,
        displayName: displayName || "Unnamed client",
      };
    })
    .filter((entry) => (role === "OWNER" ? true : entry.managerId === user.id));

  const scopedClientIds = scopedClientRows.map((entry) => entry.id);
  const clientOrdersRes =
    scopedClientIds.length > 0
      ? await admin
          .from("orders")
          .select("client_id, amount, status, created_at")
          .eq("business_id", String(currentBusiness.id))
          .in("client_id", scopedClientIds)
          .gte("created_at", clientRangeStartIso)
          .lt("created_at", clientRangeEndIso)
      : { data: [], error: null };
  if (clientOrdersRes.error) {
    console.error("[analytics] client orders query failed", {
      businessId: String(currentBusiness.id),
      error: clientOrdersRes.error.message,
    });
  }
  const clientOrders = (clientOrdersRes.data ?? []) as ClientOrderRow[];
  const ordersByClientId = new Map<string, ClientOrderRow[]>();
  for (const order of clientOrders) {
    const clientId = cleanText(order.client_id);
    if (!clientId) continue;
    if (!isTurnoverEligibleStatus(order.status)) continue;
    const current = ordersByClientId.get(clientId) ?? [];
    current.push(order);
    ordersByClientId.set(clientId, current);
  }

  const clientMetrics = scopedClientRows.map((entry) => {
    const linked = ordersByClientId.get(entry.id) ?? [];
    const turnover = linked.reduce(
      (sum, row) => sum + Number(row.amount ?? 0),
      0,
    );
    const ordersCount = linked.length;
    const averageCheck = ordersCount > 0 ? turnover / ordersCount : 0;
    const lastOrderDate =
      linked
        .map((row) => cleanText(row.created_at))
        .sort((a, b) => (a > b ? -1 : 1))[0] || null;
    return {
      ...entry,
      turnover,
      ordersCount,
      averageCheck,
      lastOrderDate,
    };
  });

  const totalClientTurnover = clientMetrics.reduce(
    (sum, entry) => sum + entry.turnover,
    0,
  );
  const totalClientOrders = clientMetrics.reduce(
    (sum, entry) => sum + entry.ordersCount,
    0,
  );
  const clientAverageOrderValue =
    totalClientOrders > 0 ? totalClientTurnover / totalClientOrders : 0;
  const totalClientsCount = clientMetrics.length;
  const totalCompanyCount = clientMetrics.filter(
    (entry) => entry.type === "company",
  ).length;
  const totalIndividualCount = clientMetrics.filter(
    (entry) => entry.type === "individual",
  ).length;

  const managerClientMetrics = Array.from(
    new Set(
      clientMetrics.map((entry) => cleanText(entry.managerId)).filter(Boolean),
    ),
  ).map((managerId) => {
    const items = clientMetrics.filter(
      (entry) => cleanText(entry.managerId) === managerId,
    );
    const turnover = items.reduce((sum, entry) => sum + entry.turnover, 0);
    const ordersCount = items.reduce(
      (sum, entry) => sum + entry.ordersCount,
      0,
    );
    return {
      managerId,
      managerName: profileById.get(managerId) || managerId,
      totalClients: items.length,
      individualClients: items.filter((entry) => entry.type === "individual")
        .length,
      companyClients: items.filter((entry) => entry.type === "company").length,
      ordersCount,
      turnover,
      averageCheck: ordersCount > 0 ? turnover / ordersCount : 0,
    };
  });

  const oldAnalyticsView =
    analyticsView === "clientManagers" || analyticsView === "clients"
      ? "overview"
      : analyticsView;
  const clientMonthOptions = Array.from({ length: 12 }, (_, index) => {
    const value = index + 1;
    return {
      value: String(value),
      label: new Date(2026, index, 1).toLocaleDateString("en-GB", {
        month: "long",
      }),
    };
  });
  const thisYear = new Date().getFullYear();
  const clientYearOptions = [
    thisYear - 2,
    thisYear - 1,
    thisYear,
    thisYear + 1,
  ];

  const renderClientPeriodControls = (): ReactNode => (
    <ClientPeriodForm
      phoneRaw={phoneRaw}
      tab={analyticsView === "clients" ? "clients" : "client-managers"}
      initialMode={clientMode}
      parsedClientMonth={parsedClientMonth}
      parsedClientYear={parsedClientYear}
      clientMonthOptions={clientMonthOptions}
      clientYearOptions={clientYearOptions}
      customFrom={customFrom}
      customTo={customTo}
      clientRangeLabel={clientRangeLabel}
      currentMonthHref={makeClientAnalyticsHref({
        mode: "month",
        month: String(new Date().getMonth() + 1),
        year: String(new Date().getFullYear()),
      })}
    />
  );

  const renderClientManagersAnalytics = (): ReactNode => {
    const managersSorted = [...managerClientMetrics].sort(
      (a, b) => b.turnover - a.turnover,
    );
    const managersWithClients = managersSorted.length;
    return (
      <div className="space-y-4">
        {renderClientPeriodControls()}
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-xs font-medium text-[#667085]">
              Managers with clients
            </div>
            <div className="mt-1 text-xl font-semibold text-[#111827]">
              {managersWithClients}
            </div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-xs font-medium text-[#667085]">
              Total assigned clients
            </div>
            <div className="mt-1 text-xl font-semibold text-[#111827]">
              {totalClientsCount}
            </div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-xs font-medium text-[#667085]">Turnover</div>
            <div className="mt-1 text-xl font-semibold text-[#111827]">
              {formatMoney(totalClientTurnover)}
            </div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-xs font-medium text-[#667085]">
              Average order value
            </div>
            <div className="mt-1 text-xl font-semibold text-[#111827]">
              {formatMoney(clientAverageOrderValue)}
            </div>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#F9FAFB] text-left text-xs font-semibold uppercase tracking-wide text-[#667085]">
                <tr>
                  <th className="px-4 py-3">Manager</th>
                  <th className="px-4 py-3">Clients</th>
                  <th className="px-4 py-3">Individual</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Orders</th>
                  <th className="px-4 py-3">Turnover</th>
                  <th className="px-4 py-3">Average check</th>
                </tr>
              </thead>
              <tbody>
                {managersSorted.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-[#667085]"
                    >
                      No manager/client data for selected period.
                    </td>
                  </tr>
                ) : (
                  managersSorted.map((entry) => (
                    <tr
                      key={entry.managerId}
                      className="border-t border-[#E5E7EB]"
                    >
                      <td className="px-4 py-3 font-medium text-[#111827]">
                        {entry.managerName}
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {entry.totalClients}
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {entry.individualClients}
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {entry.companyClients}
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {entry.ordersCount}
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {formatMoney(entry.turnover)}
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {formatMoney(entry.averageCheck)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderClientsAnalytics = (): ReactNode => {
    const topClients = [...clientMetrics]
      .sort((a, b) => b.turnover - a.turnover)
      .slice(0, 10);
    return (
      <div className="space-y-4">
        {renderClientPeriodControls()}
        <div className="grid gap-3 md:grid-cols-5">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-xs font-medium text-[#667085]">
              Total clients
            </div>
            <div className="mt-1 text-xl font-semibold text-[#111827]">
              {totalClientsCount}
            </div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-xs font-medium text-[#667085]">Individual</div>
            <div className="mt-1 text-xl font-semibold text-[#111827]">
              {totalIndividualCount}
            </div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-xs font-medium text-[#667085]">Company</div>
            <div className="mt-1 text-xl font-semibold text-[#111827]">
              {totalCompanyCount}
            </div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-xs font-medium text-[#667085]">Turnover</div>
            <div className="mt-1 text-xl font-semibold text-[#111827]">
              {formatMoney(totalClientTurnover)}
            </div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-xs font-medium text-[#667085]">
              Average order value
            </div>
            <div className="mt-1 text-xl font-semibold text-[#111827]">
              {formatMoney(clientAverageOrderValue)}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <h3 className="text-sm font-semibold text-[#111827]">
              Client type distribution
            </h3>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <div className="mb-1 flex items-center justify-between text-[#475467]">
                  <span>Individual</span>
                  <span>{totalIndividualCount}</span>
                </div>
                <div className="h-2 rounded-full bg-[#EEF2FF]">
                  <div
                    className="h-2 rounded-full bg-[var(--brand-600)]"
                    style={{
                      width: `${totalClientsCount > 0 ? (totalIndividualCount / totalClientsCount) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-[#475467]">
                  <span>Company</span>
                  <span>{totalCompanyCount}</span>
                </div>
                <div className="h-2 rounded-full bg-[#EEF2FF]">
                  <div
                    className="h-2 rounded-full bg-[#7C8BEF]"
                    style={{
                      width: `${totalClientsCount > 0 ? (totalCompanyCount / totalClientsCount) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <h3 className="text-sm font-semibold text-[#111827]">
              Top clients by turnover
            </h3>
            <div className="mt-3 space-y-2">
              {topClients.length === 0 ? (
                <div className="text-sm text-[#667085]">
                  No data for selected period.
                </div>
              ) : (
                topClients.map((client, index) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between rounded-lg border border-[#EAECF0] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-[#111827]">
                        {index + 1}. {client.displayName}
                      </div>
                      <div className="text-xs text-[#667085]">
                        {client.managerName}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-[#111827]">
                      {formatMoney(client.turnover)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#F9FAFB] text-left text-xs font-semibold uppercase tracking-wide text-[#667085]">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Manager</th>
                  <th className="px-4 py-3">Orders</th>
                  <th className="px-4 py-3">Turnover</th>
                  <th className="px-4 py-3">Average check</th>
                  <th className="px-4 py-3">Last order</th>
                </tr>
              </thead>
              <tbody>
                {[...clientMetrics]
                  .sort((a, b) => b.turnover - a.turnover)
                  .map((entry) => (
                    <tr key={entry.id} className="border-t border-[#E5E7EB]">
                      <td className="px-4 py-3 font-medium text-[#111827]">
                        {entry.displayName}
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {entry.type === "company" ? "Company" : "Individual"}
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {entry.managerName}
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {entry.ordersCount}
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {formatMoney(entry.turnover)}
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {formatMoney(entry.averageCheck)}
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {entry.lastOrderDate
                          ? formatDate(entry.lastOrderDate)
                          : "-"}
                      </td>
                    </tr>
                  ))}
                {clientMetrics.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-[#667085]"
                    >
                      No client data for selected period.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
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
              {ANALYTICS_TABS.map((tab) => (
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
            {analyticsView === "clientManagers" ? (
              renderClientManagersAnalytics()
            ) : analyticsView === "clients" ? (
              renderClientsAnalytics()
            ) : (
              <OwnerAnalyticsPanel
                data={analyticsData}
                businessSlug={slug}
                phoneRaw={phoneRaw}
                view={oldAnalyticsView}
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
                        if (salesManagerId)
                          params.set("smanager", salesManagerId);
                        return `/b/${slug}/analytics?${params.toString()}`;
                      })(),
                      participants:
                        buildParticipantsForMonth(currentMonthStart),
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
                        if (salesManagerId)
                          params.set("smanager", salesManagerId);
                        return `/b/${slug}/analytics?${params.toString()}`;
                      })(),
                      participants: buildParticipantsForMonth(nextMonthStart),
                    },
                  ],
                }}
              />
            )}
          </div>
        </div>

        <div className="space-y-4 lg:hidden">
          <div className="inline-flex rounded-lg border border-[#E5E7EB] bg-white p-1">
            {ANALYTICS_TABS.map((tab) => (
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
          {analyticsView === "clientManagers" ? (
            renderClientManagersAnalytics()
          ) : analyticsView === "clients" ? (
            renderClientsAnalytics()
          ) : (
            <OwnerAnalyticsPanel
              data={analyticsData}
              businessSlug={slug}
              phoneRaw={phoneRaw}
              view={oldAnalyticsView}
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
                      if (salesManagerId)
                        params.set("smanager", salesManagerId);
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
                      if (salesManagerId)
                        params.set("smanager", salesManagerId);
                      return `/b/${slug}/analytics?${params.toString()}`;
                    })(),
                    participants: buildParticipantsForMonth(nextMonthStart),
                  },
                ],
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
