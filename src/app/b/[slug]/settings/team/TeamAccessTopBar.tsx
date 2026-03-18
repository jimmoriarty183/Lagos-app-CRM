"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronDown, LogOut, Shield, UserCircle2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BrandIcon, BrandLockup } from "@/components/Brand";

type Props = {
  ordersHref: string;
  userLabel: string;
  profileHref: string;
  adminHref?: string;
};

export default function TeamAccessTopBar({
  ordersHref,
  userLabel,
  profileHref,
  adminHref,
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
    <header className="fixed inset-x-0 top-0 z-50 overflow-x-clip border-b border-[#E5E7EB]/80 bg-white/88 backdrop-blur-md">
      <div className="pt-[env(safe-area-inset-top)]">
        <div className="mx-auto grid h-auto max-w-[1220px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 overflow-x-clip px-3 py-2 sm:flex sm:h-[56px] sm:justify-between sm:gap-3 sm:px-6 sm:py-0">
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
            {mounted ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-9 w-10 min-w-0 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[13px] font-semibold text-[#4B5563] shadow-sm transition hover:border-[#C7D2FE] hover:bg-[#F9FAFB] hover:text-[#1F2937] sm:h-9 sm:w-auto sm:max-w-[180px] sm:gap-2 sm:px-3"
                  >
                    <UserCircle2 className="h-4 w-4 shrink-0 text-[#6B7280]" />
                    <span className="hidden truncate sm:inline">{userLabel}</span>
                    <ChevronDown className="hidden h-4 w-4 shrink-0 text-[#9CA3AF] sm:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-48 rounded-xl border-[#E5E7EB] bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
                >
                  <DropdownMenuItem asChild className="rounded-lg px-3 py-2 text-sm font-medium">
                    <Link href={profileHref}>Profile</Link>
                  </DropdownMenuItem>
                  {adminHref ? (
                    <DropdownMenuItem asChild className="rounded-lg px-3 py-2 text-sm font-medium">
                      <Link href={adminHref}>
                        <Shield className="h-4 w-4" />
                        Admin
                      </Link>
                    </DropdownMenuItem>
                  ) : null}
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
              <div className="inline-flex h-9 w-10 min-w-0 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[13px] font-semibold text-[#4B5563] shadow-sm sm:h-9 sm:w-auto sm:max-w-[180px] sm:gap-2 sm:px-3">
                <UserCircle2 className="h-4 w-4 shrink-0 text-[#6B7280]" />
                <span className="hidden truncate sm:inline">{userLabel}</span>
                <ChevronDown className="hidden h-4 w-4 shrink-0 text-[#9CA3AF] sm:block" />
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
