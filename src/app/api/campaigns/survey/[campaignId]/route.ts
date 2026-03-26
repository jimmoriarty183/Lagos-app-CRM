import { NextResponse } from "next/server";
import { getSurveyByCampaignId } from "@/lib/campaigns/service";
import { getRequiredUserId, getUserCampaignReadClient } from "@/lib/campaigns/server";

export async function GET(_request: Request, context: { params: Promise<{ campaignId: string }> }) {
  try {
    const { campaignId } = await context.params;
    if (!campaignId) {
      return NextResponse.json({ ok: false, error: "campaignId is required" }, { status: 400 });
    }

    const client = await getUserCampaignReadClient();
    await getRequiredUserId();
    const survey = await getSurveyByCampaignId(client, campaignId);
    if (!survey) {
      return NextResponse.json({ ok: false, error: "Survey not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, survey });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load survey" },
      { status: 500 },
    );
  }
}

