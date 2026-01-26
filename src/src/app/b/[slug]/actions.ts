"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * CREATE ORDER
 */
export async function createOrder(input: {
  businessId: string;
  businessSlug: string; // ✅ добавили для точного revalidate
  clientName: string;
  clientPhone?: string;
  amount: number;
  dueDate?: string; // YYYY-MM-DD
  description?: string;
}) {
  const supabase = await supabaseServer();

  // 1) Считаем, сколько заказов уже есть у этого бизнеса
  const { count, error: countError } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("business_id", input.businessId);

  if (countError) throw new Error(countError.message);

  // 2) Следующий номер заказа
  const orderNumber = (count ?? 0) + 1;

  // 3) Создаём заказ
  const { error } = await supabase.from("orders").insert({
    business_id: input.businessId,
    order_number: orderNumber,
    client_name: input.clientName,
    client_phone: input.clientPhone || null,
    amount: input.amount,
    due_date: input.dueDate || null,
    description: input.description || null,
    status: "NEW",
    paid: false,
  });

  if (error) throw new Error(error.message);

  // ✅ точный revalidate
  revalidatePath(`/b/${input.businessSlug}`);
}

/**
 * SET ORDER STATUS
 */
export async function setOrderStatus(input: {
  orderId: string;
  businessSlug: string; // ✅ добавили
  status: "NEW" | "IN_PROGRESS" | "WAITING_PAYMENT" | "DONE" | "CANCELED" | "DUPLICATE";
}) {
  const supabase = await supabaseServer();

  const patch: any = {
    status: input.status,
    closed_at: input.status === "DONE" ? new Date().toISOString() : null,
  };

  const { error } = await supabase.from("orders").update(patch).eq("id", input.orderId);
  if (error) throw new Error(error.message);

  revalidatePath(`/b/${input.businessSlug}`);
}

/**
 * SET ORDER PAID
 */
export async function setOrderPaid(input: {
  orderId: string;
  businessSlug: string; // ✅ добавили
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

/**
 * UPDATE ORDER
 */
export async function updateOrder(input: {
  orderId: string;
  businessSlug: string;
  clientName: string;
  clientPhone: string | null;
  description: string | null;
  amount: number;
  dueDate: string | null;
}) {
  const supabase = await supabaseServer();

  const { error } = await supabase
    .from("orders")
    .update({
      client_name: input.clientName,
      client_phone: input.clientPhone,
      description: input.description,
      amount: input.amount,
      due_date: input.dueDate,
    })
    .eq("id", input.orderId);

  if (error) throw new Error(error.message);

  revalidatePath(`/b/${input.businessSlug}`);
}
