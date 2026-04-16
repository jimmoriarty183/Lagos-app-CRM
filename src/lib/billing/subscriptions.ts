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
    .limit(1);

  if (error) throw error;
  return ((data ?? []) as SubscriptionRow[])[0] ?? null;
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

