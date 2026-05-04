import { redirect } from "next/navigation";
import { isPlatformModuleEnabled } from "@/config/modules";
import { resolveCurrentWorkspace } from "@/lib/platform/workspace";
import {
  supabaseServerReadOnly,
  supabaseServiceRole,
} from "@/lib/supabase/server";
import TopBar from "@/app/b/[slug]/_components/topbar/TopBar";
import type { BusinessOption } from "@/app/b/[slug]/_components/topbar/BusinessSwitcher";
import { loadUserProfileSafe } from "@/lib/profile";
import { getAdminUsersPath, isAdminEmail } from "@/lib/admin-access";
import { resolveUserDisplay } from "@/lib/user-display";
import { BASE_SYSTEM_PROMPT } from "@/lib/instagram/sales-bot";
import ConnectionConfigForm from "./ConnectionConfigForm";

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

type SearchParams = Promise<{
  status?: string;
  username?: string;
  reason?: string;
}>;

export default async function AiSalesManagerPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!isPlatformModuleEnabled("ai_sales")) {
    redirect("/app");
  }

  const [workspaceData, supabase, params] = await Promise.all([
    resolveCurrentWorkspace(),
    supabaseServerReadOnly(),
    searchParams,
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
  const canManageConnection = role === "OWNER" || role === "MANAGER";

  // Look up active Instagram connection for this workspace.
  // Service role bypasses RLS — we already gated on workspace membership above.
  const admin = supabaseServiceRole();
  const { data: connectionRow } = await admin
    .from("instagram_connections")
    .select(
      "id, ig_user_id, ig_username, ig_account_type, expires_at, webhook_subscribed, catalog_sheet_id, catalog_sheet_gid, system_prompt, enabled, created_at",
    )
    .eq("business_id", workspace.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const connection = connectionRow ?? null;
  const status = params?.status ?? null;
  const statusUsername = params?.username ?? null;
  const statusReason = params?.reason ?? null;

  const connectHref = `/api/instagram/oauth/start?business_id=${encodeURIComponent(workspace.id)}`;

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
        {status === "connected" && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            Instagram account <strong>@{statusUsername}</strong> connected. The
            bot will now respond to incoming DMs.
          </div>
        )}
        {status === "denied" && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
            Instagram connection canceled
            {statusReason ? ` (${statusReason})` : ""}.
          </div>
        )}
        {status === "error" && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
            Instagram connection failed
            {statusReason ? `: ${statusReason}` : ""}. Try again or contact
            support@ordo.uno.
          </div>
        )}

        <div className="rounded-2xl border border-[var(--neutral-200)] bg-white p-8 shadow-sm dark:border-white/10 dark:bg-[#0E0E1B]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-600)]">
            Ordo AI Sales Manager
          </p>

          {connection ? (
            <>
              <h1 className="mt-2 text-2xl font-semibold text-[var(--neutral-900)] dark:text-white">
                @{connection.ig_username} connected
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--neutral-600)] dark:text-white/70">
                Incoming Instagram Direct Messages on this account are being
                answered automatically by the AI sales manager using your
                product catalog as the only source of truth.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <Stat
                  label="Account type"
                  value={connection.ig_account_type ?? "—"}
                />
                <Stat
                  label="Webhook"
                  value={connection.webhook_subscribed ? "Active" : "Pending"}
                />
                <Stat
                  label="Catalog"
                  value={
                    connection.catalog_sheet_id
                      ? "Configured"
                      : "Not configured"
                  }
                />
              </div>

              <div className="mt-6 text-xs text-[var(--neutral-500)] dark:text-white/50">
                IG account id: <code>{connection.ig_user_id}</code> · token
                expires{" "}
                {connection.expires_at
                  ? new Date(connection.expires_at).toLocaleDateString()
                  : "—"}
              </div>

              {canManageConnection && (
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <a
                    href={connectHref}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--neutral-300)] bg-white px-4 text-sm font-medium text-[var(--neutral-800)] hover:bg-[var(--neutral-50)] dark:border-white/15 dark:bg-transparent dark:text-white dark:hover:bg-white/5"
                  >
                    Reconnect / refresh token
                  </a>
                </div>
              )}

              {canManageConnection && (
                <ConnectionConfigForm
                  connectionId={connection.id}
                  initialSheetId={connection.catalog_sheet_id ?? ""}
                  initialSheetGid={connection.catalog_sheet_gid ?? "0"}
                  initialSystemPrompt={connection.system_prompt ?? ""}
                  initialEnabled={connection.enabled}
                  basePromptPlaceholder={BASE_SYSTEM_PROMPT}
                />
              )}
            </>
          ) : (
            <>
              <h1 className="mt-2 text-2xl font-semibold text-[var(--neutral-900)] dark:text-white">
                Connect your Instagram Business account
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--neutral-600)] dark:text-white/70">
                Let Ordo answer your Instagram DMs automatically using your
                product catalog. Customers messaging your account will receive
                contextual replies powered by Gemini using only your catalog as
                the source of truth.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                {canManageConnection ? (
                  <a
                    href={connectHref}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--brand-600)] px-5 text-sm font-medium text-white hover:bg-[var(--brand-700)]"
                  >
                    Connect Instagram
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--brand-600)] px-5 text-sm font-medium text-white opacity-60"
                    title="Owner or manager role required"
                  >
                    Connect Instagram (owner/manager only)
                  </button>
                )}
                <a
                  href="/ordo-ai-sales/en"
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--neutral-300)] bg-white px-4 text-sm font-medium text-[var(--neutral-800)] hover:bg-[var(--neutral-50)] dark:border-white/15 dark:bg-transparent dark:text-white dark:hover:bg-white/5"
                >
                  Learn more
                </a>
              </div>

              <p className="mt-6 text-xs text-[var(--neutral-500)] dark:text-white/50">
                Requires an Instagram Business or Creator account. You will be
                redirected to Instagram to approve access; we never see your
                Instagram password.
              </p>
            </>
          )}
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
