import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ChevronRight, CreditCard, Settings, Shield, UserCircle2 } from "lucide-react";

import { resolveCurrentWorkspace } from "@/lib/platform/workspace";
import { getAdminUsersPath, isAdminEmail } from "@/lib/admin-access";
import TeamAccessTopBar from "@/app/b/[slug]/settings/team/TeamAccessTopBar";
import DesktopLeftRail from "@/app/b/[slug]/_components/Desktop/DesktopLeftRail";
import { loadUserProfileSafe } from "@/lib/profile";
import { supabaseServerReadOnly } from "@/lib/supabase/server";
import { resolveUserDisplay } from "@/lib/user-display";

function upperRole(value: string | null | undefined): "OWNER" | "MANAGER" | "GUEST" {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "OWNER") return "OWNER";
  if (normalized === "MANAGER") return "MANAGER";
  return "GUEST";
}

export default async function PlatformSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ b?: string }>;
}) {
  const { user, workspace: cookieWorkspace, workspaces } = await resolveCurrentWorkspace();

  if (!user) {
    redirect("/login?next=%2Fapp%2Fsettings");
  }

  if (!cookieWorkspace) {
    redirect("/select-business");
  }

  const sp = await (searchParams ?? Promise.resolve({}));
  const requestedSlug = String(sp?.b ?? "").trim();
  const workspace =
    (requestedSlug
      ? workspaces.find((w) => w.slug === requestedSlug)
      : undefined) ?? cookieWorkspace;

  const billingHref = `/app/settings/billing?b=${encodeURIComponent(workspace.slug)}`;
  const adminHref = isAdminEmail(user.email) ? getAdminUsersPath() : undefined;
  const accountLabel = user.email || user.phone || "User";
  let currentUserName = accountLabel;
  let currentUserAvatarUrl: string | undefined;
  const role = upperRole(workspace.role);

  try {
    const supabase = await supabaseServerReadOnly();
    const profile = await loadUserProfileSafe(supabase, user.id);
    const display = resolveUserDisplay({
      full_name:
        profile?.full_name ?? String(user.user_metadata?.full_name ?? ""),
      first_name:
        profile?.first_name ?? String(user.user_metadata?.first_name ?? ""),
      last_name:
        profile?.last_name ?? String(user.user_metadata?.last_name ?? ""),
      email: profile?.email ?? user.email ?? null,
      phone: user.phone ?? null,
    });
    currentUserName = display.primary;
    const avatarUrl = String(
      profile?.avatar_url ?? user.user_metadata?.avatar_url ?? "",
    ).trim();
    currentUserAvatarUrl = avatarUrl || undefined;
  } catch {
    currentUserName = accountLabel;
    currentUserAvatarUrl = undefined;
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#EEF2FF_100%)] text-[#111827]">
      <TeamAccessTopBar
        ordersHref={`/b/${workspace.slug}`}
        userLabel={currentUserName}
        profileHref="/app/profile"
        currentPlan={workspace.plan}
        businessId={workspace.id}
        adminHref={adminHref}
        userAvatarUrl={currentUserAvatarUrl}
        businesses={workspaces.map((item) => ({
          id: item.id,
          slug: item.slug,
          name: item.name || item.slug,
          role: upperRole(item.role),
          isAdmin: Boolean(adminHref),
        }))}
        currentBusinessSlug={workspace.slug}
      />

      <div className="container-standard pb-6 pt-[66px] sm:pt-[68px]">
        <div className="hidden items-start lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-4">
          <DesktopLeftRail
            businessId={workspace.id}
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
            clearHref="/app/crm"
            businessHref="/app/crm"
            clientsHref={`/b/${workspace.slug}/clients`}
            catalogHref={`/b/${workspace.slug}/catalog/products`}
            analyticsHref={`/b/${workspace.slug}/analytics`}
            todayHref={`/b/${workspace.slug}/today`}
            supportHref={`/b/${workspace.slug}/support`}
            settingsHref="/app/settings"
            adminHref={adminHref}
            canSeeAnalytics={role === "OWNER"}
            showFilters={false}
            activeSection="settings"
            layoutMode="list"
          />

          <div className="w-full min-w-0">
            <div className="rounded-3xl border border-[#E5E7EB] dark:border-white/10 bg-white/92 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="mb-3 flex items-center gap-3">
                <Link
                  href="/app/crm"
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 py-1 text-xs font-semibold text-[#374151] transition hover:border-[#D6DAE1] hover:bg-[#FCFCFD]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to CRM
                </Link>
                <div className="inline-flex items-center rounded-full border border-[#E5E7EB] dark:border-white/10 bg-[#F9FAFB] dark:bg-white/[0.04] px-3 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-white/55">
                  Account settings
                </div>
              </div>
              <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[#111827]">
                Settings
              </h1>
              <p className="mt-1 max-w-[560px] text-[13px] leading-4 text-[#6B7280] dark:text-white/55">
                Manage account-level destinations separately from workspace configuration.
              </p>

              <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
                <Link
                  href="/app/profile"
                  className="group rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] p-3 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition hover:border-[#D6DAE1] hover:bg-[#FCFCFD]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F3F4F6] text-[#4B5563] dark:text-white/70">
                        <UserCircle2 className="h-[18px] w-[18px]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-base font-semibold leading-tight text-[#111827]">Profile</div>
                        <div className="truncate text-xs leading-4 text-[#6B7280] dark:text-white/55">
                          View your account identity and contact details.
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#9CA3AF] dark:text-white/40 transition group-hover:text-[#4B5563]" />
                  </div>
                </Link>

                <Link
                  href={`/b/${workspace.slug}/settings`}
                  className="group rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] p-3 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition hover:border-[#D6DAE1] hover:bg-[#FCFCFD]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F3F4F6] text-[#4B5563] dark:text-white/70">
                        <Settings className="h-[18px] w-[18px]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-base font-semibold leading-tight text-[#111827]">Workspace settings</div>
                        <div className="truncate text-xs leading-4 text-[#6B7280] dark:text-white/55">
                          Configure business details, team access, invites, and statuses for {workspace.name || workspace.slug}.
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#9CA3AF] dark:text-white/40 transition group-hover:text-[#4B5563]" />
                  </div>
                </Link>

                <Link
                  href={billingHref}
                  className="group rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] p-3 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition hover:border-[#D6DAE1] hover:bg-[#FCFCFD]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F3F4F6] text-[#4B5563] dark:text-white/70">
                        <CreditCard className="h-[18px] w-[18px]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-base font-semibold leading-tight text-[#111827]">Billing</div>
                        <div className="truncate text-xs leading-4 text-[#6B7280] dark:text-white/55">
                          Manage your subscription, plan and limits.
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#9CA3AF] dark:text-white/40 transition group-hover:text-[#4B5563]" />
                  </div>
                </Link>
              </div>

              <div className="mt-3 rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-[#F9FAFB] dark:bg-white/[0.04] p-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF] dark:text-white/40">
                  Signed in as
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <div className="text-sm font-semibold text-[#111827]">{accountLabel}</div>
                  <div className="text-xs text-[#6B7280] dark:text-white/55">
                    Workspace: {workspace.name || workspace.slug}
                  </div>
                </div>

                {adminHref ? (
                  <Link
                    href={adminHref}
                    className="mt-2 inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-2.5 py-1 text-[11px] font-semibold text-[#374151] shadow-sm transition hover:border-[#D6DAE1] hover:bg-[#FCFCFD]"
                  >
                    <Shield className="h-4 w-4" />
                    Admin
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[920px] lg:hidden">
          <div className="rounded-3xl border border-[#E5E7EB] dark:border-white/10 bg-white/92 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="mb-3 flex items-center gap-3">
            <Link
              href="/app/crm"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 py-1 text-xs font-semibold text-[#374151] transition hover:border-[#D6DAE1] hover:bg-[#FCFCFD]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to CRM
            </Link>
            <div className="inline-flex items-center rounded-full border border-[#E5E7EB] dark:border-white/10 bg-[#F9FAFB] dark:bg-white/[0.04] px-3 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-white/55">
              Account settings
            </div>
          </div>
          <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[#111827]">
            Settings
          </h1>
          <p className="mt-1 max-w-[560px] text-[13px] leading-4 text-[#6B7280] dark:text-white/55">
            Manage account-level destinations separately from workspace configuration.
          </p>

          <div className="mt-3 grid grid-cols-1 gap-2">
            <Link
              href="/app/profile"
              className="group rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] p-3 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition hover:border-[#D6DAE1] hover:bg-[#FCFCFD]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F3F4F6] text-[#4B5563] dark:text-white/70">
                    <UserCircle2 className="h-[18px] w-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-base font-semibold leading-tight text-[#111827]">Profile</div>
                    <div className="truncate text-xs leading-4 text-[#6B7280] dark:text-white/55">
                      View your account identity and contact details.
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#9CA3AF] dark:text-white/40 transition group-hover:text-[#4B5563]" />
              </div>
            </Link>

            <Link
              href={`/b/${workspace.slug}/settings`}
              className="group rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] p-3 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition hover:border-[#D6DAE1] hover:bg-[#FCFCFD]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F3F4F6] text-[#4B5563] dark:text-white/70">
                    <Settings className="h-[18px] w-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-base font-semibold leading-tight text-[#111827]">Workspace settings</div>
                    <div className="truncate text-xs leading-4 text-[#6B7280] dark:text-white/55">
                      Configure business details, team access, invites, and statuses for {workspace.name || workspace.slug}.
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#9CA3AF] dark:text-white/40 transition group-hover:text-[#4B5563]" />
              </div>
            </Link>

            <Link
              href="/app/settings/billing"
              className="group rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] p-3 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition hover:border-[#D6DAE1] hover:bg-[#FCFCFD]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F3F4F6] text-[#4B5563] dark:text-white/70">
                    <CreditCard className="h-[18px] w-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-base font-semibold leading-tight text-[#111827]">Billing</div>
                    <div className="truncate text-xs leading-4 text-[#6B7280] dark:text-white/55">
                      Manage your subscription, plan and limits.
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#9CA3AF] dark:text-white/40 transition group-hover:text-[#4B5563]" />
              </div>
            </Link>
          </div>

          <div className="mt-3 rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-[#F9FAFB] dark:bg-white/[0.04] p-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF] dark:text-white/40">
              Signed in as
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="text-sm font-semibold text-[#111827]">{accountLabel}</div>
              <div className="text-xs text-[#6B7280] dark:text-white/55">
                Workspace: {workspace.name || workspace.slug}
              </div>
            </div>

            {adminHref ? (
              <Link
                href={adminHref}
                className="mt-2 inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-2.5 py-1 text-[11px] font-semibold text-[#374151] shadow-sm transition hover:border-[#D6DAE1] hover:bg-[#FCFCFD]"
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            ) : null}
          </div>
        </div>
        </div>
      </div>
    </main>
  );
}
