import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveBusinessLimitStatus } from "@/lib/businesses/business-upgrade-service";

export async function GET() {
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
    return NextResponse.json({
      ok: true,
      can_create: !status.upgradeRequired,
      current_usage: status.currentUsage,
      limit: status.limit,
      upgrade_required: status.upgradeRequired,
      recommended_plan: status.recommendedPlan,
      next_limit: status.nextLimit,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Failed to resolve limit status",
      },
      { status: 500 },
    );
  }
}
