import { redirect } from "next/navigation";
import { supabaseServerReadOnly } from "@/lib/supabase/server";
import { getAdminUsersPath, isAdminEmail } from "@/lib/admin-access";
import TeamAccessTopBar from "./team/TeamAccessTopBar";
import SettingsTabs from "./SettingsTabs";
import BusinessInfoPanel from "./BusinessInfoPanel";
import DesktopLeftRail from "../_components/Desktop/DesktopLeftRail";
import { loadUserProfileSafe } from "@/lib/profile";
import { resolveUserDisplay } from "@/lib/user-display";

type Role = "OWNER" | "MANAGER" | "GUEST";

function upperRole(r: unknown): Role {
  const s = String(r ?? "").toUpperCase();
  if (s === "OWNER") return "OWNER";
  if (s === "MANAGER") return "MANAGER";
  return "GUEST";
}

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await supabaseServerReadOnly();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nextPath = `/b/${slug}/settings`;
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const { data: business, error: bizErr } = await supabase
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .single();

  if (bizErr || !business) {
    redirect("/app/crm");
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
  const profile = await loadUserProfileSafe(supabase, user.id);
  const currentUserName = resolveUserDisplay({
    full_name: profile?.full_name ?? String(user.user_metadata?.full_name ?? ""),
    first_name: profile?.first_name ?? String(user.user_metadata?.first_name ?? ""),
    last_name: profile?.last_name ?? String(user.user_metadata?.last_name ?? ""),
    email: profile?.email ?? user.email ?? null,
    phone: user.phone ?? null,
  }).primary;
  const currentUserAvatarUrl =
    String(profile?.avatar_url ?? user.user_metadata?.avatar_url ?? "").trim() || undefined;

  return (
    <div className="min-h-[100svh] overflow-x-clip bg-transparent text-[#1F2937]">
      <TeamAccessTopBar
        ordersHref="/app/crm"
        userLabel={currentUserName}
        currentPlan={business.plan}
        businessId={String(business.id)}
        adminHref={adminHref}
        userAvatarUrl={currentUserAvatarUrl}
        profileHref={
          user.phone
            ? `/m/${encodeURIComponent(user.phone)}`
            : `/b/${encodeURIComponent(business.slug)}`
        }
      />

      <div className="container-standard pb-[max(96px,env(safe-area-inset-bottom))] pt-[64px] sm:pb-8 sm:pt-[64px]">
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
            clearHref={`/app/crm`}
            businessHref={`/app/crm`}
            clientsHref={`/b/${business.slug}/clients`}
            catalogHref={`/b/${business.slug}/catalog/products`}
            analyticsHref={`/b/${business.slug}/analytics`}
            todayHref={`/b/${business.slug}/today`}
            supportHref={`/b/${business.slug}/support`}
            settingsHref={`/b/${business.slug}/settings`}
            adminHref={adminHref}
            canSeeAnalytics={role === "OWNER"}
            showFilters={false}
            activeSection="settings"
          />

          <section className="w-full min-w-0 max-w-full rounded-[16px] border border-[#E5E7EB] bg-white p-3 pb-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:rounded-[18px] sm:p-4">
            <div className="mb-3">
              <div className="product-page-kicker">Settings</div>
              <h1 className="product-page-title mt-1">Business</h1>
              <p className="product-page-subtitle mt-1">
                Core workspace context for{" "}
                <span className="font-semibold">{business.slug}</span>
              </p>
            </div>

            <SettingsTabs
              tabs={[
                {
                  href: `/b/${business.slug}/settings`,
                  label: "Business",
                  active: true,
                },
                {
                  href: `/b/${business.slug}/settings/team`,
                  label: "Team",
                  active: false,
                },
                {
                  href: `/b/${business.slug}/settings/invites`,
                  label: "Invites",
                  active: false,
                },
                {
                  href: `/b/${business.slug}/settings/statuses`,
                  label: "Statuses",
                  active: false,
                },
              ]}
            />

            <BusinessInfoPanel
              businessId={business.id}
              slug={business.slug}
              name={business.name}
              plan={business.plan}
              businessPhone={business.business_phone}
              businessAddress={business.business_address}
              businessSegment={business.business_segment}
              businessWebsite={business.business_website}
            />
          </section>
        </div>

        <div className="mx-auto w-full max-w-[920px] min-w-0 lg:hidden">
          <section className="w-full min-w-0 max-w-full rounded-[16px] border border-[#E5E7EB] bg-white p-3 pb-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:rounded-[18px] sm:p-4">
            <div className="mb-3">
              <div className="product-page-kicker">Settings</div>
              <h1 className="product-page-title mt-1">Business</h1>
              <p className="product-page-subtitle mt-1">
                Core workspace context for{" "}
                <span className="font-semibold">{business.slug}</span>
              </p>
            </div>

            <SettingsTabs
              tabs={[
                {
                  href: `/b/${business.slug}/settings`,
                  label: "Business",
                  active: true,
                },
                {
                  href: `/b/${business.slug}/settings/team`,
                  label: "Team",
                  active: false,
                },
                {
                  href: `/b/${business.slug}/settings/invites`,
                  label: "Invites",
                  active: false,
                },
                {
                  href: `/b/${business.slug}/settings/statuses`,
                  label: "Statuses",
                  active: false,
                },
              ]}
            />

            <BusinessInfoPanel
              businessId={business.id}
              slug={business.slug}
              name={business.name}
              plan={business.plan}
              businessPhone={business.business_phone}
              businessAddress={business.business_address}
              businessSegment={business.business_segment}
              businessWebsite={business.business_website}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
