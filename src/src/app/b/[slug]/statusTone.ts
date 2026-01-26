export type Status =
  | "NEW"
  | "IN_PROGRESS"
  | "WAITING_PAYMENT"
  | "DONE"
  | "CANCELED"
  | "DUPLICATE";

export function statusTone(status: Status) {
  // те самые "эталонные" стили
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

// чтобы можно было импортить и так и так:
export const badgeStyleStatus = statusTone;
