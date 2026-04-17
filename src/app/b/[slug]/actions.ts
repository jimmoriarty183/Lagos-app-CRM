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
import {
  findCompanyMatches,
  findIndividualMatches,
  normalizePhone as normalizePhoneDigitsFromMatcher,
} from "@/lib/clients/matching";
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
  const nextPayload = { ...payload };

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

    const missingColumn = [
      "first_name",
      "last_name",
      "full_name",
      "created_by",
      "manager_id",
      "status_reason",
      "client_id",
      "contact_id",
      "due_at",
    ]
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
  let actorId: string | null = input.actorId ?? null;

  // Some environments can have auth users without matching profile rows.
  // Activity stream should never block core business actions.
  if (actorId) {
    const { data: actorProfile, error: actorLookupError } = await admin
      .from("profiles")
      .select("id")
      .eq("id", actorId)
      .maybeSingle();

    if (actorLookupError || !actorProfile?.id) {
      actorId = null;
    }
  }

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
    actor_id: actorId,
    actor_type: actorId ? "user" : "system",
    event_type: input.eventType,
    follow_up_id: input.followUpId ?? null,
    checklist_item_id: input.checklistItemId ?? null,
    payload: input.payload ?? {},
    visibility: "internal",
    source: input.source ?? "server_action",
    created_at: input.createdAt ?? new Date().toISOString(),
  });

  if (error) {
    const msg = String(error.message ?? "").toLowerCase();
    const isNonBlockingActivityError =
      msg.includes("activity_events") ||
      msg.includes("activity event") ||
      msg.includes("relation \"public.activity_events\"") ||
      msg.includes("foreign key") ||
      msg.includes("profiles");

    if (isNonBlockingActivityError) {
      console.warn("[activity_events] insert skipped:", error.message);
      return;
    }

    throw new Error(error.message);
  }
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

function normalizePhoneDigits(value: string | null | undefined) {
  return String(value ?? "").replace(/\D+/g, "");
}

function normalizeEmail(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeAlnum(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeNameForMatch(value: string | null | undefined) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export type CreateOrderClientPayloadInput = {
  businessId: string;
  businessSlug: string;
  clientType: "individual" | "company";
  managerId?: string | null;
  amount: number;
  dueDate?: string | null;
  dueAt?: string | null;
  description?: string | null;
  existingClientId?: string | null;
  existingContactId?: string | null;
  individual?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    postcode?: string | null;
    inn?: string | null;
  } | null;
  company?: {
    companyName?: string | null;
    registrationNumber?: string | null;
    vatNumber?: string | null;
    email?: string | null;
    phone?: string | null;
    legalAddress?: string | null;
    actualAddress?: string | null;
    postcode?: string | null;
  } | null;
  contact?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    jobTitle?: string | null;
    isPrimary?: boolean;
  } | null;
  orderLines?: Array<{
    lineType: "PRODUCT" | "SERVICE";
    catalogItemId: string;
    qty: number;
    unitPrice: number;
    newProduct?: {
      sku: string;
      name: string;
    } | null;
  }> | null;
};

export type CreateOrderFromClientPayloadResult =
  | {
      ok: true;
      orderId: string;
      clientId: string | null;
      contactId: string | null;
      createdNewClient: boolean;
    }
  | {
      ok: false;
      error: string;
    };
function getActionErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message || "Failed to create order";
  if (typeof error === "string") return error;
  return "Failed to create order";
}

export type CatalogOrderLineOption = {
  id: string;
  code: string;
  name: string;
  lineType: "PRODUCT" | "SERVICE";
  unitPrice: number;
  taxRate: number;
  currencyCode: string;
  uomCode?: string | null;
};

export async function getCatalogOrderLineOptions(input: { businessId: string }) {
  try {
    const { admin } = await requireBusinessManagerAccess(input.businessId);

    const [{ data: products, error: productsError }, { data: services, error: servicesError }] =
      await Promise.all([
        admin
          .from("catalog_products")
          .select("id, sku, name, default_unit_price, default_tax_rate, currency_code, uom_code")
          .eq("business_id", input.businessId)
          .eq("status", "ACTIVE")
          .eq("is_deleted", false)
          .order("name", { ascending: true })
          .limit(500),
        admin
          .from("catalog_services")
          .select("id, service_code, name, default_unit_price, default_tax_rate, currency_code")
          .eq("business_id", input.businessId)
          .eq("status", "ACTIVE")
          .eq("is_deleted", false)
          .order("name", { ascending: true })
          .limit(500),
      ]);

    if (productsError) throw new Error(productsError.message);
    if (servicesError) throw new Error(servicesError.message);

    const productOptions: CatalogOrderLineOption[] = (products ?? []).map((row) => ({
      id: String((row as { id: string }).id),
      code: cleanText((row as { sku?: string | null }).sku),
      name: cleanText((row as { name?: string | null }).name) || "Product",
      lineType: "PRODUCT",
      unitPrice: Number((row as { default_unit_price?: number | string }).default_unit_price ?? 0),
      taxRate: Number((row as { default_tax_rate?: number | string }).default_tax_rate ?? 0),
      currencyCode: cleanText((row as { currency_code?: string | null }).currency_code).toUpperCase(),
      uomCode: cleanText((row as { uom_code?: string | null }).uom_code) || null,
    }));

    const serviceOptions: CatalogOrderLineOption[] = (services ?? []).map((row) => ({
      id: String((row as { id: string }).id),
      code: cleanText((row as { service_code?: string | null }).service_code),
      name: cleanText((row as { name?: string | null }).name) || "Service",
      lineType: "SERVICE",
      unitPrice: Number((row as { default_unit_price?: number | string }).default_unit_price ?? 0),
      taxRate: Number((row as { default_tax_rate?: number | string }).default_tax_rate ?? 0),
      currencyCode: cleanText((row as { currency_code?: string | null }).currency_code).toUpperCase(),
      uomCode: null,
    }));

    return {
      ok: true as const,
      products: productOptions.filter(
        (item) => Number.isFinite(item.unitPrice) && Number.isFinite(item.taxRate),
      ),
      services: serviceOptions.filter(
        (item) => Number.isFinite(item.unitPrice) && Number.isFinite(item.taxRate),
      ),
    };
  } catch (error) {
    return {
      ok: false as const,
      error: getActionErrorMessage(error),
      products: [] as CatalogOrderLineOption[],
      services: [] as CatalogOrderLineOption[],
    };
  }
}

async function resolveIndividualClientForCreate(input: {
  admin: ReturnType<typeof supabaseAdmin>;
  businessId: string;
  userId: string;
  existingClientId?: string | null;
  fields: NonNullable<CreateOrderClientPayloadInput["individual"]>;
}): Promise<{ clientId: string; created: boolean }> {
  const firstName = cleanText(input.fields.firstName);
  const lastName = cleanText(input.fields.lastName);
  const fullName = buildClientFullName(firstName, lastName);
  const phone = cleanText(input.fields.phone);
  const email = cleanText(input.fields.email);
  const postcode = cleanText(input.fields.postcode);
  const address = cleanText(input.fields.address);
  const innNormalized = normalizeAlnum(input.fields.inn);
  const innRaw = cleanText(input.fields.inn);

  if (input.existingClientId) {
    const { data: existing, error: existingError } = await input.admin
      .from("clients")
      .select("id, business_id, client_type, metadata")
      .eq("id", input.existingClientId)
      .eq("business_id", input.businessId)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (!existing?.id || existing.client_type !== "individual") {
      throw new Error("Selected client is not a valid individual");
    }

    const metadata = (existing.metadata as Record<string, unknown> | null) ?? {};
    if (innNormalized) {
      metadata.inn = innRaw;
      metadata.inn_normalized = innNormalized;
    }

    const { error: clientUpdateError } = await input.admin
      .from("clients")
      .update({
        display_name: fullName || String(existing.id),
        primary_email: email || null,
        primary_phone: phone || null,
        postcode: postcode || null,
        metadata,
      })
      .eq("id", existing.id);
    if (clientUpdateError) throw new Error(clientUpdateError.message);

    const { error: profileError } = await input.admin
      .from("client_individual_profiles")
      .upsert(
        {
          client_id: existing.id,
          first_name: firstName || null,
          last_name: lastName || null,
          full_name: fullName || null,
          email: email || null,
          phone: phone || null,
          address_line1: address || null,
          postcode: postcode || null,
        },
        { onConflict: "client_id" },
      );
    if (profileError) throw new Error(profileError.message);

    return { clientId: String(existing.id), created: false };
  }

  const { data: insertedClient, error: clientInsertError } = await input.admin
    .from("clients")
    .insert({
      business_id: input.businessId,
      workspace_id: null,
      client_type: "individual",
      display_name: fullName || "Individual client",
      primary_email: email || null,
      primary_phone: phone || null,
      postcode: postcode || null,
      created_by: input.userId,
      metadata: innNormalized
        ? {
            inn: innRaw,
            inn_normalized: innNormalized,
          }
        : {},
    })
    .select("id")
    .single();
  if (clientInsertError) throw new Error(clientInsertError.message);

  const clientId = String((insertedClient as { id: string }).id);
  const { error: profileError } = await input.admin
    .from("client_individual_profiles")
    .insert({
      client_id: clientId,
      first_name: firstName || null,
      last_name: lastName || null,
      full_name: fullName || null,
      email: email || null,
      phone: phone || null,
      address_line1: address || null,
      postcode: postcode || null,
    });
  if (profileError) throw new Error(profileError.message);

  return { clientId, created: true };
}

async function resolveCompanyClientForCreate(input: {
  admin: ReturnType<typeof supabaseAdmin>;
  businessId: string;
  userId: string;
  existingClientId?: string | null;
  fields: NonNullable<CreateOrderClientPayloadInput["company"]>;
}): Promise<{ clientId: string; created: boolean }> {
  const companyName = cleanText(input.fields.companyName);
  const registrationNumber = cleanText(input.fields.registrationNumber);
  const vatNumber = cleanText(input.fields.vatNumber);
  const email = cleanText(input.fields.email);
  const phone = cleanText(input.fields.phone);
  const postcode = cleanText(input.fields.postcode);
  const legalAddress = cleanText(input.fields.legalAddress);
  const actualAddress = cleanText(input.fields.actualAddress);

  if (input.existingClientId) {
    const { data: existing, error: existingError } = await input.admin
      .from("clients")
      .select("id, business_id, client_type, metadata")
      .eq("id", input.existingClientId)
      .eq("business_id", input.businessId)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (!existing?.id || existing.client_type !== "company") {
      throw new Error("Selected client is not a valid company");
    }

    const metadata = (existing.metadata as Record<string, unknown> | null) ?? {};
    if (actualAddress) metadata.actual_address = actualAddress;

    const { error: clientUpdateError } = await input.admin
      .from("clients")
      .update({
        display_name: companyName || String(existing.id),
        primary_email: email || null,
        primary_phone: phone || null,
        postcode: postcode || null,
        metadata,
      })
      .eq("id", existing.id);
    if (clientUpdateError) throw new Error(clientUpdateError.message);

    const { error: profileError } = await input.admin
      .from("client_company_profiles")
      .upsert(
        {
          client_id: existing.id,
          company_name: companyName || null,
          registration_number: registrationNumber || null,
          vat_number: vatNumber || null,
          email: email || null,
          phone: phone || null,
          address_line1: legalAddress || null,
          postcode: postcode || null,
        },
        { onConflict: "client_id" },
      );
    if (profileError) throw new Error(profileError.message);

    return { clientId: String(existing.id), created: false };
  }

  const { data: insertedClient, error: clientInsertError } = await input.admin
    .from("clients")
    .insert({
      business_id: input.businessId,
      workspace_id: null,
      client_type: "company",
      display_name: companyName || "Company client",
      primary_email: email || null,
      primary_phone: phone || null,
      postcode: postcode || null,
      created_by: input.userId,
      metadata: actualAddress
        ? {
            actual_address: actualAddress,
          }
        : {},
    })
    .select("id")
    .single();
  if (clientInsertError) throw new Error(clientInsertError.message);

  const clientId = String((insertedClient as { id: string }).id);
  const { error: profileError } = await input.admin
    .from("client_company_profiles")
    .insert({
      client_id: clientId,
      company_name: companyName || "Company client",
      registration_number: registrationNumber || null,
      vat_number: vatNumber || null,
      email: email || null,
      phone: phone || null,
      address_line1: legalAddress || null,
      postcode: postcode || null,
    });
  if (profileError) throw new Error(profileError.message);

  return { clientId, created: true };
}

async function resolveCompanyContactForOrder(input: {
  admin: ReturnType<typeof supabaseAdmin>;
  businessId: string;
  clientId: string;
  existingContactId?: string | null;
  contact?: CreateOrderClientPayloadInput["contact"] | null;
  userId: string;
}) {
  if (input.existingContactId) {
    const { data, error } = await input.admin
      .from("client_contacts")
      .select("id, client_id")
      .eq("id", input.existingContactId)
      .eq("client_id", input.clientId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data?.id) throw new Error("Selected contact not found for this company");
    return String(data.id);
  }

  const contact = input.contact ?? null;
  if (!contact) return null;
  const firstName = cleanText(contact.firstName);
  const lastName = cleanText(contact.lastName);
  const email = cleanText(contact.email);
  const phone = cleanText(contact.phone);
  const jobTitle = cleanText(contact.jobTitle);
  const fullName = buildClientFullName(firstName, lastName);
  if (!fullName && !email && !phone) return null;

  const { data: inserted, error } = await input.admin
    .from("client_contacts")
    .insert({
      client_id: input.clientId,
      first_name: firstName || null,
      last_name: lastName || null,
      full_name: fullName || null,
      email: email || null,
      phone: phone || null,
      job_title: jobTitle || null,
      is_primary: Boolean(contact.isPrimary),
      is_active: true,
      created_by: input.userId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return String((inserted as { id: string }).id);
}

export async function createOrderFromClientPayload(
  input: CreateOrderClientPayloadInput,
): Promise<CreateOrderFromClientPayloadResult> {
  try {
  const { admin, userId } = await requireBusinessManagerAccess(input.businessId);
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be greater than 0");

  const managerId = cleanText(input.managerId);
  if (!managerId) throw new Error("Manager is required");
  const inputOrderLines = Array.isArray(input.orderLines) ? input.orderLines : [];
  if (inputOrderLines.length > 0) {
    const { error: orderLinesSchemaError } = await admin
      .from("order_lines")
      .select("id")
      .limit(1);
    if (orderLinesSchemaError) {
      throw new Error("Order lines are not available in the current schema. Apply CRM/ERP migrations first.");
    }
  }
  const dueDate = cleanText(input.dueDate) || null;
  const dueAt = input.dueAt ? normalizeDateTime(input.dueAt) : null;
  const description = cleanText(input.description) || null;
  const existingClientId = cleanText(input.existingClientId) || null;
  const existingContactId = cleanText(input.existingContactId) || null;

  if (input.clientType !== "individual" && input.clientType !== "company") {
    throw new Error("Client type is required");
  }

  let clientId: string | null = null;
  let createdNewClient = false;
  let contactId: string | null = null;
  let legacyFirstName: string | null = null;
  let legacyLastName: string | null = null;
  let legacyFullName: string | null = null;
  let legacyClientName: string | null = null;
  let legacyPhone: string | null = null;

  if (input.clientType === "individual") {
    const fields = input.individual ?? {};
    const firstName = cleanText(fields.firstName);
    const lastName = cleanText(fields.lastName);
    const phone = cleanText(fields.phone);
    const email = cleanText(fields.email);
    const inn = cleanText(fields.inn);
    const strongIdentifierOk = Boolean(normalizePhoneDigitsFromMatcher(phone) || normalizeEmail(email) || normalizeAlnum(inn));
    if (!strongIdentifierOk) {
      throw new Error("At least one strong identifier is required: INN, phone, or email");
    }
    if (!firstName && !lastName) throw new Error("At least one name field is required");

    try {
      await findIndividualMatches(admin, input.businessId, {
        firstName,
        lastName,
        phone,
        email,
        inn,
      });
      const result = await resolveIndividualClientForCreate({
        admin,
        businessId: input.businessId,
        userId,
        existingClientId,
        fields,
      });
      clientId = result.clientId;
      createdNewClient = result.created;
    } catch (error: unknown) {
      if (!isMissingClientModelError(error)) throw error;
      // Fallback: legacy schema without clients table is still supported.
      clientId = null;
      createdNewClient = false;
    }

    legacyFirstName = firstName || null;
    legacyLastName = lastName || null;
    legacyFullName = buildClientFullName(firstName, lastName) || null;
    legacyClientName = legacyFullName;
    legacyPhone = phone || null;
  } else {
    const fields = input.company ?? {};
    const companyName = cleanText(fields.companyName);
    const registrationNumber = cleanText(fields.registrationNumber);
    const vatNumber = cleanText(fields.vatNumber);
    const phone = cleanText(fields.phone);
    const email = cleanText(fields.email);
    const strongIdentifierOk = Boolean(
      normalizeAlnum(registrationNumber) ||
        normalizeAlnum(vatNumber) ||
        normalizePhoneDigitsFromMatcher(phone) ||
        normalizeEmail(email),
    );
    if (!companyName) throw new Error("Company name is required");
    if (!strongIdentifierOk) {
      throw new Error("At least one strong identifier is required: registration number, VAT/tax, phone, or email");
    }

    try {
      await findCompanyMatches(admin, input.businessId, {
        companyName,
        registrationNumber,
        vatNumber,
        phone,
        email,
      });

      const result = await resolveCompanyClientForCreate({
        admin,
        businessId: input.businessId,
        userId,
        existingClientId,
        fields,
      });
      clientId = result.clientId;
      createdNewClient = result.created;

      contactId = await resolveCompanyContactForOrder({
        admin,
        businessId: input.businessId,
        clientId,
        existingContactId,
        contact: input.contact,
        userId,
      });
    } catch (error: unknown) {
      if (!isMissingClientModelError(error)) throw error;
      // Fallback: create order without clients/contact links on legacy DB schema.
      clientId = null;
      contactId = null;
      createdNewClient = false;
    }

    legacyClientName = companyName || null;
    legacyFullName = companyName || null;
    legacyPhone = phone || null;
  }

  const { count, error: countError } = await admin
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("business_id", input.businessId);
  if (countError) throw new Error(countError.message);

  const orderNumber = (count ?? 0) + 1;
  const { data: insertedOrder, error: orderError } = await runOrdersMutation(
    {
      business_id: input.businessId,
      order_number: orderNumber,
      client_name: legacyClientName,
      first_name: legacyFirstName,
      last_name: legacyLastName,
      full_name: legacyFullName,
      client_phone: legacyPhone,
      amount,
      due_date: dueDate,
      due_at: dueAt,
      description,
      status: "NEW",
      paid: false,
      created_by: userId,
      manager_id: managerId,
      client_id: clientId,
      contact_id: contactId,
    },
    (nextPayload) => admin.from("orders").insert(nextPayload).select("id").single(),
  );
  if (orderError) throw new Error(orderError.message);
  if (!insertedOrder || !(insertedOrder as { id?: string }).id) {
    throw new Error("Failed to create order");
  }
  const createdOrderId = String((insertedOrder as { id: string }).id);

  if (inputOrderLines.length > 0) {
    const normalizedInputLines = inputOrderLines.map((line, index) => {
      const qty = Number(line.qty);
      const unitPrice = Number(line.unitPrice);
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new Error(`Line ${index + 1}: quantity must be greater than 0`);
      }
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error(`Line ${index + 1}: unit price must be 0 or greater`);
      }
      const lineType = line.lineType === "SERVICE" ? "SERVICE" : "PRODUCT";
      const catalogItemId = cleanText(line.catalogItemId);
      const newProductSku = cleanText(line.newProduct?.sku).toUpperCase();
      const newProductName = cleanText(line.newProduct?.name);
      const hasQuickNewProduct = lineType === "PRODUCT" && (newProductSku || newProductName);

      if (hasQuickNewProduct) {
        if (!newProductSku || !newProductName) {
          throw new Error(`Line ${index + 1}: new product requires code and name`);
        }
        return {
          lineType,
          catalogItemId: "",
          qty,
          unitPrice,
          newProduct: {
            sku: newProductSku,
            name: newProductName,
          },
        };
      }

      if (!catalogItemId) {
        throw new Error(`Line ${index + 1}: item is required`);
      }
      return {
        lineType,
        catalogItemId,
        qty,
        unitPrice,
        newProduct: null,
      };
    });

    const productIds = normalizedInputLines
      .filter((line) => line.lineType === "PRODUCT" && !line.newProduct)
      .map((line) => line.catalogItemId);
    const serviceIds = normalizedInputLines
      .filter((line) => line.lineType === "SERVICE")
      .map((line) => line.catalogItemId);

    const quickProductLines = normalizedInputLines.filter(
      (line): line is (typeof normalizedInputLines)[number] & {
        lineType: "PRODUCT";
        newProduct: { sku: string; name: string };
      } => line.lineType === "PRODUCT" && Boolean(line.newProduct),
    );

    const quickProductBySku = new Map<
      string,
      {
        id: string;
        name: string;
        description: string | null;
        uomCode: string | null;
        defaultTaxRate: number;
      }
    >();

    for (const line of quickProductLines) {
      const sku = line.newProduct.sku;
      if (quickProductBySku.has(sku)) continue;

      const { data: existingQuickProduct, error: existingQuickProductError } = await admin
        .from("catalog_products")
        .select("id, name, description, uom_code, default_tax_rate")
        .eq("business_id", businessId)
        .eq("sku", sku)
        .eq("is_deleted", false)
        .limit(1)
        .maybeSingle();
      if (existingQuickProductError) throw new Error(existingQuickProductError.message);

      if (existingQuickProduct?.id) {
        quickProductBySku.set(sku, {
          id: String(existingQuickProduct.id),
          name: cleanText(existingQuickProduct.name) || line.newProduct.name,
          description: cleanText(existingQuickProduct.description) || null,
          uomCode: cleanText(existingQuickProduct.uom_code) || null,
          defaultTaxRate: Number(existingQuickProduct.default_tax_rate ?? 0),
        });
        continue;
      }

      const { data: createdQuickProduct, error: createQuickProductError } = await admin
        .from("catalog_products")
        .insert({
          business_id: businessId,
          sku,
          name: line.newProduct.name,
          description: null,
          uom_code: "EA",
          is_stock_managed: false,
          default_unit_price: line.unitPrice,
          default_tax_rate: 0,
          currency_code: "GBP",
          status: "ACTIVE",
          created_by: userId,
          updated_by: userId,
        })
        .select("id, name, description, uom_code, default_tax_rate")
        .single();
      if (createQuickProductError) throw new Error(createQuickProductError.message);

      quickProductBySku.set(sku, {
        id: String(createdQuickProduct.id),
        name: cleanText(createdQuickProduct.name) || line.newProduct.name,
        description: cleanText(createdQuickProduct.description) || null,
        uomCode: cleanText(createdQuickProduct.uom_code) || "EA",
        defaultTaxRate: Number(createdQuickProduct.default_tax_rate ?? 0),
      });
    }

    const [productsRes, servicesRes] = await Promise.all([
      productIds.length > 0
        ? admin
            .from("catalog_products")
            .select("id, name, description, uom_code, default_tax_rate")
            .eq("business_id", businessId)
            .in("id", productIds)
            .eq("is_deleted", false)
        : Promise.resolve({ data: [], error: null }),
      serviceIds.length > 0
        ? admin
            .from("catalog_services")
            .select("id, name, description, default_tax_rate")
            .eq("business_id", businessId)
            .in("id", serviceIds)
            .eq("is_deleted", false)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (productsRes.error) throw new Error(productsRes.error.message);
    if (servicesRes.error) throw new Error(servicesRes.error.message);

    const productById = new Map(
      (productsRes.data ?? []).map((row) => [
        String((row as { id: string }).id),
        row as {
          id: string;
          name?: string | null;
          description?: string | null;
          uom_code?: string | null;
          default_tax_rate?: number | null;
        },
      ]),
    );
    const serviceById = new Map(
      (servicesRes.data ?? []).map((row) => [
        String((row as { id: string }).id),
        row as {
          id: string;
          name?: string | null;
          description?: string | null;
          default_tax_rate?: number | null;
        },
      ]),
    );

    const linesPayload = normalizedInputLines.map((line, index) => {
      const resolveTaxRate = (raw: number | null | undefined) => {
        const normalized = Number(raw ?? 0);
        if (!Number.isFinite(normalized) || normalized < 0 || normalized > 1) {
          return 0;
        }
        return normalized;
      };

      const lineNetAmount = Number((line.qty * line.unitPrice).toFixed(4));

      if (line.lineType === "PRODUCT") {
        const item = line.newProduct
          ? quickProductBySku.get(line.newProduct.sku)
          : productById.get(line.catalogItemId);
        if (!item) throw new Error(`Line ${index + 1}: selected product not found`);
        const taxRate = resolveTaxRate(
          "defaultTaxRate" in item ? item.defaultTaxRate : item.default_tax_rate,
        );
        const taxAmount = Number((lineNetAmount * taxRate).toFixed(4));
        const lineGrossAmount = Number((lineNetAmount + taxAmount).toFixed(4));
        return {
          order_id: createdOrderId,
          line_no: index + 1,
          line_type: "PRODUCT",
          source_type: "CATALOG_PRODUCT",
          catalog_product_id: line.newProduct
            ? item.id
            : line.catalogItemId,
          name_snapshot: cleanText(item.name) || "Product",
          description_snapshot: cleanText(item.description) || null,
          uom_code:
            "uomCode" in item
              ? cleanText(item.uomCode) || null
              : cleanText(item.uom_code) || null,
          qty: line.qty,
          unit_price: line.unitPrice,
          discount_percent: 0,
          discount_amount: 0,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          line_net_amount: lineNetAmount,
          line_gross_amount: lineGrossAmount,
          reservation_required_qty: line.qty,
          created_by: userId,
          updated_by: userId,
        };
      }

      const item = serviceById.get(line.catalogItemId);
      if (!item) throw new Error(`Line ${index + 1}: selected service not found`);
      const taxRate = resolveTaxRate(item.default_tax_rate);
      const taxAmount = Number((lineNetAmount * taxRate).toFixed(4));
      const lineGrossAmount = Number((lineNetAmount + taxAmount).toFixed(4));
      return {
        order_id: createdOrderId,
        line_no: index + 1,
        line_type: "SERVICE",
        source_type: "CATALOG_SERVICE",
        catalog_service_id: line.catalogItemId,
        name_snapshot: cleanText(item.name) || "Service",
        description_snapshot: cleanText(item.description) || null,
        qty: line.qty,
        unit_price: line.unitPrice,
        discount_percent: 0,
        discount_amount: 0,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        line_net_amount: lineNetAmount,
        line_gross_amount: lineGrossAmount,
        reservation_required_qty: 0,
        created_by: userId,
        updated_by: userId,
      };
    });

    const { error: insertLinesError } = await admin.from("order_lines").insert(linesPayload);
    if (insertLinesError) throw new Error(insertLinesError.message);
  }

  if (createdNewClient) {
    await ensureClientCurrentManager({
      admin,
      clientId,
      managerId,
      actorUserId: userId,
    });
  }

  revalidatePath(`/b/${input.businessSlug}`);
  revalidatePath(`/b/${input.businessSlug}/clients`);
  if (clientId) revalidatePath(`/b/${input.businessSlug}/clients/${clientId}`);
  revalidatePath(`/b/${input.businessSlug}/today`);

    return {
      ok: true,
      orderId: createdOrderId,
      clientId,
      contactId,
      createdNewClient,
    };
  } catch (error: unknown) {
    const message = getActionErrorMessage(error);
    console.error("[createOrderFromClientPayload] failed", {
      businessId: input.businessId,
      businessSlug: input.businessSlug,
      clientType: input.clientType,
      message,
    });
    return {
      ok: false,
      error: message,
    };
  }
}

function isMissingClientModelError(error: unknown) {
  const message = String((error as { message?: string } | null)?.message ?? "").toLowerCase();
  return (
    message.includes("could not find the table 'public.clients'") ||
    message.includes("could not find the table 'public.client_individual_profiles'") ||
    message.includes("could not find the table 'public.client_manager_assignments'") ||
    message.includes("could not find the 'client_id' column") ||
    message.includes("could not find the 'contact_id' column")
  );
}

async function ensureOrderClientLink(input: {
  admin: ReturnType<typeof supabaseAdmin>;
  businessId: string;
  actorUserId: string;
  fullName: string | null | undefined;
  firstName: string | null | undefined;
  lastName: string | null | undefined;
  phone: string | null | undefined;
}) {
  const fullName = String(input.fullName ?? "").trim();
  if (!fullName) return null;

  const targetName = normalizeNameForMatch(fullName);
  const targetDigits = normalizePhoneDigits(input.phone);

  const { data: candidates, error: findError } = await input.admin
    .from("clients")
    .select("id, display_name, primary_phone, client_type")
    .eq("business_id", input.businessId)
    .eq("client_type", "individual")
    .limit(200);

  if (findError) {
    if (isMissingClientModelError(findError)) return null;
    throw new Error(findError.message);
  }

  const existing = (candidates ?? []).find((row) => {
    const rowName = normalizeNameForMatch(String((row as { display_name?: string | null }).display_name ?? ""));
    if (rowName !== targetName) return false;

    if (!targetDigits) return true;
    const rowDigits = normalizePhoneDigits((row as { primary_phone?: string | null }).primary_phone ?? "");
    return !rowDigits || rowDigits === targetDigits;
  }) as { id: string } | undefined;

  let clientId = existing?.id ?? null;

  if (!clientId) {
    const { data: inserted, error: insertError } = await input.admin
      .from("clients")
      .insert({
        business_id: input.businessId,
        workspace_id: null,
        client_type: "individual",
        display_name: fullName,
        primary_phone: String(input.phone ?? "").trim() || null,
        created_by: input.actorUserId,
      })
      .select("id")
      .single();

    if (insertError) {
      if (isMissingClientModelError(insertError)) return null;
      throw new Error(insertError.message);
    }

    clientId = String((inserted as { id: string }).id);
  }

  const upsertProfilePayload = {
    client_id: clientId,
    first_name: String(input.firstName ?? "").trim() || null,
    last_name: String(input.lastName ?? "").trim() || null,
    full_name: fullName,
    phone: String(input.phone ?? "").trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { error: profileError } = await input.admin
    .from("client_individual_profiles")
    .upsert(upsertProfilePayload, { onConflict: "client_id" });

  if (profileError && !isMissingClientModelError(profileError)) {
    throw new Error(profileError.message);
  }

  return clientId;
}

async function ensureClientCurrentManager(input: {
  admin: ReturnType<typeof supabaseAdmin>;
  clientId: string | null;
  managerId: string | null;
  actorUserId: string;
}) {
  if (!input.clientId || !input.managerId) return;

  const { data: current, error: currentError } = await input.admin
    .from("client_manager_assignments")
    .select("id, manager_id")
    .eq("client_id", input.clientId)
    .is("unassigned_at", null)
    .maybeSingle();

  if (currentError) {
    if (isMissingClientModelError(currentError)) return;
    throw new Error(currentError.message);
  }

  if (current?.manager_id && String(current.manager_id) === input.managerId) return;

  if (current?.id) {
    const { error: closeError } = await input.admin
      .from("client_manager_assignments")
      .update({ unassigned_at: new Date().toISOString() })
      .eq("id", current.id);

    if (closeError && !isMissingClientModelError(closeError)) {
      throw new Error(closeError.message);
    }
  }

  const { error: insertError } = await input.admin
    .from("client_manager_assignments")
    .insert({
      client_id: input.clientId,
      manager_id: input.managerId,
      assigned_by: input.actorUserId,
      assigned_at: new Date().toISOString(),
    });

  if (insertError && !isMissingClientModelError(insertError)) {
    throw new Error(insertError.message);
  }
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
    orderId: createdOrderId,
}) {
  const { admin, userId } = await requireBusinessManagerAccess(input.businessId);

  const { count, error: countError } = await admin
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("business_id", input.businessId);

  if (countError) throw new Error(countError.message);

  const orderNumber = (count ?? 0) + 1;
  const { clientColumns, fullName, firstName, lastName } = await buildClientColumns({
    clientName: input.clientName,
    firstName: input.firstName,
    lastName: input.lastName,
  });
  const managerId = input.managerId ?? userId;
  const clientId = await ensureOrderClientLink({
    admin,
    businessId: input.businessId,
    actorUserId: userId,
    fullName,
    firstName,
    lastName,
    phone: input.clientPhone ?? null,
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
      manager_id: managerId,
      client_id: clientId,
      contact_id: null,
    },
    (nextPayload) => admin.from("orders").insert(nextPayload),
  );

  if (error) throw new Error(error.message);
  await ensureClientCurrentManager({
    admin,
    clientId,
    managerId,
    actorUserId: userId,
  });

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
  const { admin, userId } = await requireOrderManagerAccess(input.orderId);
  const { data: orderBefore, error: orderBeforeError } = await admin
    .from("orders")
    .select("business_id, manager_id, client_id")
    .eq("id", input.orderId)
    .maybeSingle();

  if (orderBeforeError) throw new Error(orderBeforeError.message);
  if (!orderBefore?.business_id) throw new Error("Order not found");

  const { clientColumns, fullName, firstName, lastName } = await buildClientColumns({
    clientName: input.clientName,
    firstName: input.firstName,
    lastName: input.lastName,
  });
  const resolvedClientId = await ensureOrderClientLink({
    admin,
    businessId: String(orderBefore.business_id),
    actorUserId: userId,
    fullName,
    firstName,
    lastName,
    phone: input.clientPhone ?? null,
  });
  const managerId = orderBefore.manager_id ? String(orderBefore.manager_id) : null;

  const { error } = await runOrdersMutation(
    {
      ...clientColumns,
      client_phone: input.clientPhone,
      description: input.description,
      amount: input.amount,
      due_date: input.dueDate,
      client_id: resolvedClientId ?? (orderBefore.client_id ? String(orderBefore.client_id) : null),
    },
    (nextPayload) => admin.from("orders").update(nextPayload).eq("id", input.orderId),
  );

  if (error) throw new Error(error.message);
  await ensureClientCurrentManager({
    admin,
    clientId: resolvedClientId ?? (orderBefore.client_id ? String(orderBefore.client_id) : null),
    managerId,
    actorUserId: userId,
  });

  revalidatePath(`/b/${input.businessSlug}`);
}

export async function addOrderLineToExistingOrder(input: {
  orderId: string;
  businessSlug: string;
  lineType: "PRODUCT" | "SERVICE";
  catalogItemId: string;
  qty: number;
  unitPrice: number;
  newProduct?: {
    sku: string;
    name: string;
  } | null;
}): Promise<
  | {
      ok: true;
      line: {
        id: string;
        lineType: "PRODUCT" | "SERVICE";
        nameSnapshot: string;
        qty: number;
        unitPrice: number;
      };
    }
  | { ok: false; error: string }
> {
  try {
    const { admin, userId } = await requireOrderManagerAccess(input.orderId);
    const lineType = input.lineType === "SERVICE" ? "SERVICE" : "PRODUCT";
    const catalogItemId = cleanText(input.catalogItemId);
    const qty = Number(input.qty);
    const unitPrice = Number(input.unitPrice);
    const newProductSku = cleanText(input.newProduct?.sku).toUpperCase();
    const newProductName = cleanText(input.newProduct?.name);
    const hasQuickNewProduct =
      lineType === "PRODUCT" && Boolean(newProductSku || newProductName);

    if (!catalogItemId && !hasQuickNewProduct) {
      throw new Error("Catalog item is required");
    }
    if (hasQuickNewProduct && (!newProductSku || !newProductName)) {
      throw new Error("New product requires code and name");
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new Error("Quantity must be greater than 0");
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new Error("Unit price must be 0 or greater");
    }

    const { data: orderRow, error: orderError } = await admin
      .from("orders")
      .select("id, business_id, status")
      .eq("id", input.orderId)
      .maybeSingle();
    if (orderError) throw new Error(orderError.message);
    if (!orderRow?.id || !orderRow.business_id) throw new Error("Order not found");

    const orderStatus = cleanText(orderRow.status).toUpperCase();
    if (orderStatus === "DONE" || orderStatus === "CANCELED") {
      throw new Error("Cannot add items to a closed order");
    }

    const { data: lastLine, error: lastLineError } = await admin
      .from("order_lines")
      .select("line_no")
      .eq("order_id", input.orderId)
      .order("line_no", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastLineError) {
      const message = String(lastLineError.message ?? "").toLowerCase();
      if (message.includes("order_lines") && message.includes("schema")) {
        throw new Error("Order lines are not available in the current schema. Apply CRM/ERP migrations first.");
      }
      throw new Error(lastLineError.message);
    }

    const lineNo = Number((lastLine as { line_no?: number | null } | null)?.line_no ?? 0) + 1;
    const lineNetAmount = Number((qty * unitPrice).toFixed(4));

    const normalizeTaxRate = (raw: number | null | undefined) => {
      const value = Number(raw ?? 0);
      if (!Number.isFinite(value) || value < 0 || value > 1) return 0;
      return value;
    };

    let payload: Record<string, unknown>;
    let displayName = "";
    let resolvedCatalogItemId = catalogItemId;

    if (lineType === "PRODUCT") {
      let product:
        | {
            id: string;
            name?: string | null;
            description?: string | null;
            uom_code?: string | null;
            default_tax_rate?: number | null;
          }
        | null = null;

      if (hasQuickNewProduct) {
        const { data: existingProduct, error: existingProductError } =
          await admin
            .from("catalog_products")
            .select("id, name, description, uom_code, default_tax_rate")
            .eq("business_id", businessId)
            .eq("sku", newProductSku)
            .eq("is_deleted", false)
            .limit(1)
            .maybeSingle();
        if (existingProductError) throw new Error(existingProductError.message);

        if (existingProduct?.id) {
          product = existingProduct as {
            id: string;
            name?: string | null;
            description?: string | null;
            uom_code?: string | null;
            default_tax_rate?: number | null;
          };
        } else {
          const { data: createdProduct, error: createProductError } =
            await admin
              .from("catalog_products")
              .insert({
                business_id: businessId,
                sku: newProductSku,
                name: newProductName,
                description: null,
                uom_code: "EA",
                is_stock_managed: false,
                default_unit_price: unitPrice,
                default_tax_rate: 0,
                currency_code: "GBP",
                status: "ACTIVE",
                created_by: userId,
                updated_by: userId,
              })
              .select("id, name, description, uom_code, default_tax_rate")
              .single();
          if (createProductError) throw new Error(createProductError.message);

          product = createdProduct as {
            id: string;
            name?: string | null;
            description?: string | null;
            uom_code?: string | null;
            default_tax_rate?: number | null;
          };
        }
      } else {
        const { data: selectedProduct, error: productError } = await admin
          .from("catalog_products")
          .select("id, name, description, uom_code, default_tax_rate")
          .eq("business_id", businessId)
          .eq("id", catalogItemId)
          .eq("is_deleted", false)
          .maybeSingle();
        if (productError) throw new Error(productError.message);
        if (!selectedProduct?.id) throw new Error("Selected product not found");
        product = selectedProduct as {
          id: string;
          name?: string | null;
          description?: string | null;
          uom_code?: string | null;
          default_tax_rate?: number | null;
        };
      }

      if (!product?.id) throw new Error("Selected product not found");
      resolvedCatalogItemId = String(product.id);

      const taxRate = normalizeTaxRate(
        (product as { default_tax_rate?: number | null }).default_tax_rate,
      );
      const taxAmount = Number((lineNetAmount * taxRate).toFixed(4));
      const lineGrossAmount = Number((lineNetAmount + taxAmount).toFixed(4));
      displayName = cleanText((product as { name?: string | null }).name) || "Product";

      payload = {
        order_id: input.orderId,
        line_no: lineNo,
        line_type: "PRODUCT",
        source_type: "CATALOG_PRODUCT",
        catalog_product_id: resolvedCatalogItemId,
        name_snapshot: displayName,
        description_snapshot: cleanText((product as { description?: string | null }).description) || null,
        uom_code: cleanText((product as { uom_code?: string | null }).uom_code) || null,
        qty,
        unit_price: unitPrice,
        discount_percent: 0,
        discount_amount: 0,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        line_net_amount: lineNetAmount,
        line_gross_amount: lineGrossAmount,
        reservation_required_qty: qty,
        created_by: userId,
        updated_by: userId,
      };
    } else {
      const { data: service, error: serviceError } = await admin
        .from("catalog_services")
        .select("id, name, description, default_tax_rate")
        .eq("business_id", businessId)
        .eq("id", catalogItemId)
        .eq("is_deleted", false)
        .maybeSingle();
      if (serviceError) throw new Error(serviceError.message);
      if (!service?.id) throw new Error("Selected service not found");

      const taxRate = normalizeTaxRate(
        (service as { default_tax_rate?: number | null }).default_tax_rate,
      );
      const taxAmount = Number((lineNetAmount * taxRate).toFixed(4));
      const lineGrossAmount = Number((lineNetAmount + taxAmount).toFixed(4));
      displayName = cleanText((service as { name?: string | null }).name) || "Service";

      payload = {
        order_id: input.orderId,
        line_no: lineNo,
        line_type: "SERVICE",
        source_type: "CATALOG_SERVICE",
        catalog_service_id: catalogItemId,
        name_snapshot: displayName,
        description_snapshot: cleanText((service as { description?: string | null }).description) || null,
        qty,
        unit_price: unitPrice,
        discount_percent: 0,
        discount_amount: 0,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        line_net_amount: lineNetAmount,
        line_gross_amount: lineGrossAmount,
        reservation_required_qty: 0,
        created_by: userId,
        updated_by: userId,
      };
    }

    const { data: insertedLine, error: insertError } = await admin
      .from("order_lines")
      .insert(payload)
      .select("id, line_type, name_snapshot, qty, unit_price")
      .single();
    if (insertError) throw new Error(insertError.message);

    await insertActivityEvent({
      businessId: String(orderRow.business_id),
      entityType: "order",
      entityId: input.orderId,
      orderId: input.orderId,
      actorId: userId,
      eventType: "order_line_added",
      payload: {
        lineType,
        catalogItemId: resolvedCatalogItemId,
        qty,
        unitPrice,
        name: displayName,
      },
    });

    revalidatePath(`/b/${input.businessSlug}`);

    return {
      ok: true,
      line: {
        id: String((insertedLine as { id?: string | null })?.id ?? ""),
        lineType,
        nameSnapshot:
          cleanText(
            (insertedLine as { name_snapshot?: string | null })?.name_snapshot,
          ) || displayName,
        qty: Number((insertedLine as { qty?: number | null })?.qty ?? qty),
        unitPrice: Number(
          (insertedLine as { unit_price?: number | null })?.unit_price ??
            unitPrice,
        ),
      },
    };
  } catch (error) {
    return { ok: false, error: getActionErrorMessage(error) };
  }
}

export async function setOrderManager(input: {
  orderId: string;
  businessSlug: string;
  managerId: string | null;
}) {
  const { admin, userId } = await requireOrderManagerAccess(input.orderId);
  const supabase = await supabaseServer();
  const nextManagerId = cleanText(input.managerId) || null;

  const { data: orderBefore, error: orderBeforeError } = await admin
    .from("orders")
    .select("business_id, client_id")
    .eq("id", input.orderId)
    .maybeSingle();

  if (orderBeforeError) throw new Error(orderBeforeError.message);
  if (!orderBefore?.business_id) throw new Error("Order not found");

  if (nextManagerId) {
    const [primaryMembershipRes, fallbackMembershipRes] = await Promise.all([
      admin
        .from("memberships")
        .select("user_id")
        .eq("business_id", orderBefore.business_id)
        .eq("user_id", nextManagerId)
        .or("role.eq.OWNER,role.eq.owner,role.eq.MANAGER,role.eq.manager")
        .maybeSingle(),
      admin
        .from("business_memberships")
        .select("user_id")
        .eq("business_id", orderBefore.business_id)
        .eq("user_id", nextManagerId)
        .or("role.eq.OWNER,role.eq.owner,role.eq.MANAGER,role.eq.manager")
        .maybeSingle(),
    ]);

    if (primaryMembershipRes.error && fallbackMembershipRes.error) {
      throw new Error(primaryMembershipRes.error.message);
    }

    const hasAccess = Boolean(
      primaryMembershipRes.data?.user_id || fallbackMembershipRes.data?.user_id,
    );

    if (!hasAccess) {
      throw new Error("Selected manager does not have access to this business.");
    }

    const { data: profileRow, error: profileLookupError } = await admin
      .from("profiles")
      .select("id")
      .eq("id", nextManagerId)
      .maybeSingle();

    if (profileLookupError) throw new Error(profileLookupError.message);

    if (!profileRow?.id) {
      let email: string | null = null;
      let fullName: string | null = null;
      let firstName: string | null = null;
      let lastName: string | null = null;

      try {
        const { data: authLookup, error: authLookupError } =
          await admin.auth.admin.getUserById(nextManagerId);
        if (authLookupError) throw authLookupError;

        const authUser = authLookup?.user;
        const meta = (authUser?.user_metadata ?? {}) as Record<string, unknown>;
        email = cleanText(authUser?.email) || null;
        firstName = cleanText(meta.first_name) || null;
        lastName = cleanText(meta.last_name) || null;
        fullName =
          cleanText(meta.full_name) ||
          [firstName, lastName].filter(Boolean).join(" ").trim() ||
          email;
      } catch {
        fullName = null;
      }

      const { error: profileCreateError } = await admin.from("profiles").upsert(
        {
          id: nextManagerId,
          email,
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
        },
        { onConflict: "id" },
      );

      if (profileCreateError) throw new Error(profileCreateError.message);
    }
  }

  const updateOrderManager = async (payload: { manager_id?: string | null; created_by?: string | null }) => {
    const { error } = await admin
      .from("orders")
      .update(payload)
      .eq("id", input.orderId);

    if (!error) return null;

    const message = String(error.message ?? "").toLowerCase();
    const isActorIdNotificationError =
      message.includes("null value in column \"actor_id\"") &&
      message.includes("relation \"notifications\"");

    if (!isActorIdNotificationError) return error;

    const { error: sessionError } = await supabase
      .from("orders")
      .update(payload)
      .eq("id", input.orderId);

    return sessionError ?? null;
  };

  const managerError = await updateOrderManager({ manager_id: nextManagerId });

  if (!managerError) {
    await ensureClientCurrentManager({
      admin,
      clientId: orderBefore.client_id ? String(orderBefore.client_id) : null,
      managerId: nextManagerId,
      actorUserId: userId,
    });
    revalidatePath(`/b/${input.businessSlug}`);
    return;
  }

  if (isMissingColumnError(managerError, "manager_id")) {
    {
      const fallbackError = await updateOrderManager({ created_by: nextManagerId });

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
  revalidatePath(`/b/${input.businessSlug}/analytics`);

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
  revalidatePath(`/b/${input.businessSlug}/analytics`);

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
  revalidatePath(`/b/${input.businessSlug}/analytics`);

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
  revalidatePath(`/b/${input.businessSlug}/analytics`);

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
  const summary = cleanText(input.dailySummary) ?? "";

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
