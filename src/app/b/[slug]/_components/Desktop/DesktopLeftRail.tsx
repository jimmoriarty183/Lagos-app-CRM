"use client";

import { useState, useSyncExternalStore } from "react";
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
const MENU_STORAGE_EVENT = "orders-desktop-menu-expanded-change";

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
    "group relative flex border shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors",
    expanded
      ? "min-h-14 w-full items-start justify-start gap-3 rounded-2xl px-4 py-3"
      : "h-12 w-12 items-center justify-center rounded-2xl",
    active
      ? "border-[#cfd8e6] bg-[#eef3fb] text-[#111827]"
      : disabled
        ? "border-[#e3e7ef] bg-white text-[#c0c7d4]"
        : "border-[#dde3ee] bg-white text-[#667085] hover:bg-[#f8fafc]",
  ].join(" ");

  const body = (
    <>
      <span className="shrink-0">{icon}</span>
      {expanded ? (
        <span className="min-w-0 pt-0.5 text-left">
          <span className="block text-sm font-semibold leading-5">{label}</span>
          {description ? (
            <span className="mt-0.5 block text-xs font-medium leading-4 text-[#98a2b3]">
              {description}
            </span>
          ) : null}
        </span>
      ) : (
        <>
          <span className="sr-only">{label}</span>
          <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-20 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-[#dde3ee] bg-white px-2 py-1 text-xs font-medium text-[#475467] shadow-sm group-hover:block">
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
          top: "calc(env(safe-area-inset-top) + 88px)",
          left: "max(24px, calc((100vw - 1220px) / 2 + 24px))",
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

              <RailLink
                icon={<SlidersHorizontal className="h-5 w-5" />}
                label="Filters"
                description="Search and narrow orders"
                expanded={expanded}
                active={filtersOpen}
                onClick={() => setFiltersOpen((prev) => !prev)}
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
                "absolute top-0 z-20 w-[312px]",
                expanded ? "left-[228px]" : "left-[84px]",
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
        </div>
      </div>
    </div>
  );
}
