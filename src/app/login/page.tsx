"use client";

import React from "react";
import Link from "next/link";
import { BrandLockup } from "@/components/Brand";
import LoginUI from "./ui";
import { Spinner } from "@/components/ui/spinner";

const benefits = [
  "Run clients and deals without chaos",
  "Keep team access and workflow in one workspace",
  "Stay ready for Tasks and Academy without rebuilding the product",
];

export default function Page() {
  const [mode, setMode] = React.useState<"login" | "register" | "reset">(
    "login",
  );
  const showPromo = mode !== "register";

  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-[#f6f8fb] text-slate-900">
      <div className="pointer-events-none absolute -left-40 top-[-9rem] h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,_rgba(59,130,246,0.22)_0%,_rgba(59,130,246,0)_68%)] blur-2xl" />
      <div className="pointer-events-none absolute -right-36 top-10 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,_rgba(16,185,129,0.2)_0%,_rgba(16,185,129,0)_70%)] blur-2xl" />
      <div className="pointer-events-none absolute bottom-[-10rem] left-1/2 h-[25rem] w-[25rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(99,102,241,0.18)_0%,_rgba(99,102,241,0)_68%)] blur-2xl" />

      <header className="relative z-10 border-b border-white/50 bg-white/45 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-2.5">
            <BrandLockup iconSize={34} textClassName="text-[1.9rem]" />
          </div>
          <Link
            className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
            href="/"
          >
            Home
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100svh-64px)] w-full max-w-6xl items-center px-4 py-8 sm:px-8 sm:py-10">
        <div
          className={[
            "mx-auto grid w-full items-center gap-8 lg:gap-10",
            showPromo
              ? "max-w-5xl lg:grid-cols-[1fr_440px]"
              : "max-w-[460px]",
          ].join(" ")}
        >
          {showPromo ? (
            <section className="hidden rounded-[24px] border border-white/60 bg-white/55 p-10 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur-md lg:block">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Ordo
              </p>
              <div className="mb-6">
                <BrandLockup iconSize={36} textClassName="text-[2rem]" />
              </div>
              <h2 className="mt-3 max-w-md text-[2rem] font-semibold tracking-tight text-slate-900 sm:text-[2.15rem]">
                Bring your business into order.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-600">
                Ordo is a business management system that keeps clients, tasks,
                and team workflows in one place. Start with CRM and scale the
                system without process chaos.
              </p>

              <ul className="mt-8 space-y-3">
                {benefits.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white/80 px-4 py-3 text-sm font-medium text-slate-700"
                  >
                    <span className="h-2 w-2 rounded-full bg-[#315efb]" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="space-y-4">
            <React.Suspense
              fallback={
                <div className="flex w-full items-center justify-center rounded-[20px] border border-slate-200 bg-white p-7 shadow-sm">
                  <Spinner className="h-8 w-8" />
                </div>
              }
            >
              <div className="mx-auto w-full max-w-[460px]">
                <LoginUI mode={mode} onModeChange={setMode} />
              </div>
            </React.Suspense>

            {showPromo ? (
              <section className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur-sm lg:hidden">
                <div className="mb-3">
                  <BrandLockup iconSize={30} textClassName="text-[1.65rem]" />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Why Ordo
                </p>
                <ul className="mt-2 space-y-2">
                  {benefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-2.5 text-sm text-slate-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#315efb]" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
