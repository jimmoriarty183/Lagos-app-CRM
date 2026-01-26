"use client";

import React, { useState } from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
  size?: "sm" | "md";
};

export default function Button({
  variant = "primary",
  size = "md",
  style,
  onMouseEnter,
  onMouseLeave,
  disabled,
  ...props
}: Props) {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);

  const height = size === "sm" ? 40 : 44;

  const base: React.CSSProperties = {
    height,
    minWidth: 76,
    borderRadius: 12,
    fontWeight: 800,
    fontSize: 14,
    lineHeight: "14px",
    cursor: disabled ? "not-allowed" : "pointer",
    padding: "0 16px",
    userSelect: "none",
    transition:
      "transform 90ms ease, box-shadow 140ms ease, background 140ms ease, opacity 140ms ease, filter 140ms ease",
    opacity: disabled ? 0.55 : 1,

    // ✅ чтобы текст был по центру и не “плавал”
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
  };

  const primary: React.CSSProperties = {
    border: "1px solid rgba(17,17,17,0.9)",
    background: "#111",
    color: "#fff",
  };

  const secondary: React.CSSProperties = {
    border: "1px solid #ddd",
    background: "#fff",
    color: "#111",
  };

  const variantStyle = variant === "primary" ? primary : secondary;

  // ✅ более заметный hover + аккуратный active
  const dynamic: React.CSSProperties = disabled
    ? {}
    : {
        background:
          variant === "primary"
            ? hover
              ? "#222"
              : "#111"
            : hover
            ? "rgba(17,17,17,0.06)"
            : "#fff",

        boxShadow: active
          ? "0 2px 6px rgba(0,0,0,0.12)"
          : hover
          ? "0 10px 26px rgba(0,0,0,0.22)"
          : "0 1px 0 rgba(0,0,0,0.04)",

        transform: active
          ? "translateY(1px) scale(0.985)"
          : hover
          ? "translateY(-2px)"
          : "none",
      };

  return (
    <button
      {...props}
      disabled={disabled}
      style={{ ...base, ...variantStyle, ...dynamic, ...style }}
      onMouseEnter={(e) => {
        setHover(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setHover(false);
        setActive(false);
        onMouseLeave?.(e);
      }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
    />
  );
}
