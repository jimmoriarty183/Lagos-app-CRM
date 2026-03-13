"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  Settings,
  SlidersHorizontal,
} from "lucide-react";

import DesktopSidebarFilters from "./DesktopSidebarFilters";

type Status =
  | "NEW"
  | "IN_PROGRESS"
  | "WAITING_PAYMENT"
  | "DONE"
  | "CANCELED"
  | "DUPLICATE";

type Range = "ALL" | "today" | "week" | "month" | "year";

type TeamActor = {
  id: string;
  label: string;
  kind: "OWNER" | "MANAGER";
};

type Props = {
  phoneRaw: string;
  q: string;
  status: "ALL" | "OVERDUE" | Status;
  range: Range;
  actor: string;
  actors: TeamActor[];
  hasActiveFilters: boolean;
  clearHref: string;
  businessHref: string;
  canSeeAnalytics: boolean;
};

const MENU_STORAGE_KEY = "orders-desktop-menu-expanded";

function RailLink({
  icon,
  label,
  description,
  href,
  disabled = false,
  expanded = false,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  href?: string;
  disabled?: boolean;
  expanded?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  const cls = [
    "group relative flex rounded-2xl border shadow-sm transition-colors",
    expanded
      ? "min-h-14 w-full items-start justify-start gap-3 px-4 py-3"
      : "h-12 w-12 items-center justify-center",
    active
      ? "border-gray-300 bg-gray-100 text-gray-900"
      : disabled
        ? "border-gray-200 bg-white text-gray-300"
        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
  ].join(" ");

  const body = (
    <>
      <span className="shrink-0">{icon}</span>
      {expanded ? (
        <span className="min-w-0 pt-0.5 text-left">
          <span className="block text-sm font-semibold leading-5">{label}</span>
          {description ? (
            <span className="mt-0.5 block text-xs font-medium leading-4 text-gray-500">
              {description}
            </span>
          ) : null}
        </span>
      ) : (
        <>
          <span className="sr-only">{label}</span>
          <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-20 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 shadow-sm group-hover:block">
            {label}
          </span>
        </>
      )}
    </>
  );

  if (href && !disabled) {
    return (
      <a className={cls} href={href} aria-label={label}>
        {body}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={cls}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      {body}
    </button>
  );
}

export default function DesktopLeftRail({
  phoneRaw,
  q,
  status,
  range,
  actor,
  actors,
  hasActiveFilters,
  clearHref,
  businessHref,
  canSeeAnalytics,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(MENU_STORAGE_KEY);
    if (stored === "true") {
      setExpanded(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(MENU_STORAGE_KEY, expanded ? "true" : "false");
  }, [expanded]);

  const toggleExpanded = () => {
    setExpanded((prev) => !prev);
  };

  const toggleFilters = () => {
    setFiltersOpen((prev) => !prev);
  };

  return (
    <div className="relative hidden lg:block">
      <div className="sticky top-24">
        <div className="relative">
          <div
            className={[
              "absolute left-0 top-0 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm transition-all",
              expanded ? "w-[220px]" : "w-[60px]",
            ].join(" ")}
          >
            <div className="flex flex-col gap-2">
              <RailLink
                icon={
                  expanded ? (
                    <ChevronsLeft className="h-5 w-5" />
                  ) : (
                    <ChevronsRight className="h-5 w-5" />
                  )
                }
                label={expanded ? "Collapse menu" : "Expand menu"}
                expanded={expanded}
                onClick={toggleExpanded}
              />

              <RailLink
                icon={<SlidersHorizontal className="h-5 w-5" />}
                label="Filters"
                description="Search and narrow orders"
                expanded={expanded}
                active={filtersOpen}
                onClick={toggleFilters}
              />

              {canSeeAnalytics ? (
                <RailLink
                icon={<LayoutDashboard className="h-5 w-5" />}
                label="Analytics"
                description="Jump to KPI section"
                expanded={expanded}
                href="#analytics"
              />
              ) : null}

              <RailLink
                icon={<Building2 className="h-5 w-5" />}
                label="Business"
                description="Manage access and managers"
                expanded={expanded}
                href={businessHref}
              />

              <RailLink
                icon={<Settings className="h-5 w-5" />}
                label="Settings"
                description="More options soon"
                expanded={expanded}
                disabled
              />
            </div>
          </div>

          {filtersOpen ? (
            <div
              className={[
                "absolute top-0 z-20 w-[340px]",
                expanded ? "left-[236px]" : "left-[84px]",
              ].join(" ")}
            >
              <DesktopSidebarFilters
                phoneRaw={phoneRaw}
                q={q}
                status={status}
                range={range}
                actor={actor}
                actors={actors}
                hasActiveFilters={hasActiveFilters}
                clearHref={clearHref}
              />
            </div>
          ) : null}

          <div className="h-[60px] w-[60px]" />
        </div>
      </div>
    </div>
  );
}
