"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, LogOut, Settings, Shield, UserCircle2 } from "lucide-react";
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
  adminHref,
  userAvatarUrl,
  compact = false,
}: {
  userLabel: string;
  roleLabel: string;
  profileHref: string;
  settingsHref: string;
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
            ? "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white/90 text-[#374151] shadow-sm"
            : "inline-flex h-9 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white/90 pl-1.5 pr-2.5 text-[#374151] shadow-sm"
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open user menu"
          className={
            compact
              ? "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white/90 text-[#374151] shadow-sm transition hover:border-[#D6DAE1] hover:bg-[#FCFCFD]"
              : "inline-flex h-9 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white/90 pl-1.5 pr-2.5 text-[#374151] shadow-sm transition hover:border-[#D6DAE1] hover:bg-[#FCFCFD]"
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
              <span className="hidden max-w-[132px] truncate text-[13px] font-semibold text-[#111827] lg:inline">
                {userLabel}
              </span>
              <ChevronDown className="h-4 w-4 text-[#9CA3AF]" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-[220px] rounded-2xl border-[#E5E7EB] bg-white p-1.5 shadow-[0_20px_48px_rgba(15,23,42,0.14)]"
      >
        <DropdownMenuLabel className="px-3 py-2">
          <div className="truncate text-sm font-semibold text-[#111827]">{userLabel}</div>
          <div className="pt-0.5 text-[11px] font-medium capitalize text-[#9CA3AF]">{roleLabel}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild className="rounded-xl px-3 py-2 text-sm font-medium text-[#374151]">
          <Link href={profileHref}>
            <UserCircle2 className="h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="rounded-xl px-3 py-2 text-sm font-medium text-[#374151]">
          <Link href={settingsHref}>
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>

        {adminHref ? (
          <DropdownMenuItem asChild className="rounded-xl px-3 py-2 text-sm font-medium text-[#374151]">
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
