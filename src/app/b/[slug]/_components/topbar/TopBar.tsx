"use client";

import React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LogOut, Sparkles } from "lucide-react";
import { BrandIcon, BrandLockup } from "@/components/Brand";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  adminHref?: string;
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
  adminHref,
  clearHref,
  hasActiveFilters = false,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [logoutOpen, setLogoutOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const dashboardQuery = searchParams.toString();
  const dashboardHref = dashboardQuery ? `/app/crm?${dashboardQuery}` : "/app/crm";

  const handleSelect = (slug: string) => {
    document.cookie = `active_business_slug=${encodeURIComponent(
      slug
    )}; path=/; max-age=${60 * 60 * 24 * 365}`;

    const currentParams = new URLSearchParams(window.location.search);
    const qs = currentParams.toString();
    router.push(qs ? `/app/crm?${qs}` : "/app/crm");
    router.refresh();
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      document.cookie = "u=; path=/; max-age=0";
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setLogoutOpen(false);
      setIsLoggingOut(false);
      router.push("/login");
      router.refresh();
    }
  };

  const showSwitcher = !!businesses && businesses.length >= 1;
  const userLabel = currentUserName?.trim() || "User";
  const roleLabel =
    role === "OWNER" ? "owner" : role === "MANAGER" ? "manager" : "guest";

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#E5E7EB] bg-white/90 backdrop-blur-md">
      <div className="pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-[72px] max-w-[1220px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href={dashboardHref}
            aria-label="Go to dashboard"
            className="flex shrink-0 items-center justify-center sm:justify-start"
          >
            <span className="sm:hidden">
              <BrandIcon size={40} />
            </span>
            <BrandLockup
              iconSize={38}
              textClassName="text-[2rem]"
              className="hidden sm:flex"
            />
          </Link>

          <MobileTopbarMenu
            businessHref={businessHref ?? dashboardHref}
            settingsHref={settingsHref ?? `${businessHref ?? dashboardHref}`}
            adminHref={adminHref}
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
              <div className="flex h-11 min-w-0 items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 shadow-sm">
                <span className="truncate text-sm font-semibold text-[#1F2937]">
                  {businessSlug}
                </span>
                <span className="rounded-full bg-[#1F2937] px-2 py-0.5 text-[11px] font-semibold text-white">
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
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1F2937] text-sm font-semibold text-white">
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

            {adminHref ? (
              <Link
                href={adminHref}
                  className="inline-flex h-10 items-center rounded-lg border border-[#E5E7EB] bg-white px-3 text-[12px] font-semibold text-[#374151] shadow-sm transition hover:border-[#C7D2FE] hover:text-[#1F2937]"
              >
                Admin
              </Link>
            ) : null}

            <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  title="Logout"
                  aria-label="Log out"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#374151] shadow-sm"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:max-w-[420px]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-slate-900">
                    Log out?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-sm text-slate-600">
                    Your current session will end on this device.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    disabled={isLoggingOut}
                    className="rounded-2xl border-slate-200"
                  >
                    Stay here
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="rounded-2xl bg-slate-900 text-white hover:bg-slate-800"
                  >
                    {isLoggingOut ? "Logging out..." : "Log out"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </header>
  );
}
