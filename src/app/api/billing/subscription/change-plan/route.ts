import { NextResponse } from "next/server";
import { requireAccountAccess } from "@/lib/billing/auth";
import { DEMO_BLOCKED_ERROR, isDemoAccount, isDemoEmail } from "@/lib/billing/demo";
import { requestPlanChange } from "@/lib/billing/paddle-service";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      account_id?: string;
      subscription_id?: string;
      next_plan_price_id?: string;
    };

    const accountId = String(body.account_id ?? "").trim();
    const subscriptionId = String(body.subscription_id ?? "").trim();
    const nextPlanPriceId = String(body.next_plan_price_id ?? "").trim();

    if (!accountId || !subscriptionId || !nextPlanPriceId) {
      return NextResponse.json(
        { error: "account_id, subscription_id and next_plan_price_id are required" },
        { status: 400 },
      );
    }

    const access = await requireAccountAccess(accountId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (
      isDemoEmail(access.value.user.email) ||
      (await isDemoAccount(access.value.admin, access.value.accountId))
    ) {
      return NextResponse.json(
        { ok: false, code: DEMO_BLOCKED_ERROR.code, error: DEMO_BLOCKED_ERROR.message },
        { status: 403 },
      );
    }

    const upstream = await requestPlanChange(access.value.admin, {
      subscriptionId,
      nextPlanPriceId,
      requestedBy: access.value.user.id,
    });

    return NextResponse.json({
      ok: true,
      message: "Change requested via Paddle. Final state will be confirmed by webhook.",
      upstream,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to change plan" },
      { status: 500 },
    );
  }
}

