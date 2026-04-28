import { NextResponse } from "next/server";
import { requireAccountAccess } from "@/lib/billing/auth";
import { DEMO_BLOCKED_ERROR, isDemoAccount, isDemoEmail } from "@/lib/billing/demo";
import { requestCancel } from "@/lib/billing/paddle-service";
import { PaddleApiError } from "@/lib/billing/paddle-client";

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

    if (
      isDemoEmail(access.value.user.email) ||
      (await isDemoAccount(access.value.admin, access.value.accountId))
    ) {
      return NextResponse.json(
        { ok: false, code: DEMO_BLOCKED_ERROR.code, error: DEMO_BLOCKED_ERROR.message },
        { status: 403 },
      );
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
    if (error instanceof PaddleApiError) {
      const detail = String(error.detail ?? "").toLowerCase();
      const unauthorizedCancel =
        (error.status === 401 || error.status === 403) &&
        detail.includes("not authorized") &&
        detail.includes("subscription-cancel");

      if (unauthorizedCancel) {
        return NextResponse.json(
          {
            error:
              "Paddle key does not have permission to cancel subscriptions. Update PADDLE_API_KEY to a key with subscription cancel scope, then retry.",
            code: "paddle_permission_error",
          },
          { status: 403 },
        );
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to cancel subscription" },
      { status: 500 },
    );
  }
}

