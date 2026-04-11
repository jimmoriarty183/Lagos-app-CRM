import type { SupabaseClient } from "@supabase/supabase-js";
import {
  countOwnerBusinesses,
  resolveMaxBusinessesEntitlement,
  resolveMaxBusinessesUpgradeRecommendation,
} from "@/lib/businesses/business-limits-service";
import { getLatestSubscriptionForAccount } from "@/lib/billing/subscriptions";
import type { BillingInterval } from "@/lib/billing/types";

export type BusinessLimitStatus = {
  accountId: string;
  currentUsage: number;
  limit: number | null;
  upgradeRequired: boolean;
  recommendedPlan: string | null;
  nextLimit: number | null;
};

export type BusinessLimitUpgradeTarget = {
  accountId: string;
  subscriptionId: string | null;
  nextPlanPriceId: string | null;
  nextPaddlePriceId: string | null;
  recommendedPlan: string | null;
  nextLimit: number | null;
};

type PlanPriceLookupRow = {
  id: string;
  billing_interval: BillingInterval;
  paddle_price_id: string | null;
  is_active: boolean;
  plans:
    | {
        code: string;
        is_active: boolean;
      }
    | Array<{
        code: string;
        is_active: boolean;
      }>
    | null;
};

function normalizePlanRef(
  value:
    | {
        code?: string;
        is_active?: boolean;
      }
    | Array<{
        code?: string;
        is_active?: boolean;
      }>
    | null
    | undefined,
) {
  if (!value) return null;
  if (Array.isArray(value)) {
    const first = value[0];
    if (!first) return null;
    return {
      code: String(first.code ?? "").trim(),
      isActive: Boolean(first.is_active),
    };
  }
  return {
    code: String(value.code ?? "").trim(),
    isActive: Boolean(value.is_active),
  };
}

async function resolvePlanPriceForRecommendedPlan(
  admin: SupabaseClient,
  recommendedPlan: string,
  preferredInterval: BillingInterval | null,
) {
  const { data, error } = await admin
    .from("plan_prices")
    .select("id, billing_interval, paddle_price_id, is_active, plans:plans(code, is_active)")
    .eq("is_active", true);
  if (error) throw error;

  const matchingRows = ((data ?? []) as PlanPriceLookupRow[])
    .filter((row) => {
      if (!row.is_active) return false;
      const planRef = normalizePlanRef(row.plans);
      return Boolean(
        planRef &&
          planRef.isActive &&
          planRef.code.localeCompare(recommendedPlan, undefined, { sensitivity: "base" }) ===
            0,
      );
    })
    .sort((left, right) => left.id.localeCompare(right.id));

  if (matchingRows.length === 0) return null;

  if (preferredInterval) {
    const preferred = matchingRows.find(
      (row) => row.billing_interval === preferredInterval,
    );
    if (preferred) return preferred;
  }

  return matchingRows[0];
}

export async function resolveBusinessLimitStatus(
  admin: SupabaseClient,
  ownerUserId: string,
): Promise<BusinessLimitStatus> {
  const [entitlement, currentUsage] = await Promise.all([
    resolveMaxBusinessesEntitlement(admin, ownerUserId),
    countOwnerBusinesses(admin, ownerUserId),
  ]);
  const recommendation = await resolveMaxBusinessesUpgradeRecommendation(
    admin,
    entitlement.maxBusinesses,
  );
  const upgradeRequired =
    entitlement.maxBusinesses !== null && currentUsage >= entitlement.maxBusinesses;

  return {
    accountId: entitlement.accountId,
    currentUsage,
    limit: entitlement.maxBusinesses,
    upgradeRequired,
    recommendedPlan: recommendation?.recommendedPlan ?? null,
    nextLimit: recommendation?.nextLimit ?? null,
  };
}

export async function resolveBusinessLimitUpgradeTarget(
  admin: SupabaseClient,
  ownerUserId: string,
): Promise<BusinessLimitUpgradeTarget> {
  const status = await resolveBusinessLimitStatus(admin, ownerUserId);
  if (!status.recommendedPlan) {
    return {
      accountId: status.accountId,
      subscriptionId: null,
      nextPlanPriceId: null,
      nextPaddlePriceId: null,
      recommendedPlan: null,
      nextLimit: null,
    };
  }

  const subscription = await getLatestSubscriptionForAccount(admin, status.accountId);
  const currentPlanPriceId = String(subscription?.plan_price_id ?? "").trim();
  let preferredInterval: BillingInterval | null = null;
  if (currentPlanPriceId) {
    const { data: currentPriceData, error: currentPriceError } = await admin
      .from("plan_prices")
      .select("billing_interval")
      .eq("id", currentPlanPriceId)
      .maybeSingle();
    if (currentPriceError) throw currentPriceError;
    preferredInterval =
      (currentPriceData as { billing_interval?: BillingInterval } | null)
        ?.billing_interval ?? null;
  }

  const targetPlanPrice = await resolvePlanPriceForRecommendedPlan(
    admin,
    status.recommendedPlan,
    preferredInterval,
  );

  return {
    accountId: status.accountId,
    subscriptionId: subscription?.id ?? null,
    nextPlanPriceId: targetPlanPrice?.id ?? null,
    nextPaddlePriceId: targetPlanPrice?.paddle_price_id ?? null,
    recommendedPlan: status.recommendedPlan,
    nextLimit: status.nextLimit,
  };
}
