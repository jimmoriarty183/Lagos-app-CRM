"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { Bell, BellRing, Check, FileText, Loader2, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import type {
  InboxNotification,
  NotificationType,
} from "@/app/api/topbar/inbox/route";
import { cn } from "@/components/ui/utils";
import {
  getInboxBellIndicatorState,
  getInboxNotificationDisplayState,
  getInboxNotificationTypeDisplay,
} from "@/lib/inbox/display-state";

type Props = {
  businessId?: string;
  currentBusinessSlug: string;
};

const READ_INVITES_STORAGE_KEY = "topbar_read_invites_v1";

function isCampaignNotification(notification: InboxNotification) {
  return (
    notification.entity_type === "campaign" ||
    notification.id.startsWith("campaign:") ||
    notification.type === "campaign_announcement" ||
    notification.type === "campaign_survey"
  );
}

function getCampaignId(notification: InboxNotification) {
  const metadataCampaignId = String(
    notification.metadata?.campaign_id ?? "",
  ).trim();
  if (metadataCampaignId) return metadataCampaignId;

  const entityId = String(notification.entity_id ?? "").trim();
  if (entityId) return entityId;

  if (notification.id.startsWith("campaign:")) {
    return notification.id.slice("campaign:".length).trim();
  }

  return "";
}

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

const NOTIFICATION_ICONS = {
  mention: Bell,
  mention_received: Bell,
  order_assigned: Bell,
  order_reassigned: Bell,
  important_comment_received: Bell,
  support_request_updated: Bell,
  invitation_received: Bell,
  campaign_announcement: Bell,
  campaign_survey: FileText,
} as const satisfies Partial<Record<NotificationType, LucideIcon>>;

function NotificationIcon({
  type,
  emphasized,
}: {
  type: NotificationType | string;
  emphasized: boolean;
}) {
  const IconComponent =
    NOTIFICATION_ICONS[type as keyof typeof NOTIFICATION_ICONS] ?? Bell;
  const isSurveyIcon = type === "campaign_survey";

  return (
    <div
      className={cn(
        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors",
        isSurveyIcon
          ? emphasized
            ? "border-violet-200 bg-violet-50/70 text-slate-600 dark:text-white/70"
            : "border-violet-100 bg-violet-50/45 text-slate-500 dark:text-white/55 group-hover:text-slate-600"
          : emphasized
            ? "border-sky-200 bg-sky-50/70 text-slate-600 dark:text-white/70"
            : "border-sky-100 bg-sky-50/45 text-slate-500 dark:text-white/55 group-hover:text-slate-600",
      )}
      aria-hidden="true"
    >
      <IconComponent className="h-4 w-4" />
    </div>
  );
}

export default function InviteInbox({
  businessId,
  currentBusinessSlug,
}: Props) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement | null>(null);
  const bellOpenSyncKeyRef = useRef("");

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState("");
  const [inviteActionId, setInviteActionId] = useState("");
  const [readInviteIds, setReadInviteIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "survey" | "notification">(
    "all",
  );
  const [isPending, startTransition] = useTransition();

  const bellState = useMemo(() => getInboxBellIndicatorState(items), [items]);
  const unreadCount = bellState.unreadCount;
  const answeredUnseenCount = bellState.answeredUnseenCount;

  const { newNotifications, earlierNotifications } = useMemo(() => {
    const newItems: InboxNotification[] = [];
    const earlierItems: InboxNotification[] = [];

    for (const item of items) {
      const typeDisplay = getInboxNotificationTypeDisplay(item);
      if (
        (filter === "survey" && typeDisplay.kind !== "survey") ||
        (filter === "notification" && typeDisplay.kind !== "update")
      ) {
        continue;
      }
      const displayState = getInboxNotificationDisplayState(item);
      if (displayState.tone === "new") {
        newItems.push(item);
      } else {
        earlierItems.push(item);
      }
    }

    return {
      newNotifications: newItems,
      earlierNotifications: earlierItems,
    };
  }, [filter, items]);

  const visibleItemsCount =
    newNotifications.length + earlierNotifications.length;

  const markInviteReadLocal = useCallback((notification: InboxNotification) => {
    const inviteId = String(
      notification.metadata?.invite_id ?? notification.entity_id ?? "",
    ).trim();

    setItems((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, is_read: true } : item,
      ),
    );

    if (!inviteId) return;

    setReadInviteIds((current) => {
      if (current.has(inviteId)) return current;
      const next = new Set(current);
      next.add(inviteId);
      try {
        window.localStorage.setItem(
          READ_INVITES_STORAGE_KEY,
          JSON.stringify(Array.from(next)),
        );
      } catch {
        // ignore storage write errors
      }
      return next;
    });
  }, []);

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

      const notifications = Array.isArray(json.notifications)
        ? (json.notifications as InboxNotification[])
        : [];
      setItems(
        notifications.map((item) => {
          if (item.type !== "invitation_received") return item;
          const inviteId = String(
            item.metadata?.invite_id ?? item.entity_id ?? "",
          ).trim();
          if (!inviteId || !readInviteIds.has(inviteId)) return item;
          return { ...item, is_read: true };
        }),
      );
    } catch (error: unknown) {
      setItems([]);
      setError(error instanceof Error ? error.message : "Failed to load inbox");
    } finally {
      setLoading(false);
    }
  }, [businessId, readInviteIds]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(READ_INVITES_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const ids = parsed
        .map((value) => String(value ?? "").trim())
        .filter(Boolean);
      setReadInviteIds(new Set(ids));
    } catch {
      // ignore malformed storage
    }
  }, []);

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      setItems([]);
      return;
    }
    void load();
  }, [businessId, load]);

  useEffect(() => {
    const onCampaignStateChanged = () => {
      void load();
    };
    window.addEventListener("campaign:state-changed", onCampaignStateChanged);
    return () => {
      window.removeEventListener(
        "campaign:state-changed",
        onCampaignStateChanged,
      );
    };
  }, [load]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const markAsRead = useCallback(
    async (notification: InboxNotification) => {
      const notificationId = String(notification.id ?? "").trim();
      if (!notificationId || notificationId.startsWith("invite:")) return;

      const prevItems = items;
      const isCampaignItem = isCampaignNotification(notification);
      const campaignId = isCampaignItem ? getCampaignId(notification) : "";

      setItems((current) =>
        current.map((item) =>
          item.id === notificationId ? { ...item, is_read: true } : item,
        ),
      );
      setActiveId(notificationId);

      try {
        if (isCampaignItem && !campaignId) {
          throw new Error("campaignId is required");
        }

        const res = await fetch(
          isCampaignItem ? "/api/campaigns/read" : "/api/inbox/mark-read",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            keepalive: true,
            body: JSON.stringify(
              isCampaignItem ? { campaignId } : { notificationId },
            ),
          },
        );
        const json = await res.json().catch(() => ({}));

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Failed to mark as read");
        }

        setItems((current) =>
          current.map((item) =>
            item.id === notificationId ? { ...item, is_read: true } : item,
          ),
        );
        window.dispatchEvent(
          new CustomEvent("campaign:state-changed", {
            detail: { notificationId, action: "read" },
          }),
        );
        await load();
      } catch {
        setItems(prevItems);
        setError("Failed to mark as read");
      } finally {
        setActiveId("");
      }
    },
    [items, load],
  );

  const markAllAsRead = useCallback(async () => {
    try {
      const res = await fetch("/api/inbox/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to mark all as read");
      }

      setItems((current) =>
        current.map((item) =>
          item.type === "invitation_received" ? item : { ...item, is_read: true },
        ),
      );
      window.dispatchEvent(
        new CustomEvent("campaign:state-changed", {
          detail: { action: "mark_all_read" },
        }),
      );
    } catch {
      setError("Failed to mark all as read");
      void load();
    }
  }, [load]);

  useEffect(() => {
    if (!open) {
      bellOpenSyncKeyRef.current = "";
      return;
    }
    if (items.length === 0) return;
    const campaignIds = Array.from(
      new Set(
        items
          .filter((item) => isCampaignNotification(item))
          .map((item) => getCampaignId(item))
          .filter(Boolean),
      ),
    );
    if (campaignIds.length === 0) return;
    const syncKey = campaignIds.slice().sort().join("|");
    if (bellOpenSyncKeyRef.current === syncKey) return;
    bellOpenSyncKeyRef.current = syncKey;

    void Promise.allSettled(
      campaignIds.map((campaignId) =>
        fetch("/api/campaigns/open", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({ campaignId, channel: "bell" }),
        }),
      ),
    );
  }, [items, open]);

  const handleNotificationClick = useCallback(
    async (notification: InboxNotification) => {
      const isCampaignItem = isCampaignNotification(notification);
      const campaignId = isCampaignItem ? getCampaignId(notification) : "";
      const isInvite = notification.type === "invitation_received";

      if (
        !notification.is_read &&
        notification.type !== "invitation_received"
      ) {
        await markAsRead(notification);
      }
      if (!notification.is_read && isInvite) {
        markInviteReadLocal(notification);
        return;
      }

      startTransition(() => {
        setOpen(false);
        const supportRequestId = String(
          notification.metadata?.support_request_id ??
            notification.entity_id ??
            "",
        ).trim();

        if (isCampaignItem && campaignId) {
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
          router.push(
            `/b/${currentBusinessSlug}?campaign=${encodeURIComponent(campaignId)}`,
          );
        } else if (
          notification.entity_type === "support_request" &&
          supportRequestId
        ) {
          router.push(
            `/b/${currentBusinessSlug}/support/${encodeURIComponent(
              supportRequestId,
            )}`,
          );
        } else if (notification.order_id) {
          router.push(
            `/b/${currentBusinessSlug}?focusOrder=${encodeURIComponent(
              notification.order_id,
            )}`,
          );
        }
      });
    },
    [currentBusinessSlug, markAsRead, markInviteReadLocal, router],
  );

  const runInviteAction = useCallback(
    async (notification: InboxNotification, url: string) => {
      const inviteId = String(
        notification.metadata?.invite_id ?? notification.entity_id ?? "",
      ).trim();
      if (!inviteId) return;

      setInviteActionId(notification.id);
      setError("");

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteId }),
        });
        const json = await res.json().catch(() => ({}));

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Invite action failed");
        }

        setItems((current) => current.filter((item) => item.id !== notification.id));
        markInviteReadLocal(notification);

        if (url.endsWith("/accept")) {
          const businessSlug = String(
            json?.businessSlug ??
              notification.metadata?.business_slug ??
              "",
          ).trim();
          if (businessSlug) {
            startTransition(() => {
              if (businessSlug === currentBusinessSlug) {
                router.refresh();
                return;
              }
              router.push(`/b/${encodeURIComponent(businessSlug)}`);
              router.refresh();
            });
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Invite action failed");
      } finally {
        setInviteActionId("");
      }
    },
    [currentBusinessSlug, markInviteReadLocal, router, startTransition],
  );

  const title = useMemo(() => {
    if (unreadCount === 0 && answeredUnseenCount === 0) return "Inbox is clear";
    if (answeredUnseenCount > 0 && unreadCount === 0) {
      return `${answeredUnseenCount} answered survey updates`;
    }
    if (unreadCount === 1) return "1 unread notification";
    return `${unreadCount} unread notifications`;
  }, [answeredUnseenCount, unreadCount]);

  const summaryCount = unreadCount + answeredUnseenCount;
  const summaryLabel =
    summaryCount > 0
      ? `${summaryCount} new ${summaryCount === 1 ? "update" : "updates"}`
      : items.length === 0
        ? "No notifications"
        : "All caught up";

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
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-xl border bg-white/90 dark:bg-white/[0.05] shadow-sm transition",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70 focus-visible:ring-offset-2",
          open
            ? "border-blue-300 bg-blue-50/80"
            : "border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/80 hover:border-slate-300 hover:bg-[#FCFCFD]",
        )}
      >
        {open || unreadCount > 0 ? (
          <BellRing className="h-4 w-4 text-[var(--brand-600)] transition" />
        ) : (
          <Bell className="h-4 w-4 text-slate-700 dark:text-white/80 transition" />
        )}
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--brand-600)] px-1.5 py-0.5 text-[10px] font-bold text-white">
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

          <div className="fixed left-4 right-4 top-[calc(env(safe-area-inset-top)+5rem)] z-50 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] shadow-[0_20px_44px_-22px_rgba(15,23,42,0.65)] sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+0.5rem)] sm:mt-0 sm:w-[430px] sm:max-w-[calc(100vw-1.5rem)]">
            <div className="border-b border-slate-100 dark:border-white/[0.06] bg-white/95 px-4 py-3 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-[15px] font-semibold text-slate-950 dark:text-white">
                      Inbox
                    </div>
                    <div className="rounded-full bg-slate-100 dark:bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-white/70">
                      {summaryLabel}
                    </div>
                  </div>
                </div>
                {items.length > 0 ? (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    disabled={isPending || unreadCount === 0}
                    className="inline-flex h-8 shrink-0 items-center rounded-lg px-2.5 text-[12px] font-medium text-slate-500 dark:text-white/55 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Mark all as read
                  </button>
                ) : null}
              </div>
              {items.length > 0 ? (
                <div className="mt-3 flex items-center gap-1.5">
                  <InboxFilterChip
                    label="All"
                    active={filter === "all"}
                    tone="all"
                    onClick={() => setFilter("all")}
                  />
                  <InboxFilterChip
                    label="Surveys"
                    active={filter === "survey"}
                    tone="survey"
                    onClick={() => setFilter("survey")}
                  />
                  <InboxFilterChip
                    label="Notifications"
                    active={filter === "notification"}
                    tone="notification"
                    onClick={() => setFilter("notification")}
                  />
                </div>
              ) : null}
            </div>

            {error ? (
              <div className="mx-3 mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            ) : null}

            <div className="max-h-[420px] overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center px-4 py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400 dark:text-white/45" />
                  <span className="ml-2 text-sm text-slate-500 dark:text-white/55">
                    Loading...
                  </span>
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-12">
                  <Bell className="h-8 w-8 text-slate-300 dark:text-white/30" />
                  <div className="mt-3 text-sm font-medium text-slate-900 dark:text-white">
                    Inbox is clear
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-white/55">
                    No notifications at the moment
                  </div>
                </div>
              ) : visibleItemsCount === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-12">
                  <Bell className="h-8 w-8 text-slate-300 dark:text-white/30" />
                  <div className="mt-3 text-sm font-medium text-slate-900 dark:text-white">
                    No matching items
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-white/55">
                    Try another filter
                  </div>
                </div>
              ) : (
                <div className="space-y-3 px-3 py-3">
                  {newNotifications.length > 0 ? (
                    <div>
                      <div className="sticky top-0 z-[1] bg-white/95 px-1 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-white/45 backdrop-blur">
                        New
                      </div>
                      <div className="space-y-2">
                        {newNotifications.map((notification, index) => (
                          <NotificationItem
                            key={`${notification.id || "notification"}-${index}`}
                            notification={notification}
                            activeId={activeId}
                            inviteActionId={inviteActionId}
                            onClick={handleNotificationClick}
                            onAcceptInvite={(item) =>
                              void runInviteAction(item, "/api/invite/accept")
                            }
                            onDeclineInvite={(item) =>
                              void runInviteAction(item, "/api/invite/decline")
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {earlierNotifications.length > 0 ? (
                    <div>
                      <div className="sticky top-0 z-[1] bg-white/95 px-1 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-white/45 backdrop-blur">
                        Earlier
                      </div>
                      <div className="space-y-2">
                        {earlierNotifications.map((notification, index) => (
                          <NotificationItem
                            key={`${notification.id || "notification"}-${index}`}
                            notification={notification}
                            activeId={activeId}
                            inviteActionId={inviteActionId}
                            onClick={handleNotificationClick}
                            onAcceptInvite={(item) =>
                              void runInviteAction(item, "/api/invite/accept")
                            }
                            onDeclineInvite={(item) =>
                              void runInviteAction(item, "/api/invite/decline")
                            }
                          />
                        ))}
                      </div>
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
  inviteActionId: string;
  onClick: (notification: InboxNotification) => void;
  onAcceptInvite: (notification: InboxNotification) => void;
  onDeclineInvite: (notification: InboxNotification) => void;
};

function NotificationItem({
  notification,
  activeId,
  inviteActionId,
  onClick,
  onAcceptInvite,
  onDeclineInvite,
}: NotificationItemProps) {
  const isBusy = activeId === notification.id || inviteActionId === notification.id;
  const isInviteActionBusy = inviteActionId === notification.id;
  const displayState = getInboxNotificationDisplayState(notification);
  const typeDisplay = getInboxNotificationTypeDisplay(notification);
  const exactTime = formatNotificationExactTime(notification.created_at);
  const isSurvey = typeDisplay.kind === "survey";
  const isInvite = notification.type === "invitation_received";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        onClick(notification);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick(notification);
        }
      }}
      title={exactTime}
      className={cn(
        "group flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left shadow-sm transition duration-150 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70 focus-visible:ring-inset focus-visible:ring-offset-0",
        isBusy && "cursor-not-allowed opacity-70",
        !isInvite && "cursor-pointer",
        displayState.emphasized
          ? isSurvey
            ? "border-violet-100 bg-violet-50/75 hover:bg-violet-50 active:bg-violet-100/80"
            : "border-sky-100 bg-sky-50/75 hover:bg-sky-50 active:bg-sky-100/80"
          : isSurvey
            ? "border-violet-100 bg-violet-50/35 hover:border-violet-200 hover:bg-violet-50/55 active:bg-violet-100/70"
            : "border-sky-100 bg-sky-50/35 hover:border-sky-200 hover:bg-sky-50/55 active:bg-sky-100/70",
      )}
      aria-label={`${notification.title}. ${displayState.srLabel}. ${formatNotificationTime(notification.created_at)}.`}
    >
      <NotificationIcon
        type={notification.type}
        emphasized={displayState.emphasized}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "min-w-0 flex-1 truncate text-[13px] leading-5",
              displayState.emphasized
                ? "font-semibold text-slate-800 dark:text-white/90"
                : "font-medium text-slate-700 dark:text-white/80",
            )}
          >
            {notification.title}
          </div>
          <div className="shrink-0">
            <NotificationStatusIndicator
              displayState={displayState}
              itemKind={typeDisplay.kind}
            />
          </div>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-white/45">
          <span
            className={cn(
              "inline-flex h-5 items-center rounded-md border px-1.5 text-[10px] font-medium",
              typeDisplay.kind === "survey"
                ? "border-violet-200 bg-violet-50/80 text-violet-700"
                : "border-sky-200 bg-sky-50/80 text-sky-700",
            )}
          >
            {typeDisplay.label}
          </span>
          <span
            className="h-1 w-1 rounded-full bg-slate-300"
            aria-hidden="true"
          />
          <span>{formatNotificationTime(notification.created_at)}</span>
          <span className="text-slate-300 dark:text-white/30" aria-hidden="true">
            ·
          </span>
          <span className="text-slate-500 dark:text-white/55">{exactTime}</span>
        </div>
        {isInvite ? (
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              disabled={isInviteActionBusy}
              onClick={(event) => {
                event.stopPropagation();
                onAcceptInvite(notification);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-600)] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[var(--brand-700)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isInviteActionBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Accept
            </button>
            <button
              type="button"
              disabled={isInviteActionBusy}
              onClick={(event) => {
                event.stopPropagation();
                onDeclineInvite(notification);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-white/70 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X className="h-3.5 w-3.5" />
              Decline
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function InboxFilterChip({
  label,
  active,
  tone,
  onClick,
}: {
  label: string;
  active: boolean;
  tone: "all" | "survey" | "notification";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center justify-center rounded-md border px-2.5 text-[11px] font-medium leading-none transition-colors",
        "min-w-0 whitespace-nowrap",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70 focus-visible:ring-offset-2",
        active
          ? tone === "survey"
            ? "border-violet-200 bg-violet-50 text-violet-700"
            : tone === "notification"
              ? "border-sky-200 bg-sky-50 text-sky-700"
              : "border-[var(--brand-200)] bg-[var(--brand-50)] text-[var(--brand-700)]"
          : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] text-slate-500 dark:text-white/55 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600",
      )}
    >
      {label}
    </button>
  );
}

function formatNotificationExactTime(value: string) {
  const date = new Date(value);

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function NotificationStatusIndicator({
  displayState,
  itemKind,
}: {
  displayState: ReturnType<typeof getInboxNotificationDisplayState>;
  itemKind: ReturnType<typeof getInboxNotificationTypeDisplay>["kind"];
}) {
  if (displayState.tone === "new") {
    return (
      <span className="inline-flex h-5 items-center rounded-full bg-[var(--brand-600)] px-2 text-[10px] font-semibold tracking-[0.02em] text-white">
        New
      </span>
    );
  }

  if (displayState.tone === "answered") {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
        <Check className="h-3 w-3" />
        <span className="sr-only">Answered</span>
      </span>
    );
  }

  if (itemKind === "update") {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
        <Check className="h-3 w-3" />
        <span className="sr-only">Read</span>
      </span>
    );
  }

  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] text-slate-500 dark:text-white/55">
      <Check className="h-3 w-3" />
      <span className="sr-only">Read</span>
    </span>
  );
}
