"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  Shield,
  BarChart3,
  Boxes,
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  GraduationCap,
  LifeBuoy,
  Settings,
  SlidersHorizontal,
  Users,
} from "lucide-react";

import DesktopSidebarFilters from "./DesktopSidebarFilters";
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
  sort?: OrderSort;
  actors: TeamActor[];
  currentUserId: string | null;
  hasActiveFilters: boolean;
  activeFiltersCount: number;
  clearHref: string;
  businessHref: string;
  clientsHref?: string;
  catalogHref?: string;
  analyticsHref?: string;
  todayHref?: string;
  settingsHref: string;
  supportHref?: string;
  adminHref?: string;
  canSeeAnalytics: boolean;
  showFilters?: boolean;
  activeSection?:
    | "crm"
    | "analytics"
    | "clients"
    | "catalog"
    | "today"
    | "support"
    | "settings"
    | "admin";
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
  className,
  tooltipSide = "right",
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
  className?: string;
  tooltipSide?: "left" | "right";
}) {
  const hoverable = !disabled;
  const cls = [
    "group relative flex border shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-150",
    expanded
      ? "min-h-10 w-full items-start justify-start gap-2 rounded-xl px-3 py-2"
      : "h-10 w-full items-center justify-center rounded-xl",
    active
      ? "border-[#D7DEFA] bg-[#F5F7FF] text-[#334155] shadow-[0_4px_12px_rgba(99,102,241,0.08)]"
      : disabled
        ? "cursor-not-allowed border-[#E5E7EB] bg-[#F9FAFB] text-[#9CA3AF] opacity-90"
        : "cursor-pointer border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#C7D2FE] hover:bg-[#F9FAFB] hover:text-[#1F2937] hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]",
    className ?? "",
  ].join(" ");

  const body = (
    <>
      <span
        className={[
          "relative shrink-0 rounded-lg transition-colors duration-150",
          active
            ? "bg-[var(--brand-600)] p-1.5 text-white shadow-[0_4px_12px_rgba(91,91,179,0.22)]"
            : disabled
              ? "bg-white/70 p-1.5 text-[#9CA3AF]"
              : "bg-[var(--brand-50)] p-1.5 text-[var(--brand-600)] group-hover:bg-[var(--brand-100)] group-hover:text-[var(--brand-700)]",
        ].join(" ")}
      >
        {icon}
        {badgeCount > 0 ? (
          <span
            className={[
              "absolute -right-2 -top-2 inline-flex min-w-5 items-center justify-center rounded-full border border-white bg-[var(--brand-600)] px-1 text-[10px] font-bold leading-5 text-white shadow-[0_6px_12px_rgba(91,91,179,0.28)]",
              expanded ? "h-5" : "h-5",
            ].join(" ")}
          >
            {badgeCount}
          </span>
        ) : null}
      </span>
      {expanded ? (
        <span className="min-w-0 flex-1 text-left">
          <span className="flex items-center gap-1.5">
            <span
              className={[
                "block text-xs font-semibold leading-4 transition-colors",
                active
                  ? "text-[#334155]"
                  : disabled
                    ? "text-[#9CA3AF]"
                    : "text-[#374151] group-hover:text-[var(--brand-700)]",
              ].join(" ")}
            >
              {label}
            </span>
            {badgeCount > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--brand-50)] px-1.5 text-[10px] font-bold text-[var(--brand-600)]">
                {badgeCount}
              </span>
            ) : null}
            {active ? (
              <span className="inline-flex items-center rounded-full border border-[var(--brand-200)] bg-white px-2 py-0.5 text-[10px] font-semibold text-[var(--brand-600)]">
                Active
              </span>
            ) : null}
            {disabled ? (
              <span className="inline-flex items-center rounded-full border border-[#E5E7EB] bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">
                Soon
              </span>
            ) : null}
          </span>
          {description ? (
            <span
              className={[
                "mt-0 block text-[10px] font-medium leading-3.5",
                active
                  ? "text-[#4B5563]"
                  : disabled
                    ? "text-[#9CA3AF]"
                    : "text-[#9CA3AF]",
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
              "pointer-events-none absolute top-1/2 z-[80] hidden -translate-y-1/2 whitespace-nowrap rounded-xl border bg-white px-2.5 py-1.5 text-xs font-medium shadow-sm transition-colors",
              tooltipSide === "left"
                ? "right-[calc(100%+10px)]"
                : "left-[calc(100%+10px)]",
              hoverable ? "group-hover:block group-focus-visible:block" : "",
              active
                ? "border-[var(--brand-200)] text-[var(--brand-600)]"
                : disabled
                  ? "border-[#E5E7EB] text-[#9CA3AF]"
                  : "border-[#E5E7EB] text-[#374151] group-hover:border-[var(--brand-200)] group-hover:bg-[var(--brand-50)] group-hover:text-[var(--brand-700)]",
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
  sort = "default",
  actors,
  currentUserId,
  hasActiveFilters,
  activeFiltersCount,
  clearHref,
  businessHref,
  clientsHref,
  catalogHref,
  analyticsHref,
  todayHref,
  settingsHref,
  supportHref,
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
  const effectiveKanbanPeekOpen = isKanban ? kanbanPeekOpen : false;
  const collapsedRailWidth =
    isKanban && !effectiveKanbanPeekOpen && !expanded && !filtersOpen
      ? "w-0"
      : isKanban
        ? "w-[80px]"
        : "w-[88px]";
  const expandedRailWidth = isKanban ? "w-[192px]" : "w-[208px]";
  const collapsedPanelWidth = isKanban ? "w-[72px]" : "w-[80px]";
  const expandedPanelWidth = isKanban ? "w-[176px]" : "w-[192px]";
  const topOffset = "calc(env(safe-area-inset-top) + 80px)";

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

  const toggleFiltersPanel = useCallback(() => {
    setFiltersOpen((prev) => {
      const next = !prev;
      if (isKanban && !expanded) {
        setKanbanPeekOpen(next);
      }
      return next;
    });
  }, [expanded, isKanban]);

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
  }, [toggleFiltersPanel]);

  useEffect(() => {
    if (!filtersOpen) return;
    const previous = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = previous;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [filtersOpen]);

  const platformNavigation = getPlatformSidebarNavigation();
  const secondaryModules = platformNavigation.filter(
    (item) => item.key !== "crm" && item.key !== "tasks" && item.key !== "settings",
  );
  const settingsModule = platformNavigation.find(
    (item) => item.key === "settings",
  );
  const navIconByKey = {
    academy: <GraduationCap className="h-4 w-4" />,
    settings: <Settings className="h-4 w-4" />,
  } as const;
  const analyticsTarget =
    analyticsHref ??
    `${businessHref}${businessHref.includes("?") ? "&" : "?"}section=analytics#owner-analytics`;
  const inferredClientsHref =
    clientsHref ??
    (settingsHref.startsWith("/b/") && settingsHref.includes("/settings")
      ? settingsHref.replace(/\/settings(?:\/.*)?$/, "/clients")
      : undefined);
  const inferredCatalogHref =
    catalogHref ??
    (settingsHref.startsWith("/b/") && settingsHref.includes("/settings")
      ? settingsHref.replace(/\/settings(?:\/.*)?$/, "/catalog/products")
      : undefined);
  const accountSettingsHref = (() => {
    const slugMatch = settingsHref.match(/^\/b\/([^/]+)/);
    if (slugMatch) {
      return `/app/settings?b=${encodeURIComponent(slugMatch[1])}`;
    }
    return "/app/settings";
  })();
  const railItemsClass = expanded
    ? "flex flex-col items-stretch gap-1.5"
    : "grid grid-cols-2 items-stretch gap-1.5";
  const collapsedFullRowClass = expanded ? undefined : "col-span-2";
  const topSectionOrder = [
    showFilters ? "filters" : null,
    canSeeAnalytics ? "analytics" : null,
    todayHref ? "today" : null,
  ].filter((value): value is string => Boolean(value));
  const middleSectionOrder = [
    ...secondaryModules.map((item) => `secondary:${item.key}`),
    inferredClientsHref ? "clients" : null,
    inferredCatalogHref ? "catalog" : null,
    supportHref ? "support" : null,
    adminHref ? "admin" : null,
  ].filter((value): value is string => Boolean(value));
  const tooltipSideByKey = new Map([
    ...topSectionOrder.map((key) => [key, "right" as const]),
    ...middleSectionOrder.map((key) => [key, "right" as const]),
  ]);

  return (
    <div
      data-desktop-left-rail="1"
      className={[
        "relative z-40 hidden shrink-0 transition-opacity duration-200 lg:block",
        expanded ? expandedRailWidth : collapsedRailWidth,
      ].join(" ")}
    >
      <div
        className="sticky"
        style={{ top: topOffset }}
      >
        <div className="relative">
          {isKanban && !expanded && !effectiveKanbanPeekOpen && !filtersOpen ? (
            <button
              type="button"
              onClick={openCollapsedRail}
              aria-label="Open rail menu"
              className="fixed left-0 z-50 inline-flex h-[84px] w-7 flex-col items-center justify-center gap-1 rounded-r-xl border border-[#E5E7EB] border-l-0 bg-white/96 text-[#374151] shadow-[0_10px_28px_rgba(15,23,42,0.10)] backdrop-blur transition hover:bg-white hover:text-[#1F2937]"
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
                "max-h-[calc(100vh-100px)] rounded-[18px] border border-[#E5E7EB] bg-[#F9FAFB]/96 p-1 shadow-[0_10px_34px_rgba(15,23,42,0.06)] backdrop-blur transition-all",
                expanded
                  ? "overflow-x-hidden overflow-y-auto overscroll-contain"
                  : "overflow-visible",
                expanded ? expandedPanelWidth : collapsedPanelWidth,
              ].join(" ")}
            >
              <div className={railItemsClass}>

                {isKanban && !expanded ? (
                  <button
                    type="button"
                    onClick={closeCollapsedRail}
                    className="col-span-2 inline-flex h-9 w-full items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#6B7280] transition hover:border-[#C7D2FE] hover:bg-[#F9FAFB] hover:text-[#1F2937]"
                    aria-label="Hide rail menu"
                    title="Hide menu"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </button>
                ) : null}

                {isKanban && !expanded ? (
                  <button
                    type="button"
                    onClick={toggleExpanded}
                    className="col-span-2 inline-flex h-9 w-full items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#6B7280] transition hover:border-[#C7D2FE] hover:bg-[#F9FAFB] hover:text-[#1F2937]"
                    aria-label="Open full menu"
                    title="Open full menu"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </button>
                ) : null}

                {!(isKanban && !expanded) ? (
                  <RailLink
                    icon={
                      expanded ? (
                        <ChevronsLeft className="h-4 w-4" />
                      ) : (
                        <ChevronsRight className="h-4 w-4" />
                      )
                    }
                    label={expanded ? "Collapse menu" : "Expand menu"}
                    expanded={expanded}
                    className={collapsedFullRowClass}
                    onClick={toggleExpanded}
                  />
                ) : null}

                {showFilters ? (
                  <RailLink
                    icon={<SlidersHorizontal className="h-4 w-4" />}
                    label="Filters"
                    description="Search and narrow orders"
                    expanded={expanded}
                    active={filtersOpen}
                    badgeCount={activeFiltersCount}
                    onClick={toggleFiltersPanel}
                    tooltipSide={tooltipSideByKey.get("filters") ?? "right"}
                  />
                ) : null}

                {canSeeAnalytics ? (
                  <RailLink
                    icon={<BarChart3 className="h-4 w-4" />}
                    label="Analytics"
                    description="Owner workload and deadline control"
                    expanded={expanded}
                    href={analyticsTarget}
                    active={activeSection === "analytics"}
                    tooltipSide={tooltipSideByKey.get("analytics") ?? "right"}
                  />
                ) : null}

                {todayHref ? (
                  <RailLink
                    icon={<CalendarDays className="h-4 w-4" />}
                    label="Today"
                    description="Overdue and due-today follow-ups"
                    expanded={expanded}
                    href={todayHref}
                    active={activeSection === "today"}
                    tooltipSide={tooltipSideByKey.get("today") ?? "right"}
                  />
                ) : null}

                {expanded ? (
                  <div className="my-1 h-px bg-[#E5E7EB]" />
                ) : (
                  <div className="col-span-2 my-0.5 h-px bg-[#E5E7EB]" />
                )}
                {secondaryModules.map((item) => {
                  const href = item.href;

                  return (
                    <RailLink
                      key={item.key}
                      icon={navIconByKey[item.key]}
                      label={item.label}
                      description={item.description}
                      expanded={expanded}
                      href={href}
                      active={activeSection === item.key}
                      tooltipSide={tooltipSideByKey.get(`secondary:${item.key}`) ?? "right"}
                    />
                  );
                })}
                {inferredClientsHref ? (
                  <RailLink
                    icon={<Users className="h-4 w-4" />}
                    label="Clients"
                    description="Client directory and ownership"
                    expanded={expanded}
                    href={inferredClientsHref}
                    active={activeSection === "clients"}
                    tooltipSide={tooltipSideByKey.get("clients") ?? "right"}
                  />
                ) : null}
                {inferredCatalogHref ? (
                  <RailLink
                    icon={<Boxes className="h-4 w-4" />}
                    label="Catalog"
                    description="Products and services"
                    expanded={expanded}
                    href={inferredCatalogHref}
                    active={activeSection === "catalog"}
                    tooltipSide={tooltipSideByKey.get("catalog") ?? "right"}
                  />
                ) : null}
                {supportHref ? (
                  <RailLink
                    icon={<LifeBuoy className="h-4 w-4" />}
                    label="Support"
                    description="Requests and ticket history"
                    expanded={expanded}
                    href={supportHref}
                    active={activeSection === "support"}
                    tooltipSide={tooltipSideByKey.get("support") ?? "right"}
                  />
                ) : null}
                {adminHref ? (
                  <RailLink
                    icon={<Shield className="h-4 w-4" />}
                    label="Admin"
                    description="Registered users and access"
                    expanded={expanded}
                    href={adminHref}
                    active={activeSection === "admin"}
                    tooltipSide={tooltipSideByKey.get("admin") ?? "right"}
                  />
                ) : null}
                {settingsModule ? (
                  <>
                    {expanded ? (
                      <div className="mt-1 h-px bg-[#E5E7EB]" />
                    ) : (
                      <div className="col-span-2 mt-0.5 h-px bg-[#E5E7EB]" />
                    )}
                    <RailLink
                      icon={navIconByKey.settings}
                      label={settingsModule.label}
                      description={settingsModule.description}
                      expanded={expanded}
                      href={accountSettingsHref}
                      active={activeSection === "settings"}
                      className={collapsedFullRowClass}
                    />
                  </>
                ) : null}
              </div>
            </div>
          )}

          {showFilters && filtersOpen ? (
            <div
              className={[
                "absolute z-40 w-[340px]",
                expanded
                  ? isKanban
                    ? "left-[180px]"
                    : "left-[196px]"
                  : isKanban
                    ? "left-[60px]"
                    : "left-[72px]",
              ].join(" ")}
              style={{ top: 0, maxHeight: "calc(100vh - 100px)" }}
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
