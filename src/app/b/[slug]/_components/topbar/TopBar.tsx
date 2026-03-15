"use client";

import React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LogOut, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";

import BusinessSwitcher, { BusinessOption } from "./BusinessSwitcher";
import InviteInbox from "./InviteInbox";
import MobileTopbarMenu from "./MobileTopbarMenu";

type Props = {
  businessSlug: string;
  plan: string;
  role: "OWNER" | "MANAGER" | "GUEST";
  currentUserName?: string;
  pill?: React.CSSProperties;
  businesses?: BusinessOption[];
  businessHref?: string;
  settingsHref?: string;
  clearHref?: string;
  hasActiveFilters?: boolean;
};

export default function TopBar({
  businessSlug,
  plan,
  role,
  currentUserName,
  businesses,
  businessHref,
  settingsHref,
  clearHref,
  hasActiveFilters = false,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dashboardQuery = searchParams.toString();
  const dashboardHref = dashboardQuery
    ? `/b/${businessSlug}?${dashboardQuery}`
    : `/b/${businessSlug}`;

  const handleSelect = (slug: string) => {
    document.cookie = `active_business_slug=${encodeURIComponent(
      slug
    )}; path=/; max-age=${60 * 60 * 24 * 365}`;

    const currentParams = new URLSearchParams(window.location.search);
    const qs = currentParams.toString();
    router.push(qs ? `/b/${slug}?${qs}` : `/b/${slug}`);
    router.refresh();
  };

  const handleLogout = () => {
    if (!window.confirm("Log out?")) return;
    document.cookie = "u=; path=/; max-age=0";
    router.push("/login");
  };

  const showSwitcher = !!businesses && businesses.length >= 1;
  const userLabel = currentUserName?.trim() || "User";
  const roleLabel =
    role === "OWNER" ? "owner" : role === "MANAGER" ? "manager" : "guest";

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/70 bg-white/70 backdrop-blur-md">
      <div className="pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-[72px] max-w-[1220px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href={dashboardHref}
            aria-label="Go to dashboard"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm sm:h-auto sm:w-auto sm:justify-start sm:rounded-2xl sm:p-3 sm:gap-3 sm:px-4"
          >
            <Logo size={28} />
            <div className="hidden leading-none sm:block">
              <div className="text-[15px] font-semibold tracking-tight text-slate-900">
                Ordero
              </div>
              <div className="pt-1 text-[11px] text-slate-500">Orders. Simple. Fast.</div>
            </div>
          </Link>

          <MobileTopbarMenu
            businessHref={businessHref ?? dashboardHref}
            settingsHref={settingsHref ?? `${businessHref ?? dashboardHref}`}
            clearHref={clearHref ?? dashboardHref}
            hasActiveFilters={hasActiveFilters}
            canSeeAnalytics={role === "OWNER"}
          />

          <div className="sm:hidden">
            <InviteInbox currentBusinessSlug={businessSlug} />
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
              <div className="flex h-11 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm">
                <span className="truncate text-sm font-semibold text-slate-900">
                  {businessSlug}
                </span>
                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                  {role === "OWNER"
                    ? "Owner"
                    : role === "MANAGER"
                    ? "Manager"
                    : "Guest"}
                </span>
              </div>
            )}
          </div>

          <div className="hidden min-w-0 flex-1 items-center justify-end gap-3 sm:flex">
            <InviteInbox currentBusinessSlug={businessSlug} />

            {showSwitcher && (
              <div className="shrink-0">
                <BusinessSwitcher
                  businesses={businesses!}
                  currentSlug={businessSlug}
                  onSelect={handleSelect}
                  disabledAdd
                  widthClassName="w-[300px]"
                  variant="toolbar-compact"
                />
              </div>
            )}

            <div className="flex min-w-0 max-w-[180px] items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                {userLabel[0]?.toUpperCase() || "U"}
              </div>
              <div className="flex min-w-0 flex-col leading-[1.1]">
                <div
                  className="truncate text-[13px] font-medium text-[#111111]"
                  title={userLabel}
                >
                  {userLabel}
                </div>
                <div className="mt-0.5 text-[11px] font-medium lowercase text-[#8b8b8b]">
                  {roleLabel}
                </div>
              </div>
            </div>

            <span className="inline-flex h-9 items-center rounded-full border border-violet-200 bg-violet-50 px-3 text-[11px] font-semibold uppercase tracking-wide text-violet-700">
              <Sparkles className="mr-1 h-3 w-3" />
              {plan || "beta"}
            </span>

            <button
              onClick={handleLogout}
              title="Logout"
              aria-label="Log out"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
