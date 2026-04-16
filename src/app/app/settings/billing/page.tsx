import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  Building2,
  CreditCard,
  Shield,
} from "lucide-react";

import TeamAccessTopBar from "@/app/b/[slug]/settings/team/TeamAccessTopBar";
import DesktopLeftRail from "@/app/b/[slug]/_components/Desktop/DesktopLeftRail";
import { getAdminUsersPath, isAdminEmail } from "@/lib/admin-access";
import { listEntitlements } from "@/lib/billing/entitlements";
import { getSubscriptionSnapshot } from "@/lib/billing/subscriptions";
import {
  countOwnerBusinesses,
  resolveOwnerAccountId,
} from "@/lib/businesses/business-limits-service";
import { resolveCurrentWorkspace } from "@/lib/platform/workspace";
import { supabaseAdmin } from "@/lib/supabase/admin";

function upperRole(value: string | null | undefined): "OWNER" | "MANAGER" | "GUEST" {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "OWNER") return "OWNER";
  if (normalized === "MANAGER") return "MANAGER";
  return "GUEST";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
  }).format(date);
}

function prettifyStatus(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "No active plan";
  return normalized.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function prettifyInterval(value: string | null | undefined) {
  if (value === "month") return "Monthly";
  if (value === "year") return "Yearly";
  return "—";
}

function resolveAutoRenewLabel(input: {
  subscriptionId: string | null;
  cancelAtPeriodEnd: boolean;
  status: string | null;
}) {
  if (!input.subscriptionId || !input.status) return "Off";
  if (input.cancelAtPeriodEnd) return "Off (ends after current period)";
  return "On";
}

function entitlementValueToNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

type BillingSummary = {
  accountId: string | null;
  currentPlanName: string;
  currentPlanCode: string | null;
  status: string;
  interval: string;
  nextBillingAt: string;
  autoRenew: string;
  maxBusinesses: number | null;
  currentBusinesses: number | null;
  canManageBilling: boolean;
};

async function loadBillingSummary(input: {
  userId: string;
  role: "OWNER" | "MANAGER" | "GUEST";
}): Promise<BillingSummary> {
  if (input.role !== "OWNER") {
    return {
      accountId: null,
      currentPlanName: "Billing available to workspace owners",
      currentPlanCode: null,
      status: "View only",
      interval: "—",
      nextBillingAt: "—",
      autoRenew: "—",
      maxBusinesses: null,
      currentBusinesses: null,
      canManageBilling: false,
    };
  }

  const admin = supabaseAdmin();
  const accountId = await resolveOwnerAccountId(admin, input.userId);

  if (!accountId) {
    return {
      accountId: null,
      currentPlanName: "No billing account",
      currentPlanCode: null,
      status: "Not configured",
      interval: "—",
      nextBillingAt: "—",
      autoRenew: "—",
      maxBusinesses: null,
      currentBusinesses: 0,
      canManageBilling: true,
    };
  }

  const [subscription, entitlements, currentBusinesses] = await Promise.all([
    getSubscriptionSnapshot(admin, accountId),
    listEntitlements(admin, accountId),
    countOwnerBusinesses(admin, input.userId),
  ]);

  const maxBusinessesEntitlement =
    entitlements.find((item) => item.featureCode === "max_businesses") ?? null;

  const maxBusinesses =
    maxBusinessesEntitlement?.valueType === "integer"
      ? entitlementValueToNumber(maxBusinessesEntitlement.value)
      : null;

  return {
    accountId,
    currentPlanName: subscription.plan?.name ?? "No active plan",
    currentPlanCode: subscription.plan?.code ?? null,
    status: prettifyStatus(subscription.status),
    interval: prettifyInterval(subscription.billingInterval),
    nextBillingAt: formatDateTime(subscription.nextBillingAt),
    autoRenew: resolveAutoRenewLabel({
      subscriptionId: subscription.subscriptionId,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      status: subscription.status,
    }),
    maxBusinesses,
    currentBusinesses,
    canManageBilling: true,
  };
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[20px] border border-[#E5E7EB] bg-[#F9FAFB] p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
        {label}
      </div>
      <div className="mt-2 text-base font-semibold text-[#111827]">{value}</div>
      <div className="mt-1 text-sm text-[#6B7280]">{hint}</div>
    </div>
  );
}

export default async function BillingSettingsPage() {
  const { user, workspace } = await resolveCurrentWorkspace();

  if (!user) {
    redirect("/login?next=%2Fapp%2Fsettings%2Fbilling");
  }

  if (!workspace) {
    redirect("/select-business");
  }

  const adminHref = isAdminEmail(user.email) ? getAdminUsersPath() : undefined;
  const accountLabel = user.email || user.phone || "User";
  const role = upperRole(workspace.role);
  const billing = await loadBillingSummary({ userId: user.id, role });

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

          <div className="w-full min-w-0">
            <div className="rounded-[28px] border border-[#E5E7EB] bg-white/92 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="inline-flex items-center rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
                Billing settings
              </div>
              <h1 className="mt-4 text-[32px] font-semibold tracking-[-0.03em] text-[#111827]">
                Current plan
              </h1>
              <p className="mt-2 max-w-[620px] text-sm leading-6 text-[#6B7280]">
                Your subscription renews automatically unless you cancel it. Workspace limits and access are driven by the active plan on your account.
              </p>

              <div className="mt-6 rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#4F46E5]">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div className="mt-4 text-lg font-semibold text-[#111827]">Billing summary</div>
                    <div className="mt-1 text-sm leading-6 text-[#6B7280]">
                      Review your current subscription, renewal behaviour and business capacity.
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href="/app/settings"
                      className="inline-flex items-center gap-2 rounded-full border border-[#D6DAE1] bg-white px-4 py-2 text-sm font-semibold text-[#374151] transition hover:border-[#C7D2FE] hover:bg-[#F9FAFB]"
                    >
                      Back to settings
                    </Link>
                    <Link
                      href="/pricing"
                      className="inline-flex items-center gap-2 rounded-full border border-[#111827] bg-[#111827] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1F2937]"
                    >
                      Upgrade plan
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <MetricCard
                    label="Current plan"
                    value={billing.currentPlanName}
                    hint={billing.currentPlanCode ? billing.currentPlanCode : "No active plan code"}
                  />
                  <MetricCard
                    label="Subscription status"
                    value={billing.status}
                    hint={`Billing interval: ${billing.interval}`}
                  />
                  <MetricCard
                    label="Renewal"
                    value={billing.nextBillingAt}
                    hint={`Auto-renew: ${billing.autoRenew}`}
                  />
                </div>

                <div className="mt-4 rounded-[20px] border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                  <div className="flex items-start gap-3">
                    <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#ECFDF5] text-[#059669]">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                        Business capacity
                      </div>
                      <div className="mt-2 text-base font-semibold text-[#111827]">
                        {billing.currentBusinesses ?? 0} / {billing.maxBusinesses === null ? "Unlimited" : billing.maxBusinesses} businesses used
                      </div>
                      <div className="mt-1 text-sm text-[#6B7280]">
                        Need more capacity? Move to a higher plan to unlock more businesses and future entitlement growth.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-[20px] border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                    Payment model
                  </div>
                  <div className="mt-2 text-base font-semibold text-[#111827]">
                    Recurring subscription
                  </div>
                  <div className="mt-1 text-sm leading-6 text-[#6B7280]">
                    Your plan is designed to renew automatically each billing cycle unless it is cancelled before the next renewal date.
                  </div>
                </div>

                {!billing.canManageBilling ? (
                  <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Only the workspace owner can manage subscription billing and upgrades.
                  </div>
                ) : null}
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
        </div>

        <div className="mx-auto max-w-[920px] lg:hidden">
          <div className="rounded-[28px] border border-[#E5E7EB] bg-white/92 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="inline-flex items-center rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
              Billing settings
            </div>
            <h1 className="mt-4 text-[32px] font-semibold tracking-[-0.03em] text-[#111827]">
              Current plan
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#6B7280]">
              Your subscription renews automatically unless you cancel it.
            </p>

            <div className="mt-6 space-y-3">
              <MetricCard
                label="Current plan"
                value={billing.currentPlanName}
                hint={billing.currentPlanCode ? billing.currentPlanCode : "No active plan code"}
              />
              <MetricCard
                label="Subscription status"
                value={billing.status}
                hint={`Billing interval: ${billing.interval}`}
              />
              <MetricCard
                label="Renewal"
                value={billing.nextBillingAt}
                hint={`Auto-renew: ${billing.autoRenew}`}
              />
              <MetricCard
                label="Business capacity"
                value={`${billing.currentBusinesses ?? 0} / ${billing.maxBusinesses === null ? "Unlimited" : billing.maxBusinesses}`}
                hint="Businesses used under the current workspace owner account"
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href="/app/settings"
                className="inline-flex items-center gap-2 rounded-full border border-[#D6DAE1] bg-white px-4 py-2 text-sm font-semibold text-[#374151] transition hover:border-[#C7D2FE] hover:bg-[#F9FAFB]"
              >
                Back to settings
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-full border border-[#111827] bg-[#111827] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1F2937]"
              >
                Upgrade plan
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
