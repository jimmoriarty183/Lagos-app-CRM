import { NextResponse } from "next/server";
import { requireAccountAccess } from "@/lib/billing/auth";
import { previewPlanChange } from "@/lib/billing/paddle-service";

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

    const preview = await previewPlanChange(access.value.admin, {
      subscriptionId,
      nextPlanPriceId,
    });

    return NextResponse.json({ ok: true, preview });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to preview change" },
      { status: 500 },
    );
  }
}

