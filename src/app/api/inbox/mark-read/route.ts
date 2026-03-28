import { NextResponse } from "next/server";

 codex/fix-campaign-read-state-persistence-6y37v0
import { markAllCampaignsRead, markCampaignRead } from "@/lib/campaigns/service";
=======
import { markCampaignRead } from "@/lib/campaigns/service";
 staging
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

function isMissingRelationError(error: unknown, relation: string) {
  const message = String((error as { message?: string } | null)?.message ?? "").toLowerCase();
  return (
    message.includes(`could not find the table 'public.${relation.toLowerCase()}'`) &&
    message.includes("schema cache")
  );
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

async function updateNotificationsForUser(
  admin: ReturnType<typeof supabaseAdmin>,
  userId: string,
  notificationId?: string,
) {
  const readAt = new Date().toISOString();
  const payloads = [
    { is_read: true, read: true, read_at: readAt },
    { is_read: true, read_at: readAt },
    { read: true, read_at: readAt },
    { read_at: readAt },
  ];

  const recipientColumns = ["recipient_id", "recipient_user_id", "user_id"];

  for (const payload of payloads) {
    for (const recipientColumn of recipientColumns) {
      let query = admin.from("notifications").update(payload);
      if (notificationId) {
        query = query.eq("id", notificationId);
      }
      const result = await query.eq(recipientColumn, userId);

      if (!result.error) return null;
      if (
        isMissingColumnError(result.error, recipientColumn) ||
        isMissingColumnError(result.error, "is_read") ||
        isMissingColumnError(result.error, "read") ||
        isMissingColumnError(result.error, "read_at")
      ) {
        continue;
      }
      return result.error;
    }
  }

  if (!notificationId) return null;

  for (const payload of payloads) {
    const fallback = await admin
      .from("notifications")
      .update(payload)
      .eq("id", notificationId);

    if (!fallback.error) return null;
    if (
      isMissingColumnError(fallback.error, "is_read") ||
      isMissingColumnError(fallback.error, "read") ||
      isMissingColumnError(fallback.error, "read_at")
    ) {
      continue;
    }
    return fallback.error;
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const supabase = await supabaseServer();
    const admin = supabaseAdmin();

    const { data: authData, error: authError } = await supabase.auth.getUser();
    const user = authData?.user;

    if (authError || !user?.id) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const userId = user.id;
    const body = await request.json();
    const { notificationId, markAll } = body as {
      notificationId?: string;
      markAll?: boolean;
    };

    if (markAll) {
      const updateError = await updateNotificationsForUser(admin, userId);

      if (updateError) {
        if (isMissingRelationError(updateError, "notifications")) {
          // Keep going: campaign inbox items are stored in campaign states.
        } else {
          return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
        }
      }

      await markAllCampaignsRead(supabase, userId);

      return NextResponse.json({ ok: true });
    }

    if (!notificationId) {
      return NextResponse.json(
        { ok: false, error: "notificationId or markAll required" },
        { status: 400 },
      );
    }

    if (notificationId.startsWith("invite:")) {
      return NextResponse.json({ ok: true });
    }

    if (notificationId.startsWith("campaign:")) {
      const campaignId = notificationId.slice("campaign:".length).trim();
      if (!campaignId) {
        return NextResponse.json({ ok: false, error: "campaignId is required" }, { status: 400 });
      }

 codex/fix-campaign-read-state-persistence-6y37v0
      await markCampaignRead(supabase, userId, campaignId);

      const parsedCampaignId = Number.parseInt(campaignId, 10);
      if (!Number.isFinite(parsedCampaignId)) {
        return NextResponse.json({ ok: false, error: "campaignId must be numeric" }, { status: 400 });
      }

      await markCampaignRead(supabase, userId, String(parsedCampaignId));
 staging

      return NextResponse.json({ ok: true });
    }

    const updateError = await updateNotificationsForUser(
      admin,
      userId,
      notificationId,
    );

    if (updateError) {
      if (isMissingRelationError(updateError, "notifications")) {
        return NextResponse.json({ ok: true });
      }
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
