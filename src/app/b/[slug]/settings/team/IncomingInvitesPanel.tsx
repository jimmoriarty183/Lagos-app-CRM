"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, Loader2, Mail, X } from "lucide-react";
import { useRouter } from "next/navigation";

type PendingInvite = {
  id: string;
  business_id: string;
  created_at: string | null;
  business: {
    id: string;
    slug: string;
    name: string | null;
  };
};

function formatDateTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

export default function IncomingInvitesPanel({ currentBusinessSlug }: { currentBusinessSlug: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PendingInvite[]>([]);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState("");
  const [isPending, startTransition] = useTransition();

  const title = useMemo(() => {
    if (items.length === 0) return "No incoming invites";
    if (items.length === 1) return "1 incoming invite";
    return `${items.length} incoming invites`;
  }, [items.length]);

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/invite/my-pending", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to load invites");
      }

      setItems(Array.isArray(json.invites) ? json.invites : []);
    } catch (e) {
      setItems([]);
      setError(e instanceof Error ? e.message : "Failed to load invites");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const runAction = async (
    inviteId: string,
    url: string,
    onSuccess?: (invite: PendingInvite) => void,
  ) => {
    const invite = items.find((item) => item.id === inviteId);
    setActiveId(inviteId);
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

      setItems((current) => current.filter((item) => item.id !== inviteId));

      if (invite && onSuccess) {
        onSuccess(invite);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invite action failed");
    } finally {
      setActiveId("");
    }
  };

  const acceptInvite = async (inviteId: string) => {
    await runAction(inviteId, "/api/invite/accept", (invite) => {
      startTransition(() => {
        if (invite.business.slug === currentBusinessSlug) {
          router.refresh();
          return;
        }
        router.push(`/b/${invite.business.slug}`);
        router.refresh();
      });
    });
  };

  const declineInvite = async (inviteId: string) => {
    await runAction(inviteId, "/api/invite/decline");
  };

  return (
    <section className="rounded-[18px] border border-[#dde3ee] bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#e2e8f0] bg-[#f8fafc] text-slate-600">
          <Mail className="h-4 w-4" />
        </span>
        Accept invite
      </div>

      <div className="mt-3 text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-xs leading-5 text-slate-500">
        Accept access to another business or decline it here, not only from the bell.
      </div>

      {error ? (
        <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-3 space-y-3">
        {loading ? (
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-4 text-sm text-slate-600">
            Loading invites...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
            No pending business invites.
          </div>
        ) : (
          items.map((invite) => {
            const busy = activeId === invite.id || isPending;
            return (
              <div
                key={invite.id}
                className="rounded-2xl border border-slate-100 bg-white px-3 py-3"
              >
                <div className="text-sm font-semibold text-slate-900">
                  {invite.business.name || invite.business.slug}
                </div>
                <div className="mt-1 text-xs text-slate-500">/{invite.business.slug}</div>
                <div className="mt-2 text-xs text-slate-400">
                  Invited: {formatDateTime(invite.created_at)}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void acceptInvite(invite.id)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Accept
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void declineInvite(invite.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <X className="h-4 w-4" />
                    Decline
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
