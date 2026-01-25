"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";

import BusinessSwitcher, { BusinessOption } from "./BusinessSwitcher";

type Props = {
  businessSlug: string;
  plan: string;
  role: "OWNER" | "MANAGER" | "GUEST";
  pill?: React.CSSProperties;
  businesses?: BusinessOption[];
};

export default function TopBar({ businessSlug, plan, businesses }: Props) {
  const router = useRouter();

  const handleSelect = (slug: string) => {
    document.cookie = `active_business_slug=${encodeURIComponent(
      slug
    )}; path=/; max-age=${60 * 60 * 24 * 365}`;

    const url = new URL(window.location.href);
    const u = url.searchParams.get("u");
    router.push(u ? `/b/${slug}?u=${encodeURIComponent(u)}` : `/b/${slug}`);
  };

  const handleLogout = () => {
    document.cookie = "u=; path=/; max-age=0";
    router.push("/login");
  };

  const showSwitcher = !!businesses && businesses.length > 1;

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/70 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          {/* LEFT */}
          <div className="flex items-center gap-3 min-w-0">
            <Logo size={36} />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 leading-tight">
                Ordero
              </div>
              <div className="text-[11px] text-gray-500 leading-tight hidden sm:block">
                / {businessSlug}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Switcher */}
            {showSwitcher ? (
              <BusinessSwitcher
                businesses={businesses!}
                currentSlug={businessSlug}
                onSelect={handleSelect}
                disabledAdd
                widthClassName="w-[200px] sm:w-[220px]" // desktop шире и солиднее
                variant="toolbar"
              />
            ) : null}

            {/* beta (desktop) */}
            <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-700">
              <BadgeCheck size={16} className="opacity-80" />
              <span>{plan}</span>
            </span>

            {/* logout icon (mobile+desktop sizes) */}
            <button
              onClick={handleLogout}
              title="Logout"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition"
            >
              <LogOut className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
