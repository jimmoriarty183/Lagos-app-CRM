import { NextResponse } from "next/server";

import { getBellItems } from "@/lib/campaigns/service";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export type NotificationType =
  | "mention"
  | "mention_received"
  | "order_assigned"
  | "order_reassigned"
  | "important_comment_received"
  | "support_request_updated"
  | "invitation_received"
  | "campaign_announcement"
  | "campaign_survey";

export type NotificationRow = {
  id: string;
  recipient_user_id: string | null;
  actor_user_id: string | null;
  type: string;
  entity_type: string;
  entity_id: string;
  order_id: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

type RawNotificationRow = Record<string, unknown>;

export type InboxNotification = {
  id: string;
  type: string;
  entity_type: string;
  entity_id: string;
  order_id: string | null;
  order_number: string | null;
  title: string;
  preview: string | null;
  actor_label: string | null;
  is_read: boolean;
  created_at: string;
  metadata: Record<string, unknown>;
};

function isMissingRelationError(error: unknown, relation: string) {
  const message = String((error as { message?: string } | null)?.message ?? "").toLowerCase();
  return (
    message.includes(`could not find the table 'public.${relation.toLowerCase()}'`) &&
    message.includes("schema cache")
  );
}

function getStringField(record: RawNotificationRow, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function getBooleanField(record: RawNotificationRow, keys: string[], fallback = false) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
  }
  return fallback;
}

function getObjectField(record: RawNotificationRow, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }
  return {};
}

function normalizeNotificationRow(record: RawNotificationRow): NotificationRow | null {
  const id = getStringField(record, ["id"]);
  if (!id) return null;
  const metadata = getObjectField(record, ["metadata", "payload", "data"]);
  const metadataOrderId =
    typeof metadata.order_id === "string" && metadata.order_id.trim()
      ? metadata.order_id.trim()
      : null;
  const readAt = getStringField(record, ["read_at"]);

  return {
    id,
    recipient_user_id: getStringField(record, ["recipient_user_id", "recipient_id", "user_id"]),
    actor_user_id: getStringField(record, ["actor_user_id", "actor_id", "created_by"]),
    type: getStringField(record, ["type", "notification_type"]) ?? "notification",
    entity_type: getStringField(record, ["entity_type", "entity"]) ?? "unknown",
    entity_id: getStringField(record, ["entity_id"]) ?? id,
    order_id: getStringField(record, ["order_id"]) ?? metadataOrderId,
    metadata,
    is_read: getBooleanField(record, ["is_read", "read"], Boolean(readAt)),
    read_at: readAt,
    created_at:
      getStringField(record, ["created_at", "inserted_at", "ts"]) ??
      new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = String(searchParams.get("businessId") ?? "").trim();

    if (!businessId) {
      return NextResponse.json({ ok: false, error: "businessId required" }, { status: 400 });
    }

    const supabase = await supabaseServer();
    const admin = supabaseAdmin();

    const { data: authData, error: authError } = await supabase.auth.getUser();
    const user = authData?.user;

    if (authError || !user?.id || !user.email) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const userId = user.id;
    // Use admin client to avoid RLS/policy mismatches when reading persisted
    // campaign state (read_at, opened_at, etc.) for the current user.
    // This keeps topbar read status consistent with mark-read/campaign APIs
    // that also write using admin privileges.
    const campaignClient = supabaseAdmin();

    let notifications: NotificationRow[] = [];
    const notificationsCompatResult = await admin
      .from("notifications_compat")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    let notificationsRows = notificationsCompatResult.data as RawNotificationRow[] | null;
    if (notificationsCompatResult.error) {
      if (!isMissingRelationError(notificationsCompatResult.error, "notifications_compat")) {
        return NextResponse.json(
          { ok: false, error: notificationsCompatResult.error.message },
          { status: 500 },
        );
      }
      const notificationsResult = await admin
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (notificationsResult.error && !isMissingRelationError(notificationsResult.error, "notifications")) {
        return NextResponse.json(
          { ok: false, error: notificationsResult.error.message },
          { status: 500 },
        );
      }
      notificationsRows = (notificationsResult.data ?? []) as RawNotificationRow[];
    }

    notifications = (notificationsRows ?? [])
      .map(normalizeNotificationRow)
      .filter((row): row is NotificationRow => Boolean(row))
      .filter((row) => {
        if (!row.recipient_user_id) return false;
        return row.recipient_user_id === userId;
      });

    const { data: invites, error: invitesError } = await admin
      .from("business_invites")
      .select("id, business_id, role, created_at, invited_by")
      .eq("email", user.email)
      .eq("status", "PENDING")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (invitesError && !isMissingRelationError(invitesError, "business_invites")) {
      return NextResponse.json({ ok: false, error: invitesError.message }, { status: 500 });
    }

    // Build actor labels map
    const actorIds = Array.from(
      new Set(
        [
          ...notifications.map((n) => String(n.actor_user_id ?? "")),
          ...((invites ?? []) as Array<{ invited_by?: string | null }>).map((invite) =>
            String(invite.invited_by ?? ""),
          ),
        ]
          .filter(Boolean),
      ),
    );

    let actorLabelsById = new Map<string, string>();
    if (actorIds.length > 0) {
      const { data: actors } = await admin
        .from("profiles")
        .select("id,first_name,last_name,email")
        .in("id", actorIds);

      if (actors) {
        actorLabelsById = new Map(
          actors.map((actor) => [
            String(actor.id),
            [actor.first_name, actor.last_name]
              .filter(Boolean)
              .join(" ") || String(actor.email ?? ""),
          ]),
        );
      }
    }

    // Build order numbers map
    const orderIds = Array.from(
      new Set(
        notifications
          .map((n) => String(n.order_id ?? ""))
          .filter(Boolean),
      ),
    );

    let orderNumbersById = new Map<string, string>();
    let orderBusinessIdsById = new Map<string, string>();
    if (orderIds.length > 0) {
      const { data: orders } = await admin
        .from("orders")
        .select("id,order_number,business_id")
        .in("id", orderIds);

      if (orders) {
        orderNumbersById = new Map(
          orders.map((order) => [
            String(order.id),
            String(order.order_number ?? ""),
          ]),
        );
        orderBusinessIdsById = new Map(
          orders.map((order) => [
            String(order.id),
            String(order.business_id ?? ""),
          ]),
        );
      }
    }

    // Transform notifications into inbox items
    const inboxNotifications: InboxNotification[] = notifications
      .filter((notification) => {
        const metadata = (notification.metadata as Record<string, unknown>) ?? {};
        const metadataBusinessId = String(
          metadata.business_id ??
          metadata.workspace_id ??
          "",
        ).trim();
        const orderBusinessId = orderBusinessIdsById.get(String(notification.order_id ?? "")) ?? "";

        if (metadataBusinessId) return metadataBusinessId === businessId;
        if (orderBusinessId) return orderBusinessId === businessId;
        return true;
      })
      .map(
      (notification) => {
        const metadata = (notification.metadata as Record<string, unknown>) ?? {};
        const orderNumber =
          orderNumbersById.get(String(notification.order_id ?? "")) ||
          String(metadata.order_number ?? "");
        const actorLabel = actorLabelsById.get(String(notification.actor_user_id ?? "")) || null;

        let title = "";
        let preview: string | null = null;

        switch (notification.type) {
          case "mention":
          case "mention_received":
            title = `You were mentioned in Order #${orderNumber}`;
            preview = String(
              metadata.comment_body ??
              metadata.body_preview ??
              "",
            );
            break;
          case "order_assigned":
            title = `Order #${orderNumber} was assigned to you`;
            preview = actorLabel ? `Assigned by ${actorLabel}` : null;
            break;
          case "order_reassigned":
            title = `Order #${orderNumber} was reassigned to you`;
            preview = actorLabel ? `Reassigned by ${actorLabel}` : null;
            break;
          case "important_comment_received":
            title = `New comment on Order #${orderNumber}`;
            preview = String(metadata.comment_body ?? "");
            break;
          case "invitation_received":
            title = `You were invited to a workspace`;
            preview = String(metadata.role ?? "MANAGER");
            break;
          case "support_request_updated": {
            const supportRequestId = String(
              metadata.support_request_id ?? notification.entity_id ?? "",
            ).trim();
            const status = String(metadata.status ?? "").trim();
            title = supportRequestId
              ? `Support request #${supportRequestId} updated`
              : "Support request updated";
            preview = status
              ? `Status: ${status.replaceAll("_", " ")}`
              : String(metadata.customer_reply ?? "").trim() || null;
            break;
          }
          default:
            title =
              notification.entity_type === "order_comment"
                ? `New update on Order #${orderNumber || ""}`.trim()
                : `${notification.type} notification`;
        }

        return {
          id: String(notification.id),
          type: notification.type as NotificationType,
          entity_type: String(notification.entity_type),
          entity_id: String(notification.entity_id),
          order_id: notification.order_id ? String(notification.order_id) : null,
          order_number: orderNumber || null,
          title,
          preview: preview || null,
          actor_label: actorLabel,
          is_read: Boolean(notification.is_read),
          created_at: String(notification.created_at),
          metadata,
        };
      },
    );

    const inviteNotifications: InboxNotification[] = ((invites ?? []) as Array<{
      id: string;
      business_id: string | null;
      role: string | null;
      created_at: string | null;
      invited_by: string | null;
    }>).map((invite) => ({
      id: `invite:${String(invite.id)}`,
      type: "invitation_received",
      entity_type: "invitation",
      entity_id: String(invite.id),
      order_id: null,
      order_number: null,
      title: "You were invited to a workspace",
      preview: String(invite.role ?? "MANAGER"),
      actor_label: actorLabelsById.get(String(invite.invited_by ?? "")) ?? null,
      is_read: true,
      created_at: String(invite.created_at ?? new Date().toISOString()),
      metadata: {
        invite_id: invite.id,
        business_id: invite.business_id,
        role: invite.role,
        invited_by: invite.invited_by,
      },
    }));

    const mergedNotifications = [...inboxNotifications, ...inviteNotifications].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    let campaignItems = [] as Awaited<ReturnType<typeof getBellItems>>;
    try {
      campaignItems = await getBellItems(campaignClient, userId);
    } catch {
      campaignItems = [];
    }
    const campaignNotifications: InboxNotification[] = campaignItems
      .filter((item) => String(item.id ?? "").trim().length > 0)
      .map((item) => ({
        id: `campaign:${item.id}`,
        type: item.type === "survey" ? "campaign_survey" : "campaign_announcement",
        entity_type: "campaign",
        entity_id: item.id,
        order_id: null,
        order_number: null,
        title: item.title,
        preview:
          item.type === "survey" && (item.isCompleted || item.surveyStateLabel === "Voted")
            ? "Voted"
            : item.type === "survey" && item.isDismissed
              ? "Not answered"
              : item.body ?? null,
        actor_label: null,
        is_read: item.isRead,
        created_at: item.createdAt ?? new Date().toISOString(),
        metadata: {
          campaign_id: item.id,
          campaign_type: item.type,
          channels: item.channels,
          delivery_mode: item.deliveryMode,
          has_popup: item.channels.includes("popup_right"),
          has_bell: item.channels.includes("bell"),
          survey_state:
            item.type === "survey" && (item.isCompleted || item.surveyStateLabel === "Voted")
              ? "voted"
              : item.type === "survey" && item.isDismissed
                ? "not_answered"
                : null,
          source: "campaigns",
        },
      }));

    const mergedWithCampaigns = [...mergedNotifications, ...campaignNotifications].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    const dedupedById = Array.from(
      new Map(mergedWithCampaigns.map((item) => [item.id, item])).values(),
    );

    return NextResponse.json({
      ok: true,
      notifications: dedupedById,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
