import { redirect } from "next/navigation";

import DesktopLeftRail from "@/app/b/[slug]/_components/Desktop/DesktopLeftRail";
import type { BusinessOption } from "@/app/b/[slug]/_components/topbar/BusinessSwitcher";
import { StartDayNudge } from "@/app/b/[slug]/_components/topbar/StartDayNudge";
import TopBar from "@/app/b/[slug]/_components/topbar/TopBar";
import { TodoWorkspaceView } from "@/app/b/[slug]/today/TodoWorkspaceView";
import type { TodayFollowUpItem } from "@/app/b/[slug]/today/TodayFollowUpsView";
import type { ManagerMonthlyPlanProgress } from "@/app/b/[slug]/today/TodayFollowUpsView";
import type { TodoCalendarItem } from "@/app/b/[slug]/today/todo-calendar/types";
import { inferFollowUpSubtype } from "@/app/b/[slug]/today/todo-calendar/utils";
import { getAdminUsersPath, isAdminEmail } from "@/lib/admin-access";
import {
  getStatusLabel,
  isTerminalStatus,
  type StatusFilterValue,
} from "@/lib/business-statuses";
import { resolveUserDisplay } from "@/lib/user-display";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServerReadOnly } from "@/lib/supabase/server";
import {
  compareDateOnly,
  getTodayDateOnly,
  getTomorrowDateOnly,
  type FollowUpRow,
} from "@/lib/follow-ups";
import { isFollowUpAllDay, getFollowUpStartsAt } from "@/lib/follow-ups";
import { ensureWorkspaceForBusiness } from "@/lib/workspaces";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    u?: string;
    mode?: string;
  }>;
};

type MembershipRow = {
  business_id: string;
  role: string | null;
};

type BusinessRow = {
  id: string;
  slug: string;
  name: string | null;
  plan: string | null;
};

type ProfileRow = {
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url?: string | null;
};

type OrderLookupRow = {
  id: string;
  order_number: number | null;
  client_name: string | null;
  resolved_client_display_name?: string | null;
  due_date?: string | null;
  status?: string | null;
  created_at?: string;
};

type CalendarOrderOption = {
  id: string;
  label: string;
};

type WorkDayLookupRow = {
  status: string | null;
};

type ChecklistCalendarRow = {
  id: string;
  order_id: string;
  title: string;
  due_date: string | null;
  is_done: boolean;
  created_at: string;
};

type SalesMonthTargetRow = {
  plan_amount: number | string | null;
  plan_closed_orders: number | string | null;
};

type SalesMonthOrderRow = {
  amount: number | string | null;
  status: string | null;
  updated_at: string | null;
};

type EnrichedSalesMonthOrderRow = SalesMonthOrderRow & {
  legacy_order_manager_id?: string | null;
};

function isSchemaMissingError(error: { message?: string } | null | undefined) {
  const msg = String(error?.message ?? "").toLowerCase();
  return (
    (msg.includes("schema cache") && msg.includes("could not find")) ||
    (msg.includes("column") && msg.includes("does not exist")) ||
    (msg.includes("relation") && msg.includes("does not exist"))
  );
}

function hasMeaningfulErrorPayload(error: unknown) {
  if (!error) return false;
  if (typeof error === "string") return error.trim().length > 0;
  if (typeof error !== "object") return true;

  const record = error as Record<string, unknown>;
  const fields = ["message", "code", "details", "hint", "status", "name"];
  return fields.some((field) => {
    const value = record[field];
    if (typeof value === "string") return value.trim().length > 0;
    return value !== null && value !== undefined;
  });
}

function logTodayPageError(scope: string, error: unknown) {
  if (!hasMeaningfulErrorPayload(error)) return;
  console.error(`[today/page] ${scope}`, error);
}

function upperRole(
  value: string | null | undefined,
): "OWNER" | "MANAGER" | "GUEST" {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();
  if (normalized === "OWNER") return "OWNER";
  if (normalized === "MANAGER") return "MANAGER";
  return "GUEST";
}

function cleanText(value: string | null | undefined) {
  return String(value ?? "").trim();
}

function buildScopedHref(path: string, phoneRaw: string) {
  return phoneRaw ? `${path}?u=${encodeURIComponent(phoneRaw)}` : path;
}

function buildOrderHref(
  businessSlug: string,
  orderId: string,
  phoneRaw: string,
) {
  const params = new URLSearchParams();
  params.set("focusOrder", orderId);
  if (phoneRaw) params.set("u", phoneRaw);
  return `/b/${businessSlug}?${params.toString()}`;
}

function buildOrderReferenceLabel(order: OrderLookupRow | null | undefined) {
  if (!order?.id) return null;
  const clientName =
    cleanText(order.resolved_client_display_name) ||
    cleanText(order.client_name) ||
    "Order";
  return `Order${order.order_number ? ` #${order.order_number}` : ""}${clientName ? ` - ${clientName}` : ""}`;
}

function parseNumeric(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default async function TodayFollowUpsPage({
  params,
  searchParams,
}: PageProps) {
  const [{ slug }, rawSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({} as { u?: string; mode?: string }),
  ]);
  const phoneRaw = cleanText(rawSearchParams?.u);
  const initialMode =
    cleanText(rawSearchParams?.mode).toLowerCase() === "calendar"
      ? "calendar"
      : "list";
  const supabase = await supabaseServerReadOnly();
  const admin = supabaseAdmin();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(buildScopedHref(`/b/${slug}/today`, phoneRaw))}`,
    );
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("memberships")
    .select("business_id, role")
    .eq("user_id", user.id);

  if (membershipsError) {
    logTodayPageError("memberships query failed", membershipsError);
    redirect(buildScopedHref("/app/crm", phoneRaw));
  }

  const membershipRows = (memberships ?? []) as MembershipRow[];
  if (membershipRows.length === 0) redirect("/app/crm");

  const businessIds = membershipRows.map((entry) => entry.business_id);
  const { data: businesses, error: businessesError } = await supabase
    .from("businesses")
    .select("id, slug, name, plan")
    .in("id", businessIds);

  if (businessesError) {
    logTodayPageError("businesses query failed", businessesError);
    redirect(buildScopedHref("/app/crm", phoneRaw));
  }

  const businessRows = (businesses ?? []) as BusinessRow[];
  const currentBusiness =
    businessRows.find((entry) => entry.slug === slug) ?? null;

  if (!currentBusiness) {
    redirect(buildScopedHref("/app/crm", phoneRaw));
  }

  try {
    await ensureWorkspaceForBusiness(admin, String(currentBusiness.id));
  } catch (error) {
    // Do not crash Today page if workspace bootstrap fails on legacy/prod data.
    console.error("[today/page] ensureWorkspaceForBusiness failed", error);
  }

  const role = upperRole(
    membershipRows.find((entry) => entry.business_id === currentBusiness.id)
      ?.role,
  );
  const canManage = role === "OWNER" || role === "MANAGER";

  const { data: profileRaw } = await admin
    .from("profiles")
    .select("full_name, first_name, last_name, email, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  const profile = (profileRaw ?? null) as ProfileRow | null;

  const currentUserName =
    resolveUserDisplay(profile ?? {}).primary ||
    cleanText(user.email) ||
    "User";
  const currentUserAvatarUrl = cleanText(profile?.avatar_url);

  const businessOptions: BusinessOption[] = businessRows
    .filter((entry) => cleanText(entry.slug))
    .map((entry) => ({
      id: entry.id,
      slug: entry.slug,
      name: cleanText(entry.name) || entry.slug,
      role: upperRole(
        membershipRows.find((membership) => membership.business_id === entry.id)
          ?.role,
      ),
      isAdmin: isAdminEmail(user.email),
    }));

  // Safe select: explicitly list columns to avoid schema cache issues
  // due_at may not be in schema cache immediately after migration
  // Retry without due_at if schema cache is stale
  async function fetchFollowUpsSafe(
    businessId: string,
    status: string,
    lteDate?: string,
  ) {
    // Try with due_at first
    let query = supabase
      .from("follow_ups")
      .select(
        "id, business_id, workspace_id, order_id, title, due_date, due_at, status, completed_at, created_at, updated_at, created_by, completed_by, next_follow_up_id, note, completion_note, source",
      )
      .eq("business_id", businessId)
      .eq("status", status);

    if (lteDate) {
      query = query.lte("due_date", lteDate);
    }

    query = query
      .order("due_date", { ascending: true })
      .order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      const msg = String(error.message ?? "").toLowerCase();
      // Fallback if due_at column doesn't exist or schema cache is stale
      if (
        (msg.includes("due_at") && msg.includes("schema cache")) ||
        (msg.includes("column") && msg.includes("does not exist"))
      ) {
        // Fallback: select without due_at
        let fallbackQuery = supabase
          .from("follow_ups")
          .select(
            "id, business_id, workspace_id, order_id, title, due_date, status, completed_at, created_at, updated_at, created_by, completed_by, next_follow_up_id, note, completion_note, source",
          )
          .eq("business_id", businessId)
          .eq("status", status);

        if (lteDate) {
          fallbackQuery = fallbackQuery.lte("due_date", lteDate);
        }

        fallbackQuery = fallbackQuery
          .order("due_date", { ascending: true })
          .order("created_at", { ascending: false });

        return fallbackQuery;
      }
      if (isSchemaMissingError(error)) {
        return { data: [], error: null as null };
      }
      logTodayPageError("follow_ups query failed", error);
      return { data: [], error: null as null };
    }

    return { data, error: null as null };
  }

  const followUpsResultSafe = await fetchFollowUpsSafe(
    String(currentBusiness.id),
    "open",
    getTomorrowDateOnly(),
  );
  const calendarFollowUpsResultSafe = await fetchFollowUpsSafe(
    String(currentBusiness.id),
    "open",
  );

  // Fetch orders and checklist items (these don't have due_at)
  const ordersEnrichedResult = await supabase
    .from("crm_orders_enriched")
    .select(
      "id:order_id, business_id, order_number, client_name:legacy_client_name, resolved_client_display_name, due_date, status, created_at",
    )
    .eq("business_id", currentBusiness.id)
    .not("due_date", "is", null)
    .order("due_date", { ascending: true });

  const ordersResult =
    ordersEnrichedResult.error && isSchemaMissingError(ordersEnrichedResult.error)
      ? await supabase
          .from("orders")
          .select("id, order_number, client_name, due_date, status, created_at")
          .eq("business_id", currentBusiness.id)
          .not("due_date", "is", null)
          .order("due_date", { ascending: true })
      : ordersEnrichedResult;

  const checklistResult = await supabase
    .from("order_checklist_items")
    .select("id, order_id, title, due_date, is_done, created_at")
    .eq("business_id", currentBusiness.id)
    .not("due_date", "is", null)
    .eq("is_done", false)
    .order("due_date", { ascending: true });

  const calendarOrderRows = ordersResult.error
    ? []
    : ((ordersResult.data ?? []) as OrderLookupRow[]).filter(
        (row) => !isTerminalStatus(String(row.status ?? "")),
      );
  if (ordersResult.error) {
    logTodayPageError("orders calendar query failed", ordersResult.error);
  }
  const checklistRows = isSchemaMissingError(checklistResult.error)
    ? []
    : ((checklistResult.data ?? []) as ChecklistCalendarRow[]);
  if (checklistResult.error && !isSchemaMissingError(checklistResult.error)) {
    logTodayPageError("checklist query failed", checklistResult.error);
  }

  const followUpRows = ((followUpsResultSafe.data ?? []) as FollowUpRow[]).map(
    (row) => ({
      ...row,
      due_at:
        ((row as Record<string, unknown>).due_at as string | null) ?? null,
    }),
  );
  const calendarFollowUpRows = (
    (calendarFollowUpsResultSafe.data ?? []) as FollowUpRow[]
  ).map((row) => ({
    ...row,
    due_at: ((row as Record<string, unknown>).due_at as string | null) ?? null,
  }));
  const orderIds = [
    ...new Set(
      [
        ...followUpRows.map((entry) => cleanText(entry.order_id)),
        ...calendarFollowUpRows.map((entry) => cleanText(entry.order_id)),
        ...checklistRows.map((entry) => cleanText(entry.order_id)),
        ...calendarOrderRows.map((entry) => cleanText(entry.id)),
      ].filter(Boolean),
    ),
  ];

  const orderLookup = new Map<string, OrderLookupRow>();
  if (orderIds.length > 0) {
    const enrichedOrdersLookupResult = await supabase
      .from("crm_orders_enriched")
      .select("id:order_id, order_number, client_name:legacy_client_name, resolved_client_display_name")
      .in("order_id", orderIds);

    const ordersLookupResult =
      enrichedOrdersLookupResult.error &&
      isSchemaMissingError(enrichedOrdersLookupResult.error)
        ? await supabase
            .from("orders")
            .select("id, order_number, client_name")
            .in("id", orderIds)
        : enrichedOrdersLookupResult;

    const { data: orders, error: ordersError } = ordersLookupResult;

    if (ordersError) {
      logTodayPageError("orders lookup query failed", ordersError);
    } else {
      for (const row of (orders ?? []) as OrderLookupRow[]) {
        orderLookup.set(row.id, row);
      }
    }
  }

  for (const order of calendarOrderRows) {
    orderLookup.set(order.id, order);
  }

  const createOrderOptionsResultEnriched = await supabase
    .from("crm_orders_enriched")
    .select(
      "id:order_id, order_number, client_name:legacy_client_name, resolved_client_display_name, status, created_at",
    )
    .eq("business_id", currentBusiness.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const createOrderOptionsResult =
    createOrderOptionsResultEnriched.error &&
    isSchemaMissingError(createOrderOptionsResultEnriched.error)
      ? await supabase
          .from("orders")
          .select("id, order_number, client_name, status, created_at")
          .eq("business_id", currentBusiness.id)
          .order("created_at", { ascending: false })
          .limit(200)
      : createOrderOptionsResultEnriched;

  if (createOrderOptionsResult.error) {
    logTodayPageError("orders options query failed", createOrderOptionsResult.error);
  }

  const calendarOrderOptions: CalendarOrderOption[] = (
    (createOrderOptionsResult.data ?? []) as OrderLookupRow[]
  )
    .filter((row) => row.id && !isTerminalStatus(String(row.status ?? "")))
    .map((row) => ({
      id: row.id,
      label: buildOrderReferenceLabel(row) ?? `Order ${row.order_number ?? ""}`.trim(),
    }));

  const items: TodayFollowUpItem[] = followUpRows.map((entry) => {
    const linkedOrder = entry.order_id
      ? (orderLookup.get(entry.order_id) ?? null)
      : null;
    const orderLabel = buildOrderReferenceLabel(linkedOrder);

    return {
      ...entry,
      orderLabel: orderLabel ? `Open ${orderLabel.toLowerCase()}` : null,
      orderHref: linkedOrder?.id
        ? buildOrderHref(currentBusiness.slug, linkedOrder.id, phoneRaw)
        : null,
    };
  });

  const calendarItems: TodoCalendarItem[] = [
    ...calendarFollowUpRows
      .filter((entry) => cleanText(entry.due_date))
      .map((entry) => {
        const linkedOrder = entry.order_id
          ? (orderLookup.get(entry.order_id) ?? null)
          : null;
        const status: TodoCalendarItem["status"] =
          entry.due_date < getTodayDateOnly() ? "overdue" : "open";
        const allDay = isFollowUpAllDay(entry);
        const startsAt = getFollowUpStartsAt(entry);

        return {
          id: `follow-up:${entry.id}`,
          type: "follow_up" as const,
          subtype: inferFollowUpSubtype(entry.title),
          title: entry.title,
          startsAt,
          date: entry.due_date,
          allDay,
          status,
          orderId: entry.order_id ?? undefined,
          orderLabel: buildOrderReferenceLabel(linkedOrder) ?? undefined,
          orderHref: linkedOrder?.id
            ? buildOrderHref(currentBusiness.slug, linkedOrder.id, phoneRaw)
            : undefined,
          sourceLabel: "Follow-up",
          statusLabel: status === "overdue" ? "Overdue" : "Open",
          createdAt: entry.created_at,
        };
      }),
    ...calendarOrderRows
      .filter((entry) => cleanText(entry.due_date))
      .map((entry) => ({
        id: `order:${entry.id}`,
        type: "order" as const,
        title: buildOrderReferenceLabel(entry) ?? "Order",
        date: String(entry.due_date).slice(0, 10),
        allDay: true,
        status:
          entry.due_date &&
          String(entry.due_date).slice(0, 10) < getTodayDateOnly()
            ? ("overdue" as const)
            : ("open" as const),
        orderId: entry.id,
        orderLabel: buildOrderReferenceLabel(entry) ?? undefined,
        orderHref: buildOrderHref(currentBusiness.slug, entry.id, phoneRaw),
        sourceLabel: "Order due date",
        statusLabel: getStatusLabel(String(entry.status ?? "")),
        createdAt: entry.created_at,
      })),
    ...checklistRows
      .filter((entry) => cleanText(entry.due_date))
      .map((entry) => {
        const linkedOrder = orderLookup.get(entry.order_id) ?? null;
        const date = String(entry.due_date).slice(0, 10);
        return {
          id: `checklist:${entry.id}`,
          type: "checklist" as const,
          title: entry.title,
          date,
          allDay: true,
          status:
            date < getTodayDateOnly()
              ? ("overdue" as const)
              : ("open" as const),
          orderId: entry.order_id,
          orderLabel: buildOrderReferenceLabel(linkedOrder) ?? undefined,
          orderHref: linkedOrder?.id
            ? buildOrderHref(currentBusiness.slug, linkedOrder.id, phoneRaw)
            : undefined,
          sourceLabel: "Checklist due date",
          statusLabel: "Open",
          createdAt: entry.created_at,
        };
      }),
  ];

  const businessHref = buildScopedHref("/app/crm", phoneRaw);
  const settingsHref = buildScopedHref("/app/settings", phoneRaw);
  const todayHref = buildScopedHref(`/b/${slug}/today`, phoneRaw);
  const supportHref = buildScopedHref(`/b/${slug}/support`, phoneRaw);
  const analyticsHref = buildScopedHref(`/b/${slug}/analytics`, phoneRaw);
  const adminHref = isAdminEmail(user.email) ? getAdminUsersPath() : undefined;
  const todoCount = items.filter(
    (item) => compareDateOnly(item.due_date, getTodayDateOnly()) <= 0,
  ).length;
  const overdueCount = items.filter(
    (item) => compareDateOnly(item.due_date, getTodayDateOnly()) < 0,
  ).length;
  const todayOnlyCount = items.filter(
    (item) => compareDateOnly(item.due_date, getTodayDateOnly()) === 0,
  ).length;
  let hasStartedDay = false;
  let managerPlanProgress: ManagerMonthlyPlanProgress | null = null;

  const { data: workDayRow, error: workDayError } = await supabase
    .from("work_days")
    .select("status")
    .eq("business_id", currentBusiness.id)
    .eq("user_id", user.id)
    .eq("work_date", getTodayDateOnly())
    .maybeSingle();

  if (workDayError) {
    if (!isSchemaMissingError(workDayError)) {
      logTodayPageError("work_days query failed", workDayError);
    }
  } else {
    hasStartedDay = ["running", "paused", "finished"].includes(
      String((workDayRow as WorkDayLookupRow | null)?.status ?? "")
        .trim()
        .toLowerCase(),
    );
  }

  if (role === "MANAGER") {
    const nowDate = new Date();
    const monthStartDate = new Date(
      nowDate.getFullYear(),
      nowDate.getMonth(),
      1,
    );
    const monthEndDate = new Date(
      nowDate.getFullYear(),
      nowDate.getMonth() + 1,
      0,
    );
    const monthStart = `${monthStartDate.getFullYear()}-${String(monthStartDate.getMonth() + 1).padStart(2, "0")}-${String(monthStartDate.getDate()).padStart(2, "0")}`;
    const monthEnd = `${monthEndDate.getFullYear()}-${String(monthEndDate.getMonth() + 1).padStart(2, "0")}-${String(monthEndDate.getDate()).padStart(2, "0")}`;
    const daysTotal = monthEndDate.getDate();
    const today = getTodayDateOnly();
    const daysElapsed =
      today < monthStart ? 0 : today > monthEnd ? daysTotal : Number(today.slice(8, 10));

    const [targetRes, ordersRes] = await Promise.all([
      admin
        .from("sales_month_targets")
        .select("plan_amount,plan_closed_orders")
        .eq("business_id", String(currentBusiness.id))
        .eq("manager_id", user.id)
        .eq("month_start", monthStart),
      admin
        .from("crm_orders_enriched")
        .select("amount,status,updated_at,legacy_order_manager_id")
        .eq("business_id", String(currentBusiness.id))
        .eq("legacy_order_manager_id", user.id),
    ]);

    if (targetRes.error) {
      logTodayPageError("manager sales target query failed", targetRes.error);
    }
    if (ordersRes.error && !isSchemaMissingError(ordersRes.error)) {
      logTodayPageError("manager sales orders query failed", ordersRes.error);
    }

    const targetRows = (targetRes.data ?? []) as SalesMonthTargetRow[];
    const planAmount = targetRows.reduce(
      (sum, row) => sum + parseNumeric(row.plan_amount),
      0,
    );
    const planClosedOrders = targetRows.reduce(
      (sum, row) => sum + Math.max(0, Math.floor(parseNumeric(row.plan_closed_orders))),
      0,
    );
    let salesOrderRows: SalesMonthOrderRow[] = [];
    if (ordersRes.error && isSchemaMissingError(ordersRes.error)) {
      const fallbackOrdersRes = await admin
        .from("orders")
        .select("amount,status,updated_at")
        .eq("business_id", String(currentBusiness.id))
        .eq("manager_id", user.id);

      if (fallbackOrdersRes.error) {
        logTodayPageError("manager sales orders fallback query failed", fallbackOrdersRes.error);
      } else {
        salesOrderRows = (fallbackOrdersRes.data ?? []) as SalesMonthOrderRow[];
      }
    } else {
      salesOrderRows = ((ordersRes.data ?? []) as EnrichedSalesMonthOrderRow[]).map((row) => ({
        amount: row.amount,
        status: row.status,
        updated_at: row.updated_at,
      }));
    }

    const closedOrders = salesOrderRows.filter((row) => {
      const status = String(row.status ?? "").trim().toUpperCase();
      const date = String(row.updated_at ?? "").slice(0, 10);
      return (status === "DONE" || status === "CLOSED") && date >= monthStart && date <= monthEnd;
    });
    const actualAmount = closedOrders.reduce(
      (sum, row) => sum + parseNumeric(row.amount),
      0,
    );
    const closedCount = closedOrders.length;
    const forecastAmount =
      daysElapsed > 0
        ? Number(((actualAmount / daysElapsed) * daysTotal).toFixed(2))
        : 0;
    const forecastClosedOrders =
      daysElapsed > 0
        ? Number(((closedCount / daysElapsed) * daysTotal).toFixed(2))
        : 0;
    const achievementPct =
      planAmount > 0 ? Number(((actualAmount / planAmount) * 100).toFixed(2)) : 0;

    managerPlanProgress = {
      monthStart,
      monthEnd,
      daysElapsed,
      daysTotal,
      planAmount: Number(planAmount.toFixed(2)),
      actualAmount: Number(actualAmount.toFixed(2)),
      forecastAmount,
      achievementPct,
      planClosedOrders,
      closedOrders: closedCount,
      forecastClosedOrders,
    };
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-transparent text-slate-900">
      <TopBar
        businessSlug={slug}
        role={role}
        currentUserName={currentUserName}
        currentUserAvatarUrl={currentUserAvatarUrl || undefined}
        currentPlan={currentBusiness.plan}
        businesses={businessOptions}
        businessId={currentBusiness.id}
        businessHref={businessHref}
        todayHref={todayHref}
        supportHref={supportHref}
        settingsHref={settingsHref}
        adminHref={adminHref}
        clearHref={todayHref}
        hasActiveFilters={false}
        todoCount={todoCount}
        overdueCount={overdueCount}
        todayCount={todayOnlyCount}
      />

      <main className="mx-auto max-w-[1440px] overflow-x-hidden px-4 pb-8 pt-16 sm:px-6">
        <div className="hidden items-start gap-3 lg:grid lg:grid-cols-[auto_minmax(0,1fr)]">
          <div className="relative shrink-0">
            <DesktopLeftRail
              businessId={currentBusiness.id}
              phoneRaw={phoneRaw}
              q=""
              statuses={[] as StatusFilterValue[]}
              statusMode="default"
              range="ALL"
              summaryRange="today"
              startDate={null}
              endDate={null}
              actor="ALL"
              sort="default"
              actors={[]}
              currentUserId={user.id}
              hasActiveFilters={false}
              activeFiltersCount={0}
              clearHref={todayHref}
              businessHref={businessHref}
              clientsHref={`/b/${slug}/clients`}
              catalogHref={`/b/${slug}/catalog/products`}
              analyticsHref={analyticsHref}
              todayHref={todayHref}
              supportHref={supportHref}
              settingsHref={settingsHref}
              adminHref={adminHref}
              canSeeAnalytics={role === "OWNER"}
              showFilters={false}
              activeSection="today"
            />
          </div>

          <div className="min-w-0 w-full space-y-4 pl-2">
            <TodoWorkspaceView
              businessId={String(currentBusiness.id)}
              businessSlug={currentBusiness.slug}
              canManage={canManage}
              initialItems={items}
              calendarItems={calendarItems}
              orderOptions={calendarOrderOptions}
              initialMode={initialMode}
              managerPlanProgress={managerPlanProgress}
            />
          </div>
        </div>

        <div className="space-y-4 lg:hidden">
          <TodoWorkspaceView
            businessId={String(currentBusiness.id)}
            businessSlug={currentBusiness.slug}
            canManage={canManage}
            initialItems={items}
            calendarItems={calendarItems}
            orderOptions={calendarOrderOptions}
            initialMode={initialMode}
            managerPlanProgress={managerPlanProgress}
          />
        </div>
      </main>

      <StartDayNudge
        todoCount={todoCount}
        businessSlug={currentBusiness.slug}
        enabled={hasStartedDay}
        dayKey={getTodayDateOnly()}
      />
    </div>
  );
}
