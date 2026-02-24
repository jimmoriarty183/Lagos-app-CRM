"use client";

import { useMemo, useState } from "react";
import { Mail, Sparkles, Loader2, Send } from "lucide-react";
import PendingInvites from "./PendingInvites";

export default function InviteManager({ businessId }: { businessId: string }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [msg, setMsg] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  const emailOk = useMemo(() => {
    const v = email.trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }, [email]);

  const onInvite = async () => {
    setMsg(null);

    const v = email.trim().toLowerCase();
    if (!v || !emailOk || loading) return;

    setLoading(true);
    try {
      const res = await fetch("/api/manager/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, email: v }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.error) {
        setMsg({ type: "error", text: json?.error || "Failed to invite" });
        return;
      }

      setMsg({ type: "success", text: "Invite sent. Status: PENDING" });
      setEmail("");

      // ✅ обновить список pending сразу
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      setMsg({ type: "error", text: e?.message || "Failed to invite" });
    } finally {
      setLoading(false);
    }
  };

  const canSend = emailOk && !loading;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">
            Invite manager
          </div>
          <div className="mt-1 text-xs text-gray-500">
            We’ll email an invite link. Invite stays pending until the manager
            registers.
          </div>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-900">
          <Sparkles className="h-4 w-4 opacity-70" />
          Email invite
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="relative w-full">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="manager@company.com"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onKeyDown={(e) => {
              if (e.key === "Enter") onInvite();
            }}
            className="w-full rounded-xl border border-gray-200 bg-white px-10 py-2.5 text-sm font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <button
          onClick={onInvite}
          disabled={!emailOk || loading}
          className={[
            "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200",
            loading
              ? "bg-black text-white"
              : emailOk
                ? "bg-black text-white hover:bg-gray-900 active:scale-[0.98]"
                : "border border-gray-300 bg-white text-gray-400 hover:border-gray-400",
          ].join(" ")}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              <span className="text-white">Sending…</span>
            </>
          ) : (
            <>
              <Send
                className={
                  emailOk ? "h-4 w-4 text-white" : "h-4 w-4 text-gray-400"
                }
              />
              <span className={emailOk ? "text-white" : "text-gray-400"}>
                Send invite
              </span>
            </>
          )}
        </button>
      </div>

      {msg ? (
        <div
          className={[
            "mt-3 rounded-xl border px-3 py-2 text-xs font-semibold",
            msg.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : msg.type === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-gray-200 bg-gray-50 text-gray-700",
          ].join(" ")}
        >
          {msg.text}
        </div>
      ) : null}

      <PendingInvites businessId={businessId} refreshKey={refreshKey} />
    </div>
  );
}
