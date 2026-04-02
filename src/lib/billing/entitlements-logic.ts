import type {
  EffectiveEntitlement,
  FeatureValue,
  FeatureValueType,
  OverrideType,
} from "@/lib/billing/types";

export type PlanEntitlementInput = {
  featureId: string;
  featureCode: string;
  valueType: FeatureValueType;
  valueBool: boolean | null;
  valueInt: number | null;
  valueText: string | null;
};

export type OverrideEntitlementInput = {
  featureId: string;
  featureCode: string;
  valueType: FeatureValueType;
  overrideType: OverrideType;
  valueBool: boolean | null;
  valueInt: number | null;
  valueText: string | null;
  expiresAt?: string | null;
};

export function isOverrideActive(
  override: Pick<OverrideEntitlementInput, "expiresAt">,
  atISO: string,
) {
  if (!override.expiresAt) return true;
  return override.expiresAt > atISO;
}

export function pickTypedValue(input: {
  valueType: FeatureValueType;
  valueBool: boolean | null;
  valueInt: number | null;
  valueText: string | null;
}): FeatureValue {
  if (input.valueType === "boolean") return input.valueBool ?? false;
  if (input.valueType === "integer") return input.valueInt ?? 0;
  return input.valueText ?? "";
}

export function applyOverride(
  currentValue: FeatureValue,
  valueType: FeatureValueType,
  override: OverrideEntitlementInput,
): FeatureValue {
  const overrideValue = pickTypedValue({
    valueType,
    valueBool: override.valueBool,
    valueInt: override.valueInt,
    valueText: override.valueText,
  });

  if (override.overrideType === "set_limit") {
    return overrideValue;
  }

  if (override.overrideType === "grant") {
    if (valueType === "boolean") return true;
    return overrideValue;
  }

  if (valueType === "boolean") return false;
  if (valueType === "integer") return 0;
  return "";
}

export function mergeEntitlements(
  planRows: PlanEntitlementInput[],
  overrideRows: OverrideEntitlementInput[],
): Map<string, EffectiveEntitlement> {
  const merged = new Map<string, EffectiveEntitlement>();

  for (const row of planRows) {
    merged.set(row.featureCode, {
      featureId: row.featureId,
      featureCode: row.featureCode,
      valueType: row.valueType,
      value: pickTypedValue(row),
      source: "plan",
    });
  }

  for (const row of overrideRows) {
    const existing = merged.get(row.featureCode);
    const currentValue = existing?.value ?? pickTypedValue(row);
    merged.set(row.featureCode, {
      featureId: row.featureId,
      featureCode: row.featureCode,
      valueType: row.valueType,
      value: applyOverride(currentValue, row.valueType, row),
      source: "override",
    });
  }

  return merged;
}

export function toFeatureEnabled(
  valueType: FeatureValueType,
  value: FeatureValue,
): boolean {
  if (valueType === "boolean") return Boolean(value);
  if (valueType === "integer") return Number(value ?? 0) > 0;
  return String(value ?? "").trim().length > 0;
}
