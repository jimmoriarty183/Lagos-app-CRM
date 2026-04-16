import { NextResponse } from "next/server";
import { requireAccountAccess } from "@/lib/billing/auth";
import { getSubscriptionSnapshot } from "@/lib/billing/subscriptions";

function asObject(input: unknown): Record<string, unknown> {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    return input as Record<string, unknown>;
  }
  return {};
}

function readRawPaddlePriceId(rawPayload: unknown) {
  const payload = asObject(rawPayload);
  const data = asObject(payload.data);
  const items = Array.isArray(data.items) ? data.items : [];
  const first = asObject(items[0]);
  const price = asObject(first.price);
  const direct = String(first.price_id ?? "").trim();
  const nested = String(price.id ?? "").trim();
  return nested || direct || null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const accountId = String(url.searchParams.get("account_id") ?? "").trim();
    const access = await requireAccountAccess(accountId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const subscription = await getSubscriptionSnapshot(
      access.value.admin,
      access.value.accountId,
    );

    let paddleSubscription: Record<string, unknown> | null = null;
    let paddleCustomer: Record<string, unknown> | null = null;

    if (subscription.subscriptionId) {
      const { data: psData, error: psError } = await access.value.admin
        .from("paddle_subscriptions")
        .select("*")
        .eq("subscription_id", subscription.subscriptionId)
        .maybeSingle();
      if (psError) throw psError;
      paddleSubscription = (psData as Record<string, unknown> | null) ?? null;
    }

    const { data: pcData, error: pcError } = await access.value.admin
      .from("paddle_customers")
      .select("*")
      .eq("account_id", access.value.accountId)
      .order("updated_at", { ascending: false })
      .limit(1);
    if (pcError) throw pcError;
    paddleCustomer = ((pcData ?? [])[0] as Record<string, unknown> | undefined) ?? null;

    return NextResponse.json({
      ...subscription,
      paddle: {
        customer_id:
          (paddleCustomer?.paddle_customer_id as string | undefined) ?? null,
        subscription_id:
          (paddleSubscription?.paddle_subscription_id as string | undefined) ??
          subscription.externalSubscriptionId,
        price_id: readRawPaddlePriceId(paddleSubscription?.raw_payload),
        product_id: null,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load subscription" },
      { status: 500 },
    );
  }
}
