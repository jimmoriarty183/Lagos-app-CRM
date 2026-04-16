"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronDown,
  CreditCard,
  LogOut,
  Settings,
  Shield,
  UserCircle2,
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({
  userLabel,
  roleLabel,
  profileHref,
  settingsHref,
  billingHref,
  adminHref,
  userAvatarUrl,
  compact = false,
}: {
  userLabel: string;
  roleLabel: string;
  profileHref: string;
  settingsHref: string;
  billingHref?: string;
  adminHref?: string;
  userAvatarUrl?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [isHydrated, setIsHydrated] = React.useState(false);

  React.useEffect(() => {
    setIsHydrated(true);
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      document.cookie = "u=; path=/; max-age=0";
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setIsLoggingOut(false);
      router.push("/login");
      router.refresh();
    }
  }

  if (!isHydrated) {
    return (
      <div
        className={
          compact
            ? "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#4B5563] shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
            : "inline-flex h-9 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white pl-1.5 pr-2.5 text-[#4B5563] shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
        }
      >
        {userAvatarUrl ? (
          <img
            src={userAvatarUrl}
            alt="User avatar"
            className="h-7 w-7 rounded-full border border-[#E5E7EB] object-cover"
          />
        ) : (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#111827] text-xs font-semibold text-white">
            {userLabel[0]?.toUpperCase() || "U"}
          </span>
        )}
        {compact ? null : <ChevronDown className="h-4 w-4 text-[#9CA3AF]" />}
      </div>
    );
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open user menu"
          className={
            compact
              ? "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#4B5563] shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB]"
              : "inline-flex h-9 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white pl-1.5 pr-2.5 text-[#4B5563] shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB]"
          }
        >
          {userAvatarUrl ? (
            <img
              src={userAvatarUrl}
              alt="User avatar"
              className="h-7 w-7 rounded-full border border-[#E5E7EB] object-cover"
            />
          ) : (
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#111827] text-xs font-semibold text-white">
              {userLabel[0]?.toUpperCase() || "U"}
            </span>
          )}
          {compact ? null : (
            <>
              <span className="hidden max-w-[132px] truncate text-[13px] font-semibold text-[#1F2937] lg:inline">
                {userLabel}
              </span>
              <ChevronDown className="h-4 w-4 text-[#9CA3AF]" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={10} className="w-[220px]">
        <DropdownMenuLabel className="px-3 py-2">
          <div className="truncate text-sm font-semibold text-[#1F2937]">
            {userLabel}
          </div>
          <div className="pt-0.5 text-[11px] font-medium capitalize text-[#9CA3AF]">
            {roleLabel}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          asChild
          className="rounded-xl px-3 py-2 text-sm font-medium text-[#374151]"
        >
          <Link href={profileHref}>
            <UserCircle2 className="h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem
          asChild
          className="rounded-xl px-3 py-2 text-sm font-medium text-[#374151]"
        >
          <Link href={settingsHref}>
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>

        {billingHref ? (
          <DropdownMenuItem
            asChild
            className="rounded-xl px-3 py-2 text-sm font-medium text-[#374151]"
          >
            <Link href={billingHref}>
              <CreditCard className="h-4 w-4" />
              Billing
            </Link>
          </DropdownMenuItem>
        ) : null}

        {adminHref ? (
          <DropdownMenuItem
            asChild
            className="rounded-xl px-3 py-2 text-sm font-medium text-[#374151]"
          >
            <Link href={adminHref}>
              <Shield className="h-4 w-4" />
              Admin
            </Link>
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => void handleLogout()}
          disabled={isLoggingOut}
          className="rounded-xl px-3 py-2 text-sm font-medium text-[#B42318] focus:text-[#B42318]"
        >
          <LogOut className="h-4 w-4" />
          {isLoggingOut ? "Logging out..." : "Logout"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
