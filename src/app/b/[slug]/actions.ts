"use server";

import { revalidatePath } from "next/cache";
import { buildClientFullName, splitLegacyClientName } from "@/lib/order-client";
import { supabaseServer } from "@/lib/supabase/server";

function isMissingColumnError(error: unknown, column: string) {
  const message = String((error as { message?: string } | null)?.message ?? "").toLowerCase();
  return (
    message.includes(`could not find the '${column.toLowerCase()}' column`) &&
    message.includes("schema cache")
  );
}

async function canUseOrdersColumn(supabase: Awaited<ReturnType<typeof supabaseServer>>, column: string) {
  const { error } = await supabase.from("orders").select(column).limit(1);
  return !error;
}

async function buildClientColumns(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
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
  };

  if (await canUseOrdersColumn(supabase, "first_name")) clientColumns.first_name = derived.firstName || null;
  if (await canUseOrdersColumn(supabase, "last_name")) clientColumns.last_name = derived.lastName || null;
  if (await canUseOrdersColumn(supabase, "full_name")) clientColumns.full_name = fullName || null;

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
  const supabase = await supabaseServer();

  const { count, error: countError } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("business_id", input.businessId);

  if (countError) throw new Error(countError.message);

  const orderNumber = (count ?? 0) + 1;
  const { clientColumns } = await buildClientColumns(supabase, {
    clientName: input.clientName,
    firstName: input.firstName,
    lastName: input.lastName,
  });
  const { data: authData } = await supabase.auth.getUser();
  const createdBy = authData?.user?.id ?? null;
  const createdByExists = await canUseOrdersColumn(supabase, "created_by");
  const managerIdExists = await canUseOrdersColumn(supabase, "manager_id");

  const { error } = await supabase.from("orders").insert({
    business_id: input.businessId,
    order_number: orderNumber,
    ...clientColumns,
    client_phone: input.clientPhone || null,
    amount: input.amount,
    due_date: input.dueDate || null,
    description: input.description || null,
    status: input.status ?? "NEW",
    paid: false,
    ...(createdByExists ? { created_by: createdBy } : {}),
    ...(managerIdExists ? { manager_id: input.managerId ?? createdBy } : {}),
  });

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
}) {
  const supabase = await supabaseServer();

  const patch: Record<string, string | null> = {
    status: input.status,
    closed_at: input.status === "DONE" ? new Date().toISOString() : null,
  };

  const { error } = await supabase.from("orders").update(patch).eq("id", input.orderId);
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
  const supabase = await supabaseServer();
  const { clientColumns } = await buildClientColumns(supabase, {
    clientName: input.clientName,
    firstName: input.firstName,
    lastName: input.lastName,
  });

  const { error } = await supabase
    .from("orders")
    .update({
      ...clientColumns,
      client_phone: input.clientPhone,
      description: input.description,
      amount: input.amount,
      due_date: input.dueDate,
    })
    .eq("id", input.orderId);

  if (error) throw new Error(error.message);

  revalidatePath(`/b/${input.businessSlug}`);
}

export async function setOrderManager(input: {
  orderId: string;
  businessSlug: string;
  managerId: string | null;
}) {
  const supabase = await supabaseServer();

  const { error: managerError } = await supabase
    .from("orders")
    .update({ manager_id: input.managerId })
    .eq("id", input.orderId);

  if (!managerError) {
    revalidatePath(`/b/${input.businessSlug}`);
    return;
  }

  if (isMissingColumnError(managerError, "manager_id")) {
    const createdByExists = await canUseOrdersColumn(supabase, "created_by");
    if (createdByExists) {
      const { error: fallbackError } = await supabase
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
