"use client";

import React from "react";
import Link from "next/link";
import { CalendarDays, CheckSquare } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getVisiblePlatformModules } from "@/config/modules";

import { BrandIcon, BrandLockup } from "@/components/Brand";
import BusinessSwitcher, { BusinessOption } from "./BusinessSwitcher";
import InviteInbox from "./InviteInbox";
import MobileTopbarMenu from "./MobileTopbarMenu";
import { UserMenu } from "./UserMenu";
import { WorkDayControls } from "./WorkDayControls";

type Props = {
  businessSlug: string;
  role: "OWNER" | "MANAGER" | "GUEST";
  currentUserName?: string;
  currentUserAvatarUrl?: string;
  currentPlan?: string | null;
  pill?: React.CSSProperties;
  businesses?: BusinessOption[];
  businessId?: string;
  businessHref?: string;
  clientsHref?: string;
  catalogHref?: string;
  todayHref?: string;
  supportHref?: string;
  analyticsHref?: string;
  settingsHref?: string;
  adminHref?: string;
  clearHref?: string;
  hasActiveFilters?: boolean;
  todoCount?: number;
  overdueCount?: number;
  todayCount?: number;
  billingHref?: string;
};

export default function TopBar({
  businessSlug,
  role,
  currentUserName,
  currentUserAvatarUrl,
  currentPlan,
  businesses,
  businessId,
  businessHref,
  clientsHref,
  catalogHref,
  todayHref,
  supportHref,
  analyticsHref,
  settingsHref,
  billingHref,
  adminHref,
  clearHref,
  hasActiveFilters = false,
  todoCount = 0,
  overdueCount,
  todayCount,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dashboardQuery = searchParams.toString();
  const dashboardHref = dashboardQuery
    ? `/app/crm?${dashboardQuery}`
    : "/app/crm";
  const showSwitcher = !!businesses && businesses.length >= 1;
  const userLabel = currentUserName?.trim() || "User";
  const roleLabel =
    role === "OWNER" ? "owner" : role === "MANAGER" ? "manager" : "guest";
  const resolvedSettingsHref = settingsHref ?? "/app/settings";
  const profileHref = "/app/profile";
  const resolvedBillingHref = billingHref ?? "/app/settings/billing";
  const canManage = role === "OWNER" || role === "MANAGER";
  const isAdminUser = Boolean(adminHref);
  const hasSplitTodoCounters =
    typeof overdueCount === "number" || typeof todayCount === "number";
  const overdueCounter = Math.max(0, Number(overdueCount ?? 0));
  const todayCounter = Math.max(
    0,
    Number(todayCount ?? Math.max(0, todoCount - overdueCounter)),
  );
  const calendarDayHref = React.useMemo(() => {
    if (!todayHref) return null;
    const [basePath, query = ""] = todayHref.split("?");
    const params = new URLSearchParams(query);
    params.set("mode", "calendar");
    params.set("view", "day");
    params.set("date", "today");
    return `${basePath}?${params.toString()}`;
  }, [todayHref]);
  const moduleTabs = React.useMemo(() => {
    const modules = getVisiblePlatformModules().filter(
      (module) => module.key !== "tasks" || isAdminUser,
    );
    return modules.map((module) => {
      const href = module.key === "crm" ? dashboardHref : module.href;
      const active =
        module.key === "crm"
          ? Boolean(
              pathname?.startsWith("/app/crm") || pathname?.startsWith("/b/"),
            )
          : Boolean(pathname?.startsWith(module.href));
      return { key: module.key, label: module.name, href, active };
    });
  }, [dashboardHref, isAdminUser, pathname]);

  const handleSelect = (slug: string) => {
    document.cookie = `active_business_slug=${encodeURIComponent(slug)}; path=/; max-age=${60 * 60 * 24 * 365}`;

    const currentPath = window.location.pathname;
    const currentParams = new URLSearchParams(window.location.search);
    const qs = currentParams.toString();

    let nextPath = currentPath;
    if (currentPath.startsWith("/b/")) {
      const parts = currentPath.split("/");
      if (parts.length > 2) {
        parts[2] = slug;
        nextPath = parts.join("/");
      }
    }

    router.replace(qs ? `${nextPath}?${qs}` : nextPath);
    router.refresh();
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--neutral-200)] bg-white">
      <div className="pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-[48px] max-w-[1200px] items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <MobileTopbarMenu
              businessId={businessId}
              businessSlug={businessSlug}
              canManage={canManage}
              analyticsHref={analyticsHref ?? `/b/${businessSlug}/analytics`}
              businessHref={businessHref ?? dashboardHref}
              clientsHref={clientsHref ?? `/b/${businessSlug}/clients`}
              catalogHref={catalogHref ?? `/b/${businessSlug}/catalog/products`}
              todayHref={todayHref ?? businessHref ?? dashboardHref}
              supportHref={supportHref ?? `/b/${businessSlug}/support`}
              clearHref={clearHref ?? dashboardHref}
              hasActiveFilters={hasActiveFilters}
              canSeeAnalytics={role === "OWNER"}
              userLabel={userLabel}
              roleLabel={roleLabel}
            />

            <Link
              href={businessHref ?? `/b/${businessSlug}`}
              aria-label="Go to dashboard"
              className="flex shrink-0 items-center justify-center sm:justify-start"
            >
              <span className="sm:hidden">
                <BrandIcon size={28} />
              </span>
              <BrandLockup
                iconSize={26}
                textClassName="text-[1.25rem]"
                className="hidden sm:flex"
              />
            </Link>

            <div className="hidden min-w-0 sm:block">
              {showSwitcher ? (
                <BusinessSwitcher
                  businesses={businesses!}
                  currentSlug={businessSlug}
                  onSelect={handleSelect}
                  disabledAdd
                  widthClassName="w-[176px] lg:w-[208px]"
                  variant="toolbar-compact"
                />
              ) : (
                <div className="flex h-8 min-w-[148px] max-w-[208px] items-center rounded-lg px-2.5 text-[12px] font-semibold text-[#1F2937]">
                  <span className="truncate">{businessSlug}</span>
                </div>
              )}
            </div>
            <nav className="hidden items-center rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-1 lg:inline-flex">
              {moduleTabs.map((tab) => (
                <Link
                  key={tab.key}
                  href={tab.href}
                  className={[
                    "inline-flex h-7 items-center rounded-md px-3 text-[12px] font-semibold transition",
                    tab.active
                      ? "bg-white text-[#3645A0] shadow-[0_1px_2px_rgba(16,24,40,0.08)]"
                      : "text-[#6B7280] hover:bg-white hover:text-[#1F2937]",
                  ].join(" ")}
                >
                  {tab.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="min-w-0 flex-1 sm:hidden">
            {showSwitcher ? (
              <BusinessSwitcher
                businesses={businesses!}
                currentSlug={businessSlug}
                onSelect={handleSelect}
                disabledAdd
                widthClassName="w-full"
                variant="toolbar"
              />
            ) : (
              <div className="flex h-10 min-w-0 items-center rounded-xl border border-[#E5E7EB] bg-white px-3 shadow-sm">
                <span className="truncate text-sm font-semibold text-[#1F2937]">
                  {businessSlug}
                </span>
              </div>
            )}
          </div>

          <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
            {todayHref ? (
              <Link
                href={todayHref}
                className="inline-flex h-7 items-center rounded-md border border-[#C7D2FE] bg-[#EEF2FF] px-2.5 text-[11px] font-semibold text-[#3645A0] shadow-sm transition hover:border-[#A5B4FC] hover:bg-[#E0E7FF] hover:text-[#2F3EA8]"
              >
                <CheckSquare className="h-3.5 w-3.5 text-[#3645A0]" />
                <span className="ml-2">To do</span>
                {hasSplitTodoCounters ? (
                  <span className="ml-2 inline-flex items-center gap-1.5">
                    {overdueCounter > 0 ? (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full border border-[#FECACA] bg-[#FEF2F2] px-1.5 py-0.5 text-[10px] font-bold text-[#B42318]">
                        {overdueCounter}
                      </span>
                    ) : null}
                    {todayCounter > 0 ? (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full border border-[#A5B4FC] bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#3645A0]">
                        {todayCounter}
                      </span>
                    ) : null}
                    {overdueCounter === 0 && todayCounter === 0 ? (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full border border-[#D0D5DD] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#667085]">
                        Clear
                      </span>
                    ) : null}
                  </span>
                ) : todoCount > 0 ? (
                  <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full border border-[#A5B4FC] bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#3645A0]">
                    {todoCount > 99 ? "99+" : todoCount}
                  </span>
                ) : null}
              </Link>
            ) : null}
            {calendarDayHref ? (
              <Link
                href={calendarDayHref}
                className="inline-flex h-7 items-center rounded-md border border-[#D6DAE1] bg-white px-2.5 text-[11px] font-semibold text-[#475467] shadow-sm transition hover:border-[#C7D2FE] hover:bg-[#F8FAFF] hover:text-[#3645A0]"
              >
                <CalendarDays className="h-3.5 w-3.5 text-[#667085]" />
                <span className="ml-2">Calendar</span>
              </Link>
            ) : null}
            {businessId ? (
              <WorkDayControls
                businessId={businessId}
                businessSlug={businessSlug}
                canManage={canManage}
              />
            ) : null}

            <div className="flex items-center gap-2">
              <InviteInbox
                businessId={businessId}
                currentBusinessSlug={businessSlug}
              />
              <UserMenu
                userLabel={userLabel}
                roleLabel={roleLabel}
                currentPlan={currentPlan}
                businessId={businessId}
                profileHref={profileHref}
                settingsHref={resolvedSettingsHref}
                billingHref={resolvedBillingHref}
                adminHref={adminHref}
                userAvatarUrl={currentUserAvatarUrl}
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:hidden">
            <InviteInbox
              businessId={businessId}
              currentBusinessSlug={businessSlug}
            />
            <UserMenu
              compact
              userLabel={userLabel}
              roleLabel={roleLabel}
              currentPlan={currentPlan}
              businessId={businessId}
              profileHref={profileHref}
              settingsHref={resolvedSettingsHref}
              billingHref={resolvedBillingHref}
              adminHref={adminHref}
              userAvatarUrl={currentUserAvatarUrl}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
