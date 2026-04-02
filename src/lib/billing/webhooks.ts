import type { SupabaseClient } from "@supabase/supabase-js";
import { billingLog } from "@/lib/billing/logging";
import { deriveEndedAt, normalizeSubscriptionStatus } from "@/lib/billing/subscription-lifecycle";
import type {
  BillingWebhookEventRow,
  PlanPriceRow,
  SubscriptionRow,
} from "@/lib/billing/types";

type PaddleEnvelope = {
  event_id?: string;
  event_type?: string;
  data?: Record<string, unknown>;
};

type NormalizedSubscriptionEvent = {
  externalEventId: string;
  eventType: string;
  paddleSubscriptionId: string | null;
  paddleCustomerId: string | null;
  paddlePriceId: string | null;
  paddleProductId: string | null;
  status: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  nextBilledAt: string | null;
  canceledAt: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
  accountId: string | null;
  payload: Record<string, unknown>;
};

function asObject(input: unknown): Record<string, unknown> {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    return input as Record<string, unknown>;
  }
  return {};
}

function readPath(input: unknown, path: string[]): unknown {
  let value: unknown = input;
  for (const key of path) {
    const obj = asObject(value);
    value = obj[key];
  }
  return value;
}

function readString(input: unknown, path: string[]): string | null {
  const value = readPath(input, path);
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function readBoolean(input: unknown, path: string[]): boolean {
  const value = readPath(input, path);
  return Boolean(value);
}

export function isDuplicateWebhookInsertError(error: { code?: string } | null) {
  return String(error?.code ?? "") === "23505";
}

export function normalizePaddleWebhookEvent(
  payload: Record<string, unknown>,
): NormalizedSubscriptionEvent {
  const envelope = payload as PaddleEnvelope;
  const data = asObject(envelope.data);
  const firstItem = Array.isArray(data.items)
    ? (data.items[0] as Record<string, unknown> | undefined)
    : undefined;

  return {
    externalEventId:
      String(envelope.event_id ?? "").trim() ||
      String(payload.notification_id ?? "").trim(),
    eventType: String(envelope.event_type ?? payload.event_type ?? "unknown").trim(),
    paddleSubscriptionId:
      readString(data, ["id"]) ??
      readString(data, ["subscription_id"]) ??
      readString(payload, ["subscription_id"]),
    paddleCustomerId:
      readString(data, ["customer_id"]) ??
      readString(data, ["customer", "id"]) ??
      readString(payload, ["customer_id"]),
    paddlePriceId:
      readString(firstItem, ["price", "id"]) ??
      readString(firstItem, ["price_id"]) ??
      readString(data, ["price_id"]),
    paddleProductId:
      readString(firstItem, ["product", "id"]) ??
      readString(firstItem, ["product_id"]) ??
      readString(data, ["product_id"]),
    status: readString(data, ["status"]) ?? readString(payload, ["status"]),
    currentPeriodStart:
      readString(data, ["current_billing_period", "starts_at"]) ??
      readString(data, ["current_period_start"]),
    currentPeriodEnd:
      readString(data, ["current_billing_period", "ends_at"]) ??
      readString(data, ["current_period_end"]),
    nextBilledAt:
      readString(data, ["next_billed_at"]) ??
      readString(data, ["next_payment", "date"]),
    canceledAt: readString(data, ["canceled_at"]),
    trialStart: readString(data, ["trial_dates", "starts_at"]) ?? readString(data, ["trial_start"]),
    trialEnd: readString(data, ["trial_dates", "ends_at"]) ?? readString(data, ["trial_end"]),
    cancelAtPeriodEnd: readBoolean(data, ["scheduled_change", "action"]),
    accountId:
      readString(data, ["custom_data", "account_id"]) ??
      readString(payload, ["custom_data", "account_id"]),
    payload,
  };
}

export async function insertWebhookEvent(
  admin: SupabaseClient,
  input: {
    provider: string;
    externalEventId: string;
    eventType: string;
    payload: Record<string, unknown>;
    relatedAccountId?: string | null;
  },
) {
  const { data, error } = await admin
    .from("billing_webhook_events")
    .insert({
      provider: input.provider,
      external_event_id: input.externalEventId,
      event_type: input.eventType,
      processing_status: "pending",
      payload: input.payload,
      received_at: new Date().toISOString(),
      related_account_id: input.relatedAccountId ?? null,
    })
    .select("*")
    .single();

  if (error) {
    if (isDuplicateWebhookInsertError(error)) {
      return { created: false as const, event: null };
    }
    throw error;
  }

  return {
    created: true as const,
    event: data as BillingWebhookEventRow,
  };
}

async function findAccountIdByPaddleCustomer(
  admin: SupabaseClient,
  paddleCustomerId: string | null,
) {
  if (!paddleCustomerId) return null;
  const { data, error } = await admin
    .from("paddle_customers")
    .select("account_id")
    .eq("paddle_customer_id", paddleCustomerId)
    .maybeSingle();
  if (error) throw error;
  return String((data as { account_id?: string } | null)?.account_id ?? "").trim() || null;
}

async function findPlanPriceByPaddlePriceId(
  admin: SupabaseClient,
  paddlePriceId: string | null,
) {
  if (!paddlePriceId) return null;
  const { data, error } = await admin
    .from("plan_prices")
    .select("*")
    .eq("paddle_price_id", paddlePriceId)
    .maybeSingle();
  if (error) throw error;
  return (data as PlanPriceRow | null) ?? null;
}

async function upsertPaddleCustomerMirror(
  admin: SupabaseClient,
  input: {
    accountId: string;
    paddleCustomerId: string;
    payload: Record<string, unknown>;
  },
) {
  const customerData = asObject(readPath(input.payload, ["data", "customer"]));
  const email = String(customerData.email ?? "").trim() || null;
  const status = String(customerData.status ?? "").trim() || null;

  const { error } = await admin.from("paddle_customers").upsert(
    {
      account_id: input.accountId,
      paddle_customer_id: input.paddleCustomerId,
      email,
      status,
      payload: customerData,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "paddle_customer_id" },
  );
  if (error) throw error;
}

async function upsertPaddleSubscriptionMirror(
  admin: SupabaseClient,
  input: {
    subscriptionId: string;
    paddleSubscriptionId: string;
    paddleCustomerId: string | null;
    paddlePriceId: string | null;
    paddleProductId: string | null;
    status: string | null;
    nextBilledAt: string | null;
    payload: Record<string, unknown>;
  },
) {
  const { error } = await admin.from("paddle_subscriptions").upsert(
    {
      subscription_id: input.subscriptionId,
      paddle_subscription_id: input.paddleSubscriptionId,
      paddle_customer_id: input.paddleCustomerId,
      paddle_price_id: input.paddlePriceId,
      paddle_product_id: input.paddleProductId,
      status: input.status,
      next_billed_at: input.nextBilledAt,
      raw_payload: input.payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "paddle_subscription_id" },
  );
  if (error) throw error;
}

async function findSubscriptionByExternalId(
  admin: SupabaseClient,
  externalSubscriptionId: string,
) {
  const { data, error } = await admin
    .from("subscriptions")
    .select("*")
    .eq("external_subscription_id", externalSubscriptionId)
    .maybeSingle();
  if (error) throw error;
  return (data as SubscriptionRow | null) ?? null;
}

export async function processNormalizedSubscriptionEvent(
  admin: SupabaseClient,
  normalized: NormalizedSubscriptionEvent,
) {
  const externalId = normalized.paddleSubscriptionId;
  if (!externalId) return null;

  let subscription = await findSubscriptionByExternalId(admin, externalId);
  const accountId =
    normalized.accountId ??
    (await findAccountIdByPaddleCustomer(admin, normalized.paddleCustomerId));
  const planPrice = await findPlanPriceByPaddlePriceId(admin, normalized.paddlePriceId);
  if (!accountId || !planPrice) {
    billingLog("warn", "webhook.subscription_unresolved", {
      externalId,
      accountId,
      paddlePriceId: normalized.paddlePriceId,
    });
    return null;
  }

  const normalizedStatus = normalizeSubscriptionStatus(normalized.status);
  const endedAt = deriveEndedAt(
    normalizedStatus,
    normalized.currentPeriodEnd,
    normalized.canceledAt,
  );

  if (!subscription) {
    const { data, error } = await admin
      .from("subscriptions")
      .insert({
        account_id: accountId,
        plan_price_id: planPrice.id,
        status: normalizedStatus,
        source: "paddle",
        external_subscription_id: externalId,
        current_period_start: normalized.currentPeriodStart,
        current_period_end: normalized.currentPeriodEnd,
        cancel_at_period_end: normalized.cancelAtPeriodEnd,
        canceled_at: normalized.canceledAt,
        trial_start: normalized.trialStart,
        trial_end: normalized.trialEnd,
        started_at: normalized.currentPeriodStart ?? new Date().toISOString(),
        ended_at: endedAt,
        metadata: normalized.payload,
      })
      .select("*")
      .single();
    if (error) throw error;
    subscription = data as SubscriptionRow;
  } else {
    const { data, error } = await admin
      .from("subscriptions")
      .update({
        plan_price_id: planPrice.id,
        status: normalizedStatus,
        current_period_start: normalized.currentPeriodStart,
        current_period_end: normalized.currentPeriodEnd,
        cancel_at_period_end: normalized.cancelAtPeriodEnd,
        canceled_at: normalized.canceledAt,
        trial_start: normalized.trialStart,
        trial_end: normalized.trialEnd,
        ended_at: endedAt,
        metadata: normalized.payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id)
      .select("*")
      .single();
    if (error) throw error;
    subscription = data as SubscriptionRow;
  }

  if (normalized.paddleCustomerId) {
    await upsertPaddleCustomerMirror(admin, {
      accountId,
      paddleCustomerId: normalized.paddleCustomerId,
      payload: normalized.payload,
    });
  }

  await upsertPaddleSubscriptionMirror(admin, {
    subscriptionId: subscription.id,
    paddleSubscriptionId: externalId,
    paddleCustomerId: normalized.paddleCustomerId,
    paddlePriceId: normalized.paddlePriceId,
    paddleProductId: normalized.paddleProductId,
    status: normalized.status,
    nextBilledAt: normalized.nextBilledAt,
    payload: normalized.payload,
  });

  return subscription;
}

export async function processWebhookEventRow(
  admin: SupabaseClient,
  event: BillingWebhookEventRow,
) {
  const { error: markProcessingError } = await admin
    .from("billing_webhook_events")
    .update({
      processing_status: "processing",
      retry_count: Number(event.retry_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", event.id);
  if (markProcessingError) throw markProcessingError;

  try {
    const normalized = normalizePaddleWebhookEvent(event.payload);
    const relatedSubscription = await processNormalizedSubscriptionEvent(
      admin,
      normalized,
    );

    const terminalStatus =
      normalized.eventType.startsWith("subscription.")
        ? "processed"
        : "ignored";

    const { error: doneError } = await admin
      .from("billing_webhook_events")
      .update({
        processing_status: terminalStatus,
        processed_at: new Date().toISOString(),
        error_message: null,
        related_account_id:
          normalized.accountId ?? event.related_account_id ?? null,
        related_subscription_id: relatedSubscription?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", event.id);
    if (doneError) throw doneError;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown webhook error";
    await admin
      .from("billing_webhook_events")
      .update({
        processing_status: "failed",
        error_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", event.id);
    throw error;
  }
}

export async function replayWebhookEventById(
  admin: SupabaseClient,
  eventId: string,
) {
  const { data, error } = await admin
    .from("billing_webhook_events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Webhook event not found");

  await processWebhookEventRow(admin, data as BillingWebhookEventRow);
}

export async function retryFailedWebhookEvents(
  admin: SupabaseClient,
  limit: number,
) {
  const { data, error } = await admin
    .from("billing_webhook_events")
    .select("*")
    .in("processing_status", ["failed", "pending"])
    .order("received_at", { ascending: true })
    .limit(limit);
  if (error) throw error;

  const events = (data ?? []) as BillingWebhookEventRow[];
  let processed = 0;
  let failed = 0;
  for (const event of events) {
    try {
      await processWebhookEventRow(admin, event);
      processed += 1;
    } catch {
      failed += 1;
    }
  }

  return { total: events.length, processed, failed };
}
