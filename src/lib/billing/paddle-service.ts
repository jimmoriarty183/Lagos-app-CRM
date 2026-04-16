import type { SupabaseClient } from "@supabase/supabase-js";
import {
  paddleCancelSubscription,
  paddleChangeSubscriptionPlan,
  paddleGetCustomer,
  paddleGetSubscription,
  paddlePreviewSubscriptionChange,
} from "@/lib/billing/paddle-client";
import { billingLog } from "@/lib/billing/logging";
import { normalizePaddleWebhookEvent, processNormalizedSubscriptionEvent } from "@/lib/billing/webhooks";
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

async function getPaddleSubscriptionIdForLocalSubscription(
  admin: SupabaseClient,
  subscriptionId: string,
) {
  const { data, error } = await admin
    .from("paddle_subscriptions")
    .select("paddle_subscription_id")
    .eq("subscription_id", subscriptionId)
    .maybeSingle();
  if (error) throw error;
  const externalId = String(
    (data as { paddle_subscription_id?: string } | null)?.paddle_subscription_id ?? "",
  ).trim();
  if (!externalId) {
    throw new Error("Subscription does not have paddle_subscription_id mirror");
  }
  return externalId;
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
  const externalSubscriptionId = await getPaddleSubscriptionIdForLocalSubscription(
    admin,
    input.subscriptionId,
  );
  const nextPrice = await getPlanPriceById(admin, input.nextPlanPriceId);
  if (!nextPrice.paddle_price_id) {
    throw new Error("Target plan price missing paddle_price_id");
  }

  return paddlePreviewSubscriptionChange({
    externalSubscriptionId,
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
  const externalSubscriptionId = await getPaddleSubscriptionIdForLocalSubscription(
    admin,
    input.subscriptionId,
  );
  const nextPrice = await getPlanPriceById(admin, input.nextPlanPriceId);
  if (!nextPrice.paddle_price_id) {
    throw new Error("Target plan price missing paddle_price_id");
  }

  const result = await paddleChangeSubscriptionPlan({
    externalSubscriptionId,
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
    requested_plan_price_id: nextPrice.id,
  });

  return result;
}

export async function requestCancel(
  admin: SupabaseClient,
  input: { subscriptionId: string; requestedBy?: string | null },
) {
  const subscription = await getSubscriptionById(admin, input.subscriptionId);
  const externalSubscriptionId = await getPaddleSubscriptionIdForLocalSubscription(
    admin,
    input.subscriptionId,
  );

  const result = await paddleCancelSubscription({
    externalSubscriptionId,
    effectiveFrom: "next_billing_period",
  });

  // Do an immediate read-after-write sync so UI reflects scheduled cancellation
  // without waiting for webhook delivery latency.
  try {
    const upstream = await paddleGetSubscription(externalSubscriptionId);
    const normalized = normalizePaddleWebhookEvent(upstream);
    normalized.paddleSubscriptionId = externalSubscriptionId;
    await processNormalizedSubscriptionEvent(admin, normalized);
  } catch (syncError) {
    billingLog("warn", "subscription.cancel_post_sync_failed", {
      subscription_id: subscription.id,
      error: syncError instanceof Error ? syncError.message : "Unknown error",
    });
  }

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
    .from("paddle_subscriptions")
    .select("subscription_id, account_id, paddle_subscription_id")
    .not("paddle_subscription_id", "is", null)
    .like("paddle_subscription_id", "sub_%")
    .order("updated_at", { ascending: true })
    .limit(limit);
  if (error) throw error;

  const rows = (data ?? []) as Array<{
    subscription_id: string | null;
    account_id: string;
    paddle_subscription_id: string;
  }>;
  let synced = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const paddleSubscriptionId = String(row.paddle_subscription_id ?? "").trim();
      if (!paddleSubscriptionId) continue;

      const upstream = await paddleGetSubscription(paddleSubscriptionId);
      const normalized = normalizePaddleWebhookEvent(upstream);
      normalized.paddleSubscriptionId = paddleSubscriptionId;
      normalized.accountId = normalized.accountId ?? row.account_id;
      const subscription = await processNormalizedSubscriptionEvent(admin, normalized);
      if (subscription) synced += 1;
    } catch (error) {
      failed += 1;
      billingLog("error", "resync.subscription_failed", {
        paddle_subscription_id: row.paddle_subscription_id,
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
  const fullName = String(data.name ?? data.full_name ?? "").trim() || null;

  const { error } = await admin.from("paddle_customers").upsert(
    {
      account_id: input.accountId,
      paddle_customer_id: input.paddleCustomerId,
      email: String(data.email ?? "").trim() || null,
      full_name: fullName,
      status: String(data.status ?? "").trim() || null,
      raw_payload: data,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "paddle_customer_id" },
  );
  if (error) throw error;

  return { upstream };
}

export function deriveStatusFromUpstream(status: string | null | undefined) {
  return normalizeSubscriptionStatus(status);
}
