"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export type RightVariant =
  | "none"
  | "login"
  | "back"
  | "backHome"
  | "backHomeLogin";

type Props = {
  subtitle?: string;
  rightVariant?: RightVariant;
  /** чтобы TopBar всегда совпадал с контентом */
  maxWidth?: number;
};

export default function TopBar({
  subtitle,
  rightVariant = "none",
  maxWidth = 1040,
}: Props) {
  const router = useRouter();

  const Btn = ({
    children,
    onClick,
    primary,
  }: {
    children: React.ReactNode;
    onClick: () => void;
    primary?: boolean;
  }) => (
    <button
      onClick={onClick}
      style={{
        height: 38,
        padding: "0 12px",
        borderRadius: 12,
        border: primary ? "1px solid #111827" : "1px solid #e5e7eb",
        background: primary ? "#111827" : "rgba(255,255,255,0.7)",
        color: primary ? "white" : "#111827",
        fontWeight: primary ? 900 : 800,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );

  return (
    <header style={{ padding: "10px 6px" }}>
      {/* ВАЖНО: контейнер внутри TopBar */}
      <div
        style={{
          maxWidth,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            color: "inherit",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              background: "#111827",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              userSelect: "none",
              flex: "0 0 auto",
            }}
          >
            O
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 900, lineHeight: 1 }}>Ordero</div>
            {subtitle ? (
              <div style={{ opacity: 0.65, fontSize: 12, marginTop: 2 }}>
                {subtitle}
              </div>
            ) : null}
          </div>
        </Link>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {rightVariant === "login" && (
            <Btn onClick={() => router.push("/login")} primary>
              Log in
            </Btn>
          )}

          {rightVariant === "back" && (
            <Btn onClick={() => router.back()}>Back</Btn>
          )}

          {rightVariant === "backHome" && (
            <Btn onClick={() => router.push("/")}>Back</Btn>
          )}

          {rightVariant === "backHomeLogin" && (
            <>
              <Btn onClick={() => router.push("/")}>Back</Btn>
              <Btn onClick={() => router.push("/login")} primary>
                Log in
              </Btn>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
