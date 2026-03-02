"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Sparkles } from "lucide-react";

export type BusinessRole = "Owner" | "Manager";

type TopBarProps = {
  businessName?: string;
  businessHref?: string;
  role?: BusinessRole;
  switcherHint?: string;
  onOpenBusinessSwitcher?: () => void;
  onLogout?: () => void;
};

export default function TopBar({
  businessName = "demo-business",
  businessHref = "/",
  role = "Owner",
  switcherHint = "Tap to switch",
  onOpenBusinessSwitcher,
  onLogout,
}: TopBarProps) {
  const router = useRouter();

  const roleClasses =
    role === "Owner"
      ? "bg-slate-900 text-white"
      : "bg-blue-100 text-blue-700 border border-blue-200";

  const handleLogout = () => {
    if (!window.confirm("Log out?")) return;

    if (onLogout) {
      onLogout();
      return;
    }

    router.push("/login");
  };

  const handleOpenBusinessSwitcher = () => {
    if (onOpenBusinessSwitcher) {
      onOpenBusinessSwitcher();
      return;
    }

    router.push("/b/demo");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/70 backdrop-blur-md">
      <div className="pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-3 sm:px-6">
          <Link
            href={businessHref}
            aria-label="Go to dashboard"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm"
          >
            <span className="text-sm font-black">O</span>
          </Link>

          <button
            type="button"
            onClick={handleOpenBusinessSwitcher}
            className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm"
          >
            <div className="min-w-0 flex-1 text-left leading-tight">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-semibold text-slate-900">
                  {businessName}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${roleClasses}`}
                >
                  {role}
                </span>
              </div>
              <p className="truncate text-[11px] text-slate-500">{switcherHint}</p>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
          </button>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-violet-700 sm:inline-flex">
              <Sparkles className="mr-1 h-3 w-3" />
              beta
            </span>

            <button
              type="button"
              onClick={handleLogout}
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
