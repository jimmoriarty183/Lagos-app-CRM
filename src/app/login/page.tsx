"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function normalizeNextPath(next: string | null) {
  if (!next) return "/b/test";
  if (next.startsWith("http://") || next.startsWith("https://")) return "/";
  if (!next.startsWith("/")) return "/";
  return next;
}

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const nextPath = useMemo(() => normalizeNextPath(sp.get("next")), [sp]);

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onContinue = async () => {
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data?.ok) {
        setErr(data?.error || "Login failed");
        setLoading(false);
        return;
      }

      // cookie уже поставилась, теперь просто идём в next
      router.replace(nextPath);
    } catch {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          border: "1px solid #e5e7eb",
          borderRadius: 18,
          padding: 18,
          background: "white",
        }}
      >
        <div style={{ fontWeight: 950, fontSize: 18 }}>Log in</div>
        <div style={{ opacity: 0.7, marginTop: 6 }}>
          Enter phone to continue.
        </div>

        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone (e.g. 380991112233)"
          inputMode="tel"
          style={{
            width: "100%",
            marginTop: 12,
            height: 44,
            borderRadius: 14,
            border: "1px solid #e5e7eb",
            padding: "0 12px",
          }}
        />

        {err && (
          <div style={{ marginTop: 10, color: "#b91c1c", fontWeight: 700 }}>
            {err}
          </div>
        )}

        <button
          onClick={onContinue}
          disabled={loading}
          style={{
            marginTop: 12,
            width: "100%",
            height: 44,
            borderRadius: 14,
            border: "1px solid #111827",
            background: "#111827",
            color: "white",
            fontWeight: 900,
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.8 : 1,
          }}
        >
          {loading ? "Signing in..." : "Continue"}
        </button>

        <div style={{ marginTop: 10, opacity: 0.6, fontSize: 12 }}>
          Next: <span style={{ fontFamily: "monospace" }}>{nextPath}</span>
        </div>
      </div>
    </main>
  );
}
