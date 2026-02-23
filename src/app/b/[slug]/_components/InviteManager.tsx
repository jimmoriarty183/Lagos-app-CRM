"use client";

import { useState } from "react";
import PendingInvites from "./PendingInvites";

export default function InviteManager({ businessId }: { businessId: string }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);

  const onInvite = async () => {
    setMsg("");
    if (!email.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/manager/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, email }),
      });

      const json = await res.json();

      if (!res.ok || json?.error) {
        setMsg(json?.error || "Failed to invite");
        return;
      }

      setMsg("Invite sent. Status: INVITE PENDING");
      setEmail("");

      // ✅ обновить список pending сразу
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      setMsg(e?.message || "Failed to invite");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white/70 p-4">
      <div className="text-sm font-semibold text-gray-900">
        Invite manager by email
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="manager@company.com"
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
        />

        <button
          onClick={onInvite}
          disabled={loading}
          className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Inviting…" : "Invite"}
        </button>
      </div>

      {msg ? (
        <div className="mt-2 text-xs text-gray-600">{msg}</div>
      ) : (
        <div className="mt-2 text-xs text-gray-500">
          The email will remain visible as <b>INVITE PENDING</b> until the
          manager registers and gets access to this business.
        </div>
      )}

      {/* ✅ список ожидания + revoke */}
      <PendingInvites businessId={businessId} refreshKey={refreshKey} />
    </div>
  );
}
