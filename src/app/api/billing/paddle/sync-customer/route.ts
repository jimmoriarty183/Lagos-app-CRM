import { NextResponse } from "next/server";
import { requireAccountAccess } from "@/lib/billing/auth";
import { syncCustomerByExternalId } from "@/lib/billing/paddle-service";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      account_id?: string;
      paddle_customer_id?: string;
    };
    const accountId = String(body.account_id ?? "").trim();
    const externalId = String(body.paddle_customer_id ?? "").trim();
    if (!accountId || !externalId) {
      return NextResponse.json(
        { error: "account_id and paddle_customer_id are required" },
        { status: 400 },
      );
    }

    const access = await requireAccountAccess(accountId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const synced = await syncCustomerByExternalId(access.value.admin, {
      accountId: access.value.accountId,
      paddleCustomerId: externalId,
    });
    return NextResponse.json({ ok: true, ...synced });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sync customer" },
      { status: 500 },
    );
  }
}

