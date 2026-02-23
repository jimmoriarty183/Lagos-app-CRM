"use client";

import { useEffect, useMemo, useState } from "react";

type Invite = {
  id: string;
  email: string;
  status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED" | string;
  created_at: string;
  expires_at: string;
};

export default function PendingInvites({
  businessId,
  refreshKey = 0,
}: {
  businessId: string;
  refreshKey?: number;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invites, setInvites] = useState<Invite[]>([]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/invite/list?businessId=${encodeURIComponent(businessId)}`,
        { cache: "no-store" },
      );
      const json = await res.json();
      if (json?.ok) setInvites(json.invites || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function revoke(inviteId: string) {
    const res = await fetch("/api/invite/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteId }),
    });
    const json = await res.json();
    if (json?.ok) load();
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, refreshKey]);

  const count = invites.length;

  const title = useMemo(() => {
    if (loading) return "Pending invitations…";
    return `Pending invitations (${count})`;
  }, [loading, count]);

  return (
    <div className="mt-3 rounded-2xl border border-gray-200 bg-white/70">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="text-sm font-semibold text-gray-900">
          Pending invitations ({count})
        </div>
        <div className="text-xs text-gray-500">{open ? "▲" : "▼"}</div>
      </button>

      {open && (
        <div className="px-4 pb-3">
          {count === 0 ? (
            <div className="text-xs text-gray-500 py-2">No pending invites</div>
          ) : (
            <div className="space-y-2">
              {invites.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-gray-900">
                      {inv.email}
                    </div>
                    <div className="text-xs text-gray-500">
                      Status:{" "}
                      <span className="font-medium text-gray-700">
                        {String(inv.status).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => revoke(inv.id)}
                    className="shrink-0 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={load}
            className="mt-3 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}
