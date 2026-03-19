"use client";

import React from "react";
import Link from "next/link";
import { CheckSquare } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

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
  pill?: React.CSSProperties;
  businesses?: BusinessOption[];
  businessId?: string;
  businessHref?: string;
  todayHref?: string;
  settingsHref?: string;
  adminHref?: string;
  clearHref?: string;
  hasActiveFilters?: boolean;
  todoCount?: number;
};

export default function TopBar({
  businessSlug,
  role,
  currentUserName,
  businesses,
  businessId,
  businessHref,
  todayHref,
  settingsHref,
  adminHref,
  clearHref,
  hasActiveFilters = false,
  todoCount = 0,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dashboardQuery = searchParams.toString();
  const dashboardHref = dashboardQuery ? `/app/crm?${dashboardQuery}` : "/app/crm";
  const showSwitcher = !!businesses && businesses.length >= 1;
  const userLabel = currentUserName?.trim() || "User";
  const roleLabel = role === "OWNER" ? "owner" : role === "MANAGER" ? "manager" : "guest";
  const resolvedSettingsHref = settingsHref ?? "/app/settings";
  const profileHref = "/app/profile";
  const canManage = role === "OWNER" || role === "MANAGER";

  const handleSelect = (slug: string) => {
    document.cookie = `active_business_slug=${encodeURIComponent(slug)}; path=/; max-age=${60 * 60 * 24 * 365}`;

    const currentParams = new URLSearchParams(window.location.search);
    const qs = currentParams.toString();
    router.push(qs ? `/app/crm?${qs}` : "/app/crm");
    router.refresh();
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#E5E7EB]/80 bg-white/92 backdrop-blur-md">
      <div className="pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-[64px] max-w-[1240px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 shrink-0 items-center gap-2.5">
            <MobileTopbarMenu
              businessId={businessId}
              businessSlug={businessSlug}
              canManage={canManage}
              businessHref={businessHref ?? dashboardHref}
              todayHref={todayHref ?? businessHref ?? dashboardHref}
              clearHref={clearHref ?? dashboardHref}
              hasActiveFilters={hasActiveFilters}
              canSeeAnalytics={role === "OWNER"}
              userLabel={userLabel}
              roleLabel={roleLabel}
            />

            <Link
              href={dashboardHref}
              aria-label="Go to dashboard"
              className="flex shrink-0 items-center justify-center sm:justify-start"
            >
              <span className="sm:hidden">
                <BrandIcon size={38} />
              </span>
              <BrandLockup iconSize={34} textClassName="text-[1.75rem]" className="hidden sm:flex" />
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
                <span className="truncate text-sm font-semibold text-[#1F2937]">{businessSlug}</span>
              </div>
            )}
          </div>

          <div className="hidden shrink-0 items-center gap-2.5 sm:flex">
            {todayHref ? (
              <Link
                href={todayHref}
                className="inline-flex h-8 items-center rounded-lg border border-[#C7D2FE] bg-[#EEF2FF] px-3 text-[12px] font-semibold text-[#3645A0] shadow-sm transition hover:border-[#A5B4FC] hover:bg-[#E0E7FF] hover:text-[#2F3EA8]"
              >
                <CheckSquare className="h-4 w-4 text-[#3645A0]" />
                <span className="ml-2">To do</span>
                {todoCount > 0 ? (
                  <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full border border-[#A5B4FC] bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#3645A0]">
                    {todoCount > 99 ? "99+" : todoCount}
                  </span>
                ) : null}
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
              <InviteInbox businessId={businessId} currentBusinessSlug={businessSlug} />
              <UserMenu
                userLabel={userLabel}
                roleLabel={roleLabel}
                profileHref={profileHref}
                settingsHref={resolvedSettingsHref}
                adminHref={adminHref}
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:hidden">
            <InviteInbox businessId={businessId} currentBusinessSlug={businessSlug} />
            <UserMenu
              compact
              userLabel={userLabel}
              roleLabel={roleLabel}
              profileHref={profileHref}
              settingsHref={resolvedSettingsHref}
              adminHref={adminHref}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
