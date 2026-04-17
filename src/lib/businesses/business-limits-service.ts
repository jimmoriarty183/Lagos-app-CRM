import type { SupabaseClient } from "@supabase/supabase-js";
import { getFeatureValue } from "@/lib/billing/entitlements";
import {
  BUSINESS_LIMIT_REACHED_CODE,
  businessLimitReachedError,
} from "@/lib/businesses/errors";

export const MAX_BUSINESSES_FEATURE_CODE = "max_businesses" as const;

export type BusinessLimitError = {
  code: typeof BUSINESS_LIMIT_REACHED_CODE;
  message: string;
};

export type BusinessCreationLimitCheck = {
  allowed: boolean;
  error: BusinessLimitError | null;
  accountId: string;
  maxBusinesses: number | null;
  ownerOwnedBusinessCount: number;
};

export type BusinessLimitUpgradeRecommendation = {
  recommendedPlan: string;
  nextLimit: number | null;
} | null;

export function evaluateBusinessCreationLimit(
  maxBusinesses: number | null,
  ownerOwnedBusinessCount: number,
): BusinessLimitError | null {
  if (maxBusinesses === null) return null;
  if (ownerOwnedBusinessCount < maxBusinesses) return null;
  return businessLimitReachedError({
    currentUsage: ownerOwnedBusinessCount,
    limit: maxBusinesses,
  });
}

function parseMaxBusinesses(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Invalid max_businesses entitlement value");
  }
  return Math.floor(parsed);
}

export async function resolveOwnerAccountId(
  admin: SupabaseClient,
  ownerUserId: string,
): Promise<string | null> {
  const ownerColumns = ["owner_user_id", "owner_id", "created_by"] as const;

  for (const ownerColumn of ownerColumns) {
    const { data, error } = await admin
      .from("accounts")
      .select("id")
      .eq(ownerColumn, ownerUserId)
      .order("created_at", { ascending: true })
      .limit(1);

    if (!error) {
      const accountId = String((data ?? [])[0]?.id ?? "").trim();
      if (accountId) return accountId;
      continue;
    }

    // Backward-compatibility: some environments don't have all owner columns.
    if (String((error as { code?: string } | null)?.code ?? "") === "42703") {
      continue;
    }
    throw error;
  }

  const membershipsResult = await admin
    .from("memberships")
    .select("business_id")
    .eq("user_id", ownerUserId)
    .eq("role", "owner")
    .limit(20);
  if (membershipsResult.error) {
    throw membershipsResult.error;
  }
  const businessIds = (membershipsResult.data ?? [])
    .map((row) => String((row as { business_id?: string }).business_id ?? "").trim())
    .filter(Boolean);
  if (businessIds.length === 0) return null;

  const businessesResult = await admin
    .from("businesses")
    .select("slug")
    .in("id", businessIds)
    .limit(20);
  if (businessesResult.error) {
    throw businessesResult.error;
  }

  const slugs = (businessesResult.data ?? [])
    .map((row) => String((row as { slug?: string }).slug ?? "").trim())
    .filter(Boolean);
  if (slugs.length === 0) return null;

  const accountsResult = await admin
    .from("accounts")
    .select("id")
    .in("slug", slugs)
    .order("created_at", { ascending: true })
    .limit(1);
  if (accountsResult.error) {
    throw accountsResult.error;
  }
  const accountId = String((accountsResult.data ?? [])[0]?.id ?? "").trim();
  if (accountId) return accountId;

  return null;
}

export async function countOwnerBusinesses(
  admin: SupabaseClient,
  ownerUserId: string,
): Promise<number> {
  const rpcResult = await admin.rpc("count_owner_businesses_for_limit", {
    p_owner_user_id: ownerUserId,
  });
  if (!rpcResult.error) {
    const rawValue = Array.isArray(rpcResult.data)
      ? (rpcResult.data[0] as unknown)
      : (rpcResult.data as unknown);
    const normalizedRpc = Number(rawValue ?? 0);
    if (!Number.isFinite(normalizedRpc) || normalizedRpc < 0) {
      throw new Error("Could not resolve owner business count");
    }
    return normalizedRpc;
  }
  // Function does not exist yet in some environments; keep compatibility fallback.
  if (String(rpcResult.error.code ?? "") !== "42883") {
    throw rpcResult.error;
  }

  const { count, error } = await admin
    .from("memberships")
    .select("business_id", { count: "exact", head: true })
    .eq("user_id", ownerUserId)
    .eq("role", "owner");

  if (error) throw error;

  const normalized = Number(count ?? 0);
  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new Error("Could not resolve owner business count");
  }

  return normalized;
}

export async function resolveMaxBusinessesEntitlement(
  admin: SupabaseClient,
  ownerUserId: string,
): Promise<{ accountId: string; maxBusinesses: number | null }> {
  const accountId = await resolveOwnerAccountId(admin, ownerUserId);
  if (!accountId) {
    throw new Error("Billing account not found for owner user");
  }

  const entitlement = await getFeatureValue(
    admin,
    accountId,
    MAX_BUSINESSES_FEATURE_CODE,
  );

  if (!entitlement) {
    throw new Error("max_businesses entitlement is not configured for account");
  }

  if (entitlement.valueType !== "integer") {
    throw new Error("max_businesses entitlement must be integer");
  }

  return {
    accountId,
    maxBusinesses: parseMaxBusinesses(entitlement.value),
  };
}

export type PlanLimitRow = {
  plan_code: string;
  limit_value: number | null;
};

function sortPlanLimits(rows: PlanLimitRow[]) {
  return [...rows].sort((a, b) => {
    const left = a.limit_value;
    const right = b.limit_value;
    if (left === null && right === null) return a.plan_code.localeCompare(b.plan_code);
    if (left === null) return 1;
    if (right === null) return -1;
    return left - right || a.plan_code.localeCompare(b.plan_code);
  });
}

export function pickNextMaxBusinessesRecommendation(
  rows: PlanLimitRow[],
  currentLimit: number | null,
): BusinessLimitUpgradeRecommendation {
  if (currentLimit === null) return null;
  const sorted = sortPlanLimits(rows);
  const next = sorted.find((row) => {
    if (row.limit_value === null) return true;
    return row.limit_value > currentLimit;
  });

  if (!next) return null;
  return {
    recommendedPlan: next.plan_code,
    nextLimit: next.limit_value,
  };
}

export async function resolveMaxBusinessesUpgradeRecommendation(
  admin: SupabaseClient,
  currentLimit: number | null,
): Promise<BusinessLimitUpgradeRecommendation> {
  if (currentLimit === null) return null;

  const featureResult = await admin
    .from("features")
    .select("id")
    .eq("key", MAX_BUSINESSES_FEATURE_CODE)
    .maybeSingle();
  if (featureResult.error) throw featureResult.error;

  const featureId = String((featureResult.data as { id?: string } | null)?.id ?? "").trim();
  if (!featureId) return null;

  const planFeaturesResult = await admin
    .from("plan_features")
    .select("int_value, plans:plans(code, is_active)")
    .eq("feature_id", featureId);
  if (planFeaturesResult.error) throw planFeaturesResult.error;

  const rows = ((planFeaturesResult.data ?? []) as Array<{
    int_value: number | null;
    plans?: { code?: string; is_active?: boolean } | null;
  }>)
    .map((row) => {
      const planCode = String(row.plans?.code ?? "").trim();
      const isActive = Boolean(row.plans?.is_active);
      if (!planCode || !isActive) return null;
      return {
        plan_code: planCode,
        limit_value:
          row.int_value === null || row.int_value === undefined
            ? null
            : Number(row.int_value),
      } satisfies PlanLimitRow;
    })
    .filter((row): row is PlanLimitRow => Boolean(row));

  return pickNextMaxBusinessesRecommendation(rows, currentLimit);
}

export async function checkOwnerCanCreateBusiness(
  admin: SupabaseClient,
  ownerUserId: string,
): Promise<BusinessCreationLimitCheck> {
  const [ownerOwnedBusinessCount, entitlement] = await Promise.all([
    countOwnerBusinesses(admin, ownerUserId),
    resolveMaxBusinessesEntitlement(admin, ownerUserId),
  ]);

  const { accountId, maxBusinesses } = entitlement;

  const limitError = evaluateBusinessCreationLimit(
    maxBusinesses,
    ownerOwnedBusinessCount,
  );

  if (!limitError) {
    return {
      allowed: true,
      error: null,
      accountId,
      maxBusinesses,
      ownerOwnedBusinessCount,
    };
  }

  return {
    allowed: false,
    error: limitError,
    accountId,
    maxBusinesses,
    ownerOwnedBusinessCount,
  };
}
