import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/campaigns/admin-auth";
import { getAdminCampaignClient } from "@/lib/campaigns/server";
import { deleteSurveyQuestion, updateSurveyQuestion } from "@/lib/campaigns/service";
import type { SurveyQuestionType } from "@/lib/campaigns/types";

function normalizeQuestionType(value: unknown): SurveyQuestionType | null {
  const normalized = String(value ?? "").trim();
  if (
    normalized === "single_choice" ||
    normalized === "multiple_choice" ||
    normalized === "yes_no" ||
    normalized === "rating_1_5"
  ) {
    return normalized;
  }
  return null;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ campaignId: string; questionId: string }> },
) {
  try {
    await requireApiAdmin();
    const { questionId } = await context.params;
    const body = (await request.json()) as { title?: string; questionType?: string };
    const title = String(body?.title ?? "").trim();
    const questionType = normalizeQuestionType(body?.questionType);
    if (!title || !questionType) {
      return NextResponse.json({ ok: false, error: "title and valid questionType are required" }, { status: 400 });
    }
    const client = getAdminCampaignClient();
    const question = await updateSurveyQuestion(client, { questionId, title, questionType });
    return NextResponse.json({ ok: true, question });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update survey question";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ campaignId: string; questionId: string }> },
) {
  try {
    await requireApiAdmin();
    const { questionId } = await context.params;
    const client = getAdminCampaignClient();
    await deleteSurveyQuestion(client, questionId);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete survey question";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

