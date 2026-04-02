import type { SupabaseClient } from "@supabase/supabase-js";
import { billingLog } from "@/lib/billing/logging";
import type {
  FeatureRow,
  FeatureValueType,
  ManualEntitlementOverrideRow,
  OverrideType,
} from "@/lib/billing/types";

function ensureOverrideValue(valueType: FeatureValueType, input: {
  valueBool?: boolean | null;
  valueInt?: number | null;
  valueText?: string | null;
}) {
  if (valueType === "boolean") {
    return {
      value_bool: input.valueBool ?? false,
      value_int: null,
      value_text: null,
    };
  }
  if (valueType === "integer") {
    return {
      value_bool: null,
      value_int: Number.isFinite(input.valueInt ?? NaN) ? Number(input.valueInt) : 0,
      value_text: null,
    };
  }
  return {
    value_bool: null,
    value_int: null,
    value_text: String(input.valueText ?? ""),
  };
}

async function getFeatureByCode(admin: SupabaseClient, featureCode: string) {
  const { data, error } = await admin
    .from("features")
    .select("*")
    .eq("code", featureCode)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Feature not found: ${featureCode}`);
  return data as FeatureRow;
}

export async function createOverride(
  admin: SupabaseClient,
  input: {
    accountId: string;
    featureCode: string;
    overrideType: OverrideType;
    valueBool?: boolean | null;
    valueInt?: number | null;
    valueText?: string | null;
    reason?: string | null;
    createdBy?: string | null;
    expiresAt?: string | null;
    metadata?: Record<string, unknown> | null;
  },
) {
  const feature = await getFeatureByCode(admin, input.featureCode);
  const values = ensureOverrideValue(feature.value_type, input);

  const { data, error } = await admin
    .from("manual_entitlement_overrides")
    .insert({
      account_id: input.accountId,
      feature_id: feature.id,
      override_type: input.overrideType,
      ...values,
      is_active: true,
      reason: input.reason ?? null,
      created_by: input.createdBy ?? null,
      expires_at: input.expiresAt ?? null,
      metadata: input.metadata ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;

  const row = data as ManualEntitlementOverrideRow;
  billingLog("info", "override.created", {
    account_id: input.accountId,
    feature_code: input.featureCode,
    override_type: input.overrideType,
    override_id: row.id,
  });

  await admin.from("audit_logs").insert({
    actor_id: input.createdBy ?? null,
    entity_type: "manual_entitlement_override",
    entity_id: row.id,
    action: "create",
    old_values: null,
    new_values: row,
    metadata: {
      account_id: input.accountId,
      feature_code: input.featureCode,
    },
  });

  return row;
}

export async function listOverrides(admin: SupabaseClient, accountId: string) {
  const { data, error } = await admin
    .from("manual_entitlement_overrides")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ManualEntitlementOverrideRow[];
}

export async function expireOverrides(admin: SupabaseClient) {
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("manual_entitlement_overrides")
    .update({
      is_active: false,
      updated_at: now,
    })
    .eq("is_active", true)
    .not("expires_at", "is", null)
    .lte("expires_at", now)
    .select("*");
  if (error) throw error;

  const rows = (data ?? []) as ManualEntitlementOverrideRow[];
  for (const row of rows) {
    await admin.from("audit_logs").insert({
      actor_id: null,
      entity_type: "manual_entitlement_override",
      entity_id: row.id,
      action: "expire",
      old_values: { is_active: true },
      new_values: { is_active: false },
      metadata: { account_id: row.account_id, reason: "auto_expire_job" },
    });
  }
  billingLog("info", "override.expire_job", { expired_count: rows.length });
  return rows.length;
}
