"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { Bell, BellRing, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import type {
  InboxNotification,
  NotificationType,
} from "@/app/api/topbar/inbox/route";

type Props = {
  businessId?: string;
  currentBusinessSlug: string;
};

function formatNotificationTime(value: string) {
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getNotificationIcon(type: NotificationType | string) {
  switch (type) {
    case "mention":
    case "mention_received":
      return "@";
    case "order_assigned":
    case "order_reassigned":
      return "→";
    case "important_comment_received":
      return "💬";
    case "support_request_updated":
      return "🛠";
    case "invitation_received":
      return "✉️";
    case "campaign_announcement":
      return "📢";
    case "campaign_survey":
      return "🗳";
    default:
      return "•";
  }
}

export default function InviteInbox({
  businessId,
  currentBusinessSlug,
}: Props) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState("");
  const [isPending, startTransition] = useTransition();

  const unreadCount = useMemo(
    () => items.filter((item) => !item.is_read).length,
    [items],
  );

  const { newNotifications, earlierNotifications } = useMemo(() => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const newItems: InboxNotification[] = [];
    const earlierItems: InboxNotification[] = [];

    for (const item of items) {
      const createdAt = new Date(item.created_at);
      if (createdAt >= twentyFourHoursAgo) {
        newItems.push(item);
      } else {
        earlierItems.push(item);
      }
    }

    return {
      newNotifications: newItems,
      earlierNotifications: earlierItems,
    };
  }, [items]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (businessId) params.set("businessId", businessId);

      const res = await fetch(`/api/topbar/inbox?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to load inbox");
      }

      setItems(Array.isArray(json.notifications) ? json.notifications : []);
    } catch (error: unknown) {
      setItems([]);
      setError(error instanceof Error ? error.message : "Failed to load inbox");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      setItems([]);
      return;
    }
    load();
  }, [businessId, load]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const resolveCampaignId = useCallback((notification: InboxNotification) => {
    const fromNotificationId = notification.id.startsWith("campaign:")
      ? notification.id.slice("campaign:".length).trim()
      : "";
    if (fromNotificationId) return fromNotificationId;

    const fromMetadata = String(
      notification.metadata?.campaign_id ?? notification.entity_id ?? "",
    ).trim();
    return fromMetadata;
  }, []);

  const markAsRead = useCallback(async (notification: InboxNotification) => {
    const notificationId = String(notification.id ?? "").trim();
    if (!notificationId || notificationId.startsWith("invite:")) return;

    const isCampaignItem =
      notification.type === "campaign_announcement" ||
      notification.type === "campaign_survey" ||
      notification.entity_type === "campaign" ||
      notificationId.startsWith("campaign:");

    setItems((current) =>
      current.map((item) =>
        item.id === notificationId ? { ...item, is_read: true } : item,
      ),
    );
    setActiveId(notificationId);
    try {
      if (isCampaignItem) {
        const campaignId = resolveCampaignId(notification);
        const [notificationRes, campaignRes] = await Promise.all([
          fetch("/api/inbox/mark-read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            keepalive: true,
            body: JSON.stringify({ notificationId }),
          }),
          campaignId
            ? fetch("/api/campaigns/read", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                keepalive: true,
                body: JSON.stringify({ campaignId }),
              })
            : Promise.resolve(new Response(null, { status: 204 })),
        ]);
        const notificationJson = await notificationRes.json().catch(() => ({}));
        const campaignJson = await campaignRes.json().catch(() => ({}));
        const notificationOk = notificationRes.ok && (notificationJson?.ok ?? true);
        const campaignOk = campaignRes.ok && (campaignJson?.ok ?? true);
        if (!notificationOk && !campaignOk) {
          throw new Error("Failed to mark campaign notification as read");
        }
      } else {
        const res = await fetch("/api/inbox/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({ notificationId }),
        });
        const json = await res.json().catch(() => ({}));

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Failed to mark as read");
        }
      }

      setItems((current) =>
        current.map((item) =>
          item.id === notificationId ? { ...item, is_read: true } : item,
        ),
      );
    } catch {
      setItems((current) =>
        current.map((item) =>
          item.id === notificationId ? { ...item, is_read: false } : item,
        ),
      );
    } finally {
      setActiveId("");
    }
  }, [resolveCampaignId]);

  const markAllAsRead = useCallback(async () => {
    const unreadCampaignIds = items
      .filter((item) => !item.is_read)
      .map((item) => resolveCampaignId(item))
      .filter((campaignId) => campaignId.length > 0);
    const unreadRegularIds = items
      .filter((item) => !item.is_read)
      .map((item) => String(item.id ?? "").trim())
      .filter((id) => id.length > 0 && !id.startsWith("campaign:") && !id.startsWith("invite:"));

    setItems((current) => current.map((item) => ({ ...item, is_read: true })));

    try {
      const campaignResults = await Promise.allSettled(
        unreadCampaignIds.map((campaignId) =>
          fetch("/api/campaigns/read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ campaignId }),
          }),
        ),
      );

      const hasCampaignFailure = campaignResults.some(
        (result) => result.status === "rejected" || !result.value.ok,
      );

      let hasRegularFailure = false;
      if (unreadRegularIds.length > 0) {
        const res = await fetch("/api/inbox/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markAll: true }),
        });
        const json = await res.json().catch(() => ({}));
        hasRegularFailure = !res.ok || !json?.ok;
      }

      if (hasCampaignFailure || hasRegularFailure) {
        throw new Error("Failed to mark all as read");
      }
    } catch {
      void load();
    }
  }, [items, load, resolveCampaignId]);

  const handleNotificationClick = useCallback(
    (notification: InboxNotification) => {
      const isCampaignItem =
        notification.type === "campaign_announcement" || notification.type === "campaign_survey";

      // Mark as read for all actionable items (campaign + regular notifications).
      if (!notification.is_read && notification.type !== "invitation_received") {
        void markAsRead(notification);
      }

      // Navigate based on notification type
      startTransition(() => {
        setOpen(false);
        const supportRequestId = String(
          notification.metadata?.support_request_id ?? notification.entity_id ?? "",
        ).trim();
        const campaignId = String(
          notification.metadata?.campaign_id ?? notification.entity_id ?? "",
        ).trim();
        if (isCampaignItem && campaignId) {
          void fetch("/api/campaigns/read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            keepalive: true,
            body: JSON.stringify({ campaignId }),
          });
          void fetch("/api/campaigns/click", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            keepalive: true,
            body: JSON.stringify({ campaignId, channel: "bell" }),
          });
          void fetch("/api/campaigns/open", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            keepalive: true,
            body: JSON.stringify({ campaignId, channel: "bell" }),
          });
          router.push(`/b/${currentBusinessSlug}?campaign=${encodeURIComponent(campaignId)}`);
        } else if (notification.entity_type === "support_request" && supportRequestId) {
          router.push(`/b/${currentBusinessSlug}/support/${encodeURIComponent(supportRequestId)}`);
        } else if (notification.order_id) {
          router.push(
            `/b/${currentBusinessSlug}?focusOrder=${encodeURIComponent(notification.order_id)}`,
          );
        } else if (notification.type === "invitation_received") {
          // For invitations, we could open a modal or navigate to invites page
          router.refresh();
        }
      });
    },
    [currentBusinessSlug, markAsRead, router],
  );

  const title = useMemo(() => {
    if (unreadCount === 0) return "Inbox is clear";
    if (unreadCount === 1) return "1 unread notification";
    return `${unreadCount} unread notifications`;
  }, [unreadCount]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) void load();
        }}
        aria-label="Inbox"
        title={title}
        className={`relative flex h-9 w-9 items-center justify-center rounded-xl border bg-white/90 shadow-sm transition ${
          open
            ? "border-blue-300 bg-blue-50/80"
            : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-[#FCFCFD]"
        }`}
      >
        {open || unreadCount > 0 ? (
          <BellRing className="h-4 w-4 text-[#6366F1] transition" />
        ) : (
          <Bell className="h-4 w-4 text-slate-700 transition" />
        )}
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-[#6366F1] px-1.5 py-0.5 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close inbox"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40"
          />

          <div className="fixed left-4 right-4 top-[calc(env(safe-area-inset-top)+5rem)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+0.5rem)] sm:mt-0 sm:w-[400px] sm:max-w-[calc(100vw-1.5rem)]">
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Inbox
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {unreadCount > 0
                      ? `${unreadCount} unread`
                      : items.length === 0
                        ? "No notifications"
                        : "All caught up"}
                  </div>
                </div>
                {items.length > 0 ? (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    disabled={isPending || unreadCount === 0}
                    className="inline-flex h-8 items-center rounded-lg border border-[#C7D2FE] bg-[#EEF2FF] px-3 text-[11px] font-semibold text-[#3645A0] transition hover:border-[#A5B4FC] hover:bg-[#E0E7FF] hover:text-[#2F3EA8] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Mark all as read
                  </button>
                ) : null}
              </div>
            </div>

            {error ? (
              <div className="mx-3 mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            ) : null}

            <div className="max-h-[400px] overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center px-4 py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  <span className="ml-2 text-sm text-slate-500">
                    Loading...
                  </span>
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-12">
                  <Bell className="h-8 w-8 text-slate-300" />
                  <div className="mt-3 text-sm font-medium text-slate-900">
                    Inbox is clear
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    No notifications at the moment
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {newNotifications.length > 0 ? (
                    <div>
                      <div className="bg-slate-50/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                        New
                      </div>
                      {newNotifications.map((notification, index) => (
                        <NotificationItem
                          key={`${notification.id || "notification"}-${index}`}
                          notification={notification}
                          activeId={activeId}
                          onClick={handleNotificationClick}
                          onMarkRead={(notificationId) => {
                            const target = items.find((item) => item.id === notificationId);
                            if (!target) return;
                            void markAsRead(target);
                          }}
                        />
                      ))}
                    </div>
                  ) : null}

                  {earlierNotifications.length > 0 ? (
                    <div>
                      <div className="bg-slate-50/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                        Earlier
                      </div>
                      {earlierNotifications.map((notification, index) => (
                        <NotificationItem
                          key={`${notification.id || "notification"}-${index}`}
                          notification={notification}
                          activeId={activeId}
                          onClick={handleNotificationClick}
                          onMarkRead={(notificationId) => {
                            const target = items.find((item) => item.id === notificationId);
                            if (!target) return;
                            void markAsRead(target);
                          }}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

type NotificationItemProps = {
  notification: InboxNotification;
  activeId: string;
  onClick: (notification: InboxNotification) => void;
  onMarkRead: (notificationId: string) => void;
};

function NotificationItem({
  notification,
  activeId,
  onClick,
  onMarkRead,
}: NotificationItemProps) {
  const isBusy = activeId === notification.id;
  const isUnread = !notification.is_read;

  return (
    <div
      className={`group flex w-full items-start gap-3 px-4 py-3 text-left transition ${
        isUnread
          ? "bg-blue-50/30 hover:bg-blue-50/60"
          : "bg-white hover:bg-slate-50"
      }`}
    >
      <button
        type="button"
        onClick={() => onClick(notification)}
        disabled={isBusy}
        className="flex min-w-0 flex-1 items-start gap-3 text-left disabled:cursor-not-allowed"
      >
        {/* Icon */}
        <div
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
            isUnread ? "bg-[#6366F1] text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          {getNotificationIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div
            className={`text-[13px] leading-snug ${
              isUnread
                ? "font-semibold text-slate-900"
                : "font-normal text-slate-700"
            }`}
          >
            {notification.title}
          </div>
          {notification.preview ? (
            <div className="mt-0.5 truncate text-[12px] text-slate-500">
              {notification.preview}
            </div>
          ) : null}
          <div className="mt-1.5 text-[11px] font-semibold text-[#4f46e5]">
            {notification.type === "campaign_survey" ? "Open survey" : "Open notification"}
          </div>
          {notification.entity_type === "campaign" ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                {notification.metadata?.delivery_mode === "both"
                  ? "Bell + Popup"
                  : notification.metadata?.delivery_mode === "popup_only"
                    ? "Popup"
                    : "Bell"}
              </span>
              <span
                className={[
                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                  isUnread ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-100 text-slate-600",
                ].join(" ")}
              >
                {isUnread ? "Unread" : "Read"}
              </span>
              {notification.type === "campaign_survey" &&
              (notification.metadata?.survey_state === "voted" || notification.preview === "Voted") ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Voted
                </span>
              ) : null}
            </div>
          ) : null}
          <div className="mt-1 text-[11px] text-slate-400">
            {formatNotificationTime(notification.created_at)}
          </div>
        </div>
      </button>

      {/* Unread indicator */}
      {isUnread ? (
        <div className="mt-1 flex shrink-0 flex-col items-end gap-2">
          <div className="h-2 w-2 rounded-full bg-[#6366F1]" />
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onMarkRead(notification.id);
            }}
            className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
          >
            Mark read
          </button>
        </div>
      ) : null}
    </div>
  );
}
