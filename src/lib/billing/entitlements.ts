import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isOverrideActive,
  mergeEntitlements,
  toFeatureEnabled,
  type OverrideEntitlementInput,
  type PlanEntitlementInput,
} from "@/lib/billing/entitlements-logic";
import type {
  EffectiveEntitlement,
  FeatureRow,
  FeatureRowRaw,
  ManualEntitlementOverrideRow,
  PlanFeatureRow,
  PlanPriceRow,
  SubscriptionRow,
} from "@/lib/billing/types";

const ENTITLED_STATUSES = new Set(["trialing", "active", "past_due", "paused"]);

/** Production uses `key`, local seed uses `code`. Normalise to `code`. */
function normalizeFeature(raw: FeatureRowRaw): FeatureRow {
  return { ...raw, code: raw.code ?? raw.key ?? "" } as FeatureRow;
}

function nowIso() {
  return new Date().toISOString();
}

export async function getCurrentEntitledSubscription(
  admin: SupabaseClient,
  accountId: string,
) {
  const { data, error } = await admin
    .from("subscriptions")
    .select("*")
    .eq("account_id", accountId)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as SubscriptionRow[];
  return (
    rows.find((row) => ENTITLED_STATUSES.has(row.status)) ??
    rows[0] ??
    null
  );
}

async function loadPlanEntitlements(
  admin: SupabaseClient,
  planId: string,
): Promise<PlanEntitlementInput[]> {
  const { data: planFeaturesData, error: planFeaturesError } = await admin
    .from("plan_features")
    .select("*")
    .eq("plan_id", planId);
  if (planFeaturesError) throw planFeaturesError;

  const planFeatures = (planFeaturesData ?? []) as PlanFeatureRow[];
  if (planFeatures.length === 0) return [];

  const featureIds = Array.from(new Set(planFeatures.map((row) => row.feature_id)));
  const { data: featuresData, error: featuresError } = await admin
    .from("features")
    .select("*")
    .in("id", featureIds);
  if (featuresError) throw featuresError;
  const features = ((featuresData ?? []) as FeatureRowRaw[]).map(normalizeFeature);
  const featureById = new Map(features.map((feature) => [feature.id, feature]));

  return planFeatures
    .map((row) => {
      const feature = featureById.get(row.feature_id);
      if (!feature) return null;
      return {
        featureId: feature.id,
        featureCode: feature.code,
        valueType: feature.value_type,
        valueBool: row.bool_value,
        valueInt: row.int_value,
        valueText: row.text_value,
      } satisfies PlanEntitlementInput;
    })
    .filter((row): row is PlanEntitlementInput => Boolean(row));
}

async function loadActiveOverrides(
  admin: SupabaseClient,
  accountId: string,
  atISO: string,
): Promise<OverrideEntitlementInput[]> {
  const { data: overrideData, error: overrideError } = await admin
    .from("manual_entitlement_overrides")
    .select("*")
    .eq("account_id", accountId)
    .is("revoked_at", null)
    .order("created_at", { ascending: true });
  if (overrideError) throw overrideError;

  const overrides = (overrideData ?? []) as ManualEntitlementOverrideRow[];
  if (overrides.length === 0) return [];

  const featureIds = Array.from(new Set(overrides.map((row) => row.feature_id)));
  const { data: featuresData, error: featuresError } = await admin
    .from("features")
    .select("*")
    .in("id", featureIds);
  if (featuresError) throw featuresError;
  const features = ((featuresData ?? []) as FeatureRowRaw[]).map(normalizeFeature);
  const featureById = new Map(features.map((feature) => [feature.id, feature]));

  return overrides
    .filter((row) => isOverrideActive({ expiresAt: row.expires_at }, atISO))
    .map((row) => {
      const feature = featureById.get(row.feature_id);
      if (!feature) return null;
      return {
        featureId: feature.id,
        featureCode: feature.code,
        valueType: feature.value_type,
        overrideType: row.override_type,
        valueBool: row.bool_value,
        valueInt: row.int_value,
        valueText: row.text_value,
      } satisfies OverrideEntitlementInput;
    })
    .filter((row): row is OverrideEntitlementInput => Boolean(row));
}

async function resolvePlanIdFromSubscription(
  admin: SupabaseClient,
  subscription: SubscriptionRow | null,
): Promise<string | null> {
  if (!subscription) return null;
  const { data, error } = await admin
    .from("plan_prices")
    .select("*")
    .eq("id", subscription.plan_price_id)
    .maybeSingle();
  if (error) throw error;
  const row = data as PlanPriceRow | null;
  return row?.plan_id ?? null;
}

export async function resolveEntitlements(
  admin: SupabaseClient,
  accountId: string,
  atISO: string = nowIso(),
): Promise<Map<string, EffectiveEntitlement>> {
  const subscription = await getCurrentEntitledSubscription(admin, accountId);
  const planId = await resolvePlanIdFromSubscription(admin, subscription);
  const planEntitlements = planId
    ? await loadPlanEntitlements(admin, planId)
    : [];
  const overrideEntitlements = await loadActiveOverrides(admin, accountId, atISO);

  return mergeEntitlements(planEntitlements, overrideEntitlements);
}

export async function getFeatureValue(
  admin: SupabaseClient,
  accountId: string,
  featureCode: string,
  atISO?: string,
) {
  const entitlements = await resolveEntitlements(admin, accountId, atISO);
  return entitlements.get(featureCode) ?? null;
}

export async function hasFeature(
  admin: SupabaseClient,
  accountId: string,
  featureCode: string,
  atISO?: string,
) {
  const entitlement = await getFeatureValue(admin, accountId, featureCode, atISO);
  if (!entitlement) return false;
  return toFeatureEnabled(entitlement.valueType, entitlement.value);
}

export async function listEntitlements(
  admin: SupabaseClient,
  accountId: string,
  atISO?: string,
) {
  const entitlements = await resolveEntitlements(admin, accountId, atISO);
  return Array.from(entitlements.values()).sort((a, b) =>
    a.featureCode.localeCompare(b.featureCode),
  );
}
