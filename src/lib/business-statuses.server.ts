import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizeStatusDefinition,
  type BusinessStatusDefinition,
} from "@/lib/business-statuses";

type BusinessStatusRow = {
  value?: string | null;
  label?: string | null;
  color?: string | null;
  sort_order?: number | null;
};

function isMissingRelationError(error: unknown, relation: string) {
  const message = String((error as { message?: string } | null)?.message ?? "").toLowerCase();
  return (
    message.includes(`relation "${relation.toLowerCase()}" does not exist`) ||
    message.includes(`could not find the table '${relation.toLowerCase()}'`) ||
    message.includes(`could not find the relation '${relation.toLowerCase()}'`)
  );
}

export async function loadBusinessStatuses(
  client: SupabaseClient,
  businessId: string,
) {
  const { data, error } = await client
    .from("business_statuses")
    .select("value,label,color,sort_order")
    .eq("business_id", businessId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.log("[business-statuses.server] loadBusinessStatuses error", {
      businessId,
      message: String((error as { message?: string } | null)?.message ?? error),
    });
    if (isMissingRelationError(error, "business_statuses")) return [] as BusinessStatusDefinition[];
    throw error;
  }

  const statuses = ((data ?? []) as BusinessStatusRow[])
    .map((row) => normalizeStatusDefinition(row))
    .filter((row): row is BusinessStatusDefinition => Boolean(row));

  console.log("[business-statuses.server] loadBusinessStatuses", {
    businessId,
    rawCount: Array.isArray(data) ? data.length : 0,
    statuses: statuses.map((status) => ({
      value: status.value,
      label: status.label,
      active: status.active,
      builtIn: status.builtIn ?? false,
      sortOrder: status.sortOrder,
    })),
    hasDEL: statuses.some((status) => status.value === "DEL"),
  });

  return statuses;
}
