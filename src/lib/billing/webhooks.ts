import type { SupabaseClient } from "@supabase/supabase-js";
import { billingLog, formatErrorForLog } from "@/lib/billing/logging";
import { deriveEndedAt, normalizeSubscriptionStatus } from "@/lib/billing/subscription-lifecycle";
import { paddleGetSubscription } from "@/lib/billing/paddle-client";
import { resolveOwnerAccountId } from "@/lib/businesses/business-limits-service";
import type { BillingWebhookEventRow, PlanPriceRow, SubscriptionRow } from "@/lib/billing/types";

type PaddleEnvelope = {
  event_id?: string;
  event_type?: string;
  occurred_at?: string;
  data?: Record<string, unknown>;
};

type NormalizedSubscriptionEvent = {
  externalEventId: string;
  eventType: string;
  occurredAt: string | null;
  paddleSubscriptionId: string | null;
  paddleCustomerId: string | null;
  paddlePriceId: string | null;
  status: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  nextBilledAt: string | null;
  canceledAt: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
  accountId: string | null;
  ownerUserId: string | null;
  workspaceSlug: string | null;
  payload: Record<string, unknown>;
};

function asObject(input: unknown): Record<string, unknown> {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    return input as Record<string, unknown>;
  }
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // ignore parse errors
    }
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
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "cancel";
  }
  return Boolean(value);
}

function extractSubscriptionIdFromPayload(payload: Record<string, unknown>): string | null {
  return (
    readString(payload, ["data", "subscription_id"]) ??
    readString(payload, ["data", "subscription", "id"]) ??
    readString(payload, ["subscription_id"])
  );
}

function normalizePaddleEventType(rawEventType: string | null | undefined) {
  const value = String(rawEventType ?? "").trim().toLowerCase();
  if (!value) return "unknown";
  if (value.startsWith("subscription_")) return value.replace(/^subscription_/, "subscription.");
  if (value.startsWith("transaction_")) return value.replace(/^transaction_/, "transaction.");
  return value;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function normalizePaddleWebhookEvent(
  payload: Record<string, unknown>,
): NormalizedSubscriptionEvent {
  const envelope = payload as PaddleEnvelope;
  const data = asObject(envelope.data);
  const items = Array.isArray(data.items) ? data.items : undefined;
  const subscriptionItems = Array.isArray(data.subscription_items)
    ? data.subscription_items
    : undefined;
  const firstItem = ((items ?? subscriptionItems)?.[0] as Record<string, unknown> | undefined) ?? {};

  const customDataObj = asObject(data.custom_data);

  return {
    externalEventId:
      String(envelope.event_id ?? "").trim() ||
      String(payload.notification_id ?? "").trim(),
    eventType: normalizePaddleEventType(
      String(envelope.event_type ?? payload.event_type ?? "unknown").trim(),
    ),
    occurredAt:
      String(envelope.occurred_at ?? payload.occurred_at ?? "").trim() || null,
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
    trialStart:
      readString(data, ["trial_dates", "starts_at"]) ??
      readString(data, ["trial_start"]),
    trialEnd:
      readString(data, ["trial_dates", "ends_at"]) ??
      readString(data, ["trial_end"]),
    cancelAtPeriodEnd:
      readBoolean(data, ["cancel_at_period_end"]) ||
      readBoolean(data, ["scheduled_change", "action"]),
    accountId:
      readString(customDataObj, ["account_id"]) ??
      readString(asObject(payload.custom_data), ["account_id"]),
    ownerUserId:
      readString(customDataObj, ["owner_user_id"]) ??
      readString(asObject(payload.custom_data), ["owner_user_id"]),
    workspaceSlug:
      readString(customDataObj, ["workspace_slug"]) ??
      readString(asObject(payload.custom_data), ["workspace_slug"]),
    payload,
  };
}

async function safeInsertWebhookEvent(admin: SupabaseClient, row: Record<string, unknown>) {
  const { data, error } = await admin
    .from("billing_webhook_events")
    .insert(row)
    .select("*")
    .single();
  if (error) return { data: null, error };
  return { data, error: null as null };
}

async function safeUpdateWebhookEvent(
  admin: SupabaseClient,
  eventId: string,
  patch: Record<string, unknown>,
) {
  const { error } = await admin
    .from("billing_webhook_events")
    .update(patch)
    .eq("id", eventId);
  if (error) throw error;
}

export function isDuplicateWebhookInsertError(error: { code?: string } | null) {
  return String(error?.code ?? "") === "23505";
}

export async function insertWebhookEvent(
  admin: SupabaseClient,
  input: {
    provider: string;
    externalEventId: string;
    eventType: string;
    occurredAt?: string | null;
    payload: Record<string, unknown>;
  },
) {
  const { data, error } = await safeInsertWebhookEvent(admin, {
    provider: input.provider,
    provider_event_id: input.externalEventId,
    event_type: input.eventType,
    occurred_at: input.occurredAt ?? null,
    received_at: new Date().toISOString(),
    processing_status: "received",
    processing_attempts: 0,
    signature_valid: true,
    payload: input.payload,
    error_message: null,
    processed_at: null,
  });

  if (error) {
    if (isDuplicateWebhookInsertError(error)) return { created: false as const, event: null };
    throw error;
  }

  return { created: true as const, event: data as BillingWebhookEventRow };
}

async function ensureAccountForOwner(
  admin: SupabaseClient,
  ownerUserId: string,
  workspaceSlug: string | null,
) {
  const ownerSlug = slugify(ownerUserId);
  const slugBase = slugify(workspaceSlug || `owner-${ownerSlug}`) || `owner-${ownerSlug}`;
  const slug = slugBase.slice(0, 62);
  const name = workspaceSlug ? `Workspace ${workspaceSlug}` : "Workspace account";

  const existing = await admin.from("accounts").select("id").eq("slug", slug).maybeSingle();
  if (!existing.error && existing.data) {
    return String((existing.data as { id?: string } | null)?.id ?? "").trim() || null;
  }
  if (existing.error && String(existing.error.code ?? "") !== "PGRST116") {
    // Ignore no rows errors only.
    throw existing.error;
  }

  const { data, error } = await admin
    .from("accounts")
    .insert({
      slug,
      name,
      status: "active",
    })
    .select("id")
    .single();
  if (error) throw error;
  return String((data as { id?: string } | null)?.id ?? "").trim() || null;
}

async function findAccountIdByWorkspaceSlug(
  admin: SupabaseClient,
  workspaceSlug: string | null,
) {
  if (!workspaceSlug) return null;
  const { data, error } = await admin
    .from("accounts")
    .select("id")
    .eq("slug", workspaceSlug)
    .maybeSingle();
  if (error) throw error;
  return String((data as { id?: string } | null)?.id ?? "").trim() || null;
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

async function findSubscriptionByExternalId(
  admin: SupabaseClient,
  externalSubscriptionId: string,
) {
  const mirror = await admin
    .from("paddle_subscriptions")
    .select("subscription_id")
    .eq("paddle_subscription_id", externalSubscriptionId)
    .maybeSingle();
  if (mirror.error) throw mirror.error;

  const subscriptionId = String(
    (mirror.data as { subscription_id?: string } | null)?.subscription_id ?? "",
  ).trim();
  if (!subscriptionId) return null;

  const byId = await admin
    .from("subscriptions")
    .select("*")
    .eq("id", subscriptionId)
    .maybeSingle();
  if (byId.error) throw byId.error;
  return (byId.data as SubscriptionRow | null) ?? null;
}

async function safeInsertSubscription(admin: SupabaseClient, row: Record<string, unknown>) {
  const { data, error } = await admin.from("subscriptions").insert(row).select("*").single();
  if (error) return { data: null, error };
  return { data, error: null as null };
}

async function safeUpdateSubscription(
  admin: SupabaseClient,
  subscriptionId: string,
  patch: Record<string, unknown>,
) {
  const { data, error } = await admin
    .from("subscriptions")
    .update(patch)
    .eq("id", subscriptionId)
    .select("*")
    .single();
  if (error) return { data: null, error };
  return { data, error: null as null };
}

async function findPlanPriceByPaddlePriceId(admin: SupabaseClient, paddlePriceId: string | null) {
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
  const customer = asObject(readPath(input.payload, ["data", "customer"]));
  const fullName = String(customer.name ?? customer.full_name ?? "").trim() || null;

  const { error } = await admin.from("paddle_customers").upsert(
    {
      account_id: input.accountId,
      paddle_customer_id: input.paddleCustomerId,
      email: String(customer.email ?? "").trim() || null,
      full_name: fullName,
      status: String(customer.status ?? "").trim() || null,
      raw_payload: customer,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "paddle_customer_id" },
  );
  if (error) throw error;
}

async function upsertPaddleSubscriptionMirror(
  admin: SupabaseClient,
  input: {
    accountId: string;
    subscriptionId: string;
    paddleSubscriptionId: string;
    paddleCustomerId: string | null;
    status: string | null;
    nextBilledAt: string | null;
    canceledAt: string | null;
    payload: Record<string, unknown>;
  },
) {
  const { error } = await admin.from("paddle_subscriptions").upsert(
    {
      subscription_id: input.subscriptionId,
      account_id: input.accountId,
      paddle_subscription_id: input.paddleSubscriptionId,
      paddle_customer_id: input.paddleCustomerId,
      status: input.status,
      next_billed_at: input.nextBilledAt,
      canceled_at: input.canceledAt,
      raw_payload: input.payload,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "paddle_subscription_id" },
  );
  if (error) throw error;
}

export async function processNormalizedSubscriptionEvent(
  admin: SupabaseClient,
  normalized: NormalizedSubscriptionEvent,
) {
  const externalId = normalized.paddleSubscriptionId;
  if (!externalId) {
    billingLog("warn", "[billing-webhook] missing_external_subscription_id", {});
    return null;
  }

  let subscription = await findSubscriptionByExternalId(admin, externalId);

  let accountId = normalized.accountId;
  if (!accountId) {
    accountId = await findAccountIdByPaddleCustomer(admin, normalized.paddleCustomerId);
  }
  if (!accountId && normalized.workspaceSlug) {
    accountId = await findAccountIdByWorkspaceSlug(admin, normalized.workspaceSlug);
  }
  if (!accountId && normalized.ownerUserId) {
    accountId = await resolveOwnerAccountId(admin, normalized.ownerUserId);
  }
  if (!accountId && normalized.ownerUserId) {
    accountId = await ensureAccountForOwner(admin, normalized.ownerUserId, normalized.workspaceSlug);
  }

  const planPrice = await findPlanPriceByPaddlePriceId(admin, normalized.paddlePriceId);
  if (!accountId || !planPrice) {
    billingLog("error", "[billing-webhook] subscription.unresolvable", {
      externalId,
      accountId,
      paddlePriceId: normalized.paddlePriceId,
      paddleCustomerId: normalized.paddleCustomerId,
    });
    return null;
  }

  const status = normalizeSubscriptionStatus(normalized.status);
  const endedAt = deriveEndedAt(status, normalized.currentPeriodEnd, normalized.canceledAt);

  if (!subscription) {
    const { data, error } = await safeInsertSubscription(admin, {
      account_id: accountId,
      plan_price_id: planPrice.id,
      status,
      current_period_start: normalized.currentPeriodStart,
      current_period_end: normalized.currentPeriodEnd,
      cancel_at_period_end: normalized.cancelAtPeriodEnd,
      canceled_at: normalized.canceledAt,
      trial_start: normalized.trialStart,
      trial_end: normalized.trialEnd,
      ended_at: endedAt,
      last_billing_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    subscription = data as SubscriptionRow;
  } else {
    const { data, error } = await safeUpdateSubscription(admin, subscription.id, {
      plan_price_id: planPrice.id,
      status,
      current_period_start: normalized.currentPeriodStart,
      current_period_end: normalized.currentPeriodEnd,
      cancel_at_period_end: normalized.cancelAtPeriodEnd,
      canceled_at: normalized.canceledAt,
      trial_start: normalized.trialStart,
      trial_end: normalized.trialEnd,
      ended_at: endedAt,
      last_billing_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
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
    accountId,
    subscriptionId: subscription.id,
    paddleSubscriptionId: externalId,
    paddleCustomerId: normalized.paddleCustomerId,
    status: normalized.status,
    nextBilledAt: normalized.nextBilledAt,
    canceledAt: normalized.canceledAt,
    payload: normalized.payload,
  });

  return subscription;
}

function isSubscriptionWebhookEvent(eventType: string) {
  const normalized = String(eventType ?? "").trim().toLowerCase();
  return normalized.startsWith("subscription.") || normalized.startsWith("subscription_");
}

function isTransactionWebhookEvent(eventType: string) {
  const normalized = String(eventType ?? "").trim().toLowerCase();
  return normalized.startsWith("transaction.") || normalized.startsWith("transaction_");
}

export async function processWebhookEventRow(admin: SupabaseClient, event: BillingWebhookEventRow) {
  await safeUpdateWebhookEvent(admin, event.id, {
    processing_status: "processing",
    processing_attempts: Number(event.processing_attempts ?? 0) + 1,
    error_message: null,
  });

  try {
    const normalized = normalizePaddleWebhookEvent(event.payload);
    const isSubscriptionEvent = isSubscriptionWebhookEvent(normalized.eventType);
    const isTransactionEvent = isTransactionWebhookEvent(normalized.eventType);
    const hintedSubscriptionId = extractSubscriptionIdFromPayload(event.payload);

    let relatedSubscription = await processNormalizedSubscriptionEvent(admin, normalized);

    if (!relatedSubscription && isTransactionEvent && hintedSubscriptionId) {
      const upstream = await paddleGetSubscription(hintedSubscriptionId);
      const upstreamNormalized = normalizePaddleWebhookEvent(upstream);
      upstreamNormalized.paddleSubscriptionId = hintedSubscriptionId;
      upstreamNormalized.accountId = upstreamNormalized.accountId ?? normalized.accountId;
      upstreamNormalized.workspaceSlug = upstreamNormalized.workspaceSlug ?? normalized.workspaceSlug;
      upstreamNormalized.ownerUserId = upstreamNormalized.ownerUserId ?? normalized.ownerUserId;
      relatedSubscription = await processNormalizedSubscriptionEvent(admin, upstreamNormalized);
    }

    const requiresMaterialization =
      isSubscriptionEvent || (isTransactionEvent && Boolean(hintedSubscriptionId));
    const processingStatus: BillingWebhookEventRow["processing_status"] =
      requiresMaterialization && !relatedSubscription ? "failed" : "processed";

    await safeUpdateWebhookEvent(admin, event.id, {
      processing_status: processingStatus,
      processed_at: new Date().toISOString(),
      error_message:
        processingStatus === "failed"
          ? "Subscription materialization failed"
          : null,
    });
  } catch (error) {
    const details = formatErrorForLog(error);
    await safeUpdateWebhookEvent(admin, event.id, {
      processing_status: "failed",
      error_message: details.errorMessage,
    });
    throw error;
  }
}

export async function replayWebhookEventById(admin: SupabaseClient, eventId: string) {
  const { data, error } = await admin
    .from("billing_webhook_events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Webhook event not found");
  await processWebhookEventRow(admin, data as BillingWebhookEventRow);
}

export async function retryFailedWebhookEvents(admin: SupabaseClient, limit: number) {
  const { data, error } = await admin
    .from("billing_webhook_events")
    .select("*")
    .in("processing_status", ["failed", "received"])
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
