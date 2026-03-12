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
import { resolveUserDisplay } from "@/lib/user-display";
import { supabaseAdmin } from "@/lib/supabase/admin";

type BusinessInvite = {
  id: string;
  business_id: string;
  email: string;
  role: "MANAGER" | "OWNER";
  status: "PENDING" | "ACCEPTED" | "CANCELED";
  created_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
};

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

  // auth required unless legacy ?u= bypass link is used
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user && !bypassUser) redirect("/login");

  const bypassMode = !user && Boolean(bypassUser);
  const canUseAdmin =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const admin = bypassMode && canUseAdmin ? supabaseAdmin() : null;
  const dataClient = admin ?? supabase;

  // memberships пользователя (for authed users only)
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
        .select("id, slug, plan, owner_phone, manager_phone")
        .in("id", businessIds);

      if (bErr) throw bErr;
      businesses = businessesData ?? [];
    }
  }

  // if bypass mode is used, allow opening business directly by slug without auth
  let currentBusiness = (businesses ?? []).find((b: any) => b.slug === slug);
  if (!currentBusiness) {
    const { data: bySlug, error: slugErr } = await dataClient
      .from("businesses")
      .select("id, slug, plan, owner_phone, manager_phone")
      .eq("slug", slug)
      .maybeSingle();

    if (slugErr) {
      if (bypassMode) {
        redirect("/login");
      }
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
    (memberships ?? []).find((m: any) => m.business_id === currentBusiness.id)
      ?.role ?? (bypassUser ? "MANAGER" : "GUEST");

  const userRole = upperRole(myRoleRaw);
  const canManage = userRole === "OWNER" || userRole === "MANAGER";
  const canEdit = canManage;
  const canSeeAnalyticsNav = userRole === "OWNER";

  // ✅ Pending manager invites (for Business card dropdown)
  let pendingInvites: BusinessInvite[] = [];
  if (user) {
    const { data, error: invErr } = await supabase
      .from("business_invites")
      .select(
        "id,business_id,email,role,status,created_at,accepted_at,accepted_by",
      )
      .eq("business_id", currentBusiness.id)
      .eq("status", "PENDING")
      .order("created_at", { ascending: false });

    if (invErr) throw invErr;
    pendingInvites = (data ?? []) as BusinessInvite[];
  }
  // phoneRaw для старых форм (filters/create) — берём из query ?u=
  const phoneRaw = String(sp.u ?? "");

  // Filters (компоненты ждут именно q/status/range)
  const filters: Filters = {
    q: String(sp.q ?? "").trim(),
    status: (String(sp.status ?? "ALL").toUpperCase() as any) ?? "ALL",
    range: (String(sp.range ?? "ALL") as any) ?? "ALL",
    actor: String(sp.actor ?? "ALL"),
  };

  const hasActiveFilters =
    !!filters.q ||
    filters.status !== "ALL" ||
    filters.range !== "ALL" ||
    filters.actor !== "ALL";

  const clearHref =
    phoneRaw && phoneRaw.length > 0
      ? `/b/${slug}?u=${encodeURIComponent(phoneRaw)}`
      : `/b/${slug}`;

  // Team actors for owner/manager filters
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

    const profilesMap = new Map<string, { full_name: string | null; first_name: string | null; last_name: string | null; email: string | null }>();
    if (actorUserIds.length > 0) {
      const { data: actorProfiles } = await dataClient
        .from("profiles")
        .select("id, full_name, first_name, last_name, email")
        .in("id", actorUserIds);

      for (const p of actorProfiles ?? []) {
        if (p?.id) profilesMap.set(String(p.id), { full_name: p.full_name ?? null, first_name: p.first_name ?? null, last_name: p.last_name ?? null, email: p.email ?? null });
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
  const buildOrdersQuery = (withActorFilter: boolean) => {
    let query = dataClient
      .from("orders")
      .select("*")
      .eq("business_id", currentBusiness.id)
      .order("created_at", { ascending: false });

    if (filters.status !== "ALL") query = query.eq("status", filters.status);

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

  // range-логика у тебя может быть отдельно — пока оставляем ALL
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

  const qNeedle = String(filters.q ?? "").trim().toLowerCase();
  const list: any[] = qNeedle
    ? listRaw.filter((o) => {
        const actorName = actorNameById.get(String(o.created_by ?? "")) ?? "";
        const blob = [
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

  // Analytics
  const totalOrders = list.length;

  const sumAmount = (rows: any[]) =>
    rows.reduce((s, o) => s + Number(o.amount || 0), 0);

  const totalAmount = sumAmount(list);

  const overdueCount = list.filter(
    (o) => o.status === "NEW" || o.status === "IN_PROGRESS",
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
    list.filter((o) => o.status === "NEW" || o.status === "IN_PROGRESS"),
  );

  const fmtAmount = (n: number) => new Intl.NumberFormat("uk-UA").format(n);

  const todayISO = new Date().toISOString().slice(0, 10);

  // Owner=Manager вычисляем по memberships, а не по legacy manager_phone
  const ownerMembership = (memberships ?? []).find(
    (m: any) =>
      m.business_id === currentBusiness.id &&
      String(m.role).toUpperCase() === "OWNER",
  );
  const managerMembership = (memberships ?? []).find(
    (m: any) =>
      m.business_id === currentBusiness.id &&
      String(m.role).toUpperCase() === "MANAGER",
  );
  const isOwnerManager =
    !!ownerMembership?.user_id &&
    !!managerMembership?.user_id &&
    String(ownerMembership.user_id) === String(managerMembership.user_id);

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
          <div className="col-span-3 space-y-3">
            <DesktopSidebar
              clearHref={clearHref}
              totalCount={totalOrders}
              canSeeAnalytics={canSeeAnalyticsNav}
            />

            <DesktopBusinessCard
              business={{
                id: String(currentBusiness.id), // ✅ ДОБАВИЛИ
                slug: String(currentBusiness.slug),
                owner_phone: currentBusiness.owner_phone
                  ? String(currentBusiness.owner_phone)
                  : null,
                manager_phone: currentBusiness.manager_phone
                  ? String(currentBusiness.manager_phone)
                  : null,
              }}
              role={userRole}
              phone={phoneRaw}
              isOwnerManager={!!isOwnerManager}
              pendingInvites={(pendingInvites ?? []) as any} // ✅ ДОБАВЬ
              currentUserId={user?.id ?? null}
            />
          </div>

          <div className="col-span-9 space-y-6">
            <DesktopAnalyticsCard
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
              actor={filters.actor}
              actors={teamActors}
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
