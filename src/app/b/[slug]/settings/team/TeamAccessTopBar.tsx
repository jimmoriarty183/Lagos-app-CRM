"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronDown, LogOut, UserCircle2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/Logo";

type Props = {
  ordersHref: string;
  userLabel: string;
  profileHref: string;
};

export default function TeamAccessTopBar({
  ordersHref,
  userLabel,
  profileHref,
}: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 overflow-x-clip border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <div className="pt-[env(safe-area-inset-top)]">
        <div className="mx-auto grid h-auto max-w-[1220px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 overflow-x-clip px-3 py-2.5 sm:flex sm:h-[60px] sm:justify-between sm:gap-3 sm:px-6 sm:py-0">
          <div className="flex min-w-0 items-center gap-2 justify-start">
            <Link
              href={ordersHref}
              aria-label="Go to orders"
              className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm sm:inline-flex"
            >
              <Logo size={28} />
              <div className="leading-none">
                <div className="text-[15px] font-semibold tracking-tight text-slate-900">Ordero</div>
                <div className="pt-1 text-[11px] text-slate-500">Orders. Simple. Fast.</div>
              </div>
            </Link>

            <Link
              href={ordersHref}
              className="inline-flex h-10 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 sm:h-10 sm:w-auto sm:gap-2 sm:px-3"
            >
              <span className="sm:hidden">
                <Logo size={18} />
              </span>
              <ChevronLeft className="hidden h-4 w-4 sm:block" />
              <span className="hidden sm:inline">Orders</span>
            </Link>
          </div>

          <div className="min-w-0 px-1 text-center" />

          <div className="flex min-w-0 justify-end">
            {mounted ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-10 w-11 min-w-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 sm:h-10 sm:w-auto sm:max-w-[180px] sm:gap-2 sm:px-3"
                  >
                    <UserCircle2 className="h-4 w-4 shrink-0 text-slate-500" />
                    <span className="hidden truncate sm:inline">{userLabel}</span>
                    <ChevronDown className="hidden h-4 w-4 shrink-0 text-slate-400 sm:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-48 rounded-xl border-slate-200 bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
                >
                  <DropdownMenuItem asChild className="rounded-lg px-3 py-2 text-sm font-medium">
                    <Link href={profileHref}>Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="rounded-lg px-3 py-2 text-sm font-medium text-red-700 focus:text-red-700"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="inline-flex h-10 w-11 min-w-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm sm:h-10 sm:w-auto sm:max-w-[180px] sm:gap-2 sm:px-3">
                <UserCircle2 className="h-4 w-4 shrink-0 text-slate-500" />
                <span className="hidden truncate sm:inline">{userLabel}</span>
                <ChevronDown className="hidden h-4 w-4 shrink-0 text-slate-400 sm:block" />
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
