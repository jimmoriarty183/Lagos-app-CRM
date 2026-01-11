"use client";

import React, { useState } from "react";

type Props = {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

export default function Accordion({
  title,
  defaultOpen = false,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        border: "1px solid #e5e5e5",
        borderRadius: 12,
        background: "white",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px",
          background: "white",
          border: "none",
          cursor: "pointer",
        }}
      >
        <div style={{ fontWeight: 800 }}>{title}</div>

        <div
          aria-hidden
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            border: "1px solid #ddd",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            fontWeight: 900,
            lineHeight: "18px",
            transition: "transform 120ms ease",
            transform: open ? "rotate(45deg)" : "rotate(0deg)", // + -> x
          }}
        >
          +
        </div>
      </button>

      {open && (
        <div style={{ padding: 16, borderTop: "1px solid #eee" }}>
          {children}
        </div>
      )}
    </div>
  );
}
