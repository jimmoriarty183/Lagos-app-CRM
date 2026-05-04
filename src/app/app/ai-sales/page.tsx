import { redirect } from "next/navigation";
import { isPlatformModuleEnabled } from "@/config/modules";
import { resolveCurrentWorkspace } from "@/lib/platform/workspace";
import { supabaseServerReadOnly } from "@/lib/supabase/server";
import TopBar from "@/app/b/[slug]/_components/topbar/TopBar";
import type { BusinessOption } from "@/app/b/[slug]/_components/topbar/BusinessSwitcher";
import { loadUserProfileSafe } from "@/lib/profile";
import { getAdminUsersPath, isAdminEmail } from "@/lib/admin-access";
import { resolveUserDisplay } from "@/lib/user-display";

function upperRole(
  value: string | null | undefined,
): "OWNER" | "MANAGER" | "GUEST" {
  const n = String(value ?? "")
    .trim()
    .toUpperCase();
  if (n === "OWNER") return "OWNER";
  if (n === "MANAGER") return "MANAGER";
  return "GUEST";
}

export default async function AiSalesManagerPage() {
  if (!isPlatformModuleEnabled("ai_sales")) {
    redirect("/app");
  }

  const [workspaceData, supabase] = await Promise.all([
    resolveCurrentWorkspace(),
    supabaseServerReadOnly(),
  ]);

  if (!workspaceData.user) {
    redirect("/login?next=%2Fapp%2Fai-sales");
  }

  if (!workspaceData.workspace) {
    redirect("/select-business");
  }

  const { user, workspace } = workspaceData;

  const [profile, membershipsResult] = await Promise.all([
    loadUserProfileSafe(supabase, user.id),
    supabase
      .from("memberships")
      .select("business_id, role")
      .eq("user_id", user.id),
  ]);

  const membershipRows = (membershipsResult.data ?? []) as {
    business_id: string;
    role: string | null;
  }[];
  const businessIds = membershipRows.map((m) => m.business_id);
  const { data: businessRows } = await supabase
    .from("businesses")
    .select("id, slug, name")
    .in("id", businessIds);

  const businesses: BusinessOption[] = (businessRows ?? []).map((b) => {
    const memberRole = membershipRows.find((m) => m.business_id === b.id)?.role;
    return {
      id: String(b.id),
      slug: String(b.slug ?? b.id),
      name: String(b.name ?? b.slug ?? b.id),
      role: upperRole(memberRole),
    };
  });

  const currentUserName =
    resolveUserDisplay(profile ?? {}).primary || user.email || "User";
  const currentUserAvatarUrl =
    String(profile?.avatar_url ?? "").trim() || undefined;
  const role = upperRole(workspace.role);
  const adminHref = isAdminEmail(user.email) ? getAdminUsersPath() : undefined;

  return (
    <>
      <TopBar
        businessSlug={workspace.slug}
        businessId={workspace.id}
        role={role}
        currentUserName={currentUserName}
        currentUserAvatarUrl={currentUserAvatarUrl}
        currentPlan={workspace.plan}
        businesses={businesses}
        businessHref={`/b/${workspace.slug}`}
        settingsHref="/app/settings"
        adminHref={adminHref}
      />
      <main className="mx-auto max-w-[920px] px-4 pt-[72px] pb-16">
        <div className="rounded-2xl border border-[var(--neutral-200)] bg-white p-8 shadow-sm dark:border-white/10 dark:bg-[#0E0E1B]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-600)]">
            Ordo AI Sales Manager
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--neutral-900)] dark:text-white">
            Connect your Instagram Business account
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--neutral-600)] dark:text-white/70">
            Let Ordo answer your Instagram DMs automatically using your product
            catalog. Connect your Instagram Business account to get started —
            customers messaging your account will receive contextual replies
            powered by Gemini using only your catalog as the source of truth.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--brand-600)] px-5 text-sm font-medium text-white opacity-60"
              title="Coming next: OAuth connect flow"
            >
              Connect Instagram (coming soon)
            </button>
            <a
              href="/ordo-ai-sales/en"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--neutral-300)] bg-white px-4 text-sm font-medium text-[var(--neutral-800)] hover:bg-[var(--neutral-50)] dark:border-white/15 dark:bg-transparent dark:text-white dark:hover:bg-white/5"
            >
              Learn more
            </a>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <Stat label="Status" value="Setup pending" />
            <Stat label="Connected account" value="—" />
            <Stat label="Replies sent (24h)" value="—" />
          </div>
        </div>
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-3 dark:border-white/10 dark:bg-white/5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--neutral-500)] dark:text-white/50">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-[var(--neutral-900)] dark:text-white">
        {value}
      </p>
    </div>
  );
}
