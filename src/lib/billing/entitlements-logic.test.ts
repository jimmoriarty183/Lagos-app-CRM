import assert from "node:assert/strict";
import test from "node:test";
import {
  isOverrideActive,
  mergeEntitlements,
  toFeatureEnabled,
} from "@/lib/billing/entitlements-logic";

test("entitlement merge applies override over plan", () => {
  const plan = [
    {
      featureId: "f1",
      featureCode: "team_members_limit",
      valueType: "integer" as const,
      valueBool: null,
      valueInt: 5,
      valueText: null,
    },
  ];
  const overrides = [
    {
      featureId: "f1",
      featureCode: "team_members_limit",
      valueType: "integer" as const,
      overrideType: "set_limit" as const,
      valueBool: null,
      valueInt: 20,
      valueText: null,
    },
  ];

  const merged = mergeEntitlements(plan, overrides);
  assert.equal(merged.get("team_members_limit")?.value, 20);
  assert.equal(merged.get("team_members_limit")?.source, "override");
});

test("boolean revoke override disables feature", () => {
  const plan = [
    {
      featureId: "f2",
      featureCode: "analytics_access",
      valueType: "boolean" as const,
      valueBool: true,
      valueInt: null,
      valueText: null,
    },
  ];
  const overrides = [
    {
      featureId: "f2",
      featureCode: "analytics_access",
      valueType: "boolean" as const,
      overrideType: "revoke" as const,
      valueBool: null,
      valueInt: null,
      valueText: null,
    },
  ];

  const merged = mergeEntitlements(plan, overrides);
  const entitlement = merged.get("analytics_access");
  assert.equal(entitlement?.value, false);
  assert.equal(toFeatureEnabled(entitlement!.valueType, entitlement!.value), false);
});

test("expired override is ignored by activity check", () => {
  const at = "2026-04-02T10:00:00.000Z";
  assert.equal(
    isOverrideActive({ expiresAt: "2026-04-02T09:59:59.000Z" }, at),
    false,
  );
  assert.equal(
    isOverrideActive({ expiresAt: "2026-04-02T10:01:00.000Z" }, at),
    true,
  );
});

