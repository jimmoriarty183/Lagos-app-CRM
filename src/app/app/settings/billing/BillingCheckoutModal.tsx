"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { openCheckout } from "@/components/BuyButton";

type BillingCheckoutModalProps = {
  isOwner: boolean;
  customerEmail: string;
  accountId: string | null;
  ownerUserId: string | null;
  workspaceId: string;
  workspaceSlug: string;
  initialPlan?: string;
  initialInterval?: string;
  currentPlan?: string | null;
  currentInterval?: string | null;
};

type PlanCode = "solo" | "starter" | "business" | "pro";
type BillingInterval = "monthly" | "yearly";

type PlanOption = {
  code: PlanCode;
  label: string;
  description: string;
  regularAmount: string;
  launchAmount: string;
  monthlyLaunchAmount: string;
  features: string[];
  cta: string;
  note: {
    monthly: string;
    yearly: string;
  };
};

const PLAN_OPTIONS: PlanOption[] = [
  {
    code: "solo",
    label: "Solo",
    description: "For individuals who need structure and follow-up discipline",
    regularAmount: "12",
    launchAmount: "8",
    monthlyLaunchAmount: "8",
    features: [
      "CRM (orders + kanban)",
      "Filters & search",
      "Custom statuses",
      "Basic inbox",
      "Today & follow-ups",
      "Limited team management",
    ],
    cta: "Start with Solo",
    note: {
      monthly: "+ £5 / extra user",
      yearly: "+ £50 / extra user / year",
    },
  },
  {
    code: "starter",
    label: "Starter",
    description: "For small teams getting control over daily operations",
    regularAmount: "49",
    launchAmount: "39",
    monthlyLaunchAmount: "39",
    features: [
      "CRM (orders + kanban)",
      "Filters & search",
      "Custom statuses",
      "Full inbox",
      "Today & follow-ups",
      "Team management",
      "Basic support workflow",
    ],
    cta: "Start with Starter",
    note: {
      monthly: "Includes up to 5 users",
      yearly: "Includes up to 5 users",
    },
  },
  {
    code: "business",
    label: "Business",
    description: "For growing teams that need execution visibility and control",
    regularAmount: "99",
    launchAmount: "79",
    monthlyLaunchAmount: "79",
    features: [
      "CRM (orders + kanban)",
      "Filters & search",
      "Custom statuses",
      "Full inbox",
      "Today & follow-ups",
      "Team management",
      "Manager dashboards",
      "KPI tracking",
      "Productivity analytics",
      "Alerts",
      "Basic support workflow",
    ],
    cta: "Upgrade to Business",
    note: {
      monthly: "Includes up to 10 users",
      yearly: "Includes up to 10 users",
    },
  },
  {
    code: "pro",
    label: "Pro",
    description: "For teams that need full operational control and risk visibility",
    regularAmount: "179",
    launchAmount: "149",
    monthlyLaunchAmount: "149",
    features: [
      "CRM (orders + kanban)",
      "Filters & search",
      "Custom statuses",
      "Full inbox",
      "Today & follow-ups",
      "Team management",
      "Manager dashboards",
      "KPI tracking",
      "Productivity analytics",
      "Alerts",
      "Risk score",
      "Full support workflow",
      "Priority support",
    ],
    cta: "Go Pro",
    note: {
      monthly: "Includes up to 20 users",
      yearly: "Includes up to 20 users",
    },
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
  return "solo";
}

function normalizePlanOrNull(input: string | null | undefined): PlanCode | null {
  const value = String(input ?? "").trim().toLowerCase();
  if (!value) return null;
  if (value === "solo") return "solo";
  if (value === "starter") return "starter";
  if (value === "business") return "business";
  if (value === "pro") return "pro";
  return null;
}

function normalizeInterval(input: string | undefined): BillingInterval {
  return String(input ?? "").trim().toLowerCase() === "yearly" ? "yearly" : "monthly";
}

function normalizeIntervalLoose(input: string | null | undefined): BillingInterval {
  const value = String(input ?? "").trim().toLowerCase();
  if (value === "yearly" || value === "year") return "yearly";
  return "monthly";
}

export default function BillingCheckoutModal(props: BillingCheckoutModalProps) {
  const [currentPlanCode, setCurrentPlanCode] = useState<PlanCode | null>(
    normalizePlanOrNull(props.currentPlan),
  );
  const [currentInterval, setCurrentInterval] = useState<BillingInterval>(
    normalizeIntervalLoose(props.currentInterval),
  );
  const preferredInitialPlan =
    String(props.initialPlan ?? "").trim().length > 0
      ? props.initialPlan
      : currentPlanCode ?? "business";
  const preferredInitialInterval =
    String(props.initialInterval ?? "").trim().length > 0
      ? props.initialInterval
      : currentInterval;

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<PlanCode>(normalizePlan(preferredInitialPlan));
  const [interval, setInterval] = useState<BillingInterval>(
    normalizeInterval(preferredInitialInterval),
  );

  useEffect(() => {
    if (!open || !props.accountId) return;
    let cancelled = false;

    const loadCurrentPlan = async () => {
      try {
        const response = await fetch(
          `/api/billing/subscription?account_id=${encodeURIComponent(props.accountId ?? "")}`,
        );
        if (!response.ok) return;

        const payload = (await response.json()) as {
          plan?: { code?: string | null } | null;
          billingInterval?: string | null;
        };
        const livePlanCode = normalizePlanOrNull(payload.plan?.code ?? null);
        const liveInterval = normalizeIntervalLoose(payload.billingInterval);

        if (cancelled) return;
        setCurrentPlanCode(livePlanCode);
        setCurrentInterval(liveInterval);

        if (!String(props.initialPlan ?? "").trim() && livePlanCode) {
          setPlan(livePlanCode);
        }
        if (!String(props.initialInterval ?? "").trim()) {
          setInterval(liveInterval);
        }
      } catch {
        // Keep modal functional even when subscription endpoint is temporarily unavailable.
      }
    };

    void loadCurrentPlan();

    return () => {
      cancelled = true;
    };
  }, [open, props.accountId, props.initialInterval, props.initialPlan]);

  const handleOpenCheckout = async (selectedPlan: PlanCode = plan) => {
    if (!props.isOwner || loading) return;
    const priceId = PRICE_IDS[selectedPlan][interval];
    setLoading(true);
    setError("");
    try {
      const opened = await openCheckout(priceId, {
        customerEmail: props.customerEmail,
        customData: {
          account_id: props.accountId,
          owner_user_id: props.ownerUserId,
          workspace_id: props.workspaceId,
          workspace_slug: props.workspaceSlug,
          plan_code: selectedPlan,
          billing_interval: interval,
          source: "crm_settings_billing",
        },
        successUrl: `${window.location.origin}/app/settings/billing?checkout=success&source=settings`,
      });
      if (!opened) {
        setError("Could not open checkout. Please try again.");
      }
    } catch {
      setError("Could not open checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!props.isOwner) {
    return (
      <span className="inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-2 text-sm font-semibold text-[#9CA3AF]">
        Upgrade plan (owner only)
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-[#111827] bg-[#111827] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1F2937]"
      >
        Upgrade plan
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-3 sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[92vh] w-full max-w-[1120px] overflow-y-auto rounded-2xl border border-[#D6E0EC] bg-[#F7FAFF] p-3 shadow-2xl sm:p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center rounded-full border border-[#C7D2FE] bg-[#EEF2FF] px-3 py-1 text-[11px] font-semibold text-[#4F46E5]">
                  UK launch pricing
                </div>
                <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[#0F172A] sm:text-[26px]">
                  Control execution. Not just tasks.
                </h3>
                <p className="mt-1.5 max-w-[640px] text-sm text-[#475569]">
                  A CRM built for real operations — track orders, manage follow-ups, and keep
                  your team accountable with full visibility and control.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-none inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-[#D6E0EC] bg-[#F8FAFC] p-1">
                <button
                  type="button"
                  onClick={() => setInterval("monthly")}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                    interval === "monthly"
                      ? "bg-white text-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
                      : "text-[#64748B]"
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setInterval("yearly")}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold ${
                    interval === "yearly"
                      ? "bg-white text-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
                      : "text-[#64748B]"
                  }`}
                >
                  Yearly
                  <span className="rounded-full border border-[#C7D2FE] bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold text-[#4F46E5]">
                    2 months free
                  </span>
                </button>
              </div>
              <p className="text-sm font-semibold text-[#4F46E5]">
                Founding launch pricing available for a limited period.
              </p>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleOpenCheckout(plan)}
                disabled={loading}
                className="rounded-xl border border-[#4F46E5] bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {loading ? "Opening..." : "Get started"}
              </button>
              <a
                href="/pricing"
                className="rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 text-sm font-semibold text-[#0F172A]"
              >
                Compare plans
              </a>
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs text-[#475569]">
                Checkout email:{" "}
                <span className="font-semibold text-[#0F172A]">
                  {props.customerEmail || "will be requested in checkout"}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {PLAN_OPTIONS.map((option) => (
                <article
                  key={option.code}
                  onClick={() => setPlan(option.code)}
                  className={`relative flex cursor-pointer flex-col rounded-2xl border bg-white p-4 transition ${
                    plan === option.code
                      ? "border-[#818CF8] ring-1 ring-[#818CF8] shadow-[0_6px_20px_rgba(79,70,229,0.10)]"
                      : "border-[#E2E8F0] hover:border-[#C7D2FE]"
                  }`}
                >
                  {currentPlanCode && option.code === currentPlanCode ? (
                    <span className="absolute right-3 top-3 rounded-full border border-[#34D399] bg-[#ECFDF3] px-2.5 py-0.5 text-[10px] font-semibold text-[#047857]">
                      Current plan
                    </span>
                  ) : null}
                  {!currentPlanCode && option.code === "business" ? (
                    <span className="absolute right-3 top-3 rounded-full border border-[#C7D2FE] bg-[#EEF2FF] px-2.5 py-0.5 text-[10px] font-semibold text-[#4F46E5]">
                      Most popular
                    </span>
                  ) : null}

                  <h4 className="text-lg font-semibold tracking-[-0.02em] text-[#0F172A]">
                    {option.label}
                  </h4>
                  <p className="mt-1 text-[13px] leading-[1.4] text-[#475569]">{option.description}</p>

                  <div className="mt-3 border-t border-[#F1F5F9] pt-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-[#C7D2FE] bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold text-[#4F46E5]">
                        Launch price
                      </span>
                      <span className="text-[12px] font-medium text-[#94A3B8] line-through">
                        £{interval === "monthly" ? option.regularAmount : `${option.regularAmount}0`}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-baseline gap-0.5 text-[#0F172A]">
                      <span className="text-2xl font-bold leading-none">£</span>
                      <span className="text-[40px] font-bold leading-none tracking-[-0.03em]">
                        {interval === "monthly" ? option.launchAmount : `${option.launchAmount}0`}
                      </span>
                      <span className="ml-0.5 text-base font-semibold text-[#64748B]">
                        / {interval === "monthly" ? "month" : "year"}
                      </span>
                    </div>
                  </div>

                  {interval === "yearly" ? (
                    <p className="mt-1 text-xs font-semibold text-[#4F46E5]">
                      £{option.monthlyLaunchAmount}/mo billed annually
                    </p>
                  ) : null}

                  <p className="mt-1 text-[13px] font-medium text-[#475569]">{option.note[interval]}</p>

                  <ul className="mt-3 flex-1 space-y-1.5 border-t border-[#F1F5F9] pt-3 text-[13px] text-[#334155]">
                    {option.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <svg className="mt-0.5 h-3.5 w-3.5 flex-none text-[#4F46E5]" viewBox="0 0 16 16" fill="none">
                          <path d="M13.5 4.5L6.5 11.5L2.5 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlan(option.code);
                      void handleOpenCheckout(option.code);
                    }}
                    disabled={loading || option.code === currentPlanCode}
                    className={`mt-3 w-full rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                      option.code === currentPlanCode
                        ? "cursor-not-allowed border-[#D1FAE5] bg-[#ECFDF3] text-[#047857]"
                        : option.code === "business"
                          ? "border-[#4F46E5] bg-[#4F46E5] text-white hover:bg-[#4338CA]"
                          : "border-[#CBD5E1] bg-white text-[#0F172A] hover:border-[#A5B4FC] hover:bg-[#F5F3FF]"
                    } disabled:opacity-60`}
                  >
                    {option.code === currentPlanCode ? "Current plan" : option.cta}
                  </button>
                </article>
              ))}
            </div>

            {error ? (
              <div className="mt-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-sm text-[#991B1B]">
                {error}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
