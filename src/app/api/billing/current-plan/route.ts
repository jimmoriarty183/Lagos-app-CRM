import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSubscriptionSnapshot } from "@/lib/billing/subscriptions";
import { resolveOwnerAccountId } from "@/lib/businesses/business-limits-service";
import { supabaseServerReadOnly } from "@/lib/supabase/server";

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = cleanText(searchParams.get("business_id"));
    if (!businessId) {
      return NextResponse.json(
        { error: "business_id is required" },
        { status: 400 },
      );
    }

    const supabase = await supabaseServerReadOnly();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: membership, error: membershipError } = await supabase
      .from("memberships")
      .select("business_id")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      return NextResponse.json(
        { error: membershipError.message || "Failed to verify membership" },
        { status: 500 },
      );
    }

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = supabaseAdmin();

    const ownerMembership = await admin
      .from("memberships")
      .select("user_id")
      .eq("business_id", businessId)
      .eq("role", "owner")
      .order("created_at", { ascending: true })
      .limit(1);

    const ownerUserId = cleanText(
      (ownerMembership.data?.[0] as { user_id?: string } | undefined)?.user_id,
    );

    let subscriptionPlanCode: string | null = null;
    if (ownerUserId) {
      try {
        const accountId = await resolveOwnerAccountId(admin, ownerUserId);
        if (accountId) {
          const subscription = await getSubscriptionSnapshot(admin, accountId);
          const planCode = cleanText(subscription?.plan?.code);
          if (planCode) subscriptionPlanCode = planCode;
        }
      } catch {
        // Keep endpoint resilient: fallback to workspace plan if billing snapshot is unavailable.
      }
    }

    if (subscriptionPlanCode) {
      return NextResponse.json({
        plan_code: subscriptionPlanCode,
        source: "subscription",
      });
    }

    const { data: business } = await admin
      .from("businesses")
      .select("plan")
      .eq("id", businessId)
      .maybeSingle();

    return NextResponse.json({
      plan_code: cleanText((business as { plan?: string } | null)?.plan) || null,
      source: "workspace",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to resolve current plan" },
      { status: 500 },
    );
  }
}
