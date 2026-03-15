"use client";

import type { ReactNode } from "react";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  BarChart3,
  Building2,
  ChevronsLeft,
  ChevronsRight,
  Settings,
  SlidersHorizontal,
} from "lucide-react";

import DesktopSidebarFilters from "./DesktopSidebarFilters";
import type { StatusFilterValue } from "@/lib/business-statuses";
import type { DashboardRange } from "@/lib/order-dashboard-summary";

type TeamActor = {
  id: string;
  label: string;
  kind: "OWNER" | "MANAGER";
};

type Props = {
  businessId: string;
  phoneRaw: string;
  q: string;
  statuses: StatusFilterValue[];
  statusMode: "default" | "all" | "custom";
  range: DashboardRange;
  summaryRange: DashboardRange;
  startDate: string | null;
  endDate: string | null;
  actor: string;
  actors: TeamActor[];
  currentUserId: string | null;
  hasActiveFilters: boolean;
  activeFiltersCount: number;
  clearHref: string;
  businessHref: string;
  settingsHref: string;
  canSeeAnalytics: boolean;
  showFilters?: boolean;
  activeSection?: "business" | "settings";
  layoutMode?: "list" | "kanban";
};

const MENU_STORAGE_KEY = "orders-desktop-menu-expanded";
const MENU_STORAGE_EVENT = "orders-desktop-menu-expanded-change";
const TOGGLE_FILTERS_EVENT = "orders-desktop-toggle-filters";

function subscribeExpanded(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleChange = () => onStoreChange();
  window.addEventListener("storage", handleChange);
  window.addEventListener(MENU_STORAGE_EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(MENU_STORAGE_EVENT, handleChange);
  };
}

function getExpandedSnapshot() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MENU_STORAGE_KEY) === "true";
}

function getExpandedServerSnapshot() {
  return false;
}

function RailLink({
  icon,
  label,
  description,
  href,
  disabled = false,
  expanded = false,
  active = false,
  badgeCount = 0,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  description?: string;
  href?: string;
  disabled?: boolean;
  expanded?: boolean;
  active?: boolean;
  badgeCount?: number;
  onClick?: () => void;
}) {
  const hoverable = !disabled;
  const cls = [
    "group relative flex border shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-150",
    expanded
      ? "min-h-14 w-full items-start justify-start gap-3 rounded-2xl px-4 py-3"
      : "h-12 w-12 items-center justify-center rounded-2xl",
    active
      ? "border-[#b7c8e6] bg-[#eaf2ff] text-[#0f172a] shadow-[0_10px_24px_rgba(59,130,246,0.12)] ring-1 ring-[#d7e5ff]"
      : disabled
        ? "cursor-not-allowed border-[#e3e7ef] bg-[#f8fafc] text-[#b1b9c8] opacity-90"
        : "cursor-pointer border-[#dde3ee] bg-white text-[#667085] hover:-translate-y-[1px] hover:border-[#bfd0ea] hover:bg-[#f4f8ff] hover:text-[#0f172a] hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]",
  ].join(" ");

  const body = (
    <>
      <span
        className={[
          "relative shrink-0 rounded-xl transition-colors duration-150",
          active
            ? "bg-white/80 p-2 text-[#1d4ed8]"
            : disabled
              ? "bg-white/70 p-2 text-[#b1b9c8]"
              : "p-2 text-current group-hover:bg-white",
        ].join(" ")}
      >
        {icon}
        {badgeCount > 0 ? (
          <span
            className={[
              "absolute -right-2 -top-2 inline-flex min-w-5 items-center justify-center rounded-full border border-white bg-[#2f6fed] px-1 text-[10px] font-bold leading-5 text-white shadow-[0_6px_12px_rgba(47,111,237,0.28)]",
              expanded ? "h-5" : "h-5",
            ].join(" ")}
          >
            {badgeCount}
          </span>
        ) : null}
      </span>
      {expanded ? (
        <span className="min-w-0 flex-1 pt-0.5 text-left">
          <span className="flex items-center gap-2">
            <span className="block text-sm font-semibold leading-5">{label}</span>
            {badgeCount > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#eef4ff] px-1.5 text-[10px] font-bold text-[#2459d3]">
                {badgeCount}
              </span>
            ) : null}
            {active ? (
              <span className="inline-flex items-center rounded-full border border-[#cfe0ff] bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#2459d3]">
                Active
              </span>
            ) : null}
            {disabled ? (
              <span className="inline-flex items-center rounded-full border border-[#e3e7ef] bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#98a2b3]">
                Soon
              </span>
            ) : null}
          </span>
          {description ? (
            <span
              className={[
                "mt-0.5 block text-xs font-medium leading-4",
                active ? "text-[#49627f]" : disabled ? "text-[#a5afbe]" : "text-[#98a2b3]",
              ].join(" ")}
            >
              {description}
            </span>
          ) : null}
        </span>
      ) : (
        <>
          <span className="sr-only">{label}</span>
          <span
            className={[
              "pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-20 hidden -translate-y-1/2 whitespace-nowrap rounded-xl border bg-white px-2.5 py-1.5 text-xs font-medium shadow-sm",
              hoverable ? "group-hover:block group-focus-visible:block" : "",
              active
                ? "border-[#cfe0ff] text-[#2459d3]"
                : disabled
                  ? "border-[#e3e7ef] text-[#98a2b3]"
                  : "border-[#dde3ee] text-[#475467]",
            ].join(" ")}
          >
            {label}
            {active ? " · Active" : disabled ? " · Soon" : ""}
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
  businessId,
  phoneRaw,
  q,
  statuses,
  statusMode,
  range,
  summaryRange,
  startDate,
  endDate,
  actor,
  actors,
  currentUserId,
  hasActiveFilters,
  activeFiltersCount,
  clearHref,
  businessHref,
  settingsHref,
  canSeeAnalytics,
  showFilters = true,
  activeSection,
  layoutMode = "list",
}: Props) {
  const expanded = useSyncExternalStore(
    subscribeExpanded,
    getExpandedSnapshot,
    getExpandedServerSnapshot,
  );
  const [filtersOpen, setFiltersOpen] = useState(false);

  const toggleExpanded = () => {
    const next = !expanded;
    window.localStorage.setItem(MENU_STORAGE_KEY, next ? "true" : "false");
    window.dispatchEvent(new Event(MENU_STORAGE_EVENT));
  };

  useEffect(() => {
    const handleToggleFilters = () => {
      setFiltersOpen((prev) => !prev);
    };

    window.addEventListener(TOGGLE_FILTERS_EVENT, handleToggleFilters);
    return () => window.removeEventListener(TOGGLE_FILTERS_EVENT, handleToggleFilters);
  }, []);

  return (
    <div
      className={[
        "relative hidden shrink-0 lg:block",
        expanded ? "w-[232px]" : "w-[72px]",
      ].join(" ")}
    >
      <div
        className="fixed z-30"
        style={{
          top:
            layoutMode === "kanban"
              ? "calc(env(safe-area-inset-top) + 96px)"
              : "calc(env(safe-area-inset-top) + 88px)",
          left:
            layoutMode === "kanban"
              ? "24px"
              : "max(24px, calc((100vw - 1220px) / 2 + 24px))",
        }}
      >
        <div className="relative">
          <div
            className={[
              "rounded-[28px] border border-[#dde3ee] bg-[#f8fafc]/96 p-2 shadow-[0_10px_34px_rgba(15,23,42,0.06)] backdrop-blur transition-all",
              expanded ? "w-[216px]" : "w-[68px]",
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

              {showFilters ? (
                <RailLink
                  icon={<SlidersHorizontal className="h-5 w-5" />}
                  label="Filters"
                  description="Search and narrow orders"
                  expanded={expanded}
                  active={filtersOpen}
                  badgeCount={activeFiltersCount}
                  onClick={() => setFiltersOpen((prev) => !prev)}
                />
              ) : null}

              {canSeeAnalytics ? (
                <RailLink
                  icon={<BarChart3 className="h-5 w-5" />}
                  label="Analytics"
                  description="Dashboard insights are not live yet"
                  expanded={expanded}
                  disabled
                />
              ) : null}

              <RailLink
                icon={<Building2 className="h-5 w-5" />}
                label="Business"
                description="Manage access and managers"
                expanded={expanded}
                href={businessHref}
                active={activeSection === "business"}
              />

              <RailLink
                icon={<Settings className="h-5 w-5" />}
                label="Settings"
                description="Team and statuses"
                expanded={expanded}
                href={settingsHref}
                active={activeSection === "settings"}
              />
            </div>
          </div>

          {showFilters && filtersOpen ? (
            <div
              className={[
                "absolute top-0 z-20 w-[312px]",
                expanded ? "left-[228px]" : "left-[84px]",
              ].join(" ")}
            >
              <DesktopSidebarFilters
                businessId={businessId}
                phoneRaw={phoneRaw}
                q={q}
                statuses={statuses}
                statusMode={statusMode}
                range={range}
                summaryRange={summaryRange}
                startDate={startDate}
                endDate={endDate}
                actor={actor}
                currentUserId={currentUserId}
                actors={actors}
                hasActiveFilters={hasActiveFilters}
                clearHref={clearHref}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
