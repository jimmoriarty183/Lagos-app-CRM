import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requestPlanChange } from "@/lib/billing/paddle-service";
import {
  resolveBusinessLimitStatus,
  resolveBusinessLimitUpgradeTarget,
} from "@/lib/businesses/business-upgrade-service";

export async function POST() {
  try {
    const supabase = await supabaseServer();
    const admin = supabaseAdmin();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 },
      );
    }

    const status = await resolveBusinessLimitStatus(admin, user.id);
    if (!status.upgradeRequired) {
      return NextResponse.json(
        {
          ok: false,
          code: "UPGRADE_NOT_REQUIRED",
          message: "Your current plan already supports creating another business",
          current_usage: status.currentUsage,
          limit: status.limit,
          upgrade_required: false,
          recommended_plan: status.recommendedPlan,
          next_limit: status.nextLimit,
        },
        { status: 409 },
      );
    }

    const target = await resolveBusinessLimitUpgradeTarget(admin, user.id);
    if (!target.recommendedPlan || !target.nextPlanPriceId) {
      return NextResponse.json(
        {
          ok: false,
          code: "UPGRADE_PATH_UNAVAILABLE",
          message: "No eligible upgrade option was found for your account",
          current_usage: status.currentUsage,
          limit: status.limit,
          upgrade_required: true,
          recommended_plan: status.recommendedPlan,
          next_limit: status.nextLimit,
        },
        { status: 422 },
      );
    }

    if (!target.subscriptionId) {
      return NextResponse.json({
        ok: true,
        mode: "checkout_required",
        account_id: target.accountId,
        recommended_plan: target.recommendedPlan,
        next_limit: target.nextLimit,
        next_plan_price_id: target.nextPlanPriceId,
        next_paddle_price_id: target.nextPaddlePriceId,
        message: "Continue to checkout to unlock additional businesses",
      });
    }

    const upstream = await requestPlanChange(admin, {
      subscriptionId: target.subscriptionId,
      nextPlanPriceId: target.nextPlanPriceId,
      requestedBy: user.id,
    });

    return NextResponse.json({
      ok: true,
      mode: "change_plan_requested",
      account_id: target.accountId,
      recommended_plan: target.recommendedPlan,
      next_limit: target.nextLimit,
      next_plan_price_id: target.nextPlanPriceId,
      next_paddle_price_id: target.nextPaddlePriceId,
      message: "Upgrade requested. Access updates after billing confirms the plan change.",
      upstream,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Failed to start upgrade",
      },
      { status: 500 },
    );
  }
}
