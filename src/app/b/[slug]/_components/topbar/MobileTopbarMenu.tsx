"use client";

import { useEffect, useRef, useState } from "react";
import { BarChart3, Building2, Menu, Settings, Shield, SlidersHorizontal, X } from "lucide-react";

type Props = {
  businessHref: string;
  settingsHref: string;
  adminHref?: string;
  clearHref: string;
  hasActiveFilters: boolean;
  canSeeAnalytics: boolean;
};

export default function MobileTopbarMenu({
  businessHref,
  settingsHref,
  adminHref,
  clearHref,
  hasActiveFilters,
  canSeeAnalytics,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const openFilters = () => {
    window.dispatchEvent(new CustomEvent("orders-mobile-open-filters"));
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm"
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+10px)] z-50 w-56 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
          {canSeeAnalytics ? (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-500">
              <BarChart3 className="h-4 w-4 text-slate-400" />
              <div className="min-w-0 flex-1">
                <div>Analytics</div>
                <div className="text-[11px] font-medium text-slate-400">Coming soon</div>
              </div>
              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Soon
              </span>
            </div>
          ) : null}

          <button
            type="button"
            onClick={openFilters}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50"
          >
            <SlidersHorizontal className="h-4 w-4 text-gray-500" />
            <span>Filters</span>
          </button>

          <a
            href={businessHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50"
          >
            <Building2 className="h-4 w-4 text-gray-500" />
            <span>Business</span>
          </a>

          <a
            href={settingsHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50"
          >
            <Settings className="h-4 w-4 text-gray-500" />
            <span>Settings</span>
          </a>

          {adminHref ? (
            <a
              href={adminHref}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50"
            >
              <Shield className="h-4 w-4 text-gray-500" />
              <span>Admin</span>
            </a>
          ) : null}

          {hasActiveFilters ? (
            <a
              href={clearHref}
              onClick={() => setOpen(false)}
              className="mt-1 block rounded-xl border border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              Clear filters
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
