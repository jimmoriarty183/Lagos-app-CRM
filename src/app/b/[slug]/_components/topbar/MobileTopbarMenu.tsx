"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  LifeBuoy,
  Menu,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { WorkDayControls } from "./WorkDayControls";

type Props = {
  businessId?: string;
  businessSlug: string;
  canManage: boolean;
  businessHref: string;
  todayHref: string;
  supportHref: string;
  clearHref: string;
  hasActiveFilters: boolean;
  canSeeAnalytics: boolean;
  userLabel: string;
  roleLabel: string;
};

export default function MobileTopbarMenu({
  businessId,
  businessSlug,
  canManage,
  businessHref,
  todayHref,
  supportHref,
  clearHref,
  hasActiveFilters,
  canSeeAnalytics,
  userLabel,
  roleLabel,
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
        <div className="absolute left-0 top-[calc(100%+10px)] z-[60] w-60 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
          <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-3">
            <div className="truncate text-sm font-semibold text-[#111827]">
              {userLabel}
            </div>
            <div className="pt-0.5 text-[11px] font-medium capitalize text-[#9CA3AF]">
              {roleLabel}
            </div>
          </div>

          {canSeeAnalytics ? (
            <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-500">
              <BarChart3 className="h-4 w-4 text-slate-400" />
              <div className="min-w-0 flex-1">
                <div>Analytics</div>
                <div className="text-[11px] font-medium text-slate-400">
                  Coming soon
                </div>
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
            <BriefcaseBusiness className="h-4 w-4 text-gray-500" />
            <span>CRM</span>
          </a>

          <a
            href={todayHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50"
          >
            <CalendarDays className="h-4 w-4 text-gray-500" />
            <span>Today</span>
          </a>

          <a
            href={supportHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50"
          >
            <LifeBuoy className="h-4 w-4 text-gray-500" />
            <span>Support</span>
          </a>

          {businessId && canManage ? (
            <>
              <div className="mt-2">
                <WorkDayControls
                  businessId={businessId}
                  businessSlug={businessSlug}
                  canManage={canManage}
                  compact
                  onActionComplete={() => setOpen(false)}
                />
              </div>
            </>
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
