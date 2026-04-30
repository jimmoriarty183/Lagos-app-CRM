"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { Clock, Mail, X } from "lucide-react";

type Invite = {
  id: string;
  email: string;
  status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED" | string;
  created_at?: string;
  expires_at?: string;
};

export type PendingInvitesHandle = {
  reload: () => Promise<void>;
};

function formatDateTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

function StatusPill({ status }: { status: string }) {
  const s = String(status || "").toUpperCase();
  const tone =
    s === "PENDING"
      ? "bg-amber-50 text-amber-700 border-amber-100"
      : s === "ACCEPTED"
        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
        : s === "REVOKED" || s === "EXPIRED"
          ? "bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-white/80 border-gray-200 dark:border-white/10"
          : "bg-blue-50 text-blue-700 border-blue-100";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${tone}`}
    >
      {s}
    </span>
  );
}

const PendingInvites = forwardRef<
  PendingInvitesHandle,
  { businessId: string; refreshKey?: number; optimisticEmail?: string | null }
>(function PendingInvites(
  { businessId, refreshKey = 0, optimisticEmail },
  ref,
) {
  const [loading, setLoading] = useState(false);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    setLoading(true);
    try {
      // ✅ отправляем оба параметра на всякий случай
      const url = `/api/invite/list?businessId=${encodeURIComponent(
        businessId,
      )}&business_id=${encodeURIComponent(businessId)}`;

      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(json?.error || "Failed to load invites");
      if (json?.ok) setInvites(json.invites || []);
      else setInvites([]);
    } catch (e: any) {
      setError(e?.message || "Failed to load invites");
      setInvites([]);
    } finally {
      setLoading(false);
    }
  }

  useImperativeHandle(ref, () => ({
    reload: load,
  }));

  async function revoke(inviteId: string) {
    const prev = invites;
    setInvites((cur) => cur.filter((x) => x.id !== inviteId));

    try {
      const res = await fetch("/api/invite/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_id: inviteId, inviteId }),
      });

      const json = await res.json().catch(() => ({}));

      // 👇 ДОБАВЬ ВОТ ЭТО
      console.log("REVOKE RESPONSE:", res.status, json);

      if (!res.ok || !json?.ok) {
        setInvites(prev);
        setError(json?.error || "Failed to revoke invite");
        return;
      }

      await load();
    } catch (e: any) {
      setInvites(prev);
      setError(e?.message || "Failed to revoke invite");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, refreshKey]);

  // ✅ если invite только что отправили, но list ещё не отдаёт — покажем оптимистично
  const viewInvites = useMemo(() => {
    const base = invites ?? [];
    const hasEmail =
      optimisticEmail &&
      base.some((i) => String(i.email).toLowerCase() === optimisticEmail);

    if (optimisticEmail && !hasEmail) {
      return [
        {
          id: "__optimistic__",
          email: optimisticEmail,
          status: "PENDING",
          created_at: new Date().toISOString(),
        } as Invite,
        ...base,
      ];
    }
    return base;
  }, [invites, optimisticEmail]);

  const count = viewInvites.length;

  return (
    <div className="mt-4 rounded-2xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] px-4 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <Clock className="h-4 w-4 text-gray-500 dark:text-white/55" />
          {loading ? "Pending invites…" : `Pending invites (${count})`}
        </div>
      </div>

      {error ? (
        <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        {count === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-4 py-4 text-sm text-gray-500 dark:text-white/55">
            No pending invites.
          </div>
        ) : (
          viewInvites.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-50 dark:bg-white/[0.04] text-gray-600 dark:text-white/70">
                  <Mail className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                    {inv.email}
                    {inv.id === "__optimistic__" ? (
                      <span className="ml-2 text-xs font-semibold text-gray-400 dark:text-white/45">
                        (syncing…)
                      </span>
                    ) : null}
                  </div>
                  <div className="truncate text-xs text-gray-500 dark:text-white/55">
                    {inv.created_at
                      ? `Sent: ${formatDateTime(inv.created_at)}`
                      : ""}
                    {inv.expires_at
                      ? ` • Expires: ${formatDateTime(inv.expires_at)}`
                      : ""}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <StatusPill status={inv.status} />

                {inv.id !== "__optimistic__" ? (
                  <button
                    type="button"
                    onClick={() => revoke(inv.id)}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 py-2 text-sm font-semibold text-gray-700 dark:text-white/80 hover:bg-gray-50 dark:hover:bg-white/[0.06]"
                    title="Revoke invite"
                  >
                    <X className="h-4 w-4" />
                    Revoke
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

export default PendingInvites;
