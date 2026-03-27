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

function isMissingColumnError(error: unknown, column: string) {
  const message = String((error as { message?: string } | null)?.message ?? "").toLowerCase();
  return (
    message.includes(`column notifications.${column.toLowerCase()} does not exist`) ||
    (
      message.includes(`could not find the '${column.toLowerCase()}' column`) &&
      message.includes("schema cache")
    )
  );
}

async function markCampaignNotificationsRead(
  admin: ReturnType<typeof supabaseAdmin>,
  userId: string,
  campaignId: string,
) {
  const readAt = new Date().toISOString();
  const payloads = [
    { is_read: true, read: true, read_at: readAt },
    { is_read: true, read_at: readAt },
    { read: true, read_at: readAt },
    { isRead: true, readAt: readAt },
    { isRead: true },
    { read_at: readAt },
  ];
  const recipientColumns = ["recipient_user_id", "recipient_id", "user_id", "recipientUserId", "userId"];

  for (const payload of payloads) {
    for (const recipientColumn of recipientColumns) {
      const result = await admin
        .from("notifications")
        .update(payload)
        .eq(recipientColumn, userId)
        .eq("entity_type", "campaign")
        .eq("entity_id", campaignId);

      if (!result.error) return;
      if (
        isMissingColumnError(result.error, recipientColumn) ||
        isMissingColumnError(result.error, "is_read") ||
        isMissingColumnError(result.error, "read") ||
        isMissingColumnError(result.error, "read_at") ||
        isMissingColumnError(result.error, "isRead") ||
        isMissingColumnError(result.error, "readAt") ||
        isMissingColumnError(result.error, "entity_type") ||
        isMissingColumnError(result.error, "entity_id")
      ) {
        continue;
      }
      return;
    }
  }
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
    await markCampaignNotificationsRead(client, userId, parsed.data.campaignId);

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: getErrorMessage(error, "Failed to submit survey") },
      { status: 500 },
    );
  }
}
