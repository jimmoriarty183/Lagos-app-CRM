"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

export async function createOrder(input: {
  businessId: string;
  clientName: string;
  clientPhone?: string;
  amount: number;
  dueDate?: string; // YYYY-MM-DD
}) {
  const { error } = await supabase.from("orders").insert({
    business_id: input.businessId,
    client_name: input.clientName,
    client_phone: input.clientPhone || null,
    amount: input.amount,
    due_date: input.dueDate || null,
    status: "NEW",
    paid: false,
  });

  if (error) throw new Error(error.message);

  // Перерисовать страницу бизнеса
  revalidatePath("/b/[slug]", "page");
}

export async function setOrderStatus(input: {
  orderId: string;
  status: "NEW" | "DONE";
}) {
  const patch: any = { status: input.status };

  // если DONE — ставим closed_at, если NEW — очищаем
  patch.closed_at = input.status === "DONE" ? new Date().toISOString() : null;

  const { error } = await supabase.from("orders").update(patch).eq("id", input.orderId);
  if (error) throw new Error(error.message);

  revalidatePath("/b/[slug]", "page");
}

export async function setOrderPaid(input: { orderId: string; paid: boolean }) {
  const { error } = await supabase.from("orders").update({ paid: input.paid }).eq("id", input.orderId);
  if (error) throw new Error(error.message);

  revalidatePath("/b/[slug]", "page");
}
