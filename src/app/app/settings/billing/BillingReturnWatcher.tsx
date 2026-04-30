"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type BillingReturnWatcherProps = {
  accountId: string;
  enabled: boolean;
};

type SubscriptionPayload = {
  subscriptionId?: string | null;
};

export default function BillingReturnWatcher(props: BillingReturnWatcherProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(
    props.enabled ? "Payment received. Syncing billing status..." : null,
  );

  useEffect(() => {
    if (!props.enabled || !props.accountId) return;

    let attempts = 0;
    let cancelled = false;

    const poll = async () => {
      attempts += 1;
      try {
        const response = await fetch(
          `/api/billing/subscription?account_id=${encodeURIComponent(props.accountId)}`,
          { cache: "no-store" },
        );
        if (response.ok) {
          const payload = (await response.json()) as SubscriptionPayload;
          if (payload.subscriptionId) {
            setMessage("Billing is active. Refreshing...");
            router.replace("/app/settings/billing");
            router.refresh();
            return;
          }
        }
      } catch {
        // Keep polling; network/transient errors are expected in production.
      }

      if (cancelled) return;
      if (attempts >= 8) {
        setMessage("Payment is complete. Billing is still syncing, please refresh shortly.");
        return;
      }
      window.setTimeout(() => {
        void poll();
      }, 3500);
    };

    void poll();

    return () => {
      cancelled = true;
    };
  }, [props.accountId, props.enabled, router]);

  if (!message) return null;

  return (
    <div className="mt-3 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] dark:bg-[var(--brand-600)]/15 p-3 text-sm text-[#1E3A8A]">
      {message}
    </div>
  );
}
