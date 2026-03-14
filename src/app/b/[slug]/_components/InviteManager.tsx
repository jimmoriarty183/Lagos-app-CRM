"use client";

import { useMemo, useState } from "react";
import { Loader2, Mail, Send } from "lucide-react";

export default function InviteManager({
  businessId,
  onInvited,
}: {
  businessId: string;
  onInvited?: () => void | Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

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

      if (json?.existing_user) {
        setMsg({
          type: "info",
          text: "User already has an account. They can accept this invite from the in-app bell icon.",
        });
      } else {
        setMsg({ type: "success", text: "Invite sent. Status: PENDING" });
      }

      setEmail("");
      await onInvited?.();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to invite";
      setMsg({ type: "error", text: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="text-sm font-semibold text-slate-900">Invite manager</div>
      <div className="mt-1 text-xs text-slate-500">
        Invitation will remain pending until accepted.
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative block flex-1">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-10 text-sm font-medium outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
          />
        </label>

        <button
          onClick={onInvite}
          disabled={!emailOk || loading}
          className={[
            "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all duration-200 sm:min-w-[132px]",
            loading
              ? "bg-[#111827] text-white"
              : emailOk
                ? "bg-[#111827] text-white hover:bg-[#0f172a] active:scale-[0.98]"
                : "border border-slate-200 bg-slate-50 text-slate-400",
          ].join(" ")}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              <span className="text-white">Sending…</span>
            </>
          ) : (
            <>
              <Send className={emailOk ? "h-4 w-4 text-white" : "h-4 w-4 text-slate-400"} />
              <span className={emailOk ? "text-white" : "text-slate-400"}>
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
                : "border-slate-200 bg-slate-50 text-slate-700",
          ].join(" ")}
        >
          {msg.text}
        </div>
      ) : null}
    </div>
  );
}
