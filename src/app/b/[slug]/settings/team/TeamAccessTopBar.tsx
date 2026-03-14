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
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <div className="pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-[68px] max-w-[1220px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 flex-1 justify-start">
            <Link
              href={ordersHref}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Orders</span>
            </Link>
          </div>

          <div className="min-w-0 shrink text-center">
            <div className="text-base font-semibold tracking-[-0.02em] text-slate-900 sm:text-lg">
              Team &amp; Access
            </div>
          </div>

          <div className="flex min-w-0 flex-1 justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-11 max-w-[180px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                >
                  <UserCircle2 className="h-4 w-4 shrink-0 text-slate-500" />
                  <span className="truncate">{userLabel}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
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
