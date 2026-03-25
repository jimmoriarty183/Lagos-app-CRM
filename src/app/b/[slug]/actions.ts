"use server";

import { revalidatePath } from "next/cache";
import { buildClientFullName, splitLegacyClientName } from "@/lib/order-client";
import {
  formatDateOnlyForStorage,
  getTodayDateOnly,
  getTomorrowDateOnly,
  normalizeDateOnly,
  normalizeDateTime,
  type FollowUpActionType,
  type FollowUpSource,
  type FollowUpStatus,
} from "@/lib/follow-ups";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import type { WorkDayStatus } from "@/lib/work-day";
import { ensureWorkspaceForBusiness } from "@/lib/workspaces";

function isMissingColumnError(error: unknown, column: string) {
  const message = String((error as { message?: string } | null)?.message ?? "").toLowerCase();
  return (
    message.includes(`could not find the '${column.toLowerCase()}' column`) &&
    message.includes("schema cache")
  );
}

function isDueAtColumnError(error: unknown) {
  if (!error) return false;
  const message = String((error as { message?: string } | null)?.message ?? "").toLowerCase();
  // Schema cache error (Supabase client hasn't refreshed schema)
  if (message.includes("could not find the 'due_at' column") && message.includes("schema cache")) {
    return true;
  }
  // Actual column does not exist error (migration not applied)
  if (message.includes("column") && message.includes("does not exist")) {
    return true;
  }
  return false;
}

async function runFollowUpsMutation<T>(
  payload: Record<string, unknown>,
  action: (
    p: Record<string, unknown>,
  ) => PromiseLike<{ data?: T | null; error: { message?: string } | null }>,
) {
  let nextPayload = { ...payload };

  // First attempt with full payload (including due_at if present)
  const result = await action(nextPayload);
  if (!result.error) return result;

  // If error is about due_at column, retry without it
  if (isDueAtColumnError(result.error)) {
    const { due_at, ...payloadWithoutDueAt } = nextPayload;
    const retryResult = await action(payloadWithoutDueAt);
    return retryResult;
  }

  if (isMissingColumnError(result.error, "action_type") || isMissingColumnError(result.error, "action_payload")) {
    const { action_type, action_payload, ...payloadWithoutActionFields } = nextPayload;
    const retryResult = await action(payloadWithoutActionFields);
    return retryResult;
  }

  return result;
}

async function runFollowUpsSelect<T>(
  columns: string,
  action: (cols: string) => PromiseLike<{ data?: T | null; error: { message?: string } | null }>,
) {
  // First attempt with due_at column
  const result = await action(columns);
  if (!result.error) return result;
  
  // If error is about due_at column, retry without it
  if (isDueAtColumnError(result.error)) {
    const columnsWithoutDueAt = columns.replace(/,\s*due_at/g, "");
    const retryResult = await action(columnsWithoutDueAt);
    return retryResult;
  }

  if (isMissingColumnError(result.error, "action_type") || isMissingColumnError(result.error, "action_payload")) {
    const columnsWithoutActionFields = columns
      .replace(/,\s*action_type/g, "")
      .replace(/,\s*action_payload/g, "");
    const retryResult = await action(columnsWithoutActionFields);
    return retryResult;
  }
  
  return result;
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

const followUpActionTypes: FollowUpActionType[] = [
  "meeting",
  "reminder",
  "task",
  "message",
  "manual",
];

function normalizeFollowUpActionType(value: unknown): FollowUpActionType {
  const normalized = cleanText(value).toLowerCase();
  return followUpActionTypes.includes(normalized as FollowUpActionType)
    ? (normalized as FollowUpActionType)
    : "manual";
}

function normalizeFollowUpActionPayload(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function upperRole(value: unknown) {
  return cleanText(value).toUpperCase();
}

type OrdersPayload = Record<string, string | number | boolean | null>;

function omitKeys<T extends OrdersPayload>(payload: T, keys: readonly string[]) {
  const next = { ...payload };
  for (const key of keys) delete next[key];
  return next;
}

async function runOrdersMutation<T>(
  payload: OrdersPayload,
  action: (nextPayload: OrdersPayload) => PromiseLike<{ data?: T | null; error: { message?: string } | null }>,
) {
  let nextPayload = { ...payload };
  const stripped = new Set<string>();

  while (true) {
    const result = await action(nextPayload);
    if (!result.error) return result;

    const missingColumn = ["first_name", "last_name", "full_name", "created_by", "manager_id", "status_reason"]
      .find((column) => !stripped.has(column) && isMissingColumnError(result.error, column));

    if (!missingColumn) return result;

    stripped.add(missingColumn);
    nextPayload = omitKeys(nextPayload, [missingColumn]);
  }
}

async function requireBusinessManagerAccess(businessId: string) {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;

  if (!userId) throw new Error("Not authenticated");

  const { data: membership, error } = await admin
    .from("memberships")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const role = upperRole(membership?.role);
  if (role !== "OWNER" && role !== "MANAGER") {
    throw new Error("Forbidden");
  }

  return { admin, userId };
}

async function requireOrderManagerAccess(orderId: string) {
  const { admin, userId } = await requireBusinessManagerAccessForOrderLookup(orderId);
  return { admin, userId };
}

async function requireFollowUpManagerAccess(followUpId: string) {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;

  if (!userId) throw new Error("Not authenticated");

  const { data: followUp, error } = await admin
    .from("follow_ups")
    .select("business_id")
    .eq("id", followUpId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!followUp?.business_id) throw new Error("Follow-up not found");

  const access = await requireBusinessManagerAccess(String(followUp.business_id));
  return { ...access, userId };
}

function normalizeFollowUpDueDate(value: string) {
  const date = normalizeDateOnly(value);
  if (!date) throw new Error("Valid due date is required");
  return formatDateOnlyForStorage(date);
}

function trimNullableText(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeWorkDayStatus(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "running" || normalized === "paused" || normalized === "finished") {
    return normalized as WorkDayStatus;
  }
  return "draft" as WorkDayStatus;
}

async function insertActivityEvent(input: {
  businessId: string;
  workspaceId?: string | null;
  entityType: string;
  entityId: string;
  actorId?: string | null;
  eventType: string;
  orderId?: string | null;
  followUpId?: string | null;
  checklistItemId?: string | null;
  payload?: Record<string, unknown>;
  source?: string | null;
  createdAt?: string | null;
}) {
  const admin = supabaseAdmin();
  const workspaceId = await ensureWorkspaceForBusiness(
    admin,
    input.workspaceId ?? input.businessId,
  );
  const { error } = await admin.from("activity_events").insert({
    business_id: input.businessId,
    workspace_id: workspaceId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    order_id: input.orderId ?? null,
    actor_id: input.actorId ?? null,
    actor_type: input.actorId ? "user" : "system",
    event_type: input.eventType,
    follow_up_id: input.followUpId ?? null,
    checklist_item_id: input.checklistItemId ?? null,
    payload: input.payload ?? {},
    visibility: "internal",
    source: input.source ?? "server_action",
    created_at: input.createdAt ?? new Date().toISOString(),
  });

  if (error) throw new Error(error.message);
}

function getTrackedWorkSeconds(workDay: {
  started_at: string | null;
  paused_at: string | null;
  finished_at: string | null;
  total_pause_seconds: number;
  status: WorkDayStatus;
}) {
  if (!workDay.started_at) return 0;

  const startedAtMs = Date.parse(workDay.started_at);
  if (!Number.isFinite(startedAtMs)) return 0;

  let boundaryMs = Date.now();
  if (workDay.status === "paused" && workDay.paused_at) {
    const pausedAtMs = Date.parse(workDay.paused_at);
    if (Number.isFinite(pausedAtMs)) boundaryMs = pausedAtMs;
  } else if (workDay.status === "finished" && workDay.finished_at) {
    const finishedAtMs = Date.parse(workDay.finished_at);
    if (Number.isFinite(finishedAtMs)) boundaryMs = finishedAtMs;
  }

  return Math.max(0, Math.floor((boundaryMs - startedAtMs) / 1000) - Math.max(0, workDay.total_pause_seconds ?? 0));
}

async function requireBusinessManagerAccessForOrderLookup(orderId: string) {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;

  if (!userId) throw new Error("Not authenticated");

  const { data: orderRow, error: orderError } = await admin
    .from("orders")
    .select("business_id")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) throw new Error(orderError.message);
  if (!orderRow?.business_id) throw new Error("Order not found");

  const access = await requireBusinessManagerAccess(orderRow.business_id);
  return { ...access, userId };
}

async function buildClientColumns(
  input: {
    clientName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  },
) {
  const fallback = String(input.clientName ?? "").trim();
  const derived =
    input.firstName || input.lastName
      ? {
          firstName: String(input.firstName ?? "").trim(),
          lastName: String(input.lastName ?? "").trim(),
        }
      : splitLegacyClientName(fallback);

  const fullName = buildClientFullName(derived.firstName, derived.lastName, fallback);
  const clientColumns: Record<string, string | null> = {
    client_name: fullName || fallback || null,
    first_name: derived.firstName || null,
    last_name: derived.lastName || null,
    full_name: fullName || null,
  };

  return { clientColumns, fullName, firstName: derived.firstName, lastName: derived.lastName };
}

export async function createOrder(input: {
  businessId: string;
  businessSlug: string;
  clientName: string;
  firstName?: string;
  lastName?: string;
  clientPhone?: string;
  amount: number;
  dueDate?: string;
  description?: string;
  status?: string;
  managerId?: string | null;
}) {
  const { admin, userId } = await requireBusinessManagerAccess(input.businessId);

  const { count, error: countError } = await admin
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("business_id", input.businessId);

  if (countError) throw new Error(countError.message);

  const orderNumber = (count ?? 0) + 1;
  const { clientColumns } = await buildClientColumns({
    clientName: input.clientName,
    firstName: input.firstName,
    lastName: input.lastName,
  });

  const { error } = await runOrdersMutation(
    {
      business_id: input.businessId,
      order_number: orderNumber,
      ...clientColumns,
      client_phone: input.clientPhone || null,
      amount: input.amount,
      due_date: input.dueDate || null,
      description: input.description || null,
      status: input.status ?? "NEW",
      paid: false,
      created_by: userId,
      manager_id: input.managerId ?? userId,
    },
    (nextPayload) => admin.from("orders").insert(nextPayload),
  );

  if (error) throw new Error(error.message);

  revalidatePath(`/b/${input.businessSlug}`);
}

export async function createOrderFromForm(
  businessId: string,
  businessSlug: string,
  fd: FormData,
) {
  const firstName = String(fd.get("first_name") || "").trim();
  const lastName = String(fd.get("last_name") || "").trim();
  const clientName = buildClientFullName(firstName, lastName);
  const clientPhoneRaw = String(fd.get("client_phone") || "").trim();
  const clientPhone = clientPhoneRaw.replace(/\s+/g, " ").trim();
  const amountRaw = String(fd.get("amount") || "").trim();
  const dueDate = String(fd.get("due_date") || "").trim();
  const description = String(fd.get("description") || "").trim();
  const amount = Number(amountRaw);

  if (!firstName) throw new Error("First name is required");
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  await createOrder({
    businessId,
    businessSlug,
    clientName,
    firstName,
    lastName,
    clientPhone: clientPhone || undefined,
    amount,
    dueDate: dueDate || undefined,
    description: description || undefined,
    status: "NEW",
  });
}

export async function createQuickOrderFromForm(
  businessId: string,
  businessSlug: string,
  fd: FormData,
) {
  const firstName = String(fd.get("first_name") || "").trim();
  const lastName = String(fd.get("last_name") || "").trim();
  const clientPhoneRaw = String(fd.get("client_phone") || "").trim();
  const clientPhone = clientPhoneRaw.replace(/\s+/g, " ").trim();
  const amountRaw = String(fd.get("amount") || "").trim();
  const amount = Number(amountRaw);

  if (!firstName) throw new Error("First name is required");
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  await createOrder({
    businessId,
    businessSlug,
    clientName: buildClientFullName(firstName, lastName),
    firstName,
    lastName,
    clientPhone: clientPhone || undefined,
    amount,
    status: "NEW",
  });
}

export async function setOrderStatus(input: {
  orderId: string;
  businessSlug: string;
  status: string;
  reason?: string | null;
}) {
  const { admin } = await requireOrderManagerAccess(input.orderId);
  const normalizedStatus = String(input.status ?? "").trim().toUpperCase();
  const normalizedReason = String(input.reason ?? "").trim();

  if (normalizedStatus === "CANCELED" && !normalizedReason) {
    throw new Error("Cancel reason is required");
  }

  const patch: Record<string, string | null> = {
    status: input.status,
    closed_at: normalizedStatus === "DONE" ? new Date().toISOString() : null,
    status_reason:
      normalizedStatus === "CANCELED"
        ? normalizedReason
        : null,
  };

  const { error } = await runOrdersMutation(
    patch,
    (nextPayload) => admin.from("orders").update(nextPayload).eq("id", input.orderId),
  );
  if (error) throw new Error(error.message);

  revalidatePath(`/b/${input.businessSlug}`);
}

export async function setOrderPaid(input: {
  orderId: string;
  businessSlug: string;
  paid: boolean;
}) {
  const supabase = await supabaseServer();

  const { error } = await supabase
    .from("orders")
    .update({ paid: input.paid })
    .eq("id", input.orderId);

  if (error) throw new Error(error.message);

  revalidatePath(`/b/${input.businessSlug}`);
}

export async function updateOrder(input: {
  orderId: string;
  businessSlug: string;
  clientName: string;
  firstName?: string;
  lastName?: string;
  clientPhone: string | null;
  description: string | null;
  amount: number;
  dueDate: string | null;
}) {
  const { admin } = await requireOrderManagerAccess(input.orderId);
  const { clientColumns } = await buildClientColumns({
    clientName: input.clientName,
    firstName: input.firstName,
    lastName: input.lastName,
  });

  const { error } = await runOrdersMutation(
    {
      ...clientColumns,
      client_phone: input.clientPhone,
      description: input.description,
      amount: input.amount,
      due_date: input.dueDate,
    },
    (nextPayload) => admin.from("orders").update(nextPayload).eq("id", input.orderId),
  );

  if (error) throw new Error(error.message);

  revalidatePath(`/b/${input.businessSlug}`);
}

export async function setOrderManager(input: {
  orderId: string;
  businessSlug: string;
  managerId: string | null;
}) {
  const { admin } = await requireOrderManagerAccess(input.orderId);

  const { error: managerError } = await admin
    .from("orders")
    .update({ manager_id: input.managerId })
    .eq("id", input.orderId);

  if (!managerError) {
    revalidatePath(`/b/${input.businessSlug}`);
    return;
  }

  if (isMissingColumnError(managerError, "manager_id")) {
    {
      const { error: fallbackError } = await admin
        .from("orders")
        .update({ created_by: input.managerId })
        .eq("id", input.orderId);

      if (!fallbackError) {
        revalidatePath(`/b/${input.businessSlug}`);
        return;
      }

      throw new Error(fallbackError.message);
    }
  }

  throw new Error(managerError.message);
}

export async function createFollowUp(input: {
  businessId: string;
  businessSlug: string;
  orderId?: string | null;
  title: string;
  dueDate: string;
  dueAt?: string | null;
  note?: string | null;
  source?: FollowUpSource | string | null;
  actionType?: FollowUpActionType | string | null;
  actionPayload?: Record<string, unknown> | null;
}) {
  const { admin, userId } = await requireBusinessManagerAccess(input.businessId);
  const workspaceId = await ensureWorkspaceForBusiness(admin, input.businessId);
  const title = cleanText(input.title);
  if (!title) throw new Error("Follow-up title is required");

  const dueDate = normalizeFollowUpDueDate(input.dueDate);
  const dueAt = input.dueAt ? normalizeDateTime(input.dueAt) : null;
  const actionType = normalizeFollowUpActionType(input.actionType);
  const actionPayload = normalizeFollowUpActionPayload(input.actionPayload);
  const payload: Record<string, unknown> = {
    business_id: input.businessId,
    workspace_id: workspaceId,
    order_id: trimNullableText(input.orderId),
    title,
    due_date: dueDate,
    note: trimNullableText(input.note),
    source: trimNullableText(input.source) ?? (input.orderId ? "order" : "manual"),
    action_type: actionType,
    action_payload: actionPayload,
    status: "open" as FollowUpStatus,
    created_by: userId,
  };

  // Add due_at only if provided (safe fallback if column doesn't exist yet)
  if (dueAt) {
    payload.due_at = dueAt;
  }

  const { data, error } = await runFollowUpsMutation(
    payload,
    (p) => admin.from("follow_ups").insert(p).select("*").single(),
  );

  if (error) throw new Error(error.message);

  await insertActivityEvent({
    businessId: input.businessId,
    workspaceId: String(data.workspace_id ?? input.businessId),
    entityType: "follow_up",
    entityId: String(data.id),
    actorId: userId,
    eventType: "follow_up.created",
    orderId: trimNullableText(input.orderId),
    followUpId: String(data.id),
    payload: {
      title,
      due_date: dueDate,
      due_at: dueAt,
      status: "open",
      source: payload.source,
      note: payload.note,
      action_type: actionType,
      action_payload: actionPayload,
    },
    createdAt: data.created_at ?? undefined,
  });

  revalidatePath(`/b/${input.businessSlug}`);
  revalidatePath(`/b/${input.businessSlug}/today`);

  return data;
}

export async function completeFollowUp(input: {
  followUpId: string;
  businessSlug: string;
  completionNote?: string | null;
  nextFollowUp?: {
    title: string;
    dueDate: string;
    dueAt?: string | null;
    note?: string | null;
  } | null;
}) {
  const { admin, userId } = await requireFollowUpManagerAccess(input.followUpId);
  const completionNote = trimNullableText(input.completionNote);
  const nextTitle = cleanText(input.nextFollowUp?.title);
  const shouldCreateNext = Boolean(input.nextFollowUp && nextTitle);

  if (input.nextFollowUp && !nextTitle) {
    throw new Error("Next follow-up title is required");
  }

  const nextDueDate = shouldCreateNext
    ? normalizeFollowUpDueDate(String(input.nextFollowUp?.dueDate ?? ""))
    : null;
  const nextDueAt = shouldCreateNext && input.nextFollowUp?.dueAt
    ? normalizeDateTime(input.nextFollowUp.dueAt)
    : null;

  const { data: existing, error: existingError } = await admin
    .from("follow_ups")
    .select("id, business_id, workspace_id, order_id, title, due_date, due_at, status, source, action_type, action_payload")
    .eq("id", input.followUpId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (!existing) throw new Error("Follow-up not found");
  if (existing.status === "cancelled") {
    throw new Error("Cancelled follow-up cannot be completed");
  }

  let nextCreated: Record<string, unknown> | null = null;

  if (shouldCreateNext) {
    const nextPayload: Record<string, unknown> = {
      business_id: existing.business_id,
      workspace_id: existing.workspace_id ?? existing.business_id,
      order_id: existing.order_id,
      title: nextTitle,
      due_date: nextDueDate,
      note: trimNullableText(input.nextFollowUp?.note),
      source: trimNullableText(existing.source) ?? "manual",
      action_type: "manual" satisfies FollowUpActionType,
      action_payload: {},
      status: "open",
      created_by: userId,
    };

    // Add due_at only if provided (safe fallback if column doesn't exist yet)
    if (nextDueAt) {
      nextPayload.due_at = nextDueAt;
    }

    const { data: nextData, error: nextError } = await runFollowUpsMutation(
      nextPayload,
      (p) => admin.from("follow_ups").insert(p).select("*").single(),
    );

    if (nextError) throw new Error(nextError.message);
    nextCreated = nextData as Record<string, unknown>;
  }

  const completedAt = new Date().toISOString();
  const { data, error } = await runFollowUpsMutation(
    {
      status: "done",
      completed_at: completedAt,
      completed_by: userId,
      completion_note: completionNote,
      next_follow_up_id: nextCreated?.id ?? null,
    },
    (p) => admin.from("follow_ups").update(p).eq("id", input.followUpId).select("*").single(),
  );

  if (error) throw new Error(error.message);

  await insertActivityEvent({
    businessId: String(data.business_id),
    workspaceId: String(data.workspace_id ?? data.business_id),
    entityType: "follow_up",
    entityId: String(data.id),
    actorId: userId,
    eventType: shouldCreateNext
      ? "follow_up.completed_and_next_created"
      : completionNote
        ? "follow_up.completed_with_note"
        : "follow_up.completed",
    orderId: trimNullableText(data.order_id),
    followUpId: String(data.id),
    payload: {
      title: data.title,
      due_date: data.due_date,
      due_at: data.due_at,
      completion_note: completionNote,
      action_type: data.action_type ?? null,
      action_payload: data.action_payload ?? {},
      next_follow_up_id: nextCreated?.id ?? null,
      next_follow_up_title: nextCreated?.title ?? null,
      next_follow_up_due_date: nextCreated?.due_date ?? null,
      next_follow_up_due_at: nextCreated?.due_at ?? null,
    },
    createdAt: data.completed_at ?? data.updated_at ?? completedAt,
  });

  if (nextCreated?.id) {
    await insertActivityEvent({
      businessId: String(data.business_id),
      workspaceId: String(nextCreated.workspace_id ?? data.workspace_id ?? data.business_id),
      entityType: "follow_up",
      entityId: String(nextCreated.id),
      actorId: userId,
      eventType: "follow_up.created",
      orderId: trimNullableText(String(nextCreated.order_id ?? "")),
      followUpId: String(nextCreated.id),
      payload: {
        title: String(nextCreated.title ?? nextTitle),
        due_date: String(nextCreated.due_date ?? nextDueDate ?? ""),
        due_at: String(nextCreated.due_at ?? nextDueAt ?? ""),
        status: "open",
        source: String(nextCreated.source ?? existing.source ?? "manual"),
        note: nextCreated.note ?? null,
        action_type: String(nextCreated.action_type ?? "manual"),
        action_payload: nextCreated.action_payload ?? {},
        created_from_follow_up_id: data.id,
      },
      createdAt: String(nextCreated.created_at ?? completedAt),
    });
  }

  revalidatePath(`/b/${input.businessSlug}`);
  revalidatePath(`/b/${input.businessSlug}/today`);

  return {
    completed: data,
    next: nextCreated,
  };
}

export async function updateFollowUpStatus(input: {
  followUpId: string;
  businessSlug: string;
  status: FollowUpStatus;
}) {
  const { admin, userId } = await requireFollowUpManagerAccess(input.followUpId);
  const nextStatus = String(input.status ?? "").trim().toLowerCase() as FollowUpStatus;

  if (!["open", "done", "cancelled"].includes(nextStatus)) {
    throw new Error("Invalid follow-up status");
  }

  const patch = {
    status: nextStatus,
    completed_at: nextStatus === "done" ? new Date().toISOString() : null,
    completed_by: nextStatus === "done" ? userId : null,
    completion_note: null,
    next_follow_up_id: null,
  };
  const { data: existing, error: existingError } = await admin
    .from("follow_ups")
    .select("id, business_id, order_id, title, due_date, status, completion_note, next_follow_up_id, action_type, action_payload")
    .eq("id", input.followUpId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (!existing) throw new Error("Follow-up not found");

  const { data, error } = await runFollowUpsMutation(
    patch,
    (p) => admin.from("follow_ups").update(p).eq("id", input.followUpId).select("*").single(),
  );

  if (error) throw new Error(error.message);

  await insertActivityEvent({
    businessId: String(data.business_id),
    workspaceId: String(data.workspace_id ?? data.business_id),
    entityType: "follow_up",
    entityId: String(data.id),
    actorId: userId,
    eventType:
      nextStatus === "done"
        ? "follow_up.completed"
        : nextStatus === "open"
          ? "follow_up.reopened"
          : "follow_up.cancelled",
    orderId: trimNullableText(data.order_id),
    followUpId: String(data.id),
    payload: {
      title: data.title,
      from_status: existing.status,
      to_status: nextStatus,
      due_date: data.due_date,
      completion_note: data.completion_note,
      next_follow_up_id: data.next_follow_up_id,
      action_type: data.action_type ?? null,
      action_payload: data.action_payload ?? {},
    },
    createdAt: data.updated_at ?? data.completed_at ?? undefined,
  });

  revalidatePath(`/b/${input.businessSlug}`);
  revalidatePath(`/b/${input.businessSlug}/today`);

  return data;
}

export async function rescheduleFollowUp(input: {
  followUpId: string;
  businessSlug: string;
  dueDate: string;
  dueAt?: string | null;
}) {
  const { admin, userId } = await requireFollowUpManagerAccess(input.followUpId);
  const dueDate = normalizeFollowUpDueDate(input.dueDate);
  const dueAt = input.dueAt ? normalizeDateTime(input.dueAt) : null;

  // Safe select with retry for due_at column
  const { data: existing, error: existingError } = await runFollowUpsSelect(
    "id, business_id, workspace_id, order_id, title, due_date, due_at, action_type, action_payload",
    (cols) => admin.from("follow_ups").select(cols).eq("id", input.followUpId).maybeSingle(),
  );

  if (existingError) throw new Error(existingError.message);
  if (!existing) throw new Error("Follow-up not found");

  // Safe update: only include due_at if provided
  const updatePayload: Record<string, unknown> = {
    due_date: dueDate,
    status: "open",
    completed_at: null,
    completed_by: null,
    completion_note: null,
    next_follow_up_id: null,
  };

  if (dueAt) {
    updatePayload.due_at = dueAt;
  }

  const { data, error } = await runFollowUpsMutation(
    updatePayload,
    (p) => admin.from("follow_ups").update(p).eq("id", input.followUpId).select("*").single(),
  );

  if (error) throw new Error(error.message);

  await insertActivityEvent({
    businessId: String(data.business_id),
    workspaceId: String(data.workspace_id ?? existing.workspace_id ?? data.business_id),
    entityType: "follow_up",
    entityId: String(data.id),
    actorId: userId,
    eventType: "follow_up.rescheduled",
    orderId: trimNullableText(data.order_id),
    followUpId: String(data.id),
    payload: {
      title: data.title,
      previous_due_date: existing.due_date,
      previous_due_at: existing.due_at,
      new_due_date: data.due_date,
      new_due_at: data.due_at,
      action_type: data.action_type ?? existing.action_type ?? null,
      action_payload: data.action_payload ?? existing.action_payload ?? {},
    },
    createdAt: data.updated_at ?? undefined,
  });

  revalidatePath(`/b/${input.businessSlug}`);
  revalidatePath(`/b/${input.businessSlug}/today`);

  return data;
}

// Shared helper for the future end-of-day flow so tomorrow plans reuse follow-ups.
export async function createTomorrowFollowUps(input: {
  businessId: string;
  businessSlug: string;
  items: Array<{ title: string; note?: string | null; orderId?: string | null }>;
  source?: FollowUpSource | string | null;
}) {
  const { admin, userId } = await requireBusinessManagerAccess(input.businessId);
  const workspaceId = await ensureWorkspaceForBusiness(admin, input.businessId);
  const dueDate = getTomorrowDateOnly();
  const rows = input.items
    .map((item) => ({
      business_id: input.businessId,
      workspace_id: workspaceId,
      order_id: trimNullableText(item.orderId),
      title: cleanText(item.title),
      due_date: dueDate,
      status: "open" as FollowUpStatus,
      note: trimNullableText(item.note),
      source: trimNullableText(input.source) ?? "end_of_day",
      action_type: "manual" satisfies FollowUpActionType,
      action_payload: {},
      created_by: userId,
    }))
    .filter((item) => item.title.length > 0);

  if (rows.length === 0) return [];

  const { data, error } = await admin.from("follow_ups").insert(rows).select("*");
  if (error) throw new Error(error.message);

  await Promise.all(
    (data ?? []).map((followUp) =>
      insertActivityEvent({
        businessId: String(followUp.business_id),
        workspaceId: String(followUp.workspace_id ?? followUp.business_id),
        entityType: "follow_up",
        entityId: String(followUp.id),
        actorId: userId,
        eventType: "follow_up.created",
        orderId: trimNullableText(followUp.order_id),
        followUpId: String(followUp.id),
        payload: {
          title: followUp.title,
          due_date: followUp.due_date,
          status: followUp.status,
          source: followUp.source,
          note: followUp.note,
        },
        createdAt: followUp.created_at ?? undefined,
      }),
    ),
  );

  revalidatePath(`/b/${input.businessSlug}`);
  revalidatePath(`/b/${input.businessSlug}/today`);

  return data ?? [];
}

async function upsertWorkDayRecord(input: {
  businessId: string;
  userId: string;
  status: WorkDayStatus;
  workDate?: string;
  dailySummary?: string | null;
  startedAt?: string | null;
  pausedAt?: string | null;
  resumedAt?: string | null;
  finishedAt?: string | null;
}) {
  const admin = supabaseAdmin();
  const workspaceId = await ensureWorkspaceForBusiness(admin, input.businessId);
  const workDate = input.workDate ?? getTodayDateOnly();
  const dailySummary = trimNullableText(input.dailySummary);

  const { data: existing, error: existingError } = await admin
    .from("work_days")
    .select("*")
    .eq("business_id", input.businessId)
    .eq("user_id", input.userId)
    .eq("work_date", workDate)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  const existingPauseSeconds = Number(existing?.total_pause_seconds ?? 0);
  const pausedAtValue =
    input.pausedAt ?? (input.status === "paused" ? new Date().toISOString() : existing?.paused_at ?? null);
  const resumeBoundary = input.resumedAt ?? (input.status === "running" ? new Date().toISOString() : null);
  const finishBoundary = input.finishedAt ?? (input.status === "finished" ? new Date().toISOString() : null);

  let totalPauseSeconds = existingPauseSeconds;
  if (normalizeWorkDayStatus(existing?.status) === "paused" && existing?.paused_at) {
    const pauseStartedAt = Date.parse(existing.paused_at);
    const pauseEndedAt = Date.parse(resumeBoundary ?? finishBoundary ?? "");

    if (Number.isFinite(pauseStartedAt) && Number.isFinite(pauseEndedAt) && pauseEndedAt > pauseStartedAt) {
      totalPauseSeconds += Math.floor((pauseEndedAt - pauseStartedAt) / 1000);
    }
  }
  if (
    normalizeWorkDayStatus(existing?.status) === "finished" &&
    existing?.finished_at &&
    input.status === "running"
  ) {
    const finishedAt = Date.parse(existing.finished_at);
    const resumedAt = Date.parse(resumeBoundary ?? "");

    if (Number.isFinite(finishedAt) && Number.isFinite(resumedAt) && resumedAt > finishedAt) {
      totalPauseSeconds += Math.floor((resumedAt - finishedAt) / 1000);
    }
  }

  const payload = {
    business_id: input.businessId,
    workspace_id: workspaceId,
    user_id: input.userId,
    work_date: workDate,
    status: normalizeWorkDayStatus(input.status),
    daily_summary: dailySummary ?? existing?.daily_summary ?? null,
    started_at: existing?.started_at ?? input.startedAt ?? null,
    paused_at: input.status === "paused" ? pausedAtValue : null,
    resumed_at: input.resumedAt ?? existing?.resumed_at ?? null,
    finished_at: input.status === "finished" ? finishBoundary ?? existing?.finished_at ?? null : null,
    total_pause_seconds: totalPauseSeconds,
  };

  const query = existing
    ? admin.from("work_days").update(payload).eq("id", existing.id)
    : admin.from("work_days").insert(payload);

  const { data, error } = await query.select("*").single();
  if (error) throw new Error(error.message);

  return data;
}

export async function startWorkDay(input: {
  businessId: string;
  businessSlug: string;
}) {
  const { userId } = await requireBusinessManagerAccess(input.businessId);
  const startedAt = new Date().toISOString();
  const row = await upsertWorkDayRecord({
    businessId: input.businessId,
    userId,
    status: "running",
    startedAt,
    resumedAt: startedAt,
    pausedAt: null,
    finishedAt: null,
  });

  revalidatePath(`/b/${input.businessSlug}`);
  revalidatePath(`/b/${input.businessSlug}/today`);

  await insertActivityEvent({
    businessId: input.businessId,
    entityType: "work_day",
    entityId: String(row.id),
    actorId: userId,
    eventType: "work_day.started",
    payload: {
      state: row.status,
      work_date: row.work_date,
      started_at: row.started_at,
      resumed_at: row.resumed_at,
      total_tracked_seconds: getTrackedWorkSeconds(row),
    },
    createdAt: row.resumed_at ?? row.started_at ?? undefined,
  });

  return row;
}

export async function pauseWorkDay(input: {
  businessId: string;
  businessSlug: string;
}) {
  const { userId } = await requireBusinessManagerAccess(input.businessId);
  const row = await upsertWorkDayRecord({
    businessId: input.businessId,
    userId,
    status: "paused",
    pausedAt: new Date().toISOString(),
  });

  revalidatePath(`/b/${input.businessSlug}`);
  revalidatePath(`/b/${input.businessSlug}/today`);

  await insertActivityEvent({
    businessId: input.businessId,
    entityType: "work_day",
    entityId: String(row.id),
    actorId: userId,
    eventType: "work_day.paused",
    payload: {
      state: row.status,
      work_date: row.work_date,
      paused_at: row.paused_at,
      total_tracked_seconds: getTrackedWorkSeconds(row),
    },
    createdAt: row.paused_at ?? undefined,
  });

  return row;
}

export async function resumeWorkDay(input: {
  businessId: string;
  businessSlug: string;
}) {
  const { userId } = await requireBusinessManagerAccess(input.businessId);
  const resumedAt = new Date().toISOString();
  const row = await upsertWorkDayRecord({
    businessId: input.businessId,
    userId,
    status: "running",
    resumedAt,
    pausedAt: null,
  });

  revalidatePath(`/b/${input.businessSlug}`);
  revalidatePath(`/b/${input.businessSlug}/today`);

  await insertActivityEvent({
    businessId: input.businessId,
    entityType: "work_day",
    entityId: String(row.id),
    actorId: userId,
    eventType: "work_day.resumed",
    payload: {
      state: row.status,
      work_date: row.work_date,
      resumed_at: row.resumed_at,
      total_tracked_seconds: getTrackedWorkSeconds(row),
    },
    createdAt: row.resumed_at ?? undefined,
  });

  return row;
}

export async function completeWorkDay(input: {
  businessId: string;
  businessSlug: string;
  dailySummary: string;
  tomorrowItems: Array<{ title: string; note?: string | null; orderId?: string | null }>;
}) {
  const { userId } = await requireBusinessManagerAccess(input.businessId);
  const summary = cleanText(input.dailySummary);
  if (!summary) throw new Error("Daily summary is required");

  const row = await upsertWorkDayRecord({
    businessId: input.businessId,
    userId,
    status: "finished",
    dailySummary: summary,
    finishedAt: new Date().toISOString(),
    pausedAt: null,
  });

  const tomorrowFollowUps = await createTomorrowFollowUps({
    businessId: input.businessId,
    businessSlug: input.businessSlug,
    items: input.tomorrowItems,
    source: "end_of_day",
  });

  revalidatePath(`/b/${input.businessSlug}`);
  revalidatePath(`/b/${input.businessSlug}/today`);

  await insertActivityEvent({
    businessId: input.businessId,
    entityType: "work_day",
    entityId: String(row.id),
    actorId: userId,
    eventType: "work_day.ended",
    payload: {
      state: row.status,
      work_date: row.work_date,
      finished_at: row.finished_at,
      total_tracked_seconds: getTrackedWorkSeconds(row),
      tomorrow_items_count: tomorrowFollowUps.length,
    },
    createdAt: row.finished_at ?? undefined,
  });

  return {
    workDay: row,
    tomorrowFollowUps,
  };
}
