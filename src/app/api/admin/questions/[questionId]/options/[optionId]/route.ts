import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/campaigns/admin-auth";
import { getAdminCampaignClient } from "@/lib/campaigns/server";
import { deleteSurveyOption, updateSurveyOption } from "@/lib/campaigns/service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ questionId: string; optionId: string }> },
) {
  try {
    await requireApiAdmin();
    const { optionId } = await context.params;
    const body = (await request.json()) as { label?: string; value?: string | null };
    const label = String(body?.label ?? "").trim();
    const value = body?.value == null ? null : String(body.value).trim();
    if (!label) {
      return NextResponse.json({ ok: false, error: "label is required" }, { status: 400 });
    }

    const client = getAdminCampaignClient();
    const option = await updateSurveyOption(client, { optionId, label, value });
    return NextResponse.json({ ok: true, option });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update survey option";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ questionId: string; optionId: string }> },
) {
  try {
    await requireApiAdmin();
    const { optionId } = await context.params;
    const client = getAdminCampaignClient();
    await deleteSurveyOption(client, optionId);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete survey option";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

