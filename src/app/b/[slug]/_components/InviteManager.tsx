"use client";

import { useState } from "react";

export default function InviteManager({ businessId }: { businessId: string }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onSend = async () => {
    setErr(null);
    setMsg(null);

    const value = email.trim().toLowerCase();
    if (!value || !value.includes("@")) {
      setErr("Enter manager email");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, email: value }),
      });

      const json = await res.json();
      if (!res.ok) {
        setErr(json?.error || "Failed to send invite");
        return;
      }

      setMsg("Invite sent ✅");
      setEmail("");
    } catch (e: any) {
      setErr(e?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50/50 p-3">
      <div className="text-xs font-semibold text-gray-700">
        Invite manager (email)
      </div>

      <div className="mt-2 flex gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="manager@email.com"
          className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-300"
        />
        <button
          onClick={onSend}
          disabled={loading}
          className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Sending…" : "Invite"}
        </button>
      </div>

      {err && <div className="mt-2 text-xs text-red-600">{err}</div>}
      {msg && <div className="mt-2 text-xs text-green-700">{msg}</div>}
    </div>
  );
}
