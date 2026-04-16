import type { SupabaseClient } from "@supabase/supabase-js";
import { billingLog } from "@/lib/billing/logging";
import { deriveEndedAt, normalizeSubscriptionStatus } from "@/lib/billing/subscription-lifecycle";
import { resolveOwnerAccountId } from "@/lib/businesses/business-limits-service";
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
  return Boolean(value);
}

export function isDuplicateWebhookInsertError(error: { code?: string } | null) {
  return String(error?.code ?? "") === "23505";
}

function normalizePaddleEventType(rawEventType: string | null | undefined) {
  const value = String(rawEventType ?? "").trim().toLowerCase();
  if (!value) return "unknown";
  if (value.startsWith("subscription_")) {
    return value.replace(/^subscription_/, "subscription.");
  }
  return value;
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
  const firstItem = (items ?? subscriptionItems) && Array.isArray(items ?? subscriptionItems)
    ? ((items ?? subscriptionItems)[0] as Record<string, unknown> | undefined)
    : undefined;

  return {
    externalEventId:
      String(envelope.event_id ?? "").trim() ||
      String(payload.notification_id ?? "").trim(),
    eventType: normalizePaddleEventType(
      String(envelope.event_type ?? payload.event_type ?? "unknown").trim(),
    ),
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
    ownerUserId:
      readString(data, ["custom_data", "owner_user_id"]) ??
      readString(payload, ["custom_data", "owner_user_id"]),
    workspaceSlug:
      readString(data, ["custom_data", "workspace_slug"]) ??
      readString(payload, ["custom_data", "workspace_slug"]),
    payload,
  };
}

async function safeInsertWebhookEvent(
  admin: SupabaseClient,
  row: Record<string, unknown>,
) {
  const optionalColumns = ["related_account_id", "received_at"] as const;
  const candidate = { ...row };

  for (;;) {
    const { data, error } = await admin
      .from("billing_webhook_events")
      .insert(candidate)
      .select("*")
      .single();

    if (!error) {
      return { data, error: null as null };
    }

    if (String((error as { code?: string } | null)?.code ?? "") !== "42703") {
      return { data: null, error };
    }

    const missingColumn = optionalColumns.find((column) =>
      String(error.message ?? "").includes(column),
    );
    if (!missingColumn) {
      return { data: null, error };
    }
    delete candidate[missingColumn];
  }
}

async function safeUpdateWebhookEvent(
  admin: SupabaseClient,
  eventId: string,
  patch: Record<string, unknown>,
) {
  const candidate = { ...patch };

  for (;;) {
    const { error } = await admin
      .from("billing_webhook_events")
      .update(candidate)
      .eq("id", eventId);

    if (!error) return;

    if (String((error as { code?: string } | null)?.code ?? "") !== "42703") {
      throw error;
    }

    const missing = Object.keys(candidate).find((column) =>
      String(error.message ?? "").includes(column),
    );
    if (!missing) throw error;
    delete candidate[missing];
  }
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
  const { data, error } = await safeInsertWebhookEvent(admin, {
    provider: input.provider,
    external_event_id: input.externalEventId,
    event_type: input.eventType,
    processing_status: "pending",
    payload: input.payload,
    received_at: new Date().toISOString(),
    related_account_id: input.relatedAccountId ?? null,
  });

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

async function ensureAccountForOwner(
  admin: SupabaseClient,
  ownerUserId: string,
  workspaceSlug: string | null,
) {
  const baseName = workspaceSlug ? `Workspace ${workspaceSlug}` : "Workspace account";
  const variants: Array<Record<string, unknown>> = [
    { owner_user_id: ownerUserId, name: baseName },
    { owner_id: ownerUserId, name: baseName },
    { created_by: ownerUserId, name: baseName },
    { owner_id: ownerUserId },
    { created_by: ownerUserId },
  ];

  for (const payload of variants) {
    const { data, error } = await admin
      .from("accounts")
      .insert(payload)
      .select("id")
      .single();
    if (!error) {
      const createdId = String((data as { id?: string } | null)?.id ?? "").trim();
      if (createdId) return createdId;
      continue;
    }

    const code = String((error as { code?: string } | null)?.code ?? "");
    if (code === "42703" || code === "23502" || code === "23505") {
      continue;
    }
    throw error;
  }

  return null;
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
  const direct = await admin
    .from("subscriptions")
    .select("*")
    .eq("external_subscription_id", externalSubscriptionId)
    .maybeSingle();
  if (!direct.error) {
    return (direct.data as SubscriptionRow | null) ?? null;
  }
  if (String((direct.error as { code?: string } | null)?.code ?? "") !== "42703") {
    throw direct.error;
  }

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

async function safeInsertSubscription(
  admin: SupabaseClient,
  row: Record<string, unknown>,
) {
  const candidate = { ...row };
  for (;;) {
    const { data, error } = await admin
      .from("subscriptions")
      .insert(candidate)
      .select("*")
      .single();
    if (!error) return { data, error: null as null };
    if (String((error as { code?: string } | null)?.code ?? "") !== "42703") {
      return { data: null, error };
    }
    const missing = Object.keys(candidate).find((column) =>
      String(error.message ?? "").includes(column),
    );
    if (!missing) return { data: null, error };
    delete candidate[missing];
  }
}

async function safeUpdateSubscription(
  admin: SupabaseClient,
  subscriptionId: string,
  patch: Record<string, unknown>,
) {
  const candidate = { ...patch };
  for (;;) {
    const { data, error } = await admin
      .from("subscriptions")
      .update(candidate)
      .eq("id", subscriptionId)
      .select("*")
      .single();
    if (!error) return { data, error: null as null };
    if (String((error as { code?: string } | null)?.code ?? "") !== "42703") {
      return { data: null, error };
    }
    const missing = Object.keys(candidate).find((column) =>
      String(error.message ?? "").includes(column),
    );
    if (!missing) return { data: null, error };
    delete candidate[missing];
  }
}

export async function processNormalizedSubscriptionEvent(
  admin: SupabaseClient,
  normalized: NormalizedSubscriptionEvent,
) {
  const externalId = normalized.paddleSubscriptionId;
  if (!externalId) {
    billingLog("warn", "[billing-webhook] missing_external_subscription_id", { payload: normalized.payload });
    return null;
  }

  let subscription = await findSubscriptionByExternalId(admin, externalId);
  billingLog("info", "[billing-webhook] subscription.lookup", {
    externalId,
    found: !!subscription,
  });

  // Strategy 1: account_id from webhook custom_data
  let accountId = normalized.accountId;
  if (accountId) {
    billingLog("debug", "[billing-webhook] account.found_custom_data", { accountId, externalId });
  } else {
    // Strategy 2: lookup by paddle_customer_id
    accountId = await findAccountIdByPaddleCustomer(admin, normalized.paddleCustomerId);
    if (accountId) {
      billingLog("debug", "[billing-webhook] account.found_paddle_customer", {
        paddleCustomerId: normalized.paddleCustomerId,
        accountId,
        externalId,
      });
    }
  }

  // Strategy 3: lookup by owner_user_id (resolveOwnerAccountId)
  if (!accountId && normalized.ownerUserId) {
    try {
      accountId = await resolveOwnerAccountId(admin, normalized.ownerUserId);
      if (accountId) {
        billingLog("debug", "[billing-webhook] account.found_owner_lookup", {
          ownerUserId: normalized.ownerUserId,
          accountId,
          externalId,
        });
      }
    } catch (error) {
      billingLog("warn", "[billing-webhook] account.owner_lookup_failed", {
        ownerUserId: normalized.ownerUserId,
        error: error instanceof Error ? error.message : "Unknown error",
        externalId,
      });
    }
  }

  // Strategy 4: create account for owner
  if (!accountId && normalized.ownerUserId) {
    try {
      accountId = await ensureAccountForOwner(
        admin,
        normalized.ownerUserId,
        normalized.workspaceSlug,
      );
      if (accountId) {
        billingLog("info", "[billing-webhook] account.created_for_owner", {
          ownerUserId: normalized.ownerUserId,
          accountId,
          workspaceSlug: normalized.workspaceSlug,
          externalId,
        });
      }
    } catch (error) {
      billingLog("warn", "[billing-webhook] account.creation_failed", {
        ownerUserId: normalized.ownerUserId,
        error: error instanceof Error ? error.message : "Unknown error",
        externalId,
      });
    }
  }

  const planPrice = await findPlanPriceByPaddlePriceId(admin, normalized.paddlePriceId);
  if (planPrice) {
    billingLog("debug", "[billing-webhook] plan_price.found", {
      paddlePriceId: normalized.paddlePriceId,
      planPriceId: planPrice.id,
      externalId,
    });
  } else {
    billingLog("error", "[billing-webhook] plan_price.not_found", {
      paddlePriceId: normalized.paddlePriceId,
      externalId,
    });
  }

  if (!accountId || !planPrice) {
    billingLog("error", "[billing-webhook] subscription.unresolvable", {
      externalId,
      hasAccountId: !!accountId,
      hasPlanPrice: !!planPrice,
      paddleCustomerId: normalized.paddleCustomerId,
      ownerUserId: normalized.ownerUserId,
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
    billingLog("info", "[billing-webhook] subscription.creating", {
      externalId,
      accountId,
      planPriceId: planPrice.id,
      status: normalizedStatus,
    });
    const { data, error } = await safeInsertSubscription(admin, {
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
    });
    if (error) {
      billingLog("error", "[billing-webhook] subscription.creation_failed", {
        externalId,
        accountId,
        error: error.message,
      });
      throw error;
    }
    subscription = data as SubscriptionRow;
    billingLog("info", "[billing-webhook] subscription.created", {
      subscriptionId: subscription.id,
      externalId,
      accountId,
    });
  } else {
    billingLog("info", "[billing-webhook] subscription.updating", {
      subscriptionId: subscription.id,
      externalId,
      newStatus: normalizedStatus,
      currentStatus: subscription.status,
    });
    const { data, error } = await safeUpdateSubscription(admin, subscription.id, {
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
    });
    if (error) {
      billingLog("error", "[billing-webhook] subscription.update_failed", {
        subscriptionId: subscription.id,
        externalId,
        error: error.message,
      });
      throw error;
    }
    subscription = data as SubscriptionRow;
    billingLog("info", "[billing-webhook] subscription.updated", {
      subscriptionId: subscription.id,
      externalId,
      newStatus: normalizedStatus,
    });
  }

  if (normalized.paddleCustomerId) {
    billingLog("debug", "[billing-webhook] upserting_paddle_customer", {
      paddleCustomerId: normalized.paddleCustomerId,
      accountId,
    });
    try {
      await upsertPaddleCustomerMirror(admin, {
        accountId,
        paddleCustomerId: normalized.paddleCustomerId,
        payload: normalized.payload,
      });
    } catch (error) {
      billingLog("warn", "[billing-webhook] paddle_customer_upsert_failed", {
        paddleCustomerId: normalized.paddleCustomerId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  try {
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
    billingLog("debug", "[billing-webhook] paddle_subscription_upserted", {
      subscriptionId: subscription.id,
      paddleSubscriptionId: externalId,
    });
  } catch (error) {
    billingLog("warn", "[billing-webhook] paddle_subscription_upsert_failed", {
      subscriptionId: subscription.id,
      paddleSubscriptionId: externalId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  return subscription;
}

function isSubscriptionWebhookEvent(eventType: string) {
  const normalized = String(eventType ?? "").trim().toLowerCase();
  return normalized.startsWith("subscription.") || normalized.startsWith("subscription_");
}

export async function processWebhookEventRow(
  admin: SupabaseClient,
  event: BillingWebhookEventRow,
) {
  billingLog("info", "[billing-webhook] processing_start", {
    eventId: event.id,
    provider: event.provider,
    eventType: event.event_type,
    externalEventId: event.external_event_id,
  });

  await safeUpdateWebhookEvent(admin, event.id, {
    processing_status: "processing",
    retry_count: Number(event.retry_count ?? 0) + 1,
    updated_at: new Date().toISOString(),
  });

  try {
    const normalized = normalizePaddleWebhookEvent(event.payload);
    billingLog("debug", "[billing-webhook] normalized", {
      eventId: event.id,
      eventType: normalized.eventType,
      paddleSubscriptionId: normalized.paddleSubscriptionId,
      paddleCustomerId: normalized.paddleCustomerId,
      accountId: normalized.accountId,
      ownerUserId: normalized.ownerUserId,
    });

    const relatedSubscription = await processNormalizedSubscriptionEvent(
      admin,
      normalized,
    );

    const terminalStatus =
      isSubscriptionWebhookEvent(normalized.eventType)
        ? "processed"
        : "ignored";
    
    if (isSubscriptionWebhookEvent(normalized.eventType) && !relatedSubscription) {
      billingLog("warn", "[billing-webhook] subscription_event_without_result", {
        eventId: event.id,
        eventType: normalized.eventType,
        externalId: normalized.paddleSubscriptionId,
      });
    }

    await safeUpdateWebhookEvent(admin, event.id, {
      processing_status: terminalStatus,
      processed_at: new Date().toISOString(),
      error_message: null,
      related_account_id:
        normalized.accountId ?? event.related_account_id ?? null,
      related_subscription_id: relatedSubscription?.id ?? null,
      updated_at: new Date().toISOString(),
    });

    billingLog("info", "[billing-webhook] processing_success", {
      eventId: event.id,
      status: terminalStatus,
      subscriptionId: relatedSubscription?.id ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown webhook error";
    billingLog("error", "[billing-webhook] processing_failed", {
      eventId: event.id,
      error: message,
      errorStack: error instanceof Error ? error.stack : undefined,
    });

    await safeUpdateWebhookEvent(admin, event.id, {
      processing_status: "failed",
      error_message: message,
      updated_at: new Date().toISOString(),
    });
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
