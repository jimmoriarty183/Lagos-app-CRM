import { NextResponse } from "next/server";
import { requireAccountAccess } from "@/lib/billing/auth";
import { listEntitlements } from "@/lib/billing/entitlements";
import { listOverrides } from "@/lib/billing/overrides";
import { getSubscriptionSnapshot } from "@/lib/billing/subscriptions";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const accountId = String(url.searchParams.get("account_id") ?? "").trim();
    const access = await requireAccountAccess(accountId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const [subscription, entitlements, overrides, webhookHistoryResult] =
      await Promise.all([
        getSubscriptionSnapshot(access.value.admin, access.value.accountId),
        listEntitlements(access.value.admin, access.value.accountId),
        listOverrides(access.value.admin, access.value.accountId),
        access.value.admin
          .from("billing_webhook_events")
          .select("*")
          .eq("related_account_id", access.value.accountId)
          .order("received_at", { ascending: false })
          .limit(100),
      ]);

    if (webhookHistoryResult.error) {
      throw webhookHistoryResult.error;
    }

    return NextResponse.json({
      account_id: access.value.accountId,
      current_plan: subscription.plan,
      subscription_status: subscription.status,
      subscription,
      entitlements,
      overrides,
      webhook_history: webhookHistoryResult.data ?? [],
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load billing admin data" },
      { status: 500 },
    );
  }
}

