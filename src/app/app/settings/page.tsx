import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Settings, Shield, UserCircle2 } from "lucide-react";

import { resolveCurrentWorkspace } from "@/lib/platform/workspace";
import { getAdminUsersPath, isAdminEmail } from "@/lib/admin-access";
import TeamAccessTopBar from "@/app/b/[slug]/settings/team/TeamAccessTopBar";

export default async function PlatformSettingsPage() {
  const { user, workspace } = await resolveCurrentWorkspace();

  if (!user) {
    redirect("/login?next=%2Fapp%2Fsettings");
  }

  if (!workspace) {
    redirect("/select-business");
  }

  const adminHref = isAdminEmail(user.email) ? getAdminUsersPath() : undefined;
  const accountLabel = user.email || user.phone || "User";

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#EEF2FF_100%)] text-[#111827]">
      <TeamAccessTopBar
        ordersHref="/app/crm"
        userLabel={accountLabel}
        profileHref="/app/profile"
        adminHref={adminHref}
      />

      <div className="container-standard max-w-[920px] pb-10 pt-[88px] sm:pt-[88px]">
        <div className="rounded-[28px] border border-[#E5E7EB] bg-white/92 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="inline-flex items-center rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
            Account settings
          </div>
          <h1 className="mt-4 text-[32px] font-semibold tracking-[-0.03em] text-[#111827]">
            Settings
          </h1>
          <p className="mt-2 max-w-[560px] text-sm leading-6 text-[#6B7280]">
            Manage account-level destinations separately from workspace configuration.
          </p>

          <div className="grid-container mt-6">
            <Link
              href="/app/profile"
              className="group col-12 sm:col-6 rounded-[22px] border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition hover:border-[#D6DAE1] hover:bg-[#FCFCFD]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F3F4F6] text-[#4B5563]">
                    <UserCircle2 className="h-5 w-5" />
                  </div>
                  <div className="mt-4 text-lg font-semibold text-[#111827]">Profile</div>
                  <div className="mt-1 text-sm leading-6 text-[#6B7280]">
                    View your account identity and contact details.
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-[#9CA3AF] transition group-hover:text-[#4B5563]" />
              </div>
            </Link>

            <Link
              href={`/b/${workspace.slug}/settings`}
              className="group col-12 sm:col-6 rounded-[22px] border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition hover:border-[#D6DAE1] hover:bg-[#FCFCFD]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F3F4F6] text-[#4B5563]">
                    <Settings className="h-5 w-5" />
                  </div>
                  <div className="mt-4 text-lg font-semibold text-[#111827]">Workspace settings</div>
                  <div className="mt-1 text-sm leading-6 text-[#6B7280]">
                    Configure business details, team access, invites, and statuses for {workspace.name || workspace.slug}.
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-[#9CA3AF] transition group-hover:text-[#4B5563]" />
              </div>
            </Link>
          </div>

          <div className="mt-6 rounded-[22px] border border-[#E5E7EB] bg-[#F9FAFB] p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
              Signed in as
            </div>
            <div className="mt-2 text-sm font-semibold text-[#111827]">{accountLabel}</div>
            <div className="mt-1 text-sm text-[#6B7280]">
              Current workspace: {workspace.name || workspace.slug}
            </div>

            {adminHref ? (
              <Link
                href={adminHref}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-[12px] font-semibold text-[#374151] shadow-sm transition hover:border-[#D6DAE1] hover:bg-[#FCFCFD]"
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
