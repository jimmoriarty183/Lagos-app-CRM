import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";

import TeamAccessTopBar from "@/app/b/[slug]/settings/team/TeamAccessTopBar";
import DesktopLeftRail from "@/app/b/[slug]/_components/Desktop/DesktopLeftRail";
import { getAdminUsersPath, isAdminEmail } from "@/lib/admin-access";
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

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">{label}</div>
      <div className="mt-2 text-sm font-semibold text-[#111827]">{value}</div>
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
  const nextPath = (() => {
    const params = new URLSearchParams();
    if (requestedPlan) params.set("plan", requestedPlan);
    if (requestedInterval) params.set("interval", requestedInterval);
    const query = params.toString();
    return query ? `/app/settings/billing?${query}` : "/app/settings/billing";
  })();
  const [{ user, workspace }, supabase] = await Promise.all([
    resolveCurrentWorkspace(),
    supabaseServerReadOnly(),
  ]);

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (!workspace) {
    redirect("/select-business");
  }

  const role = upperRole(workspace.role);
  const accountLabel = user.email || user.phone || "User";
  const adminHref = isAdminEmail(user.email) ? getAdminUsersPath() : undefined;

  let ownerUserId: string | null = role === "OWNER" ? user.id : null;
  if (!ownerUserId) {
    const ownerMembership = await supabase
      .from("memberships")
      .select("user_id")
      .eq("business_id", workspace.id)
      .or("role.eq.OWNER,role.eq.owner")
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
  const statusLabel = subscription?.status
    ? toTitle(subscription.status)
    : "No active subscription";
  const intervalLabel =
    subscription?.billingInterval === "month"
      ? "Monthly"
      : subscription?.billingInterval === "year"
        ? "Yearly"
        : "Not set";
  const renewalDate = formatDate(subscription?.nextBillingAt);
  const autoRenewLabel = subscription?.subscriptionId
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
    <div className="rounded-[28px] border border-[#E5E7EB] bg-white/92 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="inline-flex items-center rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
        Account settings
      </div>
      <h1 className="mt-4 text-[32px] font-semibold tracking-[-0.03em] text-[#111827]">Billing</h1>
      <p className="mt-2 max-w-[640px] text-sm leading-6 text-[#6B7280]">
        Review current plan, renewal details, and workspace business capacity.
      </p>

      {role !== "OWNER" ? (
        <div className="mt-5 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-4 text-sm text-[#92400E]">
          Only workspace owner can manage billing and upgrades. You can view billing summary in read-only mode.
        </div>
      ) : null}

      {loadError ? (
        <div className="mt-5 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]">
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
        <div className="mt-6 rounded-[22px] border border-[#E5E7EB] bg-[#F9FAFB] p-5">
          <div className="text-base font-semibold text-[#111827]">Billing account not configured</div>
          <div className="mt-2 text-sm leading-6 text-[#6B7280]">
            No billing account was found for this workspace owner yet.
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SummaryItem label="Current plan" value={planName} />
        <SummaryItem label="Subscription status" value={statusLabel} />
        <SummaryItem label="Billing interval" value={intervalLabel} />
        <SummaryItem label="Renewal date" value={renewalDate} />
        <SummaryItem label="Auto-renew" value={autoRenewLabel} />
        <SummaryItem label="Business capacity" value={usageLabel} />
      </div>

      <div className="mt-6 rounded-[22px] border border-[#E5E7EB] bg-[#F9FAFB] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
          <Sparkles className="h-4 w-4 text-[#4B5563]" />
          Payment model
        </div>
        <p className="mt-2 text-sm leading-6 text-[#6B7280]">
          Subscription is recurring and renews automatically every billing cycle unless canceled.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {role === "OWNER" ? (
          <BillingCheckoutModal
            isOwner={role === "OWNER"}
            customerEmail={String(user.email ?? "").trim()}
            accountId={accountId}
            ownerUserId={ownerUserId}
            workspaceId={workspace.id}
            workspaceSlug={workspace.slug}
            initialPlan={requestedPlan}
            initialInterval={requestedInterval}
          />
        ) : (
          <BillingCheckoutModal
            isOwner={false}
            customerEmail={String(user.email ?? "").trim()}
            accountId={accountId}
            ownerUserId={ownerUserId}
            workspaceId={workspace.id}
            workspaceSlug={workspace.slug}
          />
        )}
        <BillingSubscriptionActions
          isOwner={role === "OWNER"}
          accountId={accountId}
          subscriptionId={subscription?.subscriptionId ?? null}
          subscriptionStatus={subscription?.status ?? null}
          cancelAtPeriodEnd={Boolean(subscription?.cancelAtPeriodEnd)}
        />
        <Link
          href="/app/settings"
          className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-[#374151] transition hover:border-[#D6DAE1] hover:bg-[#FCFCFD]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to settings
        </Link>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#EEF2FF_100%)] text-[#111827]">
      <TeamAccessTopBar
        ordersHref="/app/crm"
        userLabel={accountLabel}
        profileHref="/app/profile"
        adminHref={adminHref}
      />

      <div className="container-standard overflow-x-clip pb-10 pt-[88px] sm:pt-[88px]">
        <div className="hidden items-start lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-5">
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
            catalogHref={`/b/${workspace.slug}/catalog/products`}
            analyticsHref={`/b/${workspace.slug}/analytics`}
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
