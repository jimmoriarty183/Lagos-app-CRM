"use server";

import { revalidatePath } from "next/cache";
import { buildClientFullName, splitLegacyClientName } from "@/lib/order-client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

function isMissingColumnError(error: unknown, column: string) {
  const message = String((error as { message?: string } | null)?.message ?? "").toLowerCase();
  return (
    message.includes(`could not find the '${column.toLowerCase()}' column`) &&
    message.includes("schema cache")
  );
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
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
