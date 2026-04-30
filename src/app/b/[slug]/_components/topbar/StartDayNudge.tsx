"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";

type Props = {
  todoCount: number;
  businessSlug: string;
  enabled?: boolean;
  dayKey?: string;
};

function buildDismissKey(businessSlug: string, dayKey: string) {
  return `start-day-nudge:dismissed:${businessSlug}:${dayKey}`;
}

export function StartDayNudge({
  todoCount,
  businessSlug,
  enabled = true,
  dayKey,
}: Props) {
  const router = useRouter();
  const effectiveDayKey = dayKey || new Date().toISOString().slice(0, 10);
  const storageKey = React.useMemo(
    () => buildDismissKey(businessSlug, effectiveDayKey),
    [businessSlug, effectiveDayKey],
  );
  const [hydrated, setHydrated] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(window.localStorage.getItem(storageKey) === "1");
    setHydrated(true);
  }, [storageKey]);

  if (!hydrated || !enabled || todoCount <= 0 || dismissed) {
    return null;
  }

  const handleOpenTodo = () => {
    router.push(`/b/${businessSlug}/today`);
  };

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, "1");
    }
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] shadow-lg">
        <div className="flex items-start gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] dark:bg-[var(--brand-600)]/15">
            <CheckCircle2 className="h-5 w-5 text-[var(--brand-600)]" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              You have {todoCount} {todoCount === 1 ? "item" : "items"} in To do
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-white/55">
              Start your day by reviewing pending tasks
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenTodo}
                className="inline-flex items-center justify-center rounded-xl bg-[var(--brand-600)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--brand-700)]"
              >
                Open To do
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-2 py-1.5 text-slate-500 dark:text-white/55 transition hover:bg-slate-50 dark:hover:bg-white/[0.06]"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
