"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function WelcomePage() {
  const router = useRouter();
  const sp = useSearchParams();

  const next = useMemo(() => {
    const n = sp.get("next");
    return n && n.startsWith("/") ? n : "/";
  }, [sp]);

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, next }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || "Login failed");
        setLoading(false);
        return;
      }

      const redirectTo =
        typeof data?.redirectTo === "string" && data.redirectTo.startsWith("/")
          ? data.redirectTo
          : next;

      router.push(redirectTo);
    } catch {
      setError("Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f6f7fb",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 18,
          padding: 22,
          boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: "#0f172a",
              color: "white",
              display: "grid",
              placeItems: "center",
              fontWeight: 900,
            }}
          >
            o
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>
              Welcome to Ordero
            </div>
            <div style={{ fontSize: 13, opacity: 0.7 }}>
              Enter your phone to continue
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 6 }}>
            Next: {next}
          </div>

          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone (e.g. 380991112233)"
            inputMode="tel"
            autoComplete="tel"
            style={{
              width: "100%",
              height: 44,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              padding: "0 12px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />

          {error && (
            <div
              style={{
                marginTop: 10,
                padding: "10px 12px",
                borderRadius: 12,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 12,
              width: "100%",
              height: 44,
              borderRadius: 12,
              border: "1px solid #0f172a",
              background: "#0f172a",
              color: "white",
              fontWeight: 900,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Please wait..." : "Continue"}
          </button>
        </form>
      </div>
    </main>
  );
}
