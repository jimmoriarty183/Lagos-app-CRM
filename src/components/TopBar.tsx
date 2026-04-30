"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLockup } from "@/components/Brand";

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
        padding: "0 var(--space-3)",
        borderRadius: "var(--space-3)",
        border: primary
          ? "1px solid var(--brand-600)"
          : "1px solid var(--neutral-200)",
        background: primary ? "var(--brand-600)" : "#FFFFFF",
        color: primary ? "#FFFFFF" : "var(--neutral-900)",
        fontWeight: primary ? 600 : 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s ease",
      }}
    >
      {children}
    </button>
  );

  return (
    <header
      style={{
        padding: "10px 6px",
        borderBottom: "1px solid var(--neutral-200)",
        backgroundColor: "#FFFFFF",
      }}
    >
      {/* ВАЖНО: контейнер внутри TopBar */}
      <div
        style={{
          maxWidth,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-3)",
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
          <div style={{ minWidth: 0 }}>
            <BrandLockup iconSize={34} textClassName="text-[1.9rem]" />
            {subtitle ? (
              <div
                style={{
                  opacity: 0.65,
                  fontSize: 12,
                  marginTop: 2,
                  color: "var(--neutral-500)",
                }}
              >
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
