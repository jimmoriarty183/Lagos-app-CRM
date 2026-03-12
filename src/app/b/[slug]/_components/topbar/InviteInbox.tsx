"use client";

import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Bell, Check, Loader2, X } from "lucide-react";
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

type Props = {
  currentBusinessSlug: string;
};

function formatDateTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

export default function InviteInbox({ currentBusinessSlug }: Props) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PendingInvite[]>([]);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState("");
  const [isPending, startTransition] = useTransition();

  const count = items.length;

  const title = useMemo(() => {
    if (count === 0) return "No pending invites";
    if (count === 1) return "1 business invite";
    return `${count} business invites`;
  }, [count]);

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
    } catch (e: any) {
      setItems([]);
      setError(e?.message || "Failed to load invites");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
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
    } catch (e: any) {
      setError(e?.message || "Invite action failed");
    } finally {
      setActiveId("");
    }
  };

  const acceptInvite = async (inviteId: string) => {
    await runAction(inviteId, "/api/invite/accept", (invite) => {
      startTransition(() => {
        setOpen(false);
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
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) void load();
        }}
        aria-label="Business invites"
        title={title}
        className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm"
      >
        <Bell className="h-4 w-4" />
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[340px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="text-sm font-semibold text-slate-900">Business invites</div>
            <div className="mt-1 text-xs text-slate-500">
              Accept access to another business without opening email.
            </div>
          </div>

          {error ? (
            <div className="mx-3 mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          ) : null}

          <div className="max-h-[360px] overflow-auto p-3">
            {loading ? (
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-4 text-sm text-slate-600">
                Loading invites...
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                No pending business invites.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((invite) => {
                  const busy = activeId === invite.id || isPending;
                  return (
                    <div
                      key={invite.id}
                      className="rounded-2xl border border-slate-100 bg-white px-3 py-3"
                    >
                      <div className="text-sm font-semibold text-slate-900">
                        {invite.business.name || invite.business.slug}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        /{invite.business.slug}
                      </div>
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
                          {busy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
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
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
