"use client";

import { ReactNode, useEffect, useId, useState } from "react";
import { ChevronDown } from "lucide-react";

type Props = {
  title: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  rightSlot?: ReactNode;
  storageKey?: string;
};

export default function MobileAccordion({
  title,
  defaultOpen = false,
  children,
  rightSlot,
  storageKey,
}: Props) {
  const [open, setOpen] = useState(() => {
    if (!storageKey || typeof window === "undefined") return defaultOpen;
    const stored = window.localStorage.getItem(storageKey);
    if (stored === "open") return true;
    if (stored === "closed") return false;
    return defaultOpen;
  });
  const id = useId();

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, open ? "open" : "closed");
  }, [open, storageKey]);

  return (
    <div className="w-full">
      <button
        type="button"
        aria-controls={id}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={[
          "flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-4 py-3 shadow-sm",
          "transition-colors hover:bg-gray-50",
        ].join(" ")}
      >
        <div className="min-w-0 flex items-center gap-2">
          <span className="truncate text-sm font-extrabold text-gray-900 dark:text-white">{title}</span>
        </div>

        <div className="flex items-center gap-2">
          {rightSlot ? (
            <span onClick={(event) => event.stopPropagation()} className="inline-flex items-center">
              {rightSlot}
            </span>
          ) : null}

          <span
            className={[
              "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] text-gray-600 dark:text-white/70",
              "transition-transform",
              open ? "rotate-180" : "rotate-0",
            ].join(" ")}
            aria-hidden="true"
          >
            <ChevronDown className="h-4 w-4" />
          </span>
        </div>
      </button>

      {open ? (
        <div id={id} className="pt-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}
