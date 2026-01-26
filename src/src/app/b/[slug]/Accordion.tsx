"use client";

import { ReactNode, useId, useState } from "react";

type Props = {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  rightSlot?: ReactNode; // 👈 добавили
};

export default function Accordion({
  title,
  defaultOpen = false,
  children,
  rightSlot,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();

  return (
    <div>
      <button
        type="button"
        aria-controls={id}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "10px 12px",
          borderRadius: 14,
          border: "1px solid #e5e7eb",
          background: "white",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            minWidth: 0,
          }}
        >
          <span style={{ fontWeight: 900 }}>{title}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* 👇 справа любые действия, не закрывают аккордеон */}
          {rightSlot ? (
            <span
              onClick={(e) => {
                // чтобы клик по rightSlot не переключал open/close
                e.stopPropagation();
              }}
              style={{ display: "inline-flex", alignItems: "center" }}
            >
              {rightSlot}
            </span>
          ) : null}

          <span style={{ opacity: 0.6, fontWeight: 900 }}>
            {open ? "—" : "+"}
          </span>
        </div>
      </button>

      {open ? (
        <div id={id} style={{ padding: "12px 2px 0" }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
