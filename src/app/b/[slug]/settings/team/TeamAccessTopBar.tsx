"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandIcon, BrandLockup } from "@/components/Brand";
import { UserMenu } from "@/app/b/[slug]/_components/topbar/UserMenu";
import BusinessSwitcher, {
  type BusinessOption,
} from "@/app/b/[slug]/_components/topbar/BusinessSwitcher";

type Props = {
  ordersHref: string;
  userLabel: string;
  profileHref: string;
  currentPlan?: string | null;
  businessId?: string;
  adminHref?: string;
  billingHref?: string;
  roleLabel?: string;
  userAvatarUrl?: string;
  businesses?: BusinessOption[];
  currentBusinessSlug?: string;
};

export default function TeamAccessTopBar({
  ordersHref,
  userLabel,
  profileHref,
  currentPlan,
  businessId,
  adminHref,
  billingHref,
  roleLabel = "member",
  userAvatarUrl,
  businesses,
  currentBusinessSlug,
}: Props) {
  const router = useRouter();
  const showSwitcher = Boolean(
    businesses && businesses.length > 0 && currentBusinessSlug,
  );

  const handleSelectBusiness = React.useCallback(
    (slug: string) => {
      document.cookie = `active_business_slug=${encodeURIComponent(slug)}; path=/; max-age=${60 * 60 * 24 * 365}`;
      const currentPath = window.location.pathname;

      let nextPath: string;
      if (currentPath.startsWith("/b/")) {
        const parts = currentPath.split("/");
        if (parts.length > 2) {
          parts[2] = slug;
          nextPath = parts.join("/");
        } else {
          nextPath = `/b/${slug}`;
        }
      } else if (currentPath.startsWith("/app/settings")) {
        nextPath = `/b/${slug}/settings`;
      } else {
        nextPath = `/b/${slug}`;
      }

      router.replace(nextPath);
      router.refresh();
    },
    [router],
  );

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 overflow-x-clip border-b border-[var(--neutral-200)] bg-white dark:bg-white/[0.03]"
    >
      <div className="pt-[env(safe-area-inset-top)]">
        <div className="mx-auto grid h-[48px] max-w-[1200px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 overflow-x-clip px-3 sm:flex sm:justify-between sm:gap-3 sm:px-4 sm:py-0">
          <div className="flex min-w-0 items-center justify-start gap-2.5">
            <Link
              href={ordersHref}
              aria-label="Go to orders"
              className="hidden items-center gap-3 sm:inline-flex"
            >
              <BrandLockup iconSize={30} textClassName="text-[1.55rem]" />
            </Link>

            <Link
              href={ordersHref}
              className="inline-flex h-9 w-10 items-center justify-center rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] text-[13px] font-semibold text-[#4B5563] dark:text-white/70 shadow-sm transition hover:border-[#C7D2FE] dark:hover:border-[var(--brand-500)]/40 hover:bg-[#F9FAFB] dark:hover:bg-white/[0.06] hover:text-[#1F2937] dark:hover:text-white sm:hidden"
            >
              <BrandIcon size={18} />
            </Link>

            {showSwitcher ? (
              <div className="hidden min-w-0 sm:block">
                <BusinessSwitcher
                  businesses={businesses!}
                  currentSlug={currentBusinessSlug!}
                  onSelect={handleSelectBusiness}
                  widthClassName="w-[176px] lg:w-[208px]"
                  variant="toolbar-compact"
                />
              </div>
            ) : null}

            <nav className="hidden items-center rounded-lg border border-[#E5E7EB] dark:border-white/10 bg-[#F9FAFB] dark:bg-white/[0.04] p-1 lg:inline-flex">
              <Link
                href={ordersHref}
                className="inline-flex h-7 items-center rounded-md bg-white dark:bg-white/[0.03] px-3 text-[12px] font-semibold text-[#3645A0] dark:text-[var(--brand-300)] shadow-[0_1px_2px_rgba(16,24,40,0.08)]"
              >
                CRM
              </Link>
            </nav>
          </div>

          <div className="min-w-0 px-1 text-center" />

          <div className="flex min-w-0 justify-end">
            <UserMenu
              userLabel={userLabel}
              roleLabel={roleLabel}
              currentPlan={currentPlan}
              businessId={businessId}
              profileHref={profileHref}
              settingsHref={
                currentBusinessSlug
                  ? `/b/${currentBusinessSlug}/settings`
                  : "/app/settings"
              }
              billingHref={billingHref ?? "/app/settings/billing"}
              adminHref={adminHref}
              userAvatarUrl={userAvatarUrl}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
