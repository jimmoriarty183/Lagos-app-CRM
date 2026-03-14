"use client";

import React, {
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";

import { setOrderStatus } from "./actions";
import { statusTone, type Status } from "./statusTone";

declare global {
  interface Window {
    __ordersOverlayClosingUntil?: number;
  }
}

function statusLabel(s: Status) {
  if (s === "IN_PROGRESS") return "In progress";
  if (s === "WAITING_PAYMENT") return "Waiting payment";
  if (s === "DONE") return "Done";
  if (s === "CANCELED") return "Canceled";
  if (s === "DUPLICATE") return "Duplicate";
  return "New";
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
  const tone = statusTone(status);

  return {
    background: tone.background,
    color: tone.color,
  };
}

function Badge({
  children,
  style,
  dotColor,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  style: React.CSSProperties;
  dotColor: string;
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
        height: 25,
        padding: "0 11px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        border: 0,
        cursor: disabled ? "default" : "pointer",
        userSelect: "none",
        whiteSpace: "nowrap",
        opacity: disabled ? 0.6 : 1,
        lineHeight: 1,
        transition: "background-color 140ms ease, color 140ms ease, opacity 140ms ease",
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: dotColor,
          flexShrink: 0,
        }}
      />
      {children}
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
            width: "min(calc(100vw - 24px), 320px)",
            maxHeight: "min(52vh, 340px)",
            overflowY: "auto",
            background: "white",
            border: "1px solid #E2E8F0",
            borderRadius: 14,
            boxShadow: "0 12px 32px rgba(15,23,42,0.12)",
            padding: 6,
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
        top: 34,
        right: 0,
        minWidth: width ?? 196,
        background: "white",
        border: "1px solid #E2E8F0",
        borderRadius: 14,
        boxShadow: "0 12px 32px rgba(15,23,42,0.12)",
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
  tone,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone: ReturnType<typeof statusTone>;
  active?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        textAlign: "left",
        minHeight: 36,
        padding: "8px 13px",
        borderRadius: 10,
        border: 0,
        background: active
          ? tone.selectedBackground
          : hovered
            ? "#F8FAFC"
            : "transparent",
        cursor: disabled ? "default" : "pointer",
        fontSize: 14,
        fontWeight: 500,
        color: active ? tone.color : "#182230",
        opacity: disabled ? 0.5 : 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 0,
        transition: "background-color 120ms ease, color 120ms ease",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        {children}
      </span>
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
  businessSlug,
  value,
  canManage,
}: {
  orderId: string;
  businessSlug: string;
  value: Status;
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isMobile, setIsMobile] = useState(false);

  const [local, setLocal] = useOptimistic<Status, Status>(value);

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
    const tone = statusTone(value);

    return (
      <span
        style={{
          ...badgeStyleStatus(value),
          height: 25,
          padding: "0 11px",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 500,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          border: 0,
          whiteSpace: "nowrap",
          lineHeight: 1,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: tone.dot,
            flexShrink: 0,
          }}
        />
        {statusLabel(value)}
      </span>
    );
  }

  const currentTone = statusTone(local);

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
        dotColor={currentTone.dot}
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
        {options.map((s) => {
          const tone = statusTone(s);

          return (
            <MenuItem
              key={s}
              active={s === local}
              disabled={isPending}
              tone={tone}
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
                markOverlayClosing();
                setOpen(false);

                startTransition(async () => {
                  setLocal(s);
                  try {
                    await setOrderStatus({ orderId, businessSlug, status: s });
                  } catch {
                    setLocal(prev);
                    alert("Failed to update status. Try again.");
                  }
                });
              }}
            >
              <>
                <span
                  aria-hidden="true"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: tone.dot,
                    flexShrink: 0,
                  }}
                />
                {statusLabel(s)}
              </>
            </MenuItem>
          );
        })}
      </Menu>
    </div>
  );
}
