"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeMonthStart(value: string) {
  const raw = cleanText(value);
  if (/^\d{4}-\d{2}$/.test(raw)) return `${raw}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return "";
}

function safeReturnHref(input: string, fallback: string) {
  const href = cleanText(input);
  if (!href.startsWith("/")) return fallback;
  return href;
}

export async function saveSalesPlanRowAction(formData: FormData) {
  const businessId = cleanText(formData.get("businessId"));
  const businessSlug = cleanText(formData.get("businessSlug"));
  const managerId = cleanText(formData.get("managerId"));
  const monthStart = normalizeMonthStart(cleanText(formData.get("monthStart")));
  const include = cleanText(formData.get("include")) === "1";
  const planAmountRaw = Number(formData.get("planAmount") ?? 0);
  const planClosedRaw = Number(formData.get("planClosedOrders") ?? 0);
  const planAmount = Number.isFinite(planAmountRaw) ? Math.max(0, planAmountRaw) : 0;
  const planClosedOrders = Number.isFinite(planClosedRaw)
    ? Math.max(0, Math.floor(planClosedRaw))
    : 0;

  const fallbackHref = businessSlug
    ? `/b/${businessSlug}/analytics?tab=sales`
    : "/app/crm";
  const returnHref = safeReturnHref(cleanText(formData.get("returnHref")), fallbackHref);

  if (!businessId || !businessSlug || !managerId || !monthStart) {
    redirect(returnHref);
  }

  const supabase = await supabaseServer();
  const admin = supabaseAdmin();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) redirect("/login");

  const { data: ownerMembership, error: membershipError } = await admin
    .from("memberships")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (membershipError) throw new Error(membershipError.message);

  const role = String(ownerMembership?.role ?? "").trim().toUpperCase();
  if (role !== "OWNER") throw new Error("Forbidden");

  if (!include) {
    const { error: deleteError } = await admin
      .from("sales_month_targets")
      .delete()
      .eq("business_id", businessId)
      .eq("month_start", monthStart)
      .eq("manager_id", managerId);
    if (deleteError) throw new Error(deleteError.message);
  } else {
    const { data: existing, error: existingError } = await admin
      .from("sales_month_targets")
      .select("id")
      .eq("business_id", businessId)
      .eq("month_start", monthStart)
      .eq("manager_id", managerId)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);

    if (existing?.id) {
      const { error: updateError } = await admin
        .from("sales_month_targets")
        .update({
          plan_amount: planAmount,
          plan_closed_orders: planClosedOrders,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (updateError) throw new Error(updateError.message);
    } else {
      const { error: insertError } = await admin
        .from("sales_month_targets")
        .insert({
          business_id: businessId,
          manager_id: managerId,
          month_start: monthStart,
          plan_amount: planAmount,
          plan_closed_orders: planClosedOrders,
          created_by: user.id,
        });
      if (insertError) throw new Error(insertError.message);
    }
  }

  revalidatePath(`/b/${businessSlug}/analytics`);
  redirect(returnHref);
}

