import { NextResponse } from "next/server";
import { requireAccountAccess } from "@/lib/billing/auth";
import { getFeatureValue, hasFeature } from "@/lib/billing/entitlements";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const accountId = String(url.searchParams.get("account_id") ?? "").trim();
    const featureCode = String(url.searchParams.get("feature_code") ?? "").trim();
    const currentUsage = Number(url.searchParams.get("current_usage") ?? "0");

    if (!accountId || !featureCode) {
      return NextResponse.json(
        { error: "account_id and feature_code are required" },
        { status: 400 },
      );
    }

    const access = await requireAccountAccess(accountId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const enabled = await hasFeature(
      access.value.admin,
      access.value.accountId,
      featureCode,
    );
    const entitlement = await getFeatureValue(
      access.value.admin,
      access.value.accountId,
      featureCode,
    );

    const limit =
      entitlement?.valueType === "integer"
        ? Number(entitlement.value ?? 0)
        : null;
    const withinLimit =
      limit === null ? null : Number.isFinite(limit) ? currentUsage < limit : false;

    return NextResponse.json({
      account_id: access.value.accountId,
      feature_code: featureCode,
      source: entitlement?.source ?? null,
      value_type: entitlement?.valueType ?? null,
      value: entitlement?.value ?? null,
      enabled,
      limit,
      current_usage: currentUsage,
      within_limit: withinLimit,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Feature check failed" },
      { status: 500 },
    );
  }
}
