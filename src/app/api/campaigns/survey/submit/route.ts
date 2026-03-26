import { NextResponse } from "next/server";
import { submitSurvey } from "@/lib/campaigns/service";
import { getRequiredUserId, getUserCampaignClient } from "@/lib/campaigns/server";
import { surveySubmitSchema } from "@/lib/campaigns/validation";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = surveySubmitSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 },
      );
    }

    const client = await getUserCampaignClient();
    const userId = await getRequiredUserId();
    await submitSurvey(client, userId, parsed.data.campaignId, parsed.data.answers);

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to submit survey" },
      { status: 500 },
    );
  }
}

