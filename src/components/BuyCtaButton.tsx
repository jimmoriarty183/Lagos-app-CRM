"use client";

import { useState } from "react";
import { openCheckout } from "@/components/BuyButton";

export type BuyCtaButtonProps = {
  /** Internal plan code stored in DB / Paddle (`solo` | `starter` | `business` | `pro`). */
  planCode: "solo" | "starter" | "business" | "pro";
  interval: "monthly" | "yearly";
  priceId: string;
  label: string;
  className?: string;
  /** Path to land on after auth so checkout auto-resumes. */
  postAuthPath?: string;
};

const CHECKOUT_SOURCE = "homepage_pricing";

function buildBillingPath(
  planCode: BuyCtaButtonProps["planCode"],
  interval: BuyCtaButtonProps["interval"],
) {
  const params = new URLSearchParams({
    plan: planCode,
    interval,
    autocheckout: "1",
    src: CHECKOUT_SOURCE,
  });
  return `/app/settings/billing?${params.toString()}`;
}

type AuthState = { authenticated: boolean; isDemo: boolean };

async function fetchAuthState(): Promise<AuthState> {
  try {
    const response = await fetch("/api/auth/me", {
      method: "GET",
      cache: "no-store",
      credentials: "include",
    });
    if (!response.ok) return { authenticated: false, isDemo: false };
    const payload = (await response.json()) as {
      authenticated?: boolean;
      isDemo?: boolean;
    };
    return {
      authenticated: Boolean(payload.authenticated),
      isDemo: Boolean(payload.isDemo),
    };
  } catch {
    return { authenticated: false, isDemo: false };
  }
}

export default function BuyCtaButton({
  planCode,
  interval,
  priceId,
  label,
  className,
  postAuthPath,
}: BuyCtaButtonProps) {
  const [busy, setBusy] = useState(false);
  const [demoBlocked, setDemoBlocked] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    setDemoBlocked(false);

    const billingPath = postAuthPath ?? buildBillingPath(planCode, interval);

    try {
      const auth = await fetchAuthState();

      if (!auth.authenticated) {
        // Preserve checkout intent through login: post-auth lands on the billing
        // page with autocheckout=1 so Paddle reopens without a second click.
        window.location.href = `/login?next=${encodeURIComponent(billingPath)}`;
        return;
      }

      if (auth.isDemo) {
        // Demo account is a shared sandbox — Paddle billing is intentionally
        // disabled. Surface that here instead of letting the modal/Paddle open
        // for a transaction that the server would reject anyway.
        setDemoBlocked(true);
        return;
      }

      // Authenticated, non-demo: open Paddle directly. successUrl returns the
      // user to settings/billing where webhooks have updated the snapshot.
      const opened = await openCheckout(priceId, {
        customData: {
          plan_code: planCode,
          billing_interval: interval,
          source: CHECKOUT_SOURCE,
        },
        successUrl: `${window.location.origin}/app/settings/billing?checkout=success&source=homepage`,
      });

      if (!opened) {
        // Paddle failed to load (network / token issue) — fall back to the
        // settings/billing page so the user can retry from a stable surface.
        window.location.href = billingPath;
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className={className}
        aria-label={label}
      >
        {busy ? "Loading..." : label}
      </button>
      {demoBlocked ? (
        <p className="mt-2 text-[11px] font-medium leading-snug text-rose-600">
          Demo account can&apos;t purchase plans. Sign out and create a real
          account to upgrade.
        </p>
      ) : null}
    </>
  );
}
