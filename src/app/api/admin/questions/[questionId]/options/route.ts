import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/campaigns/admin-auth";
import { getAdminCampaignClient } from "@/lib/campaigns/server";
import { createSurveyOption } from "@/lib/campaigns/service";
import { surveyOptionPayloadSchema } from "@/lib/campaigns/validation";

export async function POST(request: Request, context: { params: Promise<{ questionId: string }> }) {
  try {
    await requireApiAdmin();
    const { questionId } = await context.params;
    const body = await request.json();
    const parsed = surveyOptionPayloadSchema.safeParse({ ...body, questionId });
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 },
      );
    }

    const client = getAdminCampaignClient();
    const option = await createSurveyOption(client, parsed.data);
    return NextResponse.json({ ok: true, option });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create survey option";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

