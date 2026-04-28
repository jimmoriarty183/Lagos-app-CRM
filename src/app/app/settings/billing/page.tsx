import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";

import TeamAccessTopBar from "@/app/b/[slug]/settings/team/TeamAccessTopBar";
import DesktopLeftRail from "@/app/b/[slug]/_components/Desktop/DesktopLeftRail";
import { getAdminUsersPath, isAdminEmail } from "@/lib/admin-access";
import { isDemoEmail } from "@/lib/billing/demo";
import { listEntitlements } from "@/lib/billing/entitlements";
import { getSubscriptionSnapshot } from "@/lib/billing/subscriptions";
import type { SubscriptionSnapshot } from "@/lib/billing/types";
import {
  countOwnerBusinesses,
  resolveOwnerAccountId,
} from "@/lib/businesses/business-limits-service";
import { resolveCurrentWorkspace } from "@/lib/platform/workspace";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServerReadOnly } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import BillingCheckoutModal from "@/app/app/settings/billing/BillingCheckoutModal";
import BillingReturnWatcher from "@/app/app/settings/billing/BillingReturnWatcher";
import BillingSubscriptionActions from "@/app/app/settings/billing/BillingSubscriptionActions";
import { loadUserProfileSafe } from "@/lib/profile";
import { resolveUserDisplay } from "@/lib/user-display";

type Role = "OWNER" | "MANAGER" | "GUEST";

function upperRole(value: string | null | undefined): Role {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "OWNER") return "OWNER";
  if (normalized === "MANAGER") return "MANAGER";
  return "GUEST";
}

function toTitle(value: string | null | undefined, fallback = "Not available") {
  if (!value) return fallback;
  const normalized = value.replaceAll("_", " ").trim();
  if (!normalized) return fallback;
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function resolveMaxBusinesses(entitlements: Awaited<ReturnType<typeof listEntitlements>>) {
  const entry = entitlements.find((item) => item.featureCode === "max_businesses");
  if (!entry || entry.valueType !== "integer") {
    return null;
  }
  const parsed = Number(entry.value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return Math.floor(parsed);
}

function SummaryItem({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">{label}</div>
      <div className={`mt-1 text-sm font-semibold leading-tight ${valueClassName ?? "text-[#111827]"}`}>{value}</div>
    </div>
  );
}

export default async function BillingSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const requestedPlan = String(resolvedSearchParams.plan ?? "").trim();
  const requestedInterval = String(resolvedSearchParams.interval ?? "").trim();
  const checkoutState = String(resolvedSearchParams.checkout ?? "").trim().toLowerCase();
  const autoCheckoutFlag = String(resolvedSearchParams.autocheckout ?? "").trim() === "1";
  const nextPath = (() => {
    const params = new URLSearchParams();
    if (requestedPlan) params.set("plan", requestedPlan);
    if (requestedInterval) params.set("interval", requestedInterval);
    if (autoCheckoutFlag) params.set("autocheckout", "1");
    const query = params.toString();
    return query ? `/app/settings/billing?${query}` : "/app/settings/billing";
  })();
  const [{ user, workspace: cookieWorkspace, workspaces }, supabase] = await Promise.all([
    resolveCurrentWorkspace(),
    supabaseServerReadOnly(),
  ]);

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (!cookieWorkspace) {
    redirect("/select-business");
  }

  const requestedSlug = String(resolvedSearchParams.b ?? "").trim();
  const workspace =
    (requestedSlug
      ? workspaces.find((w) => w.slug === requestedSlug)
      : undefined) ?? cookieWorkspace;

  const role = upperRole(workspace.role);
  const accountLabel = user.email || user.phone || "User";
  let currentUserName = accountLabel;
  let currentUserAvatarUrl: string | undefined;
  const adminHref = isAdminEmail(user.email) ? getAdminUsersPath() : undefined;

  try {
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

  let ownerUserId: string | null = role === "OWNER" ? user.id : null;
  if (!ownerUserId && role === "OWNER") {
    const ownerMembership = await supabase
      .from("memberships")
      .select("user_id")
      .eq("business_id", workspace.id)
      .eq("role", "owner")
      .order("created_at", { ascending: true })
      .limit(1);
    if (!ownerMembership.error) {
      ownerUserId = String((ownerMembership.data ?? [])[0]?.user_id ?? "").trim() || null;
    }
  }

  let accountId: string | null = null;
  let subscription: SubscriptionSnapshot | null = null;
  let ownerBusinessesUsed: number | null = null;
  let maxBusinesses: number | null = null;
  let loadError: string | null = null;
  let accountLookupFailed = false;
  let snapshotFailed = false;
  let billingReader: SupabaseClient = supabase;

  if (ownerUserId) {
    try {
      billingReader = supabaseAdmin();
    } catch (error) {
      // Keep page functional even if service-role env is unavailable in runtime.
      console.error("[settings/billing] failed to init admin client", error);
    }

    try {
      accountId = await resolveOwnerAccountId(billingReader, ownerUserId);
      if (!accountId && workspace.slug) {
        const fallbackBySlug = await billingReader
          .from("accounts")
          .select("id")
          .eq("slug", workspace.slug)
          .maybeSingle();
        if (!fallbackBySlug.error) {
          accountId = String((fallbackBySlug.data as { id?: string } | null)?.id ?? "").trim() || null;
        }
      }
    } catch (error) {
      accountLookupFailed = true;
      console.error("[settings/billing] failed to resolve owner account", error);
      loadError = "Billing summary is temporarily unavailable.";
    }

    if (accountId) {
      const [snapshotResult, entitlementsResult, usageResult] = await Promise.allSettled([
        getSubscriptionSnapshot(billingReader, accountId),
        listEntitlements(billingReader, accountId),
        countOwnerBusinesses(billingReader, ownerUserId),
      ]);

      if (snapshotResult.status === "fulfilled") {
        subscription = snapshotResult.value;
      } else {
        snapshotFailed = true;
        console.error("[settings/billing] failed to load subscription snapshot", snapshotResult.reason);
      }

      if (entitlementsResult.status === "fulfilled") {
        maxBusinesses = resolveMaxBusinesses(entitlementsResult.value);
      } else {
        console.error("[settings/billing] failed to load entitlements", entitlementsResult.reason);
      }

      if (usageResult.status === "fulfilled") {
        ownerBusinessesUsed = usageResult.value;
      } else {
        console.error("[settings/billing] failed to load owner usage", usageResult.reason);
      }
    }

    if (!accountId && !accountLookupFailed) {
      loadError = null;
    } else if (snapshotFailed && !loadError) {
      loadError = "Billing summary is temporarily unavailable.";
    }
  }

  const planName = subscription?.plan?.name ?? "No active plan";
  const normalizedSubscriptionStatus = String(subscription?.status ?? "").toLowerCase();
  const hasScheduledCancellation =
    Boolean(subscription?.subscriptionId) &&
    Boolean(subscription?.cancelAtPeriodEnd) &&
    normalizedSubscriptionStatus !== "canceled" &&
    normalizedSubscriptionStatus !== "expired";
  const statusLabel = hasScheduledCancellation
    ? "Canceled"
    : subscription?.status
      ? toTitle(subscription.status)
      : "No active subscription";
  const isNegativeStatus =
    hasScheduledCancellation ||
    normalizedSubscriptionStatus === "canceled" ||
    normalizedSubscriptionStatus === "expired";
  const intervalLabel =
    subscription?.billingInterval === "month"
      ? "Monthly"
      : subscription?.billingInterval === "year"
        ? "Yearly"
        : "Not set";
  const renewalDate = formatDate(subscription?.nextBillingAt);
  const renewalLabel = hasScheduledCancellation ? "Access until" : "Renewal date";
  const autoRenewLabel =
    subscription?.subscriptionId &&
    normalizedSubscriptionStatus !== "canceled" &&
    normalizedSubscriptionStatus !== "expired"
      ? subscription.cancelAtPeriodEnd
        ? "Off"
        : "On"
      : "Not active";
  const usageLabel =
    ownerBusinessesUsed === null
      ? "Unavailable"
      : maxBusinesses === null
        ? `${ownerBusinessesUsed} / Unlimited`
        : `${ownerBusinessesUsed} / ${maxBusinesses}`;

  const content = (
    <div className="rounded-3xl border border-[#E5E7EB] bg-white/92 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
      <Link
        href="/app/settings"
        className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-semibold text-[#374151] transition hover:border-[#D6DAE1] hover:bg-[#FCFCFD]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </Link>
      <div className="mt-2 inline-flex items-center rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
        Account settings
      </div>
      <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-[#111827]">Billing</h1>
      <p className="mt-1 max-w-[640px] text-[13px] leading-4 text-[#6B7280]">
        Review current plan, renewal details, and workspace business capacity.
      </p>

      {role !== "OWNER" ? (
        <div className="mt-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
          <div className="text-sm font-semibold text-[#111827]">Invited workspace member</div>
          <p className="mt-1 text-[13px] leading-5 text-[#6B7280]">
            Billing and subscription details are visible only to the workspace owner.
          </p>
        </div>
      ) : null}

      {role === "OWNER" ? (
        <>
          {loadError ? (
            <div className="mt-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-[13px] leading-5 text-[#991B1B]">
              {loadError}
            </div>
          ) : null}

          {accountId ? (
            <BillingReturnWatcher
              accountId={accountId}
              enabled={
                role === "OWNER" &&
                checkoutState === "success" &&
                !subscription?.subscriptionId
              }
            />
          ) : null}

          {!accountId && !accountLookupFailed ? (
            <div className="mt-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
              <div className="text-base font-semibold text-[#111827]">Billing account not configured</div>
              <div className="mt-1 text-sm leading-5 text-[#6B7280]">
                No billing account was found for this workspace owner yet.
              </div>
            </div>
          ) : null}

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <SummaryItem label="Current plan" value={planName} />
            <SummaryItem label="Subscription status" value={statusLabel} valueClassName={isNegativeStatus ? "text-red-500" : undefined} />
            <SummaryItem label="Billing interval" value={intervalLabel} />
            <SummaryItem label={renewalLabel} value={renewalDate} />
            <SummaryItem label="Auto-renew" value={autoRenewLabel} />
            <SummaryItem label="Business capacity" value={usageLabel} />
          </div>

          <div className="mt-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
              <Sparkles className="h-4 w-4 text-[#4B5563]" />
              Payment model
            </div>
            <p className="mt-1 text-sm leading-5 text-[#6B7280]">
              Subscription is recurring and renews automatically every billing cycle unless canceled.
            </p>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <BillingCheckoutModal
              isOwner={role === "OWNER"}
              isDemo={isDemoEmail(user.email)}
              customerEmail={String(user.email ?? "").trim()}
              accountId={accountId}
              ownerUserId={ownerUserId}
              workspaceId={workspace.id}
              workspaceSlug={workspace.slug}
              initialPlan={requestedPlan}
              initialInterval={requestedInterval}
              currentPlan={subscription?.plan?.code ?? null}
              currentInterval={subscription?.billingInterval ?? null}
              autoCheckout={autoCheckoutFlag}
            />
            <BillingSubscriptionActions
              isOwner={role === "OWNER"}
              accountId={accountId}
              subscriptionId={subscription?.subscriptionId ?? null}
              subscriptionStatus={subscription?.status ?? null}
              cancelAtPeriodEnd={Boolean(subscription?.cancelAtPeriodEnd)}
            />
            <Link
              href="/app/settings"
              className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-sm font-semibold text-[#374151] transition hover:border-[#D6DAE1] hover:bg-[#FCFCFD]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to settings
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#EEF2FF_100%)] text-[#111827]">
      <TeamAccessTopBar
        ordersHref={`/b/${workspace.slug}`}
        userLabel={currentUserName}
        profileHref="/app/profile"
        currentPlan={subscription?.plan?.code ?? null}
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

          <div className="w-full min-w-0">{content}</div>
        </div>

        <div className="mx-auto max-w-[920px] lg:hidden">{content}</div>
      </div>
    </main>
  );
}
