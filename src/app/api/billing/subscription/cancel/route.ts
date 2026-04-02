import { NextResponse } from "next/server";
import { requireAccountAccess } from "@/lib/billing/auth";
import { requestCancel } from "@/lib/billing/paddle-service";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      account_id?: string;
      subscription_id?: string;
    };
    const accountId = String(body.account_id ?? "").trim();
    const subscriptionId = String(body.subscription_id ?? "").trim();

    if (!accountId || !subscriptionId) {
      return NextResponse.json(
        { error: "account_id and subscription_id are required" },
        { status: 400 },
      );
    }

    const access = await requireAccountAccess(accountId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const upstream = await requestCancel(access.value.admin, {
      subscriptionId,
      requestedBy: access.value.user.id,
    });

    return NextResponse.json({
      ok: true,
      message: "Cancel requested via Paddle. Final state will be confirmed by webhook.",
      upstream,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to cancel subscription" },
      { status: 500 },
    );
  }
}

