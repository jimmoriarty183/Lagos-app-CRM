"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Sparkles } from "lucide-react";

import BusinessSwitcher, { BusinessOption } from "./BusinessSwitcher";

type Props = {
  businessSlug: string;
  plan: string;
  role: "OWNER" | "MANAGER" | "GUEST";
  pill?: React.CSSProperties;
  businesses?: BusinessOption[];
};

export default function TopBar({ businessSlug, plan, role, businesses }: Props) {
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
    if (!window.confirm("Log out?")) return;
    document.cookie = "u=; path=/; max-age=0";
    router.push("/login");
  };

  const showSwitcher = !!businesses && businesses.length >= 1;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/70 backdrop-blur-md">
      <div className="pt-[env(safe-area-inset-top)]">
        <div className="mx-auto grid h-14 max-w-7xl grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 px-3 sm:px-6 lg:gap-5">
          <Link
            href={`/b/${businessSlug}`}
            aria-label="Go to dashboard"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm"
          >
            <span className="text-sm font-black">O</span>
          </Link>

          <div className="min-w-0 lg:mx-auto lg:w-full lg:max-w-[560px] xl:max-w-[640px]">
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

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-violet-700 md:inline-flex">
              <Sparkles className="mr-1 h-3 w-3" />
              {plan || "beta"}
            </span>

            <button
              onClick={handleLogout}
              title="Logout"
              aria-label="Log out"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
