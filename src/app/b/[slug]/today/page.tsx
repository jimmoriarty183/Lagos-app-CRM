import { redirect } from "next/navigation";

import DesktopLeftRail from "@/app/b/[slug]/_components/Desktop/DesktopLeftRail";
import type { BusinessOption } from "@/app/b/[slug]/_components/topbar/BusinessSwitcher";
import { StartDayNudge } from "@/app/b/[slug]/_components/topbar/StartDayNudge";
import TopBar from "@/app/b/[slug]/_components/topbar/TopBar";
import {
  TodayFollowUpsView,
  type TodayFollowUpItem,
} from "@/app/b/[slug]/today/TodayFollowUpsView";
import { getAdminUsersPath, isAdminEmail } from "@/lib/admin-access";
import type { StatusFilterValue } from "@/lib/business-statuses";
import { resolveUserDisplay } from "@/lib/user-display";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServerReadOnly } from "@/lib/supabase/server";
import {
  compareDateOnly,
  getTodayDateOnly,
  getTomorrowDateOnly,
  type FollowUpRow,
} from "@/lib/follow-ups";
import { ensureWorkspaceForBusiness } from "@/lib/workspaces";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    u?: string;
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
};

type OrderLookupRow = {
  id: string;
  order_number: number | null;
  client_name: string | null;
};

type WorkDayLookupRow = {
  status: string | null;
};

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

export default async function TodayFollowUpsPage({
  params,
  searchParams,
}: PageProps) {
  const [{ slug }, rawSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({}),
  ]);
  const phoneRaw = cleanText(rawSearchParams?.u);
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

  if (membershipsError) throw membershipsError;

  const membershipRows = (memberships ?? []) as MembershipRow[];
  if (membershipRows.length === 0) redirect("/app/crm");

  const businessIds = membershipRows.map((entry) => entry.business_id);
  const { data: businesses, error: businessesError } = await supabase
    .from("businesses")
    .select("id, slug, name, plan")
    .in("id", businessIds);

  if (businessesError) throw businessesError;

  const businessRows = (businesses ?? []) as BusinessRow[];
  const currentBusiness =
    businessRows.find((entry) => entry.slug === slug) ?? null;

  if (!currentBusiness) {
    redirect(buildScopedHref("/app/crm", phoneRaw));
  }

  await ensureWorkspaceForBusiness(admin, String(currentBusiness.id));

  const role = upperRole(
    membershipRows.find((entry) => entry.business_id === currentBusiness.id)
      ?.role,
  );
  const canManage = role === "OWNER" || role === "MANAGER";

  const { data: profileRaw } = await admin
    .from("profiles")
    .select("full_name, first_name, last_name, email")
    .eq("id", user.id)
    .maybeSingle();
  const profile = (profileRaw ?? null) as ProfileRow | null;

  const currentUserName =
    resolveUserDisplay(profile ?? null).primary ||
    cleanText(user.email) ||
    "User";

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

  const { data: followUps, error: followUpsError } = await supabase
    .from("follow_ups")
    .select("*")
    .eq("business_id", currentBusiness.id)
    .eq("status", "open")
    .lte("due_date", getTomorrowDateOnly())
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: false });

  if (followUpsError) throw followUpsError;

  const followUpRows = (followUps ?? []) as FollowUpRow[];
  const orderIds = [
    ...new Set(
      followUpRows.map((entry) => cleanText(entry.order_id)).filter(Boolean),
    ),
  ];

  const orderLookup = new Map<string, OrderLookupRow>();
  if (orderIds.length > 0) {
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, order_number, client_name")
      .in("id", orderIds);

    if (ordersError) throw ordersError;
    for (const row of (orders ?? []) as OrderLookupRow[]) {
      orderLookup.set(row.id, row);
    }
  }

  const items: TodayFollowUpItem[] = followUpRows.map((entry) => {
    const linkedOrder = entry.order_id
      ? (orderLookup.get(entry.order_id) ?? null)
      : null;
    const orderClient = cleanText(linkedOrder?.client_name) || "Order";
    const orderLabel = linkedOrder?.id
      ? `Open order${linkedOrder.order_number ? ` #${linkedOrder.order_number}` : ""}${orderClient ? ` - ${orderClient}` : ""}`
      : null;

    return {
      ...entry,
      orderLabel,
      orderHref: linkedOrder?.id
        ? buildOrderHref(currentBusiness.slug, linkedOrder.id, phoneRaw)
        : null,
    };
  });

  const businessHref = buildScopedHref("/app/crm", phoneRaw);
  const settingsHref = buildScopedHref("/app/settings", phoneRaw);
  const todayHref = buildScopedHref(`/b/${slug}/today`, phoneRaw);
  const adminHref = isAdminEmail(user.email) ? getAdminUsersPath() : undefined;
  const todoCount = items.filter((item) => compareDateOnly(item.due_date, getTodayDateOnly()) <= 0).length;
  let hasStartedDay = false;

  const { data: workDayRow } = await supabase
    .from("work_days")
    .select("status")
    .eq("business_id", currentBusiness.id)
    .eq("user_id", user.id)
    .eq("work_date", getTodayDateOnly())
    .maybeSingle();

  hasStartedDay = ["running", "paused", "finished"].includes(
    String((workDayRow as WorkDayLookupRow | null)?.status ?? "").trim().toLowerCase(),
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-transparent text-slate-900">
      <TopBar
        businessSlug={slug}
        role={role}
        currentUserName={currentUserName}
        businesses={businessOptions}
        businessId={currentBusiness.id}
        businessHref={businessHref}
        todayHref={todayHref}
        settingsHref={settingsHref}
        adminHref={adminHref}
        clearHref={todayHref}
        hasActiveFilters={false}
        todoCount={todoCount}
      />

      <main className="mx-auto max-w-[1220px] overflow-x-hidden px-4 pb-8 pt-20 sm:px-6">
        <div className="hidden items-start gap-5 lg:grid lg:grid-cols-[auto_minmax(0,1fr)]">
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
              todayHref={todayHref}
              settingsHref={settingsHref}
              adminHref={adminHref}
              canSeeAnalytics={role === "OWNER"}
              showFilters={false}
              activeSection="today"
            />
          </div>

          <div className="min-w-0 space-y-4 pl-2">
            <TodayFollowUpsView
              businessSlug={currentBusiness.slug}
              canManage={canManage}
              initialItems={items}
            />
          </div>
        </div>

        <div className="space-y-4 lg:hidden">
          <TodayFollowUpsView
            businessSlug={currentBusiness.slug}
            canManage={canManage}
            initialItems={items}
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
