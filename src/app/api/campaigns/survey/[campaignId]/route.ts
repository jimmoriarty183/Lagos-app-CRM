import { NextResponse } from "next/server";
import { getSurveyAnswersForUser, getSurveyByCampaignId } from "@/lib/campaigns/service";
import { getRequiredUserId, getUserCampaignReadClient } from "@/lib/campaigns/server";

export async function GET(_request: Request, context: { params: Promise<{ campaignId: string }> }) {
  try {
    const { campaignId } = await context.params;
    if (!campaignId) {
      return NextResponse.json({ ok: false, error: "campaignId is required" }, { status: 400 });
    }

    const client = await getUserCampaignReadClient();
    const userId = await getRequiredUserId();
    const survey = await getSurveyByCampaignId(client, campaignId);
    if (!survey) {
      return NextResponse.json({ ok: false, error: "Survey not found" }, { status: 404 });
    }
    const myAnswers = await getSurveyAnswersForUser(client, userId, campaignId);

    return NextResponse.json({ ok: true, survey, myAnswers });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load survey" },
      { status: 500 },
    );
  }
}
