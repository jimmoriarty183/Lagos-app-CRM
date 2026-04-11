"use client";

import React from "react";
import { Spinner } from "@/components/ui/spinner";
import { BUSINESS_LIMIT_REACHED_CODE } from "@/lib/businesses/errors";
import { BusinessLimitPaywallState } from "@/components/businesses/BusinessLimitPaywallState";

type CreateBusinessApiError = {
  ok: false;
  code: string;
  message: string;
  current_usage?: number | null;
  limit?: number | null;
};

function ErrorBox({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
      {text}
    </div>
  );
}

export function OnboardingBusinessForm() {
  const [pending, setPending] = React.useState(false);
  const [businessName, setBusinessName] = React.useState("");
  const [localError, setLocalError] = React.useState("");
  const [limitError, setLimitError] = React.useState<{
    currentUsage: number | null;
    limit: number | null;
  } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError("");
    setLimitError(null);

    if (!businessName.trim()) {
      setLocalError("Enter your business name");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: businessName.trim(),
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as
        | { ok: true; business?: { slug?: string } }
        | CreateBusinessApiError;

      if (response.ok && payload.ok) {
        window.location.href = "/app/crm";
        return;
      }

      const errorPayload = payload as Partial<CreateBusinessApiError>;
      if (errorPayload.code === BUSINESS_LIMIT_REACHED_CODE) {
        setLimitError({
          currentUsage: errorPayload.current_usage ?? null,
          limit: errorPayload.limit ?? null,
        });
        return;
      }

      setLocalError(errorPayload.message || "Failed to create business");
    } catch {
      setLocalError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (limitError) {
    return (
      <BusinessLimitPaywallState
        currentUsage={limitError.currentUsage}
        limit={limitError.limit}
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
