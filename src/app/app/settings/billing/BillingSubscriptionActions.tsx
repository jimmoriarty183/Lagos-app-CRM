"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BillingSubscriptionActionsProps = {
  isOwner: boolean;
  accountId: string | null;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  cancelAtPeriodEnd: boolean;
};

export default function BillingSubscriptionActions(
  props: BillingSubscriptionActionsProps,
) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!props.isOwner || !props.accountId || !props.subscriptionId) {
    return null;
  }

  const normalizedStatus = String(props.subscriptionStatus ?? "").toLowerCase();
  const canCancel =
    !props.cancelAtPeriodEnd &&
    normalizedStatus !== "canceled" &&
    normalizedStatus !== "expired";

  const handleCancel = async () => {
    if (!canCancel || loading) return;
    const confirmed = window.confirm(
      "Cancel subscription at period end? Access remains active until period closes.",
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/billing/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: props.accountId,
          subscription_id: props.subscriptionId,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to cancel subscription");
      }
      setMessage(
        payload.message ||
          "Cancellation requested. Status will update after billing webhook.",
      );
      router.refresh();
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Failed to cancel subscription",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleCancel}
        disabled={!canCancel || loading}
        className="inline-flex items-center justify-center rounded-full border border-[#B91C1C] bg-white px-4 py-2 text-sm font-semibold text-[#B91C1C] transition hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:border-[#E5E7EB] disabled:text-[#9CA3AF]"
      >
        {props.cancelAtPeriodEnd
          ? "Cancellation scheduled"
          : loading
            ? "Requesting..."
            : "Cancel subscription"}
      </button>
      {message ? (
        <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2 text-xs text-[#1E3A8A]">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs text-[#991B1B]">
          {error}
        </div>
      ) : null}
    </div>
  );
}
