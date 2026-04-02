import type { SubscriptionStatus } from "@/lib/billing/types";

export function normalizeSubscriptionStatus(input: string | null | undefined): SubscriptionStatus {
  const status = String(input ?? "")
    .trim()
    .toLowerCase();

  if (status === "trialing") return "trialing";
  if (status === "active") return "active";
  if (status === "past_due") return "past_due";
  if (status === "paused") return "paused";
  if (status === "expired") return "expired";
  if (status === "canceled" || status === "cancelled") return "canceled";
  return "expired";
}

export function deriveEndedAt(
  status: SubscriptionStatus,
  currentPeriodEnd: string | null,
  canceledAt: string | null,
): string | null {
  if (status === "canceled" || status === "expired") {
    return canceledAt ?? currentPeriodEnd ?? new Date().toISOString();
  }
  return null;
}

