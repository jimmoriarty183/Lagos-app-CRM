"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import { setOrderStatus } from "./actions";

type Status =
  | "NEW"
  | "IN_PROGRESS"
  | "WAITING_PAYMENT"
  | "DONE"
  | "CANCELED"
  | "DUPLICATE";

declare global {
  interface Window {
    __ordersOverlayClosingUntil?: number;
  }
}

function statusLabel(s: Status) {
  if (s === "IN_PROGRESS") return "IN PROGRESS";
  if (s === "WAITING_PAYMENT") return "WAITING PAYMENT";
  return s;
}

function markOverlayClosing() {
  if (typeof window === "undefined") return;
  window.__ordersOverlayClosingUntil = Date.now() + 400;
}

function suppressOverlayEvent(event: React.SyntheticEvent) {
  event.preventDefault();
  event.stopPropagation();
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
    case "WAITING_PAYMENT":
      return {
        background: "rgba(245,158,11,0.14)",
        border: "1px solid rgba(245,158,11,0.28)",
        color: "#b45309",
      };
    case "CANCELED":
      return {
        background: "rgba(239,68,68,0.10)",
        border: "1px solid rgba(239,68,68,0.22)",
        color: "#b91c1c",
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
  mobile,
  onClose,
}: {
  open: boolean;
  menuRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
  width?: number;
  mobile?: boolean;
  onClose?: () => void;
}) {
  if (!open) return null;

  if (mobile) {
    const overlay = (
      <div
        role="presentation"
        onPointerDown={suppressOverlayEvent}
        onPointerUp={(event) => {
          if (event.target !== event.currentTarget) return;
          suppressOverlayEvent(event);
        }}
        onTouchStart={(event) => {
          if (event.target !== event.currentTarget) return;
          suppressOverlayEvent(event);
        }}
        onTouchEnd={(event) => {
          if (event.target !== event.currentTarget) return;
          suppressOverlayEvent(event);
          markOverlayClosing();
          onClose?.();
        }}
        onMouseDown={(event) => {
          if (event.target !== event.currentTarget) return;
          suppressOverlayEvent(event);
        }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          suppressOverlayEvent(event);
          markOverlayClosing();
          onClose?.();
        }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 12,
          background: "rgba(15,23,42,0.42)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
        }}
      >
        <div
          ref={menuRef}
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => event.stopPropagation()}
          style={{
            width: "min(calc(100vw - 24px), 360px)",
            maxHeight: "min(52vh, 360px)",
            overflowY: "auto",
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
            padding: 8,
          }}
        >
          {children}
        </div>
      </div>
    );

    if (typeof document === "undefined") return null;
    return createPortal(overlay, document.body);
  }

  return (
    <div
      ref={menuRef}
      style={{
        position: "absolute",
        top: 36,
        right: 0,
        minWidth: width ?? 180,
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        boxShadow: "0 10px 30px rgba(0,0,0,0.10)",
        padding: 6,
        zIndex: 80,
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
  const [isMobile, setIsMobile] = useState(false);

  // optimistic
  const [local, setLocal] = useState<Status>(value);
  useEffect(() => setLocal(value), [value]);

  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useOutsideAndEscClose(open, () => setOpen(false), rootRef, menuRef);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const apply = () => setIsMobile(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!open || !isMobile) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [open, isMobile]);

  const options = useMemo(
    () =>
      [
        "NEW",
        "IN_PROGRESS",
        "WAITING_PAYMENT",
        "DONE",
        "CANCELED",
        "DUPLICATE",
      ] as Status[],
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
      style={{
        position: "relative",
        display: "inline-block",
        zIndex: open ? 80 : 1,
      }}
    >
      <Badge
        style={badgeStyleStatus(local)}
        disabled={isPending}
        title="Change status"
        onClick={() => setOpen((v) => !v)}
      >
        {statusLabel(local)}
      </Badge>

      <Menu
        open={open}
        menuRef={menuRef}
        width={210}
        mobile={isMobile}
        onClose={() => setOpen(false)}
      >
        {options.map((s) => (
          <MenuItem
            key={s}
            active={s === local}
            disabled={isPending}
            danger={s === "CANCELED"}
            onClick={() => {
              if (s === local) {
                markOverlayClosing();
                setOpen(false);
                return;
              }

              if (s === "CANCELED") {
                const ok = confirm("Cancel this order?");
                if (!ok) {
                  markOverlayClosing();
                  setOpen(false);
                  return;
                }
              }

              const prev = local;
              setLocal(s);
              markOverlayClosing();
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
