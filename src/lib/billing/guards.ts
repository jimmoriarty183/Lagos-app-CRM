import type { SupabaseClient } from "@supabase/supabase-js";
import { getFeatureValue, hasFeature } from "@/lib/billing/entitlements";

export async function requireBooleanFeature(
  admin: SupabaseClient,
  input: {
    accountId: string;
    featureCode: string;
    errorMessage?: string;
  },
) {
  const enabled = await hasFeature(admin, input.accountId, input.featureCode);
  if (!enabled) {
    throw new Error(input.errorMessage ?? `Feature disabled: ${input.featureCode}`);
  }
}

export async function requireLimitFeature(
  admin: SupabaseClient,
  input: {
    accountId: string;
    featureCode: string;
    currentUsage: number;
    errorMessage?: string;
  },
) {
  const entitlement = await getFeatureValue(admin, input.accountId, input.featureCode);
  const limit =
    entitlement?.valueType === "integer"
      ? Number(entitlement.value ?? 0)
      : 0;

  if (!Number.isFinite(limit) || input.currentUsage >= limit) {
    throw new Error(
      input.errorMessage ??
        `Limit reached for ${input.featureCode}: ${input.currentUsage}/${limit}`,
    );
  }
}

