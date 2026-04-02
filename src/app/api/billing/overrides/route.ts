import { NextResponse } from "next/server";
import { requireAccountAccess } from "@/lib/billing/auth";
import { createOverride, listOverrides } from "@/lib/billing/overrides";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const accountId = String(url.searchParams.get("account_id") ?? "").trim();
    const access = await requireAccountAccess(accountId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const overrides = await listOverrides(access.value.admin, access.value.accountId);
    return NextResponse.json({ account_id: access.value.accountId, overrides });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load overrides" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      account_id?: string;
      feature_code?: string;
      override_type?: "grant" | "revoke" | "set_limit";
      value_bool?: boolean | null;
      value_int?: number | null;
      value_text?: string | null;
      reason?: string | null;
      expires_at?: string | null;
      metadata?: Record<string, unknown> | null;
    };

    const accountId = String(body.account_id ?? "").trim();
    const featureCode = String(body.feature_code ?? "").trim();
    const overrideType = String(body.override_type ?? "").trim() as
      | "grant"
      | "revoke"
      | "set_limit";

    if (!accountId || !featureCode || !overrideType) {
      return NextResponse.json(
        { error: "account_id, feature_code and override_type are required" },
        { status: 400 },
      );
    }

    const access = await requireAccountAccess(accountId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const override = await createOverride(access.value.admin, {
      accountId: access.value.accountId,
      featureCode,
      overrideType,
      valueBool: body.value_bool,
      valueInt: body.value_int,
      valueText: body.value_text,
      reason: body.reason,
      createdBy: access.value.user.id,
      expiresAt: body.expires_at ?? null,
      metadata: body.metadata ?? null,
    });

    return NextResponse.json({ ok: true, override });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create override" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as {
      account_id?: string;
      override_id?: string;
      is_active?: boolean;
    };

    const accountId = String(body.account_id ?? "").trim();
    const overrideId = String(body.override_id ?? "").trim();
    const nextActive = Boolean(body.is_active);

    if (!accountId || !overrideId) {
      return NextResponse.json(
        { error: "account_id and override_id are required" },
        { status: 400 },
      );
    }

    const access = await requireAccountAccess(accountId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { data: current, error: currentError } = await access.value.admin
      .from("manual_entitlement_overrides")
      .select("*")
      .eq("id", overrideId)
      .eq("account_id", access.value.accountId)
      .maybeSingle();
    if (currentError) {
      throw currentError;
    }
    if (!current) {
      return NextResponse.json({ error: "Override not found" }, { status: 404 });
    }

    const { data: updated, error: updateError } = await access.value.admin
      .from("manual_entitlement_overrides")
      .update({
        is_active: nextActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", overrideId)
      .eq("account_id", access.value.accountId)
      .select("*")
      .single();
    if (updateError) {
      throw updateError;
    }

    await access.value.admin.from("audit_logs").insert({
      actor_id: access.value.user.id,
      entity_type: "manual_entitlement_override",
      entity_id: overrideId,
      action: "update",
      old_values: { is_active: (current as { is_active?: boolean }).is_active ?? null },
      new_values: { is_active: nextActive },
      metadata: {
        account_id: access.value.accountId,
      },
    });

    return NextResponse.json({ ok: true, override: updated });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update override" },
      { status: 500 },
    );
  }
}
