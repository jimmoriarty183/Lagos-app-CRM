import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import {
  BUSINESS_LIMIT_REACHED_CODE,
  businessLimitReachedError,
  type BusinessErrorPayload,
} from "@/lib/businesses/errors";
import {
  checkOwnerCanCreateBusiness,
  resolveMaxBusinessesEntitlement,
  resolveMaxBusinessesUpgradeRecommendation,
} from "@/lib/businesses/business-limits-service";

function isMissingColumnError(message: string) {
  const lowered = message.toLowerCase();
  return (
    lowered.includes("column") &&
    (lowered.includes("does not exist") || lowered.includes("schema cache"))
  );
}

function isDuplicateValueError(message: string) {
  const lowered = message.toLowerCase();
  return (
    lowered.includes("duplicate key") ||
    lowered.includes("already exists") ||
    lowered.includes("unique constraint") ||
    lowered.includes("violates unique")
  );
}

function isBrokenRpcTriggerError(message: string) {
  const lowered = message.toLowerCase();
  return lowered.includes('record "new" has no field "business_id"');
}

function slugify(input: string) {
  const base = String(input || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return base || `biz-${Date.now()}`;
}

export type BusinessCreateResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

export type BusinessCreateGuardedResult =
  | { ok: true; slug: string }
  | { ok: false; error: BusinessErrorPayload; status: number };

type CreateWithLimitGuardRow = {
  ok: boolean;
  slug: string | null;
  business_id: string | null;
  error_code: string | null;
  error_message: string | null;
  current_usage: number | null;
  limit_value: number | null;
};

async function updateBusinessMetadata(
  admin: SupabaseClient,
  slug: string,
  input: { businessName?: string; businessSegment?: string },
) {
  const name = String(input.businessName ?? "").trim();
  const segment = String(input.businessSegment ?? "").trim();

  if (name) {
    const { error } = await admin.from("businesses").update({ name }).eq("slug", slug);
    if (error && !isMissingColumnError(error.message)) {
      return { ok: false as const, error: error.message };
    }
  }

  if (segment) {
    const { error } = await admin
      .from("businesses")
      .update({ business_segment: segment })
      .eq("slug", slug);
    if (error && !isMissingColumnError(error.message)) {
      return { ok: false as const, error: error.message };
    }
  }

  return { ok: true as const };
}

export async function createBusinessWithFallback(params: {
  supabase: Awaited<ReturnType<typeof supabaseServer>>;
  admin: SupabaseClient;
  userId: string;
  businessName: string;
  businessSegment?: string;
}): Promise<BusinessCreateResult> {
  const { supabase, admin, userId, businessName, businessSegment } = params;
  const baseSlug = slugify(businessName);

  for (let attempt = 0; attempt < 7; attempt += 1) {
    const slugCandidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 2}`;
    const { error: rpcErr } = await supabase.rpc("create_business_with_owner", {
      p_slug: slugCandidate,
      p_owner_phone: null,
      p_manager_phone: null,
    });

    if (!rpcErr) {
      const updateResult = await updateBusinessMetadata(admin, slugCandidate, {
        businessName,
        businessSegment,
      });
      if (!updateResult.ok) return { ok: false, error: updateResult.error };
      return { ok: true, slug: slugCandidate };
    }

    if (rpcErr.code === "23505" || isDuplicateValueError(rpcErr.message)) {
      continue;
    }

    if (!isBrokenRpcTriggerError(rpcErr.message)) {
      return { ok: false, error: rpcErr.message };
    }

    const { data: createdBusiness, error: createBusinessErr } = await admin
      .from("businesses")
      .insert({ slug: slugCandidate, name: businessName, created_by: userId })
      .select("id, slug")
      .single();

    if (createBusinessErr) {
      if (
        createBusinessErr.code === "23505" ||
        isDuplicateValueError(createBusinessErr.message)
      ) {
        continue;
      }
      if (isMissingColumnError(createBusinessErr.message)) {
        const { data: fallbackBusiness, error: fallbackErr } = await admin
          .from("businesses")
          .insert({ slug: slugCandidate, created_by: userId })
          .select("id, slug")
          .single();
        if (fallbackErr) return { ok: false, error: fallbackErr.message };

        const businessId = String(fallbackBusiness?.id ?? "").trim();
        if (!businessId) return { ok: false, error: "Business created without id" };

        const { error: membershipErr } = await admin.from("memberships").upsert(
          { business_id: businessId, user_id: userId, role: "OWNER" },
          { onConflict: "business_id,user_id" },
        );
        if (membershipErr) return { ok: false, error: membershipErr.message };

        const updateResult = await updateBusinessMetadata(admin, slugCandidate, {
          businessName,
          businessSegment,
        });
        if (!updateResult.ok) return { ok: false, error: updateResult.error };
        return { ok: true, slug: slugCandidate };
      }
      return { ok: false, error: createBusinessErr.message };
    }

    const businessId = String(createdBusiness?.id ?? "").trim();
    if (!businessId) return { ok: false, error: "Business created without id" };

    const { error: membershipErr } = await admin.from("memberships").upsert(
      { business_id: businessId, user_id: userId, role: "OWNER" },
      { onConflict: "business_id,user_id" },
    );
    if (membershipErr) return { ok: false, error: membershipErr.message };

    const updateResult = await updateBusinessMetadata(admin, slugCandidate, {
      businessName,
      businessSegment,
    });
    if (!updateResult.ok) return { ok: false, error: updateResult.error };

    return { ok: true, slug: slugCandidate };
  }

  return {
    ok: false,
    error: "Could not create business. Try a slightly different name.",
  };
}

function toBusinessErrorPayload(
  code: string | null | undefined,
  message: string | null | undefined,
  input?: { currentUsage?: number | null; limit?: number | null },
): BusinessErrorPayload {
  const normalizedCode = String(code ?? "").trim();
  if (normalizedCode === BUSINESS_LIMIT_REACHED_CODE) {
    return businessLimitReachedError({
      currentUsage: input?.currentUsage ?? null,
      limit: input?.limit ?? null,
    });
  }
  return {
    code: "BUSINESS_CREATE_FAILED",
    message: message?.trim() || "Failed to create business",
  };
}

async function attachUpgradeRecommendation(
  admin: SupabaseClient,
  payload: BusinessErrorPayload,
): Promise<BusinessErrorPayload> {
  if (payload.code !== BUSINESS_LIMIT_REACHED_CODE) {
    return payload;
  }

  try {
    const recommendation = await resolveMaxBusinessesUpgradeRecommendation(
      admin,
      payload.limit ?? null,
    );
    return businessLimitReachedError({
      currentUsage: payload.current_usage ?? null,
      limit: payload.limit ?? null,
      recommendedPlan: recommendation?.recommendedPlan ?? null,
      nextLimit: recommendation?.nextLimit ?? null,
    });
  } catch {
    return businessLimitReachedError({
      currentUsage: payload.current_usage ?? null,
      limit: payload.limit ?? null,
    });
  }
}

export async function createBusinessForOwner(params: {
  supabase: Awaited<ReturnType<typeof supabaseServer>>;
  admin: SupabaseClient;
  userId: string;
  businessName: string;
  businessSegment?: string;
}): Promise<BusinessCreateGuardedResult> {
  const { supabase, admin, userId, businessName, businessSegment } = params;
  const baseSlug = slugify(businessName);

  let maxBusinesses: number | null = null;
  try {
    const entitlement = await resolveMaxBusinessesEntitlement(admin, userId);
    maxBusinesses = entitlement.maxBusinesses;
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Failed to resolve entitlements",
      },
      status: 500,
    };
  }

  const guardedRpc = await admin.rpc("create_business_with_owner_limit_guard", {
    p_owner_user_id: userId,
    p_base_slug: baseSlug,
    p_max_businesses: maxBusinesses,
  });

  if (!guardedRpc.error) {
    const row = ((guardedRpc.data ?? [])[0] ?? null) as CreateWithLimitGuardRow | null;
    if (!row) {
      return {
        ok: false,
        error: { code: "INTERNAL_ERROR", message: "Empty business creation response" },
        status: 500,
      };
    }

    if (!row.ok) {
      const payload = await attachUpgradeRecommendation(
        admin,
        toBusinessErrorPayload(row.error_code, row.error_message, {
          currentUsage: row.current_usage,
          limit: row.limit_value,
        }),
      );
      return {
        ok: false,
        error: payload,
        status: payload.code === BUSINESS_LIMIT_REACHED_CODE ? 403 : 500,
      };
    }

    const createdSlug = String(row.slug ?? "").trim();
    if (!createdSlug) {
      return {
        ok: false,
        error: { code: "INTERNAL_ERROR", message: "Business created without slug" },
        status: 500,
      };
    }

    const updateResult = await updateBusinessMetadata(admin, createdSlug, {
      businessName,
      businessSegment,
    });
    if (!updateResult.ok) {
      return {
        ok: false,
        error: { code: "BUSINESS_CREATE_FAILED", message: updateResult.error },
        status: 500,
      };
    }

    return { ok: true, slug: createdSlug };
  }

  // Function does not exist yet in some environments; keep compatibility fallback.
  if (String(guardedRpc.error.code ?? "") !== "42883") {
    return {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: guardedRpc.error.message,
      },
      status: 500,
    };
  }

  // Legacy fallback (non-atomic): keep explicit limit check for safety in older DBs.
  const limitCheck = await checkOwnerCanCreateBusiness(admin, userId);
  if (!limitCheck.allowed) {
    const payload = await attachUpgradeRecommendation(
      admin,
      toBusinessErrorPayload(
        BUSINESS_LIMIT_REACHED_CODE,
        limitCheck.error?.message ??
          "You have reached the maximum number of businesses for your plan",
        {
          currentUsage: limitCheck.ownerOwnedBusinessCount,
          limit: limitCheck.maxBusinesses,
        },
      ),
    );
    return {
      ok: false,
      error: payload,
      status: 403,
    };
  }

  const legacyResult = await createBusinessWithFallback({
    supabase,
    admin,
    userId,
    businessName,
    businessSegment,
  });

  if (!legacyResult.ok) {
    return {
      ok: false,
      error: { code: "BUSINESS_CREATE_FAILED", message: legacyResult.error },
      status: 500,
    };
  }

  return legacyResult;
}
