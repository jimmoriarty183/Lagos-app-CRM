"use client";

import { Bell } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NotificationBellDropdown } from "@/components/campaigns/NotificationBellDropdown";
import type { CampaignBellItem } from "@/lib/campaigns/types";

async function safeJson<T>(response: Response): Promise<T | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function BellNotifications() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CampaignBellItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = useMemo(() => items.filter((item) => !item.isRead).length, [items]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await fetch("/api/campaigns/bell", { cache: "no-store" });
    const json = await safeJson<{ ok: boolean; items?: CampaignBellItem[]; error?: string }>(response);
    if (!response.ok || !json?.ok) {
      setItems([]);
      setError(json?.error ?? "Failed to load notifications");
      setLoading(false);
      return;
    }

    setItems(Array.isArray(json.items) ? json.items : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onClickOutside);
    return () => window.removeEventListener("mousedown", onClickOutside);
  }, []);

  const markRead = useCallback(async (campaignId: string) => {
    const response = await fetch("/api/campaigns/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId }),
    });
    const json = await safeJson<{ ok: boolean }>(response);
    if (!response.ok || !json?.ok) return;
    setItems((current) => current.map((item) => (item.id === campaignId ? { ...item, isRead: true } : item)));
    window.dispatchEvent(new CustomEvent("campaign:state-changed", { detail: { campaignId, action: "read" } }));
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) {
            void load();
          }
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white/90 text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <NotificationBellDropdown
          items={items}
          loading={loading}
          error={error}
          onItemClick={(item) => {
            void fetch("/api/campaigns/click", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ campaignId: item.id, channel: "bell" }),
            });
            void fetch("/api/campaigns/open", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ campaignId: item.id, channel: "bell" }),
            });
            if (!item.isRead) {
              void markRead(item.id);
            }
          }}
        />
      ) : null}
    </div>
  );
}
