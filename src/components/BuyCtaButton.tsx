"use client";

import { useState } from "react";

export type BuyCtaButtonProps = {
  /** Internal plan code stored in DB / Paddle (`solo` | `starter` | `business` | `pro`). */
  planCode: "solo" | "starter" | "business" | "pro";
  interval: "monthly" | "yearly";
  /** Kept for backwards compat with /pricing call sites. The cabinet looks
   *  the price up itself — public pages never talk to Paddle directly. */
  priceId?: string;
  label: string;
  className?: string;
  /** Optional override of the destination after auth (advanced use). */
  postAuthPath?: string;
};

const CHECKOUT_SOURCE = "homepage_pricing";

function buildPlanQuery(
  planCode: BuyCtaButtonProps["planCode"],
  interval: BuyCtaButtonProps["interval"],
  options: { autoCheckout?: boolean } = {},
) {
  const params = new URLSearchParams({
    plan: planCode,
    interval,
    src: CHECKOUT_SOURCE,
  });
  if (options.autoCheckout) params.set("autocheckout", "1");
  return params.toString();
}

type AuthState = {
  authenticated: boolean;
  isDemo: boolean;
  userId: string | null;
  hasBusiness: boolean;
};

async function fetchAuthState(): Promise<AuthState> {
  try {
    const response = await fetch("/api/auth/me", {
      method: "GET",
      cache: "no-store",
      credentials: "include",
    });
    if (!response.ok) {
      return { authenticated: false, isDemo: false, userId: null, hasBusiness: false };
    }
    const payload = (await response.json()) as {
      authenticated?: boolean;
      isDemo?: boolean;
      userId?: string | null;
      hasBusiness?: boolean;
    };
    return {
      authenticated: Boolean(payload.authenticated),
      isDemo: Boolean(payload.isDemo),
      userId: payload.userId ? String(payload.userId) : null,
      hasBusiness: Boolean(payload.hasBusiness),
    };
  } catch {
    return { authenticated: false, isDemo: false, userId: null, hasBusiness: false };
  }
}

export default function BuyCtaButton({
  planCode,
  interval,
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

    try {
      const auth = await fetchAuthState();

      if (auth.authenticated && auth.isDemo) {
        // Demo account is a shared sandbox — Paddle billing is intentionally
        // disabled. Block here so the user sees the reason instead of getting
        // a generic server error from /api/billing/* later in the funnel.
        setDemoBlocked(true);
        return;
      }

      // Per product requirement: from public surfaces (/, /pricing) we never
      // open Paddle directly. The user always passes through a logged-in
      // cabinet first so they can verify which email they're subscribing
      // under. The cabinet (=/onboarding/plan or /app/settings/billing) is
      // the surface that actually triggers Paddle, with autocheckout=1 to
      // resume the picked plan without a second click.
      const planQuery = buildPlanQuery(planCode, interval, {
        autoCheckout: true,
      });

      let destination: string;
      if (!auth.authenticated) {
        // Through login the user lands on /onboarding/business (with intent
        // preserved). After business creation the form forwards them to
        // /onboarding/plan?...&autocheckout=1 which fires Paddle.
        const next = postAuthPath ?? `/onboarding/business?${planQuery}`;
        destination = `/login?next=${encodeURIComponent(next)}`;
      } else if (!auth.hasBusiness) {
        // Authed but no workspace yet — same path as fresh signup, just
        // skipping the login step.
        destination = postAuthPath ?? `/onboarding/business?${planQuery}`;
      } else {
        // Established owner: take them straight to the in-app billing
        // surface where the topbar already shows their identity.
        destination = `/app/settings/billing?${planQuery}`;
      }

      window.location.href = destination;
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
