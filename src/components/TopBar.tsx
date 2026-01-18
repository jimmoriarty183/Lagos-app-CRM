"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  subtitle?: string;
  rightVariant?: "login" | "pricing" | "none";
};

export default function TopBar({ subtitle, rightVariant = "none" }: Props) {
  const router = useRouter();

  const goBackSmart = () => {
    // если есть история — вернёмся назад, иначе на главную
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <header style={{ padding: "10px 18px 0" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "10px 6px",
          }}
        >
          {/* Logo (clickable -> home) */}
          <Link
            href="/"
            style={{
              all: "unset",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10,
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
                letterSpacing: 0.5,
                userSelect: "none",
              }}
            >
              O
            </div>

            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 900, lineHeight: 1 }}>Ordero</div>
              <div style={{ opacity: 0.65, fontSize: 12, marginTop: 2 }}>
                {subtitle ?? "Orders. Simple. Fast."}
              </div>
            </div>
          </Link>

          {/* Right actions */}
          {rightVariant !== "none" && (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                onClick={goBackSmart}
                style={{
                  height: 38,
                  padding: "0 12px",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  background: "rgba(255,255,255,0.7)",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Back
              </button>

              {rightVariant === "pricing" && (
                <button
                  onClick={() => router.push("/login")}
                  style={{
                    height: 38,
                    padding: "0 12px",
                    borderRadius: 12,
                    border: "1px solid #111827",
                    background: "#111827",
                    color: "white",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Log in
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
