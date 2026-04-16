"use client";

import React from "react";
import { Spinner } from "@/components/ui/spinner";
import { BUSINESS_LIMIT_REACHED_CODE } from "@/lib/businesses/errors";
import { BusinessLimitPaywallState } from "@/components/businesses/BusinessLimitPaywallState";
import { openCheckout } from "@/components/BuyButton";
import {
  clearCreateBusinessIntent,
  markCreateBusinessIntentUpgradeStarted,
  markCreateBusinessIntentRetry,
  readCreateBusinessIntent,
  saveCreateBusinessIntent,
} from "@/lib/businesses/create-business-intent";

type CreateBusinessApiError = {
  ok: false;
  code: string;
  message: string;
  current_usage?: number | null;
  limit?: number | null;
  upgrade_required?: boolean;
  recommended_plan?: string | null;
  next_limit?: number | null;
};

type UpgradeStartResponse =
  | {
      ok: true;
      mode: "change_plan_requested";
      message: string;
      next_paddle_price_id?: string | null;
      recommended_plan?: string | null;
      next_limit?: number | null;
    }
  | {
      ok: true;
      mode: "checkout_required";
      message: string;
      account_id?: string | null;
      next_paddle_price_id?: string | null;
      recommended_plan?: string | null;
      next_limit?: number | null;
    }
  | {
      ok: false;
      code: string;
      message: string;
      upgrade_required?: boolean;
      recommended_plan?: string | null;
      next_limit?: number | null;
    };

type LimitStatusResponse =
  | {
      ok: true;
      can_create: boolean;
      current_usage: number;
      limit: number | null;
      upgrade_required: boolean;
      recommended_plan: string | null;
      next_limit: number | null;
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

type LimitErrorState = {
  currentUsage: number | null;
  limit: number | null;
  upgradeRequired: boolean;
  recommendedPlan: string | null;
  nextLimit: number | null;
};

function ErrorBox({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
      {text}
    </div>
  );
}

function toLimitErrorState(payload: Partial<CreateBusinessApiError>): LimitErrorState {
  return {
    currentUsage: payload.current_usage ?? null,
    limit: payload.limit ?? null,
    upgradeRequired: payload.upgrade_required ?? true,
    recommendedPlan: payload.recommended_plan ?? null,
    nextLimit: payload.next_limit ?? null,
  };
}

export function OnboardingBusinessForm() {
  const [pending, setPending] = React.useState(false);
  const [upgradePending, setUpgradePending] = React.useState(false);
  const [continuePending, setContinuePending] = React.useState(false);
  const [businessName, setBusinessName] = React.useState("");
  const [localError, setLocalError] = React.useState("");
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [limitError, setLimitError] = React.useState<LimitErrorState | null>(null);

  const submitCreation = React.useCallback(
    async (
      draft: { business_name: string },
      options?: { preservePaywall?: boolean; fromResume?: boolean },
    ) => {
      setLocalError("");
      if (!options?.preservePaywall) {
        setLimitError(null);
      }

      const response = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      const payload = (await response.json().catch(() => ({}))) as
        | { ok: true; business?: { slug?: string } }
        | CreateBusinessApiError;

      if (response.ok && payload.ok) {
        clearCreateBusinessIntent();
        window.location.href = "/app/crm";
        return;
      }

      const errorPayload = payload as Partial<CreateBusinessApiError>;
      if (errorPayload.code === BUSINESS_LIMIT_REACHED_CODE) {
        saveCreateBusinessIntent({ business_name: draft.business_name });
        setLimitError(toLimitErrorState(errorPayload));
        if (options?.fromResume) {
          setStatusMessage("Upgrade is still processing. We saved your draft and will keep it ready.");
        }
        return;
      }

      setLocalError(errorPayload.message || "Failed to create business");
    },
    [],
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatusMessage(null);
    setLocalError("");

    if (!businessName.trim()) {
      setLocalError("Enter your business name");
      return;
    }

    setPending(true);
    try {
      await submitCreation({ business_name: businessName.trim() });
    } catch {
      setLocalError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const checkLimitAndContinue = React.useCallback(async () => {
    const intent = readCreateBusinessIntent();
    if (!intent?.draft?.business_name) {
      setStatusMessage("Your saved draft expired. Enter business details and continue.");
      clearCreateBusinessIntent();
      setLimitError(null);
      return;
    }

    const now = Date.now();
    if (intent.last_retry_at && now - intent.last_retry_at < 4000) {
      setStatusMessage("Still syncing your upgrade. Retry in a few seconds.");
      return;
    }

    setContinuePending(true);
    try {
      const response = await fetch("/api/businesses/limit-status", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as LimitStatusResponse;
      if (!response.ok || !payload.ok) {
        setStatusMessage(
          "We could not confirm your upgrade yet. Please refresh and try again.",
        );
        return;
      }

      if (!payload.can_create) {
        setLimitError({
          currentUsage: payload.current_usage,
          limit: payload.limit,
          upgradeRequired: payload.upgrade_required,
          recommendedPlan: payload.recommended_plan,
          nextLimit: payload.next_limit,
        });
        markCreateBusinessIntentRetry();
        setStatusMessage(
          "Upgrade received, but access is still syncing. Retry in a few seconds.",
        );
        return;
      }

      setBusinessName(intent.draft.business_name);
      setStatusMessage("Upgrade confirmed. Finishing your business creation...");
      await submitCreation(
        { business_name: intent.draft.business_name },
        { preservePaywall: true, fromResume: true },
      );
    } catch {
      setStatusMessage("Network error while checking upgrade status. Please try again.");
    } finally {
      setContinuePending(false);
    }
  }, [submitCreation]);

  const handleUpgrade = React.useCallback(async () => {
    if (upgradePending) return;
    const currentDraft = businessName.trim();
    if (currentDraft) {
      saveCreateBusinessIntent({ business_name: currentDraft });
    }

    setUpgradePending(true);
    setStatusMessage(null);
    try {
      const response = await fetch("/api/billing/upgrade/business-limit", {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as UpgradeStartResponse;

      if (!response.ok || !payload.ok) {
        setStatusMessage(
          payload.message || "We could not start the upgrade flow. Please try again.",
        );
        return;
      }

      if (payload.mode === "checkout_required") {
        const paddlePriceId = String(payload.next_paddle_price_id ?? "").trim();
        if (!paddlePriceId) {
          setStatusMessage("Upgrade checkout is unavailable right now. Please contact support.");
          return;
        }
        const accountId = String(payload.account_id ?? "").trim() || null;
        const opened = await openCheckout(paddlePriceId, {
          customData: {
            account_id: accountId,
            source: "onboarding_business_limit_upgrade",
          },
          successUrl: `${window.location.origin}/app/settings/billing?checkout=success&source=onboarding`,
        });
        if (!opened) {
          setStatusMessage("Could not open checkout. Please allow popups and try again.");
          return;
        }
        markCreateBusinessIntentUpgradeStarted();
        setStatusMessage("Complete checkout, then click Continue after upgrade.");
        return;
      }

      markCreateBusinessIntentUpgradeStarted();
      setStatusMessage(payload.message || "Upgrade requested. We are waiting for confirmation.");
    } catch {
      setStatusMessage("Network error while starting upgrade. Please try again.");
    } finally {
      setUpgradePending(false);
    }
  }, [businessName, upgradePending]);

  if (limitError) {
    return (
      <BusinessLimitPaywallState
        currentUsage={limitError.currentUsage}
        limit={limitError.limit}
        recommendedPlan={limitError.recommendedPlan}
        nextLimit={limitError.nextLimit}
        upgradePending={upgradePending}
        continuePending={continuePending}
        statusMessage={statusMessage}
        onUpgrade={handleUpgrade}
        onContinue={() => {
          void checkLimitAndContinue();
        }}
      />
    );
  }

  return (
    <section className="w-full overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_20px_60px_-42px_rgba(15,23,42,0.35)]">
      <div className="border-b border-slate-200 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
          Ordo onboarding
        </p>
        <h1 className="mt-2 text-[1.55rem] font-semibold tracking-tight text-slate-900">
          Create your business
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Add a business name to continue. You can change it later in settings.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3 px-6 py-6">
        <ErrorBox text={localError} />

        <label className="block">
          <div className="mb-1.5 text-[13px] font-semibold text-slate-700">Business name</div>
          <input
            name="business_name"
            type="text"
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Acme Operations"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[var(--brand-600)] focus:ring-4 focus:ring-[rgba(91,91,179,0.14)]"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="brand-primary-btn mt-1 flex h-11 w-full items-center justify-center rounded-xl border px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <Spinner className="h-4 w-4" />
              Creating business...
            </span>
          ) : (
            "Continue"
          )}
        </button>
      </form>
    </section>
  );
}
