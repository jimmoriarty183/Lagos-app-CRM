"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

export function TaskGroupSection({
  title,
  count,
  hint,
  tone = "neutral",
  defaultOpen = true,
  persistenceKey,
  children,
}: {
  title: string;
  count: number;
  hint: string;
  tone?: "danger" | "primary" | "neutral";
  defaultOpen?: boolean;
  persistenceKey?: string;
  children: React.ReactNode;
}) {
  const storageKey = persistenceKey
    ? `task-group-section:${persistenceKey}`
    : null;

  // Read the persisted state synchronously during the first client render so
  // we never paint with the default-open state and then collapse — that flicker
  // is what users perceive as "the section reopens when I switch pages".
  // SSR returns defaultOpen because window is undefined there; on hydration
  // we re-sync to the persisted value if it differs.
  const [isOpen, setIsOpen] = React.useState(() => {
    if (typeof window === "undefined" || !storageKey) return defaultOpen;
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved === "1") return true;
      if (saved === "0") return false;
    } catch {
      // ignore storage errors
    }
    return defaultOpen;
  });

  // Skip the very first save effect run — the initial state already came from
  // localStorage, so writing it back is redundant and risks racing with the
  // load on rehydration. Persist every subsequent toggle.
  const skipFirstSaveRef = React.useRef(true);
  React.useEffect(() => {
    if (!storageKey) return;
    if (skipFirstSaveRef.current) {
      skipFirstSaveRef.current = false;
      return;
    }
    try {
      window.localStorage.setItem(storageKey, isOpen ? "1" : "0");
    } catch {
      // ignore storage errors
    }
  }, [storageKey, isOpen]);

  const textClass =
    tone === "danger"
      ? "text-[#B42318]"
      : tone === "primary"
        ? "text-[#3645A0] dark:text-[var(--brand-300)]"
        : "text-[#475467] dark:text-white/70";

  return (
    <section className="space-y-1.5">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-[14px] px-1 py-1 text-left transition hover:bg-[#F8FAFC] dark:hover:bg-white/[0.06]"
        aria-expanded={isOpen}
      >
        <div>
          <div className={`text-[12px] font-medium leading-4 ${textClass}`}>
            {title} ({count})
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-[#9CA3AF] dark:text-white/40">
              {hint}
            </span>
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] text-[#98A2B3] dark:text-white/45">
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </span>
          </div>
        </div>
      </button>

      {isOpen ? children : null}
    </section>
  );
}
