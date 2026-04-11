"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

type BusinessLimitPaywallStateProps = {
  currentUsage: number | null;
  limit: number | null;
  recommendedPlan?: string | null;
  nextLimit?: number | null;
  upgradePending?: boolean;
  continuePending?: boolean;
  statusMessage?: string | null;
  onUpgrade?: () => void;
  onContinue?: () => void;
};

function formatLimit(limit: number | null) {
  if (limit === null) return "Unlimited";
  return `${limit}`;
}

function formatPlanName(plan: string | null | undefined) {
  const trimmed = String(plan ?? "").trim();
  if (!trimmed) return "the next plan";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function BusinessLimitPaywallState({
  currentUsage,
  limit,
  recommendedPlan = null,
  nextLimit = null,
  upgradePending = false,
  continuePending = false,
  statusMessage = null,
  onUpgrade,
  onContinue,
}: BusinessLimitPaywallStateProps) {
  const planName = formatPlanName(recommendedPlan);
  const nextLimitLabel = formatLimit(nextLimit);

  return (
    <section className="w-full overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_20px_60px_-42px_rgba(15,23,42,0.35)]">
      <div className="border-b border-slate-200 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
          Business limit reached
        </p>
        <h1 className="mt-2 text-[1.55rem] font-semibold tracking-tight text-slate-900">
          You have reached your business limit
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Upgrade to {planName} to create up to {nextLimitLabel} businesses and keep
          expanding without interruption.
        </p>
      </div>

      <div className="space-y-4 px-6 py-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Current usage
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {currentUsage ?? "-"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Plan limit
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {formatLimit(limit)}
            </p>
          </div>
        </div>

        {statusMessage ? (
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            {statusMessage}
          </div>
        ) : null}

        <Button
          type="button"
          onClick={onUpgrade}
          disabled={upgradePending}
          className="h-11 w-full rounded-xl text-sm font-semibold"
        >
          {upgradePending ? "Starting upgrade..." : "Upgrade plan"}
        </Button>

        <Button
          type="button"
          onClick={onContinue}
          disabled={continuePending}
          variant="outline"
          className="h-11 w-full rounded-xl text-sm font-semibold"
        >
          {continuePending ? "Checking upgrade..." : "Continue after upgrade"}
        </Button>

        <Button
          asChild
          variant="outline"
          className="h-11 w-full rounded-xl text-sm font-semibold"
        >
          <Link href="/select-business">Use existing businesses</Link>
        </Button>
      </div>
    </section>
  );
}
