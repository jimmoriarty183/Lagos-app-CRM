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
  type DashboardRange,
  type TrendDirection,
  type TrendTone,
} from "@/lib/order-dashboard-summary";
import { supabaseServerReadOnly } from "@/lib/supabase/server";
import {
  getDefaultVisibleStatusFilters,
  getDefaultVisibleStatuses,
  type StatusFilterValue,
  type StatusValue,
} from "@/lib/business-statuses";
import { loadBusinessStatuses } from "@/lib/business-statuses.server";
import { resolveUserDisplay } from "@/lib/user-display";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeOrderClient } from "@/lib/order-client";

function isSameStatusFilterSet(
  actual: readonly StatusFilterValue[],
  expected: readonly StatusFilterValue[],
) {
  return (
    actual.length === expected.length &&
    expected.every((status) => actual.includes(status))
  );
}

type Filters = {
  q: string;
  statuses: StatusFilterValue[];
  statusMode: "default" | "all" | "custom";
  range: DashboardRange;
  startDate: string | null;
  endDate: string | null;
  actor: string;
};

type OrderSort =
  | "default"
  | "newest"
  | "oldest"
  | "dueSoonest"
  | "dueLatest"
  | "statusAsc"
  | "statusDesc"
  | "amountHigh"
  | "amountLow";

type ViewMode = "list" | "kanban";
type HiddenKanbanCounts = {
  done: number;
  canceled: number;
  duplicate: number;
};

type SummaryPeriodOption = {
  label: string;
  shortLabel: string;
  href: string;
  active: boolean;
};

function addDays(input: Date, days: number) {
  const value = new Date(input.getTime());
  value.setDate(value.getDate() + days);
  return value;
}

function startOfMonth(input: Date) {
  const value = new Date(input.getTime());
  value.setDate(1);
  value.setHours(0, 0, 0, 0);
  return value;
}

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
    view?: string;
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
    statusMode?: string;
    sort?: string;
  };
};

type TeamActor = {
  id: string;
  label: string;
  kind: "OWNER" | "MANAGER";
};

type ActorProfileRow = {
  id: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

type ActorMembershipRow = {
  user_id: string | null;
  role: string | null;
  profiles: ActorProfileRow | ActorProfileRow[] | null;
};

type OrderListItem = any & {
  client_first_name: string;
  client_last_name: string;
  client_full_name: string;
  manager_id: string | null;
  manager_name: string | null;
  created_by_name: string | null;
  created_by_role: "OWNER" | "MANAGER" | null;
};

function unwrapJoinedProfile<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function cleanText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "";
}

function buildSafeUserFallback(userId?: string | null) {
  const id = cleanText(userId);
  if (!id) return "No name";
  return `User ${id.slice(0, 8)}`;
}

function normalizeActorLabel(input: {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  fallback?: string | null;
}) {
  const display = resolveUserDisplay({
    full_name: input.full_name ?? null,
    first_name: input.first_name ?? null,
    last_name: input.last_name ?? null,
    email: input.email ?? null,
  });

  return display.primary || cleanText(input.fallback) || "No name";
}

function getOrderManagerValue(order: { manager_id?: unknown; created_by?: unknown }) {
  const managerId = cleanText(order.manager_id);
  if (managerId) return managerId;
  const createdBy = cleanText(order.created_by);
  return createdBy || "";
}

function getClientSearchBlob(order: {
  client_name?: unknown;
  first_name?: unknown;
  last_name?: unknown;
  full_name?: unknown;
  client_full_name?: unknown;
  client_first_name?: unknown;
  client_last_name?: unknown;
}) {
  const normalized = normalizeOrderClient({
    client_name: String(order.client_name ?? order.client_full_name ?? ""),
    first_name: String(order.first_name ?? order.client_first_name ?? ""),
    last_name: String(order.last_name ?? order.client_last_name ?? ""),
    full_name: String(order.full_name ?? order.client_full_name ?? ""),
  });

  return [
    normalized.fullName,
    normalized.firstName,
    normalized.lastName,
  ]
    .filter(Boolean)
    .join(" ");
}

function formatSearchDate(value: unknown) {
  const text = cleanText(value);
  if (!text) return "";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return [
    text,
    date.toISOString(),
    date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  ]
    .filter(Boolean)
    .join(" ");
}

function getStatusSearchLabel(status: unknown) {
  return cleanText(status).replaceAll("_", " ");
}

function upperRole(r: any): "OWNER" | "MANAGER" | "GUEST" {
  const s = String(r || "").toUpperCase();
  if (s === "OWNER") return "OWNER";
  if (s === "MANAGER") return "MANAGER";
  return "GUEST";
}

function normalizeStatusFilters(
  value: string | string[] | undefined,
) {
  const normalized = (Array.isArray(value) ? value : [value])
    .flatMap((item) => String(item ?? "").split(","))
    .map((item) => item.trim().toUpperCase())
    .filter((item): item is StatusFilterValue => Boolean(item) && item !== "ALL");

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

const ORDER_SORT_OPTIONS: readonly OrderSort[] = [
  "default",
  "newest",
  "oldest",
  "dueSoonest",
  "dueLatest",
  "statusAsc",
  "statusDesc",
  "amountHigh",
  "amountLow",
] as const;

function normalizeOrderSort(value: string | undefined): OrderSort {
  return ORDER_SORT_OPTIONS.includes(value as OrderSort) ? (value as OrderSort) : "default";
}

function normalizeViewMode(value: string | undefined): ViewMode {
  return value === "kanban" ? "kanban" : "list";
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

  const customStatuses = await loadBusinessStatuses(dataClient, String(currentBusiness.id));
  const defaultVisibleStatuses = getDefaultVisibleStatuses(customStatuses);
  const defaultVisibleStatusFilters = getDefaultVisibleStatusFilters(customStatuses);

  const myRoleRaw =
    (memberships ?? []).find((m: any) => m.business_id === currentBusiness.id)?.role ??
    (bypassUser ? "MANAGER" : "GUEST");

  const userRole = upperRole(myRoleRaw);
  const canManage = userRole === "OWNER" || userRole === "MANAGER";
  const canEdit = canManage;
  const canSeeAnalyticsNav = userRole === "OWNER";
  const currentUserId = user?.id ?? null;
  let currentUserName =
    bypassUser && !user ? bypassUser : user?.email ?? (userRole === "OWNER" ? "Owner" : "User");

  if (user?.id) {
    try {
      const { data: currentProfile } = await dataClient
        .from("profiles")
        .select("full_name, first_name, last_name, email")
        .eq("id", user.id)
        .maybeSingle();

      const currentUserDisplay = resolveUserDisplay({
        full_name: currentProfile?.full_name ?? String(user.user_metadata?.full_name ?? ""),
        first_name: currentProfile?.first_name ?? String(user.user_metadata?.first_name ?? ""),
        last_name: currentProfile?.last_name ?? String(user.user_metadata?.last_name ?? ""),
        email: currentProfile?.email ?? user.email ?? null,
        phone: bypassUser || null,
      });

      currentUserName = currentUserDisplay.primary;
    } catch {
      currentUserName =
        user.email ?? (userRole === "OWNER" ? "Owner" : userRole === "MANAGER" ? "Manager" : "Guest");
    }
  }

  const phoneRaw = String(sp.u ?? "");
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

  const parsedStatuses = normalizeStatusFilters(sp.status);
  const statusMode: Filters["statusMode"] =
    String(sp.statusMode ?? "").toLowerCase() === "all"
      ? "all"
      : parsedStatuses.length > 0 &&
          !isSameStatusFilterSet(parsedStatuses, defaultVisibleStatusFilters)
        ? "custom"
        : "default";

  const filters: Filters = {
    q: String(sp.q ?? "").trim(),
    statuses: parsedStatuses,
    statusMode,
    range: rangeInput.range,
    startDate: customStartDate,
    endDate: customEndDate,
    actor: String(sp.actor ?? "ALL"),
  };
  const perPage = normalizePageSize(sp.perPage);
  const sort = normalizeOrderSort(sp.sort);
  const viewMode = normalizeViewMode(sp.view);
  const hasCustomRange = filters.range === "custom" && !!filters.startDate && !!filters.endDate;
  const rangeIsDefault = filters.range === "ALL" && !hasCustomRange;
  const isRangeFilterActive = !rangeIsDefault;
  const summaryRange = summaryRangeInput.range;

  const hasActiveFilters =
    !!filters.q ||
    filters.statusMode !== "default" ||
    isRangeFilterActive ||
    filters.actor !== "ALL";
  const activeFiltersCount = [
    filters.q ? 1 : 0,
    filters.statusMode !== "default" ? 1 : 0,
    isRangeFilterActive ? 1 : 0,
    filters.actor !== "ALL" ? 1 : 0,
  ].reduce((sum, count) => sum + count, 0);

  const clearHref = (() => {
    const params = new URLSearchParams();
    if (phoneRaw && phoneRaw.length > 0) params.set("u", phoneRaw);
    params.set("perPage", String(perPage));
    if (viewMode === "kanban") params.set("view", viewMode);
    if (summaryRange !== DEFAULT_SUMMARY_RANGE) params.set("srange", summaryRange);
    if (summaryRange === "custom" && summaryCustomStartDate) params.set("sstart", summaryCustomStartDate);
    if (summaryRange === "custom" && summaryCustomEndDate) params.set("send", summaryCustomEndDate);
    const qs = params.toString();
    return qs ? `/b/${slug}?${qs}` : `/b/${slug}`;
  })();
  const businessHref =
    phoneRaw && phoneRaw.length > 0
      ? `/b/${slug}/settings?u=${encodeURIComponent(phoneRaw)}`
      : `/b/${slug}/settings`;
  const settingsHref =
    phoneRaw && phoneRaw.length > 0
      ? `/b/${slug}/settings?u=${encodeURIComponent(phoneRaw)}`
      : `/b/${slug}/settings`;

  const makeSummaryHref = (nextSummaryRange: DashboardRange) => {
    const params = new URLSearchParams();
    if (phoneRaw && phoneRaw.length > 0) params.set("u", phoneRaw);
    params.set("perPage", String(perPage));
    if (viewMode === "kanban") params.set("view", viewMode);
    if (sort !== "default") params.set("sort", sort);
    if (filters.q) params.set("q", filters.q);
    if (filters.statusMode === "all") {
      params.set("statusMode", "all");
    } else {
      for (const status of filters.statuses) params.append("status", status);
    }
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

  const makeSummaryCustomHref = (startDate: string, endDate: string) => {
    const params = new URLSearchParams();
    if (phoneRaw && phoneRaw.length > 0) params.set("u", phoneRaw);
    params.set("perPage", String(perPage));
    if (viewMode === "kanban") params.set("view", viewMode);
    if (sort !== "default") params.set("sort", sort);
    if (filters.q) params.set("q", filters.q);
    if (filters.statusMode === "all") {
      params.set("statusMode", "all");
    } else {
      for (const status of filters.statuses) params.append("status", status);
    }
    if (filters.range !== "ALL") params.set("range", filters.range);
    if (filters.startDate) params.set("start", filters.startDate);
    if (filters.endDate) params.set("end", filters.endDate);
    if (filters.actor !== "ALL") params.set("actor", filters.actor);
    params.set("srange", "custom");
    params.set("sstart", startDate);
    params.set("send", endDate);
    const qs = params.toString();
    return qs ? `/b/${slug}?${qs}` : `/b/${slug}`;
  };

  const summaryPeriodOptions: SummaryPeriodOption[] =
    userRole === "OWNER"
      ? [
          { label: "Today", shortLabel: "Today", href: makeSummaryHref("today"), active: summaryRange === "today" },
          { label: "Yesterday", shortLabel: "Yesterday", href: makeSummaryHref("yesterday"), active: summaryRange === "yesterday" },
          { label: "This week", shortLabel: "Week", href: makeSummaryHref("thisWeek"), active: summaryRange === "thisWeek" },
          { label: "This month", shortLabel: "Month", href: makeSummaryHref("thisMonth"), active: summaryRange === "thisMonth" },
          { label: "This year", shortLabel: "Year", href: makeSummaryHref("thisYear"), active: summaryRange === "thisYear" },
          { label: "Custom range", shortLabel: "Custom", href: makeSummaryHref("custom"), active: summaryRange === "custom" },
        ]
      : [
          { label: "Today", shortLabel: "Today", href: makeSummaryHref("today"), active: summaryRange === "today" },
          { label: "Yesterday", shortLabel: "Yesterday", href: makeSummaryHref("yesterday"), active: summaryRange === "yesterday" },
          { label: "This week", shortLabel: "Week", href: makeSummaryHref("thisWeek"), active: summaryRange === "thisWeek" },
          { label: "This month", shortLabel: "Month", href: makeSummaryHref("thisMonth"), active: summaryRange === "thisMonth" },
        ];
  const summaryExtendedOptions: SummaryPeriodOption[] = [];

  let teamActors: TeamActor[] = [];
  let ownerIds: string[] = [];
  let managerIds: string[] = [];

  try {
    const adminClient = supabaseAdmin();
    const { data: primaryMemberships, error: primaryMembershipsError } = await adminClient
      .from("memberships")
      .select("user_id, role, profiles:profiles(id, full_name, first_name, last_name, email)")
      .eq("business_id", currentBusiness.id)
      .or("role.eq.OWNER,role.eq.owner,role.eq.MANAGER,role.eq.manager");

    const { data: fallbackMemberships, error: fallbackMembershipsError } = await adminClient
      .from("business_memberships")
      .select("user_id, role")
      .eq("business_id", currentBusiness.id)
      .or("role.eq.OWNER,role.eq.owner,role.eq.MANAGER,role.eq.manager");

    if (primaryMembershipsError && fallbackMembershipsError) {
      throw primaryMembershipsError || fallbackMembershipsError;
    }

    const primaryRows = ((primaryMemberships ?? []) as ActorMembershipRow[]) || [];
    const fallbackRows = (((fallbackMemberships ?? []) as { user_id: string | null; role: string | null }[]) || []).map(
      (row) => ({
        user_id: row.user_id,
        role: row.role,
        profiles: null,
      }),
    );

    const actorIds = Array.from(
      new Set(
        [...primaryRows, ...fallbackRows]
          .map((membership) => cleanText(membership.user_id))
          .filter(Boolean),
      ),
    );

    const { data: actorProfiles } = actorIds.length
      ? await adminClient
          .from("profiles")
          .select("id, full_name, first_name, last_name, email")
          .in("id", actorIds)
      : { data: [], error: null };

    const profileMap = new Map<string, ActorProfileRow>();
    for (const profile of (actorProfiles ?? []) as ActorProfileRow[]) {
      if (profile?.id) {
        profileMap.set(String(profile.id), profile);
      }
    }

    const membershipMap = new Map<string, TeamActor>();
    const allMemberships = [...primaryRows, ...fallbackRows];

    for (const membership of allMemberships) {
      const id = cleanText(membership?.user_id);
      const roleUpper = upperRole(membership?.role);
      if (!id || (roleUpper !== "OWNER" && roleUpper !== "MANAGER")) continue;

      const joinedProfile = unwrapJoinedProfile(membership.profiles);
      const profile = joinedProfile ?? profileMap.get(id) ?? null;
      let email = cleanText(profile?.email);

      if (!email) {
        try {
          const { data: authLookup } = await adminClient.auth.admin.getUserById(id);
          email = cleanText(authLookup?.user?.email);
        } catch {
          email = "";
        }
      }

      const label = normalizeActorLabel({
        full_name: profile?.full_name ?? null,
        first_name: profile?.first_name ?? null,
        last_name: profile?.last_name ?? null,
        email: email || null,
        fallback: !profile ? buildSafeUserFallback(id) : null,
      });

      membershipMap.set(`${id}:${roleUpper}`, {
        id,
        label,
        kind: roleUpper === "OWNER" ? "OWNER" : "MANAGER",
      });
    }

    teamActors = Array.from(membershipMap.values());
    ownerIds = teamActors.filter((actor) => actor.kind === "OWNER").map((actor) => actor.id);
    managerIds = teamActors.filter((actor) => actor.kind === "MANAGER").map((actor) => actor.id);
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
  const summaryQuickRanges: SummaryPeriodOption[] = [
    {
      label: "Today",
      shortLabel: "Today",
      href: makeSummaryCustomHref(todayISO, todayISO),
      active: summaryRange === "custom" && summaryCustomStartDate === todayISO && summaryCustomEndDate === todayISO,
    },
    {
      label: "Yesterday",
      shortLabel: "Yesterday",
      href: makeSummaryCustomHref(formatDateInput(addDays(now, -1)), formatDateInput(addDays(now, -1))),
      active:
        summaryRange === "custom" &&
        summaryCustomStartDate === formatDateInput(addDays(now, -1)) &&
        summaryCustomEndDate === formatDateInput(addDays(now, -1)),
    },
    {
      label: "This week",
      shortLabel: "Week",
      href: makeSummaryCustomHref(formatDateInput(addDays(now, -((now.getDay() + 6) % 7))), todayISO),
      active:
        summaryRange === "custom" &&
        summaryCustomStartDate === formatDateInput(addDays(now, -((now.getDay() + 6) % 7))) &&
        summaryCustomEndDate === todayISO,
    },
    {
      label: "This month",
      shortLabel: "Month",
      href: makeSummaryCustomHref(formatDateInput(startOfMonth(now)), todayISO),
      active:
        summaryRange === "custom" &&
        summaryCustomStartDate === formatDateInput(startOfMonth(now)) &&
        summaryCustomEndDate === todayISO,
    },
    ...(userRole === "OWNER"
      ? [{
          label: "This year",
          shortLabel: "Year",
          href: makeSummaryCustomHref(`${now.getFullYear()}-01-01`, todayISO),
          active:
            summaryRange === "custom" &&
            summaryCustomStartDate === `${now.getFullYear()}-01-01` &&
            summaryCustomEndDate === todayISO,
        } satisfies SummaryPeriodOption]
      : []),
    {
      label: "Reset",
      shortLabel: "Reset",
      href: makeSummaryHref("thisMonth"),
      active: false,
    },
  ];
  const qNeedle = String(filters.q ?? "").trim().toLowerCase();

  const actorFilteredList: any[] =
    filters.actor === "ALL"
      ? listRaw
      : filters.actor === "ME"
        ? listRaw.filter((o) => getOrderManagerValue(o) === String(currentUserId ?? ""))
        : filters.actor === "UNASSIGNED"
          ? listRaw.filter((o) => !getOrderManagerValue(o))
      : filters.actor === "OWNER"
        ? listRaw.filter((o) => ownerIds.includes(getOrderManagerValue(o)))
        : filters.actor === "MANAGER"
          ? listRaw.filter((o) => managerIds.includes(getOrderManagerValue(o)))
          : filters.actor.startsWith("user:")
            ? listRaw.filter((o) => getOrderManagerValue(o) === filters.actor.slice(5))
            : listRaw;

  const searchedList: any[] = qNeedle
    ? actorFilteredList.filter((o) => {
        const actorName = actorNameById.get(getOrderManagerValue(o)) ?? "";
        const creatorName = actorNameById.get(cleanText(o.created_by)) ?? "";
        const blob = [
          String(o.id ?? ""),
          String(o.order_number ?? ""),
          String(o.search_text ?? ""),
          getClientSearchBlob(o),
          String(o.client_phone ?? ""),
          String(o.amount ?? ""),
          `$${String(o.amount ?? "")}`,
          String(o.description ?? ""),
          actorName,
          creatorName,
          String(o.created_by ?? ""),
          getStatusSearchLabel(o.status),
          formatSearchDate(o.created_at),
          formatSearchDate(o.due_date),
        ]
          .join(" ")
          .toLowerCase();

        return blob.includes(qNeedle);
      })
    : actorFilteredList;

  const applyStatusFilter = (rows: any[]) =>
    filters.statusMode === "all"
      ? rows
      : filters.statuses.length === 0
        ? rows.filter(
            (o) =>
              defaultVisibleStatuses.includes(String(o.status ?? "") as StatusValue) ||
              isOrderOverdue(o, todayISO),
          )
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
  const kanbanHiddenCounts: HiddenKanbanCounts = {
    done: currentPeriodRows.filter((order) => order.status === "DONE").length,
    canceled: currentPeriodRows.filter((order) => order.status === "CANCELED").length,
    duplicate: currentPeriodRows.filter((order) => order.status === "DUPLICATE").length,
  };
  const summaryCurrentRows = filterOrdersByCreatedAt(listRaw, summaryPeriod.current);
  const previousPeriodRows = summaryPeriod.previous
    ? filterOrdersByCreatedAt(listRaw, summaryPeriod.previous)
    : [];

  const actorKindById = new Map<string, "OWNER" | "MANAGER">();
  for (const actor of teamActors) {
    if (actor?.id) actorKindById.set(String(actor.id), actor.kind);
  }

  const filteredRows = [...applyStatusFilter(currentPeriodRows)];
  const sortedRows = sort === "default" ? filteredRows : filteredRows.sort((a, b) => {
    const createdA = new Date(String(a.created_at ?? "")).getTime();
    const createdB = new Date(String(b.created_at ?? "")).getTime();
    const dueA = a.due_date ? new Date(String(a.due_date)).getTime() : null;
    const dueB = b.due_date ? new Date(String(b.due_date)).getTime() : null;
    const amountA = Number(a.amount ?? 0);
    const amountB = Number(b.amount ?? 0);
    const statusA = getStatusSearchLabel(a.status).toLowerCase();
    const statusB = getStatusSearchLabel(b.status).toLowerCase();

    switch (sort) {
      case "oldest":
        return createdA - createdB;
      case "dueSoonest":
        if (dueA === null && dueB === null) return createdB - createdA;
        if (dueA === null) return 1;
        if (dueB === null) return -1;
        return dueA - dueB || createdB - createdA;
      case "dueLatest":
        if (dueA === null && dueB === null) return createdB - createdA;
        if (dueA === null) return 1;
        if (dueB === null) return -1;
        return dueB - dueA || createdB - createdA;
      case "statusAsc":
        return statusA.localeCompare(statusB) || createdB - createdA;
      case "statusDesc":
        return statusB.localeCompare(statusA) || createdB - createdA;
      case "amountHigh":
        return amountB - amountA || createdB - createdA;
      case "amountLow":
        return amountA - amountB || createdB - createdA;
      case "newest":
      default:
        return createdB - createdA;
    }
  });

  const list: OrderListItem[] = sortedRows.map((order) => {
    const client = normalizeOrderClient({
      client_name: order.client_name,
      first_name: order.first_name,
      last_name: order.last_name,
      full_name: order.full_name,
    });
    const creatorId = cleanText(order.created_by);

    return {
      ...order,
      client_first_name: client.firstName,
      client_last_name: client.lastName,
      client_full_name: client.fullName,
      manager_id: order.manager_id
        ? String(order.manager_id)
        : order.created_by
          ? String(order.created_by)
          : null,
      manager_name:
        actorNameById.get(String(order.manager_id ?? "")) ||
        actorNameById.get(String(order.created_by ?? "")) ||
        null,
      created_by_name: actorNameById.get(creatorId) || null,
      created_by_role: actorKindById.get(creatorId) ?? null,
    };
  });
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
        mode: "percent",
        improvement: "up",
        zeroPreviousBehavior: "absolute",
        formatAbsoluteValue: fmtSignedCount,
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
        mode: "percent",
        improvement: "down",
        zeroPreviousBehavior: "absolute",
        formatAbsoluteValue: fmtSignedCount,
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
        currentUserName={currentUserName}
        businesses={businessOptions}
        businessHref={businessHref}
        settingsHref={settingsHref}
        clearHref={clearHref}
        hasActiveFilters={hasActiveFilters}
      />

      <main
        className={[
          "overflow-x-hidden px-4 pb-8 pt-20 sm:px-6",
          viewMode === "kanban" ? "mx-0 max-w-none" : "mx-auto max-w-[1220px]",
        ].join(" ")}
      >
        <div className="hidden items-start lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-5">
          <DesktopLeftRail
            key={`desktop-rail-${filters.range}-${filters.startDate ?? ""}-${filters.endDate ?? ""}`}
            businessId={String(currentBusiness.id)}
            phoneRaw={phoneRaw}
            q={filters.q}
            statuses={filters.statuses}
            range={filters.range}
            summaryRange={summaryRange}
            startDate={filters.startDate}
            endDate={filters.endDate}
            actor={filters.actor}
            statusMode={filters.statusMode}
            actors={teamActors}
            currentUserId={currentUserId}
            hasActiveFilters={hasActiveFilters}
            activeFiltersCount={activeFiltersCount}
            clearHref={clearHref}
            businessHref={businessHref}
            settingsHref={settingsHref}
            canSeeAnalytics={canSeeAnalyticsNav}
            layoutMode={viewMode}
          />

          <div className="min-w-0 space-y-4">
            {viewMode === "list" ? (
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
                  resetHref: makeSummaryHref("thisMonth"),
                  quickOptions: summaryQuickRanges,
                  phoneRaw,
                  tableQuery: {
                    q: filters.q,
                    sort,
                    statuses: filters.statuses,
                    range: filters.range,
                    startDate: filters.startDate,
                    endDate: filters.endDate,
                    actor: filters.actor,
                  },
                }}
              />
            ) : null}

            {viewMode === "list" ? (
              <DesktopCreateOrderAccordion
                businessId={String(currentBusiness.id)}
                businessSlug={String(currentBusiness.slug)}
              />
            ) : null}

            <DesktopOrdersTable
              key={`desktop-orders-${viewMode}-${filters.q}-${filters.statuses.join(",")}-${filters.actor}-${filters.range}-${filters.startDate ?? ""}-${filters.endDate ?? ""}-${sort}`}
              list={paginatedList}
              todayISO={todayISO}
              businessSlug={String(currentBusiness.slug)}
              businessId={String(currentBusiness.id)}
              phoneRaw={phoneRaw}
              searchQuery={filters.q}
              sort={sort}
              initialViewMode={viewMode}
              statusMode={filters.statusMode}
              statusFilter={filters.statusMode === "all" ? [] : filters.statuses}
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
              hiddenKanbanCounts={kanbanHiddenCounts}
              canManage={canManage}
              canEdit={canEdit}
              userRole={userRole}
              actors={teamActors}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
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
                sort,
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
            businessId={String(currentBusiness.id)}
            phoneRaw={phoneRaw}
            filters={filters}
            statusMode={filters.statusMode}
            summaryRange={summaryRange}
            clearHref={clearHref}
            hasActiveFilters={hasActiveFilters}
            actor={filters.actor}
            actors={teamActors}
          />
          <MobileOrdersList
            key={`mobile-orders-${filters.q}-${filters.statuses.join(",")}-${filters.actor}-${filters.range}-${filters.startDate ?? ""}-${filters.endDate ?? ""}-${sort}`}
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
            currentUserName={currentUserName}
            searchQuery={filters.q}
            sort={sort}
            statusMode={filters.statusMode}
            statusFilter={filters.statusMode === "all" ? [] : filters.statuses}
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
