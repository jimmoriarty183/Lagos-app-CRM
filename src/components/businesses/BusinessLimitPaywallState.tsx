"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

type BusinessLimitPaywallStateProps = {
  currentUsage: number | null;
  limit: number | null;
};

function formatLimit(limit: number | null) {
  if (limit === null) return "Unlimited";
  return `${limit}`;
}

export function BusinessLimitPaywallState({
  currentUsage,
  limit,
}: BusinessLimitPaywallStateProps) {
  return (
    <section className="w-full overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_20px_60px_-42px_rgba(15,23,42,0.35)]">
      <div className="border-b border-slate-200 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
          Workspace limit reached
        </p>
        <h1 className="mt-2 text-[1.55rem] font-semibold tracking-tight text-slate-900">
          Upgrade to add another business
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          You have reached the workspace cap on your current plan. Upgrade now to
          create more businesses and keep scaling.
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

        <Button asChild className="h-11 w-full rounded-xl text-sm font-semibold">
          <Link href="/pricing">Upgrade plan</Link>
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
