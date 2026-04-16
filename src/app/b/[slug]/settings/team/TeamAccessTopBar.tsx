"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { BrandIcon, BrandLockup } from "@/components/Brand";
import { UserMenu } from "@/app/b/[slug]/_components/topbar/UserMenu";

type Props = {
  ordersHref: string;
  userLabel: string;
  profileHref: string;
  adminHref?: string;
  billingHref?: string;
  roleLabel?: string;
  userAvatarUrl?: string;
};

export default function TeamAccessTopBar({
  ordersHref,
  userLabel,
  profileHref,
  adminHref,
  billingHref,
  roleLabel = "member",
  userAvatarUrl,
}: Props) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 overflow-x-clip border-b border-[var(--neutral-200)] bg-white">
      <div className="pt-[env(safe-area-inset-top)]">
        <div className="mx-auto grid h-[64px] max-w-[1200px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 overflow-x-clip px-3 sm:flex sm:justify-between sm:gap-3 sm:px-6 sm:py-0">
          <div className="flex min-w-0 items-center gap-2 justify-start">
            <Link
              href={ordersHref}
              aria-label="Go to orders"
              className="hidden items-center gap-3 sm:inline-flex"
            >
              <BrandLockup iconSize={30} textClassName="text-[1.55rem]" />
            </Link>

            <Link
              href={ordersHref}
              className="inline-flex h-9 w-10 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[13px] font-semibold text-[#4B5563] shadow-sm transition hover:border-[#C7D2FE] hover:bg-[#F9FAFB] hover:text-[#1F2937] sm:h-9 sm:w-auto sm:gap-2 sm:px-3"
            >
              <span className="sm:hidden">
                <BrandIcon size={18} />
              </span>
              <ChevronLeft className="hidden h-4 w-4 sm:block" />
              <span className="hidden sm:inline">CRM</span>
            </Link>
          </div>

          <div className="min-w-0 px-1 text-center" />

          <div className="flex min-w-0 justify-end">
            <UserMenu
              userLabel={userLabel}
              roleLabel={roleLabel}
              profileHref={profileHref}
              settingsHref="/app/settings"
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
