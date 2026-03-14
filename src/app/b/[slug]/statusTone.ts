export type Status =
  | "NEW"
  | "IN_PROGRESS"
  | "WAITING_PAYMENT"
  | "DONE"
  | "CANCELED"
  | "DUPLICATE";

type StatusTone = {
  background: string;
  color: string;
  dot: string;
  selectedBackground: string;
};

export function statusTone(status: Status): StatusTone {
  switch (status) {
    case "DONE":
      return {
        background: "#ECFDF5",
        color: "#059669",
        dot: "#047857",
        selectedBackground: "#DDF7EA",
      };
    case "IN_PROGRESS":
      return {
        background: "#EFF6FF",
        color: "#2563EB",
        dot: "#2563EB",
        selectedBackground: "#DFECFF",
      };
    case "WAITING_PAYMENT":
      return {
        background: "#FFF7ED",
        color: "#EA580C",
        dot: "#C2410C",
        selectedBackground: "#FFE9D6",
      };
    case "CANCELED":
      return {
        background: "#FEF2F2",
        color: "#DC2626",
        dot: "#B91C1C",
        selectedBackground: "#FDE2E2",
      };
    case "DUPLICATE":
      return {
        background: "#F5F3FF",
        color: "#756EAE",
        dot: "#9A93D6",
        selectedBackground: "#ECE8FF",
      };
    case "NEW":
    default:
      return {
        background: "#F1F5F9",
        color: "#475569",
        dot: "#64748B",
        selectedBackground: "#E7EDF5",
      };
  }
}

export const badgeStyleStatus = statusTone;
