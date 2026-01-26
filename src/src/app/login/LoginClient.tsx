"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  next?: string;
};

export default function LoginClient({ next = "" }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState(""); // для регистрации
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = useMemo(
    () => (next && next.startsWith("/") ? next : "/"),
    [next]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // TODO: подключим реальную авторизацию (Supabase Auth)
      // mode === "login" -> sign in
      // mode === "signup" -> sign up

      // Заглушка успеха:
      router.push(redirectTo);
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 440, margin: "0 auto", padding: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <h1 style={{ fontSize: 26, margin: 0 }}>Log in to Ordero</h1>
        <p style={{ margin: "6px 0 0", opacity: 0.75 }}>
          {mode === "login"
            ? "Enter your phone and password."
            : "Create an account in 1 minute."}
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setMode("login")}
          style={tabStyle(mode === "login")}
        >
          Log in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          style={tabStyle(mode === "signup")}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={onSubmit} style={cardStyle}>
        {mode === "signup" && (
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex"
              style={inputStyle}
              autoComplete="name"
            />
          </Field>
        )}

        <Field label="Phone">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+380..."
            style={inputStyle}
            autoComplete="tel"
            inputMode="tel"
          />
        </Field>

        <Field label="Password">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            type="password"
            style={inputStyle}
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
          />
        </Field>

        {error && (
          <div style={{ color: "#b91c1c", fontSize: 14, marginTop: 6 }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} style={primaryBtn}>
          {loading
            ? "Please wait..."
            : mode === "login"
            ? "Log in"
            : "Create account"}
        </button>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65 }}>
          By continuing, you agree to the Terms and Privacy Policy.
        </div>
      </form>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, opacity: 0.75 }}>{label}</span>
      {children}
    </label>
  );
}

const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 14,
  background: "white",
  display: "grid",
  gap: 12,
};

const inputStyle: React.CSSProperties = {
  height: 44,
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  padding: "0 12px",
  outline: "none",
};

const primaryBtn: React.CSSProperties = {
  height: 44,
  borderRadius: 12,
  border: "1px solid #111827",
  background: "#111827",
  color: "white",
  cursor: "pointer",
  marginTop: 4,
};

function tabStyle(active: boolean): React.CSSProperties {
  return {
    height: 36,
    padding: "0 12px",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    background: active ? "#111827" : "white",
    color: active ? "white" : "#111827",
    cursor: "pointer",
    fontWeight: 600,
  };
}
