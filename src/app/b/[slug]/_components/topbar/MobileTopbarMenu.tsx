"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Boxes,
  BriefcaseBusiness,
  CalendarDays,
  LifeBuoy,
  Menu,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { WorkDayControls } from "./WorkDayControls";

type Props = {
  businessId?: string;
  businessSlug: string;
  canManage: boolean;
  analyticsHref?: string;
  businessHref: string;
  clientsHref: string;
  catalogHref?: string;
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
  analyticsHref,
  businessHref,
  clientsHref,
  catalogHref,
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
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] text-slate-600 dark:text-white/70 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/[0.06]"
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+10px)] z-[60] w-60 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-2 shadow-[0_12px_28px_rgba(16,24,40,0.12)]">
          <div className="rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-[#F9FAFB] dark:bg-white/[0.04] px-3 py-3">
            <div className="truncate text-sm font-semibold text-[#1F2937] dark:text-white/90">
              {userLabel}
            </div>
            <div className="pt-0.5 text-[11px] font-medium capitalize text-[#9CA3AF] dark:text-white/40">
              {roleLabel}
            </div>
          </div>

          {canSeeAnalytics ? (
            <a
              href={analyticsHref ?? `/b/${businessSlug}/analytics`}
              onClick={() => setOpen(false)}
              className="mt-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#1F2937] dark:text-white/90 transition-colors hover:bg-[#F9FAFB] dark:hover:bg-white/[0.06]"
            >
              <BarChart3 className="h-4 w-4 text-[#6B7280] dark:text-white/55" />
              <span>Analytics</span>
            </a>
          ) : null}

          <button
            type="button"
            onClick={openFilters}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-[#1F2937] dark:text-white/90 transition-colors hover:bg-[#F9FAFB] dark:hover:bg-white/[0.06]"
          >
            <SlidersHorizontal className="h-4 w-4 text-[#6B7280] dark:text-white/55" />
            <span>Filters</span>
          </button>

          <a
            href={businessHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#1F2937] dark:text-white/90 transition-colors hover:bg-[#F9FAFB] dark:hover:bg-white/[0.06]"
          >
            <BriefcaseBusiness className="h-4 w-4 text-[#6B7280] dark:text-white/55" />
            <span>CRM</span>
          </a>

          <a
            href={clientsHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#1F2937] dark:text-white/90 transition-colors hover:bg-[#F9FAFB] dark:hover:bg-white/[0.06]"
          >
            <Users className="h-4 w-4 text-[#6B7280] dark:text-white/55" />
            <span>Clients</span>
          </a>

          <a
            href={catalogHref ?? `/b/${businessSlug}/catalog/products`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#1F2937] dark:text-white/90 transition-colors hover:bg-[#F9FAFB] dark:hover:bg-white/[0.06]"
          >
            <Boxes className="h-4 w-4 text-[#6B7280] dark:text-white/55" />
            <span>Catalog</span>
          </a>

          <a
            href={todayHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#1F2937] dark:text-white/90 transition-colors hover:bg-[#F9FAFB] dark:hover:bg-white/[0.06]"
          >
            <CalendarDays className="h-4 w-4 text-[#6B7280] dark:text-white/55" />
            <span>Today</span>
          </a>

          <a
            href={supportHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#1F2937] dark:text-white/90 transition-colors hover:bg-[#F9FAFB] dark:hover:bg-white/[0.06]"
          >
            <LifeBuoy className="h-4 w-4 text-[#6B7280] dark:text-white/55" />
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
              className="mt-1 block rounded-xl border border-gray-200 dark:border-white/10 px-3 py-2 text-center text-xs font-semibold text-[#6B7280] dark:text-white/55 hover:bg-[#F9FAFB] dark:hover:bg-white/[0.06]"
            >
              Clear filters
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
