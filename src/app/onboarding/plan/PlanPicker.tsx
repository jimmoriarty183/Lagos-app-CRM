"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { openCheckout } from "@/components/BuyButton";
import { BrandLockup } from "@/components/Brand";

type PlanCode = "solo" | "starter" | "business" | "pro";
type BillingInterval = "monthly" | "yearly";

type PlanOption = {
  code: PlanCode;
  label: string;
  description: string;
  regularAmount: { monthly: string; yearly: string };
  launchAmount: { monthly: string; yearly: string };
  monthlyEquivalentYearly: string;
  features: string[];
  cta: string;
  highlight?: boolean;
  note: string;
};

// NOTE: same swap as /pricing — code 'business' shown as "Pro", code 'pro' as
// "Business". Keep the codes stable for billing history.
const PLAN_OPTIONS: PlanOption[] = [
  {
    code: "solo",
    label: "Solo",
    description: "For individuals who need structure and follow-up discipline",
    regularAmount: { monthly: "12", yearly: "120" },
    launchAmount: { monthly: "8", yearly: "80" },
    monthlyEquivalentYearly: "8",
    features: [
      "CRM (orders + kanban)",
      "Filters & search",
      "Custom statuses",
      "Basic inbox",
      "Today & follow-ups",
    ],
    cta: "Start with Solo",
    note: "1 user · 1 business",
  },
  {
    code: "starter",
    label: "Starter",
    description: "For small teams getting control over daily operations",
    regularAmount: { monthly: "49", yearly: "490" },
    launchAmount: { monthly: "39", yearly: "390" },
    monthlyEquivalentYearly: "39",
    features: [
      "Everything in Solo",
      "Full inbox",
      "Team management",
      "Basic support workflow",
    ],
    cta: "Start with Starter",
    note: "Up to 5 users · 2 businesses",
  },
  {
    code: "business",
    label: "Pro",
    description: "For growing teams that need manager dashboards and KPI visibility",
    regularAmount: { monthly: "99", yearly: "990" },
    launchAmount: { monthly: "79", yearly: "790" },
    monthlyEquivalentYearly: "79",
    features: [
      "Everything in Starter",
      "Manager dashboards",
      "KPI tracking",
      "Productivity analytics",
      "Alerts",
      "Export clients & products",
    ],
    cta: "Start with Pro",
    highlight: true,
    note: "Up to 10 users · 5 businesses",
  },
  {
    code: "pro",
    label: "Business",
    description:
      "For multi-location teams and agencies that need full operational control",
    regularAmount: { monthly: "179", yearly: "1790" },
    launchAmount: { monthly: "149", yearly: "1490" },
    monthlyEquivalentYearly: "149",
    features: [
      "Everything in Pro",
      "Risk score",
      "Full support workflow",
      "Priority support",
      "Import from CSV",
      "Audit log",
    ],
    cta: "Start with Business",
    note: "Up to 20 users · 10 businesses",
  },
];

const PRICE_IDS: Record<PlanCode, Record<BillingInterval, string>> = {
  solo: {
    monthly: "pri_01kmncmgt9csnfq6hwvz6eg5m3",
    yearly: "pri_01kn1ztvh3d8mf3c7msstc4yj4",
  },
  starter: {
    monthly: "pri_01kmncq914c512x590mj142cm9",
    yearly: "pri_01kn1zrysbhmecpa8dmn3mjkwv",
  },
  business: {
    monthly: "pri_01kmncrvjyqb3y1rwf6w2zcpbq",
    yearly: "pri_01kn1zq31rkhqbgxys3f1fgqgj",
  },
  pro: {
    monthly: "pri_01kmncvk1ytkmj0tar1wxb8cw4",
    yearly: "pri_01kn1zmv87cs2he9v7xy01xpns",
  },
};

function normalizePlan(input: string | undefined): PlanCode {
  const value = String(input ?? "").trim().toLowerCase();
  if (value === "starter") return "starter";
  if (value === "business") return "business";
  if (value === "pro") return "pro";
  if (value === "solo") return "solo";
  return "business";
}

function normalizeInterval(input: string | undefined): BillingInterval {
  return String(input ?? "").trim().toLowerCase() === "yearly" ? "yearly" : "monthly";
}

type Props = {
  userEmail: string;
  userId: string;
  isDemo: boolean;
  initialPlan?: string;
  initialInterval?: string;
  autoCheckout?: boolean;
};

export function OnboardingPlanPicker({
  userEmail,
  userId,
  isDemo,
  initialPlan,
  initialInterval,
  autoCheckout,
}: Props) {
  const [interval, setInterval] = useState<BillingInterval>(
    normalizeInterval(initialInterval),
  );
  const [activePlan, setActivePlan] = useState<PlanCode>(
    normalizePlan(initialPlan),
  );
  const [busyPlan, setBusyPlan] = useState<PlanCode | null>(null);
  const [error, setError] = useState("");
  const [autoFired, setAutoFired] = useState(false);

  async function handleSelectPlan(plan: PlanCode) {
    if (busyPlan) return;
    setError("");

    if (isDemo) {
      setError(
        "Billing is disabled for the demo account. Sign out and create a real account to subscribe.",
      );
      return;
    }

    setActivePlan(plan);
    setBusyPlan(plan);

    try {
      const opened = await openCheckout(PRICE_IDS[plan][interval], {
        customerEmail: userEmail,
        customData: {
          plan_code: plan,
          billing_interval: interval,
          owner_user_id: userId,
          source: "onboarding_plan",
        },
        successUrl: `${window.location.origin}/app/crm?checkout=success`,
      });
      if (!opened) {
        setError("Could not open checkout. Please try again.");
      }
    } catch {
      setError("Could not open checkout. Please try again.");
    } finally {
      setBusyPlan(null);
    }
  }

  // Auto-resume checkout when arriving from a public Buy click. Demo
  // accounts and missing autocheckout flags are filtered upstream.
  useEffect(() => {
    if (!autoCheckout || autoFired || isDemo) return;
    setAutoFired(true);
    void handleSelectPlan(normalizePlan(initialPlan));
    // Single-fire keyed on autoCheckout — handleSelectPlan reads fresh state
    // each call, so we don't need it in deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCheckout, autoFired, isDemo]);

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-5 pb-10 pt-2">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" aria-label="Ordo home">
          <BrandLockup variant="default" iconSize={28} />
        </Link>
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 py-1.5 font-medium text-slate-600 dark:text-white/70">
            Signed in as <span className="font-semibold text-slate-900 dark:text-white">{userEmail || "—"}</span>
          </span>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 py-1.5 font-medium text-slate-600 dark:text-white/70 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </form>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-6 shadow-[0_18px_48px_-32px_rgba(15,23,42,0.35)] sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-700)]">
              Step 1 of 2 · Choose your plan
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Pick a plan to activate your workspace
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-white/70">
              All plans start with a 14-day free trial. After checkout we&apos;ll
              ask you to name your business and you&apos;ll be inside the CRM.
            </p>
          </div>

          <div className="inline-flex rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] p-1">
            <button
              type="button"
              onClick={() => setInterval("monthly")}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                interval === "monthly"
                  ? "bg-white dark:bg-white/[0.03] text-slate-900 dark:text-white shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
                  : "text-slate-500 dark:text-white/55 hover:text-slate-900"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setInterval("yearly")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                interval === "yearly"
                  ? "bg-white dark:bg-white/[0.03] text-slate-900 dark:text-white shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
                  : "text-slate-500 dark:text-white/55 hover:text-slate-900"
              }`}
            >
              Yearly
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                2 mo free
              </span>
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {PLAN_OPTIONS.map((option) => {
            const isActive = option.code === activePlan;
            const launchPrice = option.launchAmount[interval];
            const regularPrice = option.regularAmount[interval];
            const period = interval === "monthly" ? "mo" : "yr";
            const busy = busyPlan === option.code;

            return (
              <article
                key={option.code}
                className={`relative flex flex-col rounded-2xl border bg-white dark:bg-white/[0.03] p-4 transition ${
                  option.highlight
                    ? "border-[var(--brand-300)] shadow-[0_18px_38px_-26px_rgba(91,91,179,0.55)] ring-1 ring-[var(--brand-200)]"
                    : isActive
                      ? "border-slate-300 dark:border-white/15"
                      : "border-slate-200 dark:border-white/10"
                }`}
              >
                {option.highlight ? (
                  <span className="absolute right-3 top-3 inline-flex items-center rounded-full border border-[var(--brand-300)] bg-[var(--brand-100)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--brand-700)]">
                    Most popular
                  </span>
                ) : null}

                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {option.label}
                </h3>
                <p className="mt-1 min-h-[36px] text-xs leading-relaxed text-slate-500 dark:text-white/55">
                  {option.description}
                </p>

                <div className="mt-3 flex items-baseline gap-1 text-slate-950 dark:text-white">
                  <span className="text-base font-bold">£</span>
                  <span className="text-3xl font-bold tracking-tight">
                    {launchPrice}
                  </span>
                  <span className="ml-0.5 text-sm font-semibold text-slate-600 dark:text-white/70">
                    /{period}
                  </span>
                  <span className="ml-1.5 text-xs font-medium text-slate-400 dark:text-white/45 line-through">
                    £{regularPrice}
                  </span>
                </div>
                {interval === "yearly" ? (
                  <p className="mt-1 text-[11px] font-semibold text-[var(--brand-700)]">
                    £{option.monthlyEquivalentYearly}/mo billed annually
                  </p>
                ) : null}

                <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-white/80">
                  {option.note}
                </p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-white/55">
                  14-day free trial · Cancel anytime before day 15
                </p>

                <ul className="my-3 flex-1 space-y-1.5 border-t border-slate-100 dark:border-white/[0.06] pt-3 text-xs text-slate-700 dark:text-white/80">
                  {option.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span className="mt-0.5 inline-flex h-3.5 w-3.5 flex-none items-center justify-center rounded-full bg-[var(--brand-100)] text-[var(--brand-700)]">
                        <svg
                          width="9"
                          height="9"
                          viewBox="0 0 16 16"
                          fill="none"
                          aria-hidden
                        >
                          <path
                            d="M13.5 4.5L6.5 11.5L2.5 7.5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => void handleSelectPlan(option.code)}
                  disabled={busy || Boolean(busyPlan)}
                  className={`mt-auto inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-70 ${
                    option.highlight
                      ? "bg-[var(--brand-600)] text-white shadow-[0_10px_22px_-12px_rgba(91,91,179,0.6)] hover:bg-[var(--brand-700)]"
                      : "border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] text-slate-900 dark:text-white hover:border-[var(--brand-300)] hover:bg-[var(--brand-50)] hover:text-[var(--brand-700)]"
                  }`}
                >
                  {busy ? "Opening checkout..." : option.cta}
                </button>
              </article>
            );
          })}
        </div>

        {isDemo ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
            Billing is disabled for the demo account. Sign out and create a real
            account to subscribe.
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            {error}
          </p>
        ) : null}

        <p className="mt-5 text-[11px] leading-snug text-slate-500 dark:text-white/55">
          Payments are processed by Paddle. We&apos;ll request your card at
          checkout — you can cancel anytime in the first 14 days without being
          charged.
        </p>
      </section>
    </div>
  );
}
