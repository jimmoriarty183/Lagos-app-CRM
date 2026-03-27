import { NextResponse } from "next/server";
import { submitSurvey } from "@/lib/campaigns/service";
import { getRequiredUserId, getUserCampaignReadClient } from "@/lib/campaigns/server";
import { surveySubmitSchema } from "@/lib/campaigns/validation";
import { supabaseAdmin } from "@/lib/supabase/admin";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object") {
    const message = String((error as { message?: unknown }).message ?? "").trim();
    const code = String((error as { code?: unknown }).code ?? "").trim();
    const details = String((error as { details?: unknown }).details ?? "").trim();
    const hint = String((error as { hint?: unknown }).hint ?? "").trim();
    const pieces = [message, code ? `(code: ${code})` : "", details, hint].filter(Boolean);
    if (pieces.length > 0) return pieces.join(" ");
  }
  return fallback;
}

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

    const client = supabaseAdmin();
    const authClient = await getUserCampaignReadClient();
    const { data, error } = await authClient.auth.getUser();
    let userId = data.user?.id ?? null;
    if (error || !userId) {
      userId = await getRequiredUserId().catch(() => null);
    }
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }
    await submitSurvey(client, userId, parsed.data.campaignId, parsed.data.answers);

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: getErrorMessage(error, "Failed to submit survey") },
      { status: 500 },
    );
  }
}
