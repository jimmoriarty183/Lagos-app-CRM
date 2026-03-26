import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/campaigns/admin-auth";
import { getAdminCampaignClient } from "@/lib/campaigns/server";
import { createSurveyQuestion } from "@/lib/campaigns/service";
import { surveyQuestionPayloadSchema } from "@/lib/campaigns/validation";

export async function POST(request: Request, context: { params: Promise<{ campaignId: string }> }) {
  try {
    await requireApiAdmin();
    const { campaignId } = await context.params;
    const body = await request.json();
    const parsed = surveyQuestionPayloadSchema.safeParse({ ...body, campaignId });

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 },
      );
    }

    const client = getAdminCampaignClient();
    const question = await createSurveyQuestion(client, parsed.data);
    return NextResponse.json({ ok: true, question });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create survey question";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

