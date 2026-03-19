"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Bell, BellRing, Check, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { formatFollowUpDate, getTodayDateOnly } from "@/lib/follow-ups";

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
  businessId?: string;
  currentBusinessSlug: string;
  todayHref?: string;
};

type InboxFollowUp = {
  id: string;
  title: string;
  due_date: string;
  order_id: string | null;
  created_at: string | null;
};

function formatDateTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

export default function InviteInbox({ businessId, currentBusinessSlug, todayHref }: Props) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PendingInvite[]>([]);
  const [followUps, setFollowUps] = useState<InboxFollowUp[]>([]);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState("");
  const [isPending, startTransition] = useTransition();

  const count = items.length + followUps.length;

  const title = useMemo(() => {
    if (count === 0) return "Inbox is clear";
    if (count === 1) return "1 inbox item";
    return `${count} inbox items`;
  }, [count]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("today", getTodayDateOnly());
      if (businessId) params.set("businessId", businessId);

      const res = await fetch(`/api/topbar/inbox?${params.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to load inbox");
      }

      setItems(Array.isArray(json.invites) ? json.invites : []);
      setFollowUps(Array.isArray(json.followUps) ? json.followUps : []);
    } catch (error: unknown) {
      setItems([]);
      setFollowUps([]);
      setError(error instanceof Error ? error.message : "Failed to load inbox");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      setItems([]);
      setFollowUps([]);
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
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Invite action failed");
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

  const openToday = () => {
    startTransition(() => {
      setOpen(false);
      router.push(todayHref || `/b/${currentBusinessSlug}/today`);
      router.refresh();
    });
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
        className={`relative flex h-9 w-9 items-center justify-center rounded-xl border bg-white/90 shadow-sm transition ${
          open
            ? "border-blue-300 bg-blue-50/80"
            : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-[#FCFCFD]"
        }`}
      >
        {open || count > 0 ? (
          <BellRing className="h-4 w-4 text-[#6366F1] transition" />
        ) : (
          <Bell className="h-4 w-4 text-slate-700 transition" />
        )}
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-[#6366F1] px-1.5 py-0.5 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close business invites"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40"
          />

          <div className="fixed left-4 right-4 top-[calc(env(safe-area-inset-top)+5rem)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+0.5rem)] sm:mt-0 sm:w-[340px] sm:max-w-[calc(100vw-1.5rem)]">
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="text-sm font-semibold text-slate-900">Inbox</div>
              <div className="mt-1 text-xs text-slate-500">
                Business invites and overdue or due-today follow-ups.
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
                  Loading inbox...
                </div>
              ) : items.length === 0 && followUps.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                  Inbox is clear.
                </div>
              ) : (
                <div className="space-y-3">
                  {followUps.length > 0 ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 px-1">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                          Follow-ups
                        </div>
                        <button
                          type="button"
                          onClick={openToday}
                          className="text-[11px] font-semibold text-[#6366F1] transition hover:text-[#5558E6]"
                        >
                          Open all
                        </button>
                      </div>
                      {followUps.map((followUp) => (
                        <div
                          key={followUp.id}
                          className="rounded-xl border border-slate-100 bg-white px-3 py-2.5"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-[13px] font-semibold text-slate-900">
                                {followUp.title}
                              </div>
                              <div className="mt-0.5 text-[11px] text-slate-500">
                                Due: {formatFollowUpDate(followUp.due_date)}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={openToday}
                              className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              Open
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {items.length > 0 ? (
                    <div className="space-y-2">
                      <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                        Invites
                      </div>
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
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#6366F1] px-3 py-2 text-sm font-semibold text-white hover:bg-[#5558E6] disabled:cursor-not-allowed disabled:opacity-60"
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


