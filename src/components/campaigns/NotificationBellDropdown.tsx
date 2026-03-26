"use client";

import type { CampaignBellItem } from "@/lib/campaigns/types";

type Props = {
  items: CampaignBellItem[];
  loading: boolean;
  error: string | null;
  onItemClick: (item: CampaignBellItem) => void;
};

function formatRelative(value: string | null) {
  if (!value) return "now";
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US");
}

export function NotificationBellDropdown({ items, loading, error, onItemClick }: Props) {
  return (
    <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="text-sm font-semibold text-slate-900">Notifications</div>
        <div className="mt-0.5 text-xs text-slate-500">
          {items.filter((item) => !item.isRead).length} unread
        </div>
      </div>

      <div className="max-h-[420px] overflow-auto">
        {loading ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">Loading notifications...</div>
        ) : error ? (
          <div className="px-4 py-10 text-center text-sm text-rose-600">{error}</div>
        ) : items.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">No active notifications</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item, index) => (
              <button
                key={item.id || `notification-item-${index}`}
                type="button"
                onClick={() => onItemClick(item)}
                className={[
                  "w-full px-4 py-3 text-left transition",
                  item.isRead ? "bg-white hover:bg-slate-50" : "bg-blue-50/40 hover:bg-blue-50/70",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="truncate text-sm font-semibold text-slate-900">{item.title}</div>
                  <span
                    className={[
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                      item.type === "survey" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-700",
                    ].join(" ")}
                  >
                    {item.type}
                  </span>
                </div>
                {item.body ? (
                  <div className="mt-1 line-clamp-2 text-xs text-slate-600">{item.body}</div>
                ) : null}
                <div className="mt-1 text-[11px] text-slate-400">{formatRelative(item.createdAt)}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
