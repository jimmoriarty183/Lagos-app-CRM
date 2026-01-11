"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { setOrderPaid, setOrderStatus } from "./actions";

type Status = "NEW" | "IN_PROGRESS" | "DONE" | "CANCELED" | "DUPLICATE";

function statusLabel(s: Status) {
  return s === "IN_PROGRESS" ? "IN PROGRESS" : s;
}

function badgeStyleStatus(status: Status): React.CSSProperties {
  switch (status) {
    case "DONE":
      return {
        background: "rgba(34,197,94,0.12)",
        border: "1px solid rgba(34,197,94,0.25)",
        color: "#15803d",
      };
    case "IN_PROGRESS":
      return {
        background: "rgba(59,130,246,0.12)",
        border: "1px solid rgba(59,130,246,0.25)",
        color: "#1d4ed8",
      };
    case "CANCELED":
      return {
        background: "rgba(245,158,11,0.14)",
        border: "1px solid rgba(245,158,11,0.28)",
        color: "#b45309",
      };
    case "DUPLICATE":
      return {
        background: "rgba(148,163,184,0.14)",
        border: "1px solid rgba(148,163,184,0.28)",
        color: "#334155",
      };
    case "NEW":
    default:
      return {
        background: "rgba(0,0,0,0.04)",
        border: "1px solid rgba(0,0,0,0.10)",
        color: "#111827",
      };
  }
}

function badgeStylePaid(): React.CSSProperties {
  return {
    background: "rgba(0,0,0,0.04)",
    border: "1px solid rgba(0,0,0,0.10)",
    color: "#111827",
  };
}

function Badge({
  children,
  style,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  style: React.CSSProperties;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={disabled ? undefined : onClick}
      style={{
        height: 30,
        padding: "0 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: 0.2,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        cursor: disabled ? "default" : "pointer",
        userSelect: "none",
        whiteSpace: "nowrap",
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
    >
      {children}
      {!disabled ? (
        <span style={{ opacity: 0.5, fontWeight: 900 }}>▾</span>
      ) : null}
    </button>
  );
}

function Menu({
  open,
  menuRef,
  children,
  width,
}: {
  open: boolean;
  menuRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
  width?: number;
}) {
  if (!open) return null;

  return (
    <div
      ref={menuRef}
      style={{
        position: "absolute",
        top: 36,
        left: 0,
        minWidth: width ?? 160,
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        boxShadow: "0 10px 30px rgba(0,0,0,0.10)",
        padding: 6,
        zIndex: 50,
      }}
    >
      {children}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  disabled,
  danger,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "8px 10px",
        borderRadius: 10,
        border: 0,
        background: active ? "rgba(0,0,0,0.05)" : "transparent",
        cursor: disabled ? "default" : "pointer",
        fontSize: 13,
        fontWeight: 800,
        color: danger ? "#b91c1c" : "#111827",
        opacity: disabled ? 0.5 : 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "rgba(0,0,0,0.04)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      <span>{children}</span>
      {active ? <span style={{ opacity: 0.6 }}>✓</span> : null}
    </button>
  );
}

function useOutsideAndEscClose(
  open: boolean,
  onClose: () => void,
  rootRef: React.RefObject<HTMLDivElement | null>,
  menuRef: React.RefObject<HTMLDivElement | null>
) {
  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node | null;
      if (!t) return;

      const root = rootRef.current;
      const menu = menuRef.current;

      if (root && root.contains(t)) return;
      if (menu && menu.contains(t)) return;

      onClose();
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, rootRef, menuRef]);
}

export function StatusCell({
  orderId,
  value,
  canManage,
}: {
  orderId: string;
  value: Status;
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // optimistic
  const [local, setLocal] = useState<Status>(value);
  useEffect(() => setLocal(value), [value]);

  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useOutsideAndEscClose(open, () => setOpen(false), rootRef, menuRef);

  const options = useMemo(
    () => ["NEW", "IN_PROGRESS", "DONE", "CANCELED", "DUPLICATE"] as Status[],
    []
  );

  if (!canManage) {
    return (
      <span
        style={{
          ...badgeStyleStatus(value),
          height: 30,
          padding: "0 10px",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 800,
          display: "inline-flex",
          alignItems: "center",
          whiteSpace: "nowrap",
        }}
      >
        {statusLabel(value)}
      </span>
    );
  }

  return (
    <div
      ref={rootRef}
      style={{ position: "relative", display: "inline-block" }}
    >
      <Badge
        style={badgeStyleStatus(local)}
        disabled={isPending}
        title="Change status"
        onClick={() => setOpen((v) => !v)}
      >
        {statusLabel(local)}
      </Badge>

      <Menu open={open} menuRef={menuRef} width={190}>
        {options.map((s) => (
          <MenuItem
            key={s}
            active={s === local}
            disabled={isPending}
            danger={s === "CANCELED"}
            onClick={() => {
              if (s === local) {
                setOpen(false);
                return;
              }

              if (s === "CANCELED") {
                const ok = confirm("Cancel this order?");
                if (!ok) {
                  setOpen(false);
                  return;
                }
              }

              const prev = local;
              setLocal(s);
              setOpen(false);

              startTransition(async () => {
                try {
                  await setOrderStatus({ orderId, status: s });
                } catch {
                  setLocal(prev);
                  alert("Failed to update status. Try again.");
                }
              });
            }}
          >
            {statusLabel(s)}
          </MenuItem>
        ))}
      </Menu>
    </div>
  );
}

export function PaidCell({
  orderId,
  value,
  canManage,
}: {
  orderId: string;
  value: boolean;
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // optimistic
  const [local, setLocal] = useState<boolean>(value);
  useEffect(() => setLocal(value), [value]);

  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useOutsideAndEscClose(open, () => setOpen(false), rootRef, menuRef);

  if (!canManage) {
    return (
      <span
        style={{
          ...badgeStylePaid(),
          height: 30,
          padding: "0 10px",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 800,
          display: "inline-flex",
          alignItems: "center",
          whiteSpace: "nowrap",
        }}
      >
        {local ? "PAID" : "NOT PAID"}
      </span>
    );
  }

  return (
    <div
      ref={rootRef}
      style={{ position: "relative", display: "inline-block" }}
    >
      <Badge
        style={badgeStylePaid()}
        disabled={isPending}
        title="Change paid"
        onClick={() => setOpen((v) => !v)}
      >
        {local ? "PAID" : "NOT PAID"}
      </Badge>

      <Menu open={open} menuRef={menuRef} width={160}>
        <MenuItem
          active={local === true}
          disabled={isPending}
          onClick={() => {
            if (local === true) {
              setOpen(false);
              return;
            }

            const prev = local;
            setLocal(true);
            setOpen(false);

            startTransition(async () => {
              try {
                await setOrderPaid({ orderId, paid: true });
              } catch {
                setLocal(prev);
                alert("Failed to update paid. Try again.");
              }
            });
          }}
        >
          PAID
        </MenuItem>

        <MenuItem
          active={local === false}
          disabled={isPending}
          onClick={() => {
            if (local === false) {
              setOpen(false);
              return;
            }

            const prev = local;
            setLocal(false);
            setOpen(false);

            startTransition(async () => {
              try {
                await setOrderPaid({ orderId, paid: false });
              } catch {
                setLocal(prev);
                alert("Failed to update paid. Try again.");
              }
            });
          }}
        >
          NOT PAID
        </MenuItem>
      </Menu>
    </div>
  );
}
