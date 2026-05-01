"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BrandLockup } from "@/components/Brand";
import LoginUI from "./ui";
import { Spinner } from "@/components/ui/spinner";
import { PublicFooter } from "@/components/PublicFooter";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const benefits = [
  "Run clients and deals without chaos",
  "Keep team access and workflow in one workspace",
  "Stay ready for Tasks and Academy without rebuilding the product",
];

export default function Page() {
  return (
    <React.Suspense fallback={null}>
      <LoginPageContent />
    </React.Suspense>
  );
}

function LoginPageContent() {
  const searchParams = useSearchParams();
  const [mode, setMode] = React.useState<"login" | "register" | "reset">(
    searchParams.get("mode") === "register" ? "register" : "login",
  );
  const showPromo = mode !== "register";

  return (
    <div className="relative flex min-h-[100svh] flex-col overflow-hidden bg-[#f6f8fb] text-slate-900 dark:bg-[var(--bg-app)] dark:text-white">
      <div className="pointer-events-none absolute -left-40 top-[-9rem] h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,_rgba(59,130,246,0.22)_0%,_rgba(59,130,246,0)_68%)] blur-2xl dark:bg-[radial-gradient(circle,_rgba(91,91,179,0.45)_0%,_rgba(91,91,179,0)_68%)]" />
      <div className="pointer-events-none absolute -right-36 top-10 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,_rgba(16,185,129,0.2)_0%,_rgba(16,185,129,0)_70%)] blur-2xl dark:bg-[radial-gradient(circle,_rgba(124,124,200,0.32)_0%,_rgba(124,124,200,0)_70%)]" />
      <div className="pointer-events-none absolute bottom-[-10rem] left-1/2 h-[25rem] w-[25rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(99,102,241,0.18)_0%,_rgba(99,102,241,0)_68%)] blur-2xl dark:bg-[radial-gradient(circle,_rgba(91,91,179,0.4)_0%,_rgba(91,91,179,0)_68%)]" />

      <header className="relative z-10 border-b border-white/50 bg-white/45 backdrop-blur-xl dark:border-white/10 dark:bg-[#0B0B14]/60">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-2.5">
            <BrandLockup iconSize={34} textClassName="text-[1.9rem]" />
          </div>
          <div className="flex items-center gap-3">
            <Link
              className="text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-white/70 dark:hover:text-white"
              href="/"
            >
              Home
            </Link>
            <ThemeToggle size="sm" />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center px-4 py-4 sm:px-8 sm:py-6">
        <div
          className={[
            "mx-auto grid w-full items-center gap-6 lg:gap-8",
            showPromo
              ? "max-w-5xl lg:grid-cols-[1fr_420px]"
              : "max-w-[440px]",
          ].join(" ")}
        >
          {showPromo ? (
            <section className="hidden rounded-[24px] border border-white/60 bg-white/55 p-6 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur-md dark:border-white/10 dark:bg-white/[0.03] dark:shadow-[0_20px_60px_-35px_rgba(0,0,0,0.7)] lg:block">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-[var(--brand-300)]">
                Ordo
              </p>
              <div className="mb-3">
                <BrandLockup iconSize={28} textClassName="text-[1.5rem]" />
              </div>
              <h2 className="mt-2 max-w-md text-[1.5rem] font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[1.65rem]">
                Bring your business into order.
              </h2>
              <p className="mt-2 max-w-md text-[13px] leading-snug text-slate-600 dark:text-white/70">
                Ordo is a business management system that keeps clients, tasks,
                and team workflows in one place. Start with CRM and scale the
                system without process chaos.
              </p>

              <ul className="mt-4 space-y-2">
                {benefits.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-center gap-2.5 rounded-lg border border-slate-200/90 bg-white/80 px-3 py-2 text-[13px] font-medium text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/85"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#315efb] dark:bg-[var(--brand-300)]" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="space-y-4">
            <React.Suspense
              fallback={
                <div className="flex w-full items-center justify-center rounded-[20px] border border-slate-200 bg-white p-7 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
                  <Spinner className="h-8 w-8" />
                </div>
              }
            >
              <div className="mx-auto w-full max-w-[440px]">
                <LoginUI mode={mode} onModeChange={setMode} />
              </div>
            </React.Suspense>

            {showPromo ? (
              <section className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03] lg:hidden">
                <div className="mb-3">
                  <BrandLockup iconSize={30} textClassName="text-[1.65rem]" />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-[var(--brand-300)]">
                  Why Ordo
                </p>
                <ul className="mt-2 space-y-2">
                  {benefits.map((benefit) => (
                    <li
                      key={benefit}
                      className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-white/80"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-[#315efb] dark:bg-[var(--brand-300)]" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>
      </main>

      <div className="relative z-10">
        <PublicFooter />
      </div>
    </div>
  );
}
