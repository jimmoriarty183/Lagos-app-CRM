import { NextResponse } from "next/server";
import { markCampaignRead } from "@/lib/campaigns/service";
import { getRequiredUserId } from "@/lib/campaigns/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

async function markNotificationsReadForCampaign(
  admin: ReturnType<typeof supabaseAdmin>,
  userId: string,
  campaignId: string,
  notificationId?: string,
) {
  const readAt = new Date().toISOString();
  const payloads = [
    { is_read: true, read: true, read_at: readAt },
    { is_read: true, read_at: readAt },
    { read: true, read_at: readAt },
    { read_at: readAt },
  ];
  const recipientColumns = ["recipient_user_id", "recipient_id", "user_id"];

  const shouldSkipRecipientColumnError = (error: unknown) =>
    isMissingColumnError(error, "recipient_user_id") ||
    isMissingColumnError(error, "recipient_id") ||
    isMissingColumnError(error, "user_id");

  const shouldSkipReadColumnError = (error: unknown) =>
    isMissingColumnError(error, "is_read") ||
    isMissingColumnError(error, "read") ||
    isMissingColumnError(error, "read_at");

  if (notificationId) {
    for (const payload of payloads) {
      for (const recipientColumn of recipientColumns) {
        const result = await admin
          .from("notifications")
          .update(payload)
          .eq("id", notificationId)
          .eq(recipientColumn, userId);
        if (!result.error) break;
        if (shouldSkipRecipientColumnError(result.error) || shouldSkipReadColumnError(result.error)) {
          continue;
        }
        return;
      }
    }
  }

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
        shouldSkipRecipientColumnError(result.error) ||
        shouldSkipReadColumnError(result.error) ||
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
    const body = await request.json();
    const campaignId = String(body?.campaignId ?? "").trim();
    const notificationId = String(body?.notificationId ?? "").trim();
    if (!campaignId) {
      return NextResponse.json({ ok: false, error: "campaignId is required" }, { status: 400 });
    }

    const client = supabaseAdmin();
    const userId = await getRequiredUserId();
    await markCampaignRead(client, userId, campaignId);
    await markNotificationsReadForCampaign(client, userId, campaignId, notificationId || undefined);

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to mark as read" },
      { status: 500 },
    );
  }
}
