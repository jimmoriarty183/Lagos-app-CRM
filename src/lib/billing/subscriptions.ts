import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PlanPriceRow,
  PlanRow,
  SubscriptionRow,
  SubscriptionSnapshot,
} from "@/lib/billing/types";
import { normalizeSubscriptionStatus } from "@/lib/billing/subscription-lifecycle";

export async function getLatestSubscriptionForAccount(
  admin: SupabaseClient,
  accountId: string,
) {
  const { data, error } = await admin
    .from("subscriptions")
    .select("*")
    .eq("account_id", accountId)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  const rows = (data ?? []) as SubscriptionRow[];
  if (rows.length === 0) return null;

  const statusPriority = (status: string | null | undefined) => {
    const normalized = String(status ?? "").trim().toLowerCase();
    if (normalized === "active") return 0;
    if (normalized === "trialing") return 1;
    if (normalized === "past_due") return 2;
    if (normalized === "paused") return 3;
    if (normalized === "canceled" || normalized === "cancelled") return 4;
    if (normalized === "expired") return 5;
    return 6;
  };

  const sorted = [...rows].sort((left, right) => {
    const statusDelta = statusPriority(left.status) - statusPriority(right.status);
    if (statusDelta !== 0) return statusDelta;

    const leftTime = new Date(left.updated_at ?? left.created_at ?? 0).getTime();
    const rightTime = new Date(right.updated_at ?? right.created_at ?? 0).getTime();
    return rightTime - leftTime;
  });

  return sorted[0] ?? null;
}

export async function getSubscriptionSnapshot(
  admin: SupabaseClient,
  accountId: string,
): Promise<SubscriptionSnapshot> {
  const subscription = await getLatestSubscriptionForAccount(admin, accountId);

  if (!subscription) {
    return {
      subscriptionId: null,
      accountId,
      status: null,
      plan: null,
      billingInterval: null,
      nextBillingAt: null,
      trial: { start: null, end: null },
      cancelAtPeriodEnd: false,
      externalSubscriptionId: null,
    };
  }

  const { data: planPriceData, error: planPriceError } = await admin
    .from("plan_prices")
    .select("*")
    .eq("id", subscription.plan_price_id)
    .maybeSingle();
  if (planPriceError) throw planPriceError;
  const planPrice = planPriceData as PlanPriceRow | null;

  let plan: PlanRow | null = null;
  if (planPrice?.plan_id) {
    const { data: planData, error: planError } = await admin
      .from("plans")
      .select("*")
      .eq("id", planPrice.plan_id)
      .maybeSingle();
    if (planError) throw planError;
    plan = (planData as PlanRow | null) ?? null;
  }

  let externalSubscriptionId: string | null = null;
  if (subscription.id) {
    const { data: mirrorData, error: mirrorError } = await admin
      .from("paddle_subscriptions")
      .select("paddle_subscription_id")
      .eq("subscription_id", subscription.id)
      .maybeSingle();
    if (mirrorError) throw mirrorError;
    externalSubscriptionId =
      String((mirrorData as { paddle_subscription_id?: string } | null)?.paddle_subscription_id ?? "")
        .trim() || null;
  }

  return {
    subscriptionId: subscription.id,
    accountId,
    status: normalizeSubscriptionStatus(subscription.status),
    plan: plan
      ? {
          id: plan.id,
          code: plan.code,
          name: plan.name,
        }
      : null,
    billingInterval: planPrice?.billing_interval ?? null,
    nextBillingAt: subscription.current_period_end,
    trial: {
      start: subscription.trial_start,
      end: subscription.trial_end,
    },
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    externalSubscriptionId,
  };
}

