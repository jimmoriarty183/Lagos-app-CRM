import { redirect } from "next/navigation";
import { supabaseServerReadOnly } from "@/lib/supabase/server";
import { getAdminUsersPath, isAdminEmail } from "@/lib/admin-access";
import BusinessPeoplePanel from "@/app/b/[slug]/_components/BusinessPeoplePanel";
import TeamAccessTopBar from "./TeamAccessTopBar";
import SettingsTabs from "../SettingsTabs";
import DesktopLeftRail from "@/app/b/[slug]/_components/Desktop/DesktopLeftRail";

type Role = "OWNER" | "MANAGER" | "GUEST";
type MembershipRow = {
  role: string | null;
  user_id: string | null;
};
type PendingInviteRow = {
  id?: string;
  email?: string;
  created_at?: string | null;
};

function upperRole(r: unknown): Role {
  const s = String(r ?? "").toUpperCase();
  if (s === "OWNER") return "OWNER";
  if (s === "MANAGER") return "MANAGER";
  return "GUEST";
}

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  await searchParams;

  const supabase = await supabaseServerReadOnly();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nextPath = `/b/${slug}/settings/team`;
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const { data: business, error: bizErr } = await supabase
    .from("businesses")
    .select("id,slug,owner_phone,manager_phone")
    .eq("slug", slug)
    .single();

  if (bizErr || !business) {
    redirect("/login?no_business=1");
  }

  const { data: mem, error: memErr } = await supabase
    .from("memberships")
    .select("role")
    .eq("business_id", business.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memErr) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const role: Role = upperRole(mem?.role);
  if (role === "GUEST") {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  const adminHref = isAdminEmail(user.email) ? getAdminUsersPath() : undefined;

  const { data: ownerManagerMems } = await supabase
    .from("memberships")
    .select("role,user_id")
    .eq("business_id", business.id)
    .in("role", ["OWNER", "MANAGER"]);
  const roleRows = (ownerManagerMems ?? []) as MembershipRow[];

  const ownerId =
    roleRows.find((row) => String(row.role).toUpperCase() === "OWNER")?.user_id ?? null;
  const managerId =
    roleRows.find((row) => String(row.role).toUpperCase() === "MANAGER")?.user_id ?? null;
  const isOwnerManager = !!ownerId && !!managerId && String(ownerId) === String(managerId);

  const { data: pendingInvites } = await supabase
    .from("business_invites")
    .select("id,business_id,email,role,status,created_at")
    .eq("business_id", business.id)
    .eq("status", "PENDING")
    .eq("role", "MANAGER")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-[100svh] overflow-x-clip bg-transparent text-[#1F2937]">
      <TeamAccessTopBar
        ordersHref="/app/crm"
        userLabel={user.email || user.phone || "User"}
        adminHref={adminHref}
        profileHref={
          user.phone
            ? `/m/${encodeURIComponent(user.phone)}`
            : `/b/${encodeURIComponent(business.slug)}`
        }
      />

      <div className="mx-auto max-w-[1220px] overflow-x-clip px-2 pb-[max(96px,env(safe-area-inset-bottom))] pt-[88px] sm:px-6 sm:pb-8 sm:pt-[88px]">
        <div className="hidden items-start lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-5">
          <DesktopLeftRail
            businessId={String(business.id)}
            phoneRaw=""
            q=""
            statuses={[]}
            statusMode="default"
            range="ALL"
            summaryRange="thisMonth"
            startDate={null}
            endDate={null}
            actor="ALL"
            actors={[]}
            currentUserId={user.id}
            hasActiveFilters={false}
            activeFiltersCount={0}
            clearHref={`/b/${business.slug}`}
            businessHref={`/b/${business.slug}/settings`}
            settingsHref={`/b/${business.slug}/settings/team`}
            adminHref={adminHref}
            canSeeAnalytics={role === "OWNER"}
            showFilters={false}
            activeSection="settings"
          />

          <section className="w-full min-w-0 max-w-full rounded-[20px] border border-[#E5E7EB] bg-white p-3.5 pb-6 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:rounded-[26px] sm:p-5">
            <div className="mb-4">
              <div className="product-page-kicker">
                Settings
              </div>
              <h1 className="product-page-title mt-1.5">
                Team &amp; Access
              </h1>
              <p className="product-page-subtitle mt-1.5">
                Manage who can access <span className="font-semibold">{business.slug}</span>
              </p>
            </div>

            <SettingsTabs
              tabs={[
                { href: `/b/${business.slug}/settings`, label: "Business", active: false },
                { href: `/b/${business.slug}/settings/team`, label: "Team", active: true },
                { href: `/b/${business.slug}/settings/invites`, label: "Invites", active: false },
                { href: `/b/${business.slug}/settings/statuses`, label: "Statuses", active: false },
              ]}
            />

            <BusinessPeoplePanel
              businessId={business.id}
              businessSlug={business.slug}
              role={role}
              isOwnerManager={isOwnerManager}
              pendingInvites={((pendingInvites ?? []) as PendingInviteRow[]) ?? []}
              currentUserId={user.id}
              mode="teamOnly"
            />
          </section>
        </div>

        <div className="mx-auto w-full max-w-[920px] min-w-0 lg:hidden">
          <section className="w-full min-w-0 max-w-full rounded-[20px] border border-[#E5E7EB] bg-white p-3.5 pb-6 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:rounded-[26px] sm:p-5">
            <div className="mb-4">
              <div className="product-page-kicker">
                Settings
              </div>
              <h1 className="product-page-title mt-1.5">
                Team &amp; Access
              </h1>
              <p className="product-page-subtitle mt-1.5">
                Manage who can access <span className="font-semibold">{business.slug}</span>
              </p>
            </div>

            <SettingsTabs
              tabs={[
                { href: `/b/${business.slug}/settings`, label: "Business", active: false },
                { href: `/b/${business.slug}/settings/team`, label: "Team", active: true },
                { href: `/b/${business.slug}/settings/invites`, label: "Invites", active: false },
                { href: `/b/${business.slug}/settings/statuses`, label: "Statuses", active: false },
              ]}
            />

            <BusinessPeoplePanel
              businessId={business.id}
              businessSlug={business.slug}
              role={role}
              isOwnerManager={isOwnerManager}
              pendingInvites={((pendingInvites ?? []) as PendingInviteRow[]) ?? []}
              currentUserId={user.id}
              mode="teamOnly"
            />
          </section>
        </div>
      </div>
    </div>
  );
}
