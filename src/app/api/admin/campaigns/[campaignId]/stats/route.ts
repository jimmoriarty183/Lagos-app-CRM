import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/campaigns/admin-auth";
import { getAdminCampaignClient } from "@/lib/campaigns/server";
import { getSurveyStats } from "@/lib/campaigns/service";

export async function GET(_request: Request, context: { params: Promise<{ campaignId: string }> }) {
  try {
    await requireApiAdmin();
    const { campaignId } = await context.params;
    const client = getAdminCampaignClient();
    const stats = await getSurveyStats(client, campaignId);
    if (!stats) {
      return NextResponse.json({ ok: false, error: "Survey stats not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, stats });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load survey stats";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

