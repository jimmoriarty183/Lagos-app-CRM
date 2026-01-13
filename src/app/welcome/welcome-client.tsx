"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function safePath(s: string) {
  return s && s.startsWith("/") ? s : "/";
}

function appendU(urlPath: string, phone: string) {
  const base = safePath(urlPath);
  const u = new URL(base, "http://local");
  if (!u.searchParams.get("u")) u.searchParams.set("u", phone);
  return u.pathname + (u.search ? u.search : "");
}

export default function WelcomeClient({ next }: { next: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const nextSafe = useMemo(() => safePath(next || "/"), [next]);

  const onContinue = async () => {
    if (loading) return;
    setErr(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, next: nextSafe }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        setErr(data?.error || "Login failed");
        setLoading(false);
        return;
      }

      const normalizedPhone = String(data?.phone || "");
      const redirectTo = safePath(String(data?.redirectTo || "/"));

      // MVP: добавляем ?u=phone для существующей логики ролей на /b/[slug]
      const finalUrl = appendU(redirectTo, normalizedPhone);

      router.replace(finalUrl);
      // router.refresh(); // ← можно не надо, чтобы не было лишних перерендеров
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
        display: "grid",
        placeItems: "center",
        background: "#f8fafc",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
          padding: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "#0f172a",
              color: "white",
              display: "grid",
              placeItems: "center",
              fontWeight: 900,
            }}
          >
            O
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>
              Welcome to Ordero
            </div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Enter your phone to continue
            </div>
          </div>
        </div>

        <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 10 }}>
          Next: <span style={{ fontFamily: "monospace" }}>{nextSafe}</span>
        </div>

        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone (e.g. 380991112233)"
          style={{
            width: "100%",
            height: 44,
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            padding: "0 12px",
            outline: "none",
            marginBottom: 12,
          }}
        />

        {err && (
          <div
            style={{
              marginBottom: 12,
              padding: 10,
              borderRadius: 12,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              fontSize: 13,
            }}
          >
            {err}
          </div>
        )}

        <button
          type="button"
          onClick={onContinue}
          disabled={loading}
          style={{
            width: "100%",
            height: 44,
            borderRadius: 12,
            border: "1px solid #0f172a",
            background: "#0f172a",
            color: "white",
            fontWeight: 800,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Signing in..." : "Continue"}
        </button>
      </div>
    </main>
  );
}
