import type { SupabaseClient } from "@supabase/supabase-js";
import {
  paddleCancelSubscription,
  paddleChangeSubscriptionPlan,
  paddleGetCustomer,
  paddleGetSubscription,
  paddlePreviewSubscriptionChange,
} from "@/lib/billing/paddle-client";
import { billingLog } from "@/lib/billing/logging";
import {
  normalizePaddleWebhookEvent,
  processNormalizedSubscriptionEvent,
} from "@/lib/billing/webhooks";
import { normalizeSubscriptionStatus } from "@/lib/billing/subscription-lifecycle";
import type { PlanPriceRow, SubscriptionRow } from "@/lib/billing/types";

async function getSubscriptionById(admin: SupabaseClient, subscriptionId: string) {
  const { data, error } = await admin
    .from("subscriptions")
    .select("*")
    .eq("id", subscriptionId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Subscription not found");
  return data as SubscriptionRow;
}

async function getPlanPriceById(admin: SupabaseClient, planPriceId: string) {
  const { data, error } = await admin
    .from("plan_prices")
    .select("*")
    .eq("id", planPriceId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Plan price not found");
  return data as PlanPriceRow;
}

export async function previewPlanChange(
  admin: SupabaseClient,
  input: { subscriptionId: string; nextPlanPriceId: string },
) {
  const subscription = await getSubscriptionById(admin, input.subscriptionId);
  if (!subscription.external_subscription_id) {
    throw new Error("Subscription does not have external_subscription_id");
  }
  const nextPrice = await getPlanPriceById(admin, input.nextPlanPriceId);
  if (!nextPrice.paddle_price_id) {
    throw new Error("Target plan price missing paddle_price_id");
  }

  return paddlePreviewSubscriptionChange({
    externalSubscriptionId: subscription.external_subscription_id,
    paddlePriceId: nextPrice.paddle_price_id,
  });
}

export async function requestPlanChange(
  admin: SupabaseClient,
  input: {
    subscriptionId: string;
    nextPlanPriceId: string;
    requestedBy?: string | null;
  },
) {
  const subscription = await getSubscriptionById(admin, input.subscriptionId);
  if (!subscription.external_subscription_id) {
    throw new Error("Subscription does not have external_subscription_id");
  }
  const nextPrice = await getPlanPriceById(admin, input.nextPlanPriceId);
  if (!nextPrice.paddle_price_id) {
    throw new Error("Target plan price missing paddle_price_id");
  }

  const result = await paddleChangeSubscriptionPlan({
    externalSubscriptionId: subscription.external_subscription_id,
    paddlePriceId: nextPrice.paddle_price_id,
  });

  await admin.from("audit_logs").insert({
    actor_id: input.requestedBy ?? null,
    entity_type: "subscription",
    entity_id: subscription.id,
    action: "request_plan_change",
    old_values: { plan_price_id: subscription.plan_price_id },
    new_values: { requested_plan_price_id: nextPrice.id },
    metadata: { mode: "pending_webhook_confirmation" },
  });
  billingLog("info", "subscription.change_plan_requested", {
    subscription_id: subscription.id,
    previous_plan_price_id: subscription.plan_price_id,
    requested_plan_price_id: nextPrice.id,
  });

  return result;
}

export async function requestCancel(
  admin: SupabaseClient,
  input: { subscriptionId: string; requestedBy?: string | null },
) {
  const subscription = await getSubscriptionById(admin, input.subscriptionId);
  if (!subscription.external_subscription_id) {
    throw new Error("Subscription does not have external_subscription_id");
  }

  const result = await paddleCancelSubscription({
    externalSubscriptionId: subscription.external_subscription_id,
    effectiveFrom: "next_billing_period",
  });

  await admin.from("audit_logs").insert({
    actor_id: input.requestedBy ?? null,
    entity_type: "subscription",
    entity_id: subscription.id,
    action: "request_cancel",
    old_values: { cancel_at_period_end: subscription.cancel_at_period_end },
    new_values: { cancel_at_period_end: true },
    metadata: { mode: "pending_webhook_confirmation" },
  });
  billingLog("info", "subscription.cancel_requested", {
    subscription_id: subscription.id,
  });

  return result;
}

export async function resyncSubscriptions(admin: SupabaseClient, limit = 100) {
  const { data, error } = await admin
    .from("subscriptions")
    .select("*")
    .eq("source", "paddle")
    .not("external_subscription_id", "is", null)
    .order("updated_at", { ascending: true })
    .limit(limit);
  if (error) throw error;

  const rows = (data ?? []) as SubscriptionRow[];
  let synced = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      if (!row.external_subscription_id) continue;
      const upstream = await paddleGetSubscription(row.external_subscription_id);
      const normalized = normalizePaddleWebhookEvent(upstream);
      const nextStatus = normalizeSubscriptionStatus(normalized.status);

      const { data: nextPriceData, error: nextPriceError } = await admin
        .from("plan_prices")
        .select("*")
        .eq("paddle_price_id", normalized.paddlePriceId)
        .maybeSingle();
      if (nextPriceError) throw nextPriceError;
      const nextPrice = (nextPriceData as PlanPriceRow | null) ?? null;

      await admin
        .from("subscriptions")
        .update({
          status: nextStatus,
          plan_price_id: nextPrice?.id ?? row.plan_price_id,
          current_period_start:
            normalized.currentPeriodStart ?? row.current_period_start,
          current_period_end:
            normalized.currentPeriodEnd ?? row.current_period_end,
          cancel_at_period_end: Boolean(normalized.cancelAtPeriodEnd),
          canceled_at: normalized.canceledAt ?? row.canceled_at,
          trial_start: normalized.trialStart ?? row.trial_start,
          trial_end: normalized.trialEnd ?? row.trial_end,
          metadata: normalized.payload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      await admin.from("paddle_subscriptions").upsert(
        {
          subscription_id: row.id,
          paddle_subscription_id: row.external_subscription_id,
          paddle_customer_id: normalized.paddleCustomerId,
          paddle_price_id: normalized.paddlePriceId,
          paddle_product_id: normalized.paddleProductId,
          status: normalized.status,
          next_billed_at: normalized.nextBilledAt,
          raw_payload: normalized.payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "paddle_subscription_id" },
      );

      synced += 1;
    } catch (error) {
      failed += 1;
      billingLog("error", "resync.subscription_failed", {
        subscription_id: row.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return { total: rows.length, synced, failed };
}

export async function syncSubscriptionByExternalId(
  admin: SupabaseClient,
  externalSubscriptionId: string,
) {
  const upstream = await paddleGetSubscription(externalSubscriptionId);
  const normalized = normalizePaddleWebhookEvent(upstream);
  normalized.paddleSubscriptionId = externalSubscriptionId;
  const subscription = await processNormalizedSubscriptionEvent(admin, normalized);
  return { upstream, subscription };
}

export async function syncCustomerByExternalId(
  admin: SupabaseClient,
  input: { accountId: string; paddleCustomerId: string },
) {
  const upstream = await paddleGetCustomer(input.paddleCustomerId);
  const data = (upstream.data ?? upstream) as Record<string, unknown>;

  const { error } = await admin.from("paddle_customers").upsert(
    {
      account_id: input.accountId,
      paddle_customer_id: input.paddleCustomerId,
      email: String(data.email ?? "").trim() || null,
      status: String(data.status ?? "").trim() || null,
      payload: data,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "paddle_customer_id" },
  );
  if (error) throw error;

  return { upstream };
}
