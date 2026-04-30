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
  currentPlan,
  businessId,
  profileHref,
  settingsHref,
  billingHref,
  adminHref,
  userAvatarUrl,
  compact = false,
}: {
  userLabel: string;
  roleLabel: string;
  currentPlan?: string | null;
  businessId?: string;
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
  const [resolvedPlan, setResolvedPlan] = React.useState<string | null>(
    currentPlan ?? null,
  );

  React.useEffect(() => {
    setIsHydrated(true);
  }, []);

  React.useEffect(() => {
    setResolvedPlan(currentPlan ?? null);
  }, [currentPlan]);

  React.useEffect(() => {
    const id = String(businessId ?? "").trim();
    if (!id) return;

    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(
          `/api/billing/current-plan?business_id=${encodeURIComponent(id)}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          },
        );
        if (!response.ok) return;
        const payload = (await response.json()) as { plan_code?: string | null };
        const nextPlan = String(payload.plan_code ?? "").trim();
        if (nextPlan) {
          setResolvedPlan(nextPlan);
          return;
        }
        setResolvedPlan(null);
      } catch {
        // Silent fallback: keep menu usable even if billing endpoint is unavailable.
      }
    })();

    return () => controller.abort();
  }, [businessId]);

  const planMeta = React.useMemo(() => {
    const raw = String(resolvedPlan ?? "").trim().toLowerCase();
    // Display names were swapped in Phase 5: code='business' is middle-high
    // tier shown as "Pro", code='pro' is top tier shown as "Business".
    const knownPlans: Record<string, string> = {
      solo: "Solo",
      starter: "Starter",
      business: "Pro",
      pro: "Business",
    };
    const label = knownPlans[raw] ?? "No active plan";
    const isFallback = !(raw in knownPlans);
    return { label, isFallback };
  }, [resolvedPlan]);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      document.cookie = "u=; path=/; max-age=0";
      await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
      });
    } catch {
      // Ignore network errors — we still proceed to wipe client state below.
    }

    // Defensive client-side wipe: remove any Supabase tokens that the browser
    // client may have cached in storage so a stale session cannot resurrect.
    try {
      if (typeof window !== "undefined") {
        const wipeStorage = (storage: Storage) => {
          const removable: string[] = [];
          for (let i = 0; i < storage.length; i += 1) {
            const key = storage.key(i);
            if (!key) continue;
            if (key.startsWith("sb-") || key.startsWith("supabase.")) {
              removable.push(key);
            }
          }
          removable.forEach((key) => storage.removeItem(key));
        };
        wipeStorage(window.localStorage);
        wipeStorage(window.sessionStorage);
      }
    } catch {
      // localStorage may be unavailable (private mode); fall through.
    }

    setIsLoggingOut(false);

    // Hard redirect drops in-memory React/router state and forces middleware
    // to re-evaluate auth from the now-cleared cookies. router.push would keep
    // the cached client state and could flash an authed UI.
    if (typeof window !== "undefined") {
      window.location.replace("/login");
      return;
    }
    router.push("/login");
    router.refresh();
  }

  if (!isHydrated) {
    return (
      <div
        className={
          compact
            ? "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] text-[#4B5563] dark:text-white/70 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
            : "inline-flex h-9 items-center gap-2 rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] pl-1.5 pr-2.5 text-[#4B5563] dark:text-white/70 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
        }
      >
        {userAvatarUrl ? (
          <img
            src={userAvatarUrl}
            alt="User avatar"
            className="h-7 w-7 rounded-full border border-[#E5E7EB] dark:border-white/10 object-cover"
          />
        ) : (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#111827] text-xs font-semibold text-white">
            {userLabel[0]?.toUpperCase() || "U"}
          </span>
        )}
        {compact ? null : <ChevronDown className="h-4 w-4 text-[#9CA3AF] dark:text-white/40" />}
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
              ? "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] text-[#4B5563] dark:text-white/70 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-[#D1D5DB] dark:hover:border-white/20 hover:bg-[#F9FAFB] dark:hover:bg-white/[0.06]"
              : "inline-flex h-9 items-center gap-2 rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] pl-1.5 pr-2.5 text-[#4B5563] dark:text-white/70 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-[#D1D5DB] dark:hover:border-white/20 hover:bg-[#F9FAFB] dark:hover:bg-white/[0.06]"
          }
        >
          {userAvatarUrl ? (
            <img
              src={userAvatarUrl}
              alt="User avatar"
              className="h-7 w-7 rounded-full border border-[#E5E7EB] dark:border-white/10 object-cover"
            />
          ) : (
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#111827] text-xs font-semibold text-white">
              {userLabel[0]?.toUpperCase() || "U"}
            </span>
          )}
          {compact ? null : (
            <>
              <span className="hidden max-w-[132px] truncate text-[13px] font-semibold text-[#1F2937] dark:text-white/90 lg:inline">
                {userLabel}
              </span>
              <ChevronDown className="h-4 w-4 text-[#9CA3AF] dark:text-white/40" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={10} className="w-[220px]">
        <DropdownMenuLabel className="px-3 py-2">
          <div className="truncate text-sm font-semibold text-[#1F2937] dark:text-white/90">
            {userLabel}
          </div>
          <div className="pt-0.5 text-[11px] font-medium capitalize text-[#9CA3AF] dark:text-white/40">
            {roleLabel}
          </div>
          <div
            className={`mt-2 inline-flex max-w-full items-center rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.04em] ${
              planMeta.isFallback
                ? "border border-[#E5E7EB] dark:border-white/10 bg-[#F9FAFB] dark:bg-white/[0.04] text-[#667085]"
                : "border border-[#C7D2FE] dark:border-[var(--brand-500)]/40 bg-[#EEF2FF] dark:bg-[var(--brand-600)]/15 text-[#3645A0] dark:text-[var(--brand-300)]"
            }`}
          >
            <span className="truncate">Current plan: {planMeta.label}</span>
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

        <DropdownMenuItem
          asChild
          className="rounded-xl px-3 py-2 text-sm font-medium text-[#374151]"
        >
          <Link href={settingsHref}>
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>

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
