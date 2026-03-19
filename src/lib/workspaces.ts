import type { SupabaseClient } from "@supabase/supabase-js";

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function isMissingRelationError(error: unknown, relation: string) {
  const message = cleanText((error as { message?: unknown } | null)?.message).toLowerCase();
  return (
    message.includes(`could not find the table '${relation.toLowerCase()}'`) &&
    message.includes("schema cache")
  );
}

function isMissingColumnError(error: unknown, column: string) {
  const message = cleanText((error as { message?: unknown } | null)?.message).toLowerCase();
  return (
    message.includes(`could not find the '${column.toLowerCase()}' column`) &&
    message.includes("schema cache")
  );
}

export async function ensureWorkspaceForBusiness(
  admin: SupabaseClient,
  businessId: string,
) {
  const normalizedBusinessId = cleanText(businessId);
  if (!normalizedBusinessId) {
    throw new Error("Business id is required");
  }

  const existingWorkspace = await admin
    .from("workspaces")
    .select("id, business_id")
    .or(`id.eq.${normalizedBusinessId},business_id.eq.${normalizedBusinessId}`)
    .maybeSingle();

  if (!existingWorkspace.error && existingWorkspace.data?.id) {
    return String(existingWorkspace.data.id);
  }

  if (
    existingWorkspace.error &&
    !isMissingRelationError(existingWorkspace.error, "workspaces") &&
    !isMissingColumnError(existingWorkspace.error, "business_id")
  ) {
    throw new Error(existingWorkspace.error.message);
  }

  const businessResult = await admin
    .from("businesses")
    .select("id, slug, name, created_at, updated_at")
    .eq("id", normalizedBusinessId)
    .maybeSingle();

  if (businessResult.error) {
    throw new Error(businessResult.error.message);
  }

  const business = businessResult.data;
  if (!business?.id) {
    throw new Error("Business not found");
  }

  const workspacePayload: Record<string, string> = {
    id: String(business.id),
    business_id: String(business.id),
    slug: cleanText(business.slug) || String(business.id),
    name: cleanText(business.name) || cleanText(business.slug) || "Workspace",
    created_at: String(business.created_at ?? new Date().toISOString()),
    updated_at: String(business.updated_at ?? new Date().toISOString()),
  };

  while (true) {
    const upsertResult = await admin
      .from("workspaces")
      .upsert(workspacePayload, { onConflict: "id" })
      .select("id")
      .single();

    if (!upsertResult.error) {
      return String(upsertResult.data.id);
    }

    const missingColumn = ["slug", "name", "created_at", "updated_at", "business_id"].find((column) =>
      isMissingColumnError(upsertResult.error, column),
    );

    const message = cleanText((upsertResult.error as { message?: unknown } | null)?.message).toLowerCase();
    if (message.includes("null value in column \"business_id\"")) {
      workspacePayload.business_id = String(business.id);
      continue;
    }

    if (!missingColumn) {
      throw new Error(upsertResult.error.message);
    }

    delete workspacePayload[missingColumn];
  }
}
