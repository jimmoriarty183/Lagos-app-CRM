"use client";

import type { ReactNode } from "react";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  Shield,
  BarChart3,
  BriefcaseBusiness,
  CheckSquare,
  ChevronsLeft,
  ChevronsRight,
  GraduationCap,
  Settings,
  SlidersHorizontal,
} from "lucide-react";

import DesktopSidebarFilters from "./DesktopSidebarFilters";
import { BrandIcon } from "@/components/Brand";
import { getPlatformSidebarNavigation } from "@/config/navigation";
import type { StatusFilterValue } from "@/lib/business-statuses";
import type { DashboardRange } from "@/lib/order-dashboard-summary";

type OrderSort =
  | "default"
  | "newest"
  | "oldest"
  | "dueSoonest"
  | "dueLatest"
  | "statusAsc"
  | "statusDesc"
  | "amountHigh"
  | "amountLow";

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
  sort: OrderSort;
  actors: TeamActor[];
  currentUserId: string | null;
  hasActiveFilters: boolean;
  activeFiltersCount: number;
  clearHref: string;
  businessHref: string;
  settingsHref: string;
  adminHref?: string;
  canSeeAnalytics: boolean;
  showFilters?: boolean;
  activeSection?: "crm" | "settings" | "admin";
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

function SidebarBrand({
  expanded,
  href,
}: {
  expanded: boolean;
  href: string;
}) {
  return (
    <a
      href={href}
      aria-label="Open Corelix CRM"
      className={[
        "group flex items-center text-slate-900 transition",
        expanded
          ? "gap-3 rounded-2xl px-3 py-3"
          : "justify-center rounded-2xl py-3",
      ].join(" ")}
    >
      <BrandIcon size={expanded ? 28 : 30} />
      {expanded ? (
        <span className="text-base font-semibold tracking-tight text-slate-900">
          Corelix
        </span>
      ) : null}
    </a>
  );
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
      : "h-12 w-full items-center justify-center rounded-2xl",
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
            <span className="block text-sm font-semibold leading-5">
              {label}
            </span>
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
                active
                  ? "text-[#49627f]"
                  : disabled
                    ? "text-[#a5afbe]"
                    : "text-[#98a2b3]",
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
  sort,
  actors,
  currentUserId,
  hasActiveFilters,
  activeFiltersCount,
  clearHref,
  businessHref,
  settingsHref,
  adminHref,
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
  const [kanbanPeekOpen, setKanbanPeekOpen] = useState(false);
  const isKanban = layoutMode === "kanban";
  const collapsedRailWidth =
    isKanban && !kanbanPeekOpen && !expanded && !filtersOpen
      ? "w-0"
      : isKanban
        ? "w-[60px]"
        : "w-[72px]";
  const expandedRailWidth = isKanban ? "w-[208px]" : "w-[232px]";
  const collapsedPanelWidth = isKanban ? "w-[60px]" : "w-[68px]";
  const expandedPanelWidth = isKanban ? "w-[192px]" : "w-[216px]";
  const topOffset =
    layoutMode === "kanban"
      ? "calc(env(safe-area-inset-top) + 112px)"
      : "calc(env(safe-area-inset-top) + 112px)";
  const leftOffset =
    layoutMode === "list"
      ? "max(1.5rem, calc((100vw - 1220px) / 2 + 1.5rem))"
      : undefined;

  const openCollapsedRail = () => {
    if (isKanban && !expanded) {
      setKanbanPeekOpen(true);
    }
  };

  const closeCollapsedRail = () => {
    if (isKanban && !expanded) {
      setFiltersOpen(false);
      setKanbanPeekOpen(false);
    }
  };

  const toggleFiltersPanel = () => {
    setFiltersOpen((prev) => {
      const next = !prev;
      if (isKanban && !expanded) {
        setKanbanPeekOpen(next);
      }
      return next;
    });
  };

  const toggleExpanded = () => {
    const next = !expanded;
    window.localStorage.setItem(MENU_STORAGE_KEY, next ? "true" : "false");
    window.dispatchEvent(new Event(MENU_STORAGE_EVENT));
  };

  useEffect(() => {
    const handleToggleFilters = () => {
      toggleFiltersPanel();
    };

    window.addEventListener(TOGGLE_FILTERS_EVENT, handleToggleFilters);
    return () =>
      window.removeEventListener(TOGGLE_FILTERS_EVENT, handleToggleFilters);
  }, [expanded, isKanban]);

  useEffect(() => {
    if (!isKanban) {
      setKanbanPeekOpen(false);
    }
  }, [isKanban]);

  const platformNavigation = getPlatformSidebarNavigation();
  const navIconByKey = {
    crm: <BriefcaseBusiness className="h-5 w-5" />,
    tasks: <CheckSquare className="h-5 w-5" />,
    academy: <GraduationCap className="h-5 w-5" />,
    settings: <Settings className="h-5 w-5" />,
  } as const;

  return (
    <div
      className={[
        "relative z-40 hidden shrink-0 lg:block",
        expanded ? expandedRailWidth : collapsedRailWidth,
      ].join(" ")}
    >
      <div
        className={layoutMode === "list" ? "fixed" : "sticky"}
        style={{
          top: topOffset,
          ...(layoutMode === "list" ? { left: leftOffset } : {}),
        }}
      >
        <div className="relative">
          {isKanban && !expanded && !kanbanPeekOpen && !filtersOpen ? (
            <button
              type="button"
              onClick={openCollapsedRail}
              aria-label="Open rail menu"
              className="fixed left-0 z-50 inline-flex h-[84px] w-7 flex-col items-center justify-center gap-1 rounded-r-xl border border-[#dde3ee] border-l-0 bg-white/96 text-[#475467] shadow-[0_10px_28px_rgba(15,23,42,0.10)] backdrop-blur transition hover:bg-white hover:text-[#111827]"
              style={{ top: topOffset }}
            >
              <ChevronsRight className="h-3.5 w-3.5 shrink-0" />
              <span
                className="text-[9px] font-semibold uppercase tracking-[0.18em]"
                style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
              >
                Menu
              </span>
            </button>
          ) : (
            <div
              className={[
                "rounded-[26px] border border-[#dde3ee] bg-[#f8fafc]/96 p-1.5 shadow-[0_10px_34px_rgba(15,23,42,0.06)] backdrop-blur transition-all",
                expanded ? expandedPanelWidth : collapsedPanelWidth,
              ].join(" ")}
            >
              <div className="flex flex-col items-stretch gap-1.5">
                <SidebarBrand expanded={expanded} href={businessHref} />

                {isKanban && !expanded ? (
                  <button
                    type="button"
                    onClick={closeCollapsedRail}
                    className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-[#dde3ee] bg-white text-[#667085] transition hover:border-[#cfd8e6] hover:bg-[#f8fafc] hover:text-[#111827]"
                    aria-label="Hide rail menu"
                    title="Hide menu"
                  >
                    <ChevronsLeft className="h-5 w-5" />
                  </button>
                ) : null}

                {isKanban && !expanded ? (
                  <button
                    type="button"
                    onClick={toggleExpanded}
                    className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-[#dde3ee] bg-white text-[#667085] transition hover:border-[#cfd8e6] hover:bg-[#f8fafc] hover:text-[#111827]"
                    aria-label="Open full menu"
                    title="Open full menu"
                  >
                    <ChevronsRight className="h-5 w-5" />
                  </button>
                ) : null}

                {!(isKanban && !expanded) ? (
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
                ) : null}

                {showFilters ? (
                  <RailLink
                    icon={<SlidersHorizontal className="h-5 w-5" />}
                    label="Filters"
                    description="Search and narrow orders"
                    expanded={expanded}
                    active={filtersOpen}
                    badgeCount={activeFiltersCount}
                    onClick={toggleFiltersPanel}
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

                {platformNavigation.map((item) => {
                  const href =
                    item.key === "crm"
                      ? businessHref
                      : item.key === "settings"
                        ? settingsHref
                        : item.href;

                  return (
                    <RailLink
                      key={item.key}
                      icon={navIconByKey[item.key]}
                      label={item.label}
                      description={item.description}
                      expanded={expanded}
                      href={href}
                      active={activeSection === item.key}
                    />
                  );
                })}
                {adminHref ? (
                  <RailLink
                    icon={<Shield className="h-5 w-5" />}
                    label="Admin"
                    description="Registered users and access"
                    expanded={expanded}
                    href={adminHref}
                    active={activeSection === "admin"}
                  />
                ) : null}

              </div>
            </div>
          )}

          {showFilters && filtersOpen ? (
            <div
              className={[
                "absolute top-0 z-20 w-[312px]",
                expanded
                  ? isKanban
                    ? "left-[204px]"
                    : "left-[228px]"
                  : isKanban
                    ? "left-[72px]"
                    : "left-[84px]",
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
                sort={sort}
                currentUserId={currentUserId}
                actors={actors}
                hasActiveFilters={hasActiveFilters}
                clearHref={clearHref}
                layoutMode={layoutMode}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
