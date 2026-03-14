"use client";

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

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <header className="sticky top-0 z-40 overflow-x-clip border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <div className="pt-[env(safe-area-inset-top)]">
        <div className="mx-auto grid h-auto max-w-[1220px] grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2 overflow-x-clip px-3 py-2.5 sm:flex sm:h-[60px] sm:justify-between sm:gap-3 sm:px-6 sm:py-0">
          <div className="flex min-w-0 justify-start">
            <Link
              href={ordersHref}
              className="inline-flex h-10 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 sm:h-10 sm:w-auto sm:gap-2 sm:px-3"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Orders</span>
            </Link>
          </div>

          <div className="min-w-0 px-1 text-center">
            <div className="truncate text-[13px] font-semibold tracking-[-0.02em] text-slate-900 sm:text-[16px]">
              Team &amp; Access
            </div>
          </div>

          <div className="flex min-w-0 justify-end">
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
          </div>
        </div>
      </div>
    </header>
  );
}
