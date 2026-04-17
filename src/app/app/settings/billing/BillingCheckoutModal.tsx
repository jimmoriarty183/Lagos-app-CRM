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
      monthly: "1 user included",
      yearly: "1 user included",
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
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-3 sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative mx-auto flex max-h-[calc(100vh-2rem)] w-full max-w-[1200px] flex-col overflow-hidden rounded-2xl border border-[#D6E0EC] bg-[#F7FAFF] shadow-2xl sm:max-h-[calc(100vh-3rem)]"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Header */}
            <div className="flex flex-none items-center justify-between gap-3 border-b border-[#E2E8F0] px-4 py-2.5">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="rounded-full border border-[#C7D2FE] bg-[#EEF2FF] px-2.5 py-0.5 text-[10px] font-semibold text-[#4F46E5]">
                      UK launch pricing
                    </span>
                    <h3 className="text-base font-semibold tracking-[-0.02em] text-[#0F172A] sm:text-lg">
                      Control execution. Not just tasks.
                    </h3>
                  </div>
                  <p className="mt-0.5 text-[12px] text-[#475569]">
                    A CRM built for real operations — track orders, manage follow-ups, and keep your team accountable.
                  </p>
                </div>
              </div>

              <div className="flex flex-none items-center gap-2.5">
                <div className="inline-flex items-center gap-0.5 rounded-lg border border-[#D6E0EC] bg-[#F8FAFC] p-0.5">
                  <button
                    type="button"
                    onClick={() => setInterval("monthly")}
                    className={`rounded-md px-2.5 py-1 text-[12px] font-semibold ${
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
                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-semibold ${
                      interval === "yearly"
                        ? "bg-white text-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
                        : "text-[#64748B]"
                    }`}
                  >
                    Yearly
                    <span className="rounded-full bg-[#EEF2FF] px-1.5 py-px text-[9px] font-bold text-[#4F46E5]">
                      -2mo
                    </span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
                  aria-label="Close"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Plan cards */}
            <div className="px-4 py-2.5">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
                {PLAN_OPTIONS.map((option) => (
                  <article
                    key={option.code}
                    onClick={() => setPlan(option.code)}
                    className={`relative flex cursor-pointer flex-col rounded-xl border bg-white px-3 py-2.5 transition ${
                      plan === option.code
                        ? "border-[#818CF8] ring-1 ring-[#818CF8] shadow-[0_4px_16px_rgba(79,70,229,0.10)]"
                        : "border-[#E2E8F0] hover:border-[#C7D2FE]"
                    }`}
                  >
                    {currentPlanCode && option.code === currentPlanCode ? (
                      <span className="absolute right-2 top-2 rounded-full border border-[#34D399] bg-[#ECFDF3] px-1.5 py-px text-[9px] font-semibold text-[#047857]">
                        Current
                      </span>
                    ) : null}
                    {!currentPlanCode && option.code === "business" ? (
                      <span className="absolute right-2 top-2 rounded-full border border-[#C7D2FE] bg-[#EEF2FF] px-1.5 py-px text-[9px] font-semibold text-[#4F46E5]">
                        Popular
                      </span>
                    ) : null}

                    <h4 className="text-[14px] font-semibold text-[#0F172A]">{option.label}</h4>
                    <p className="text-[10px] leading-[1.3] text-[#64748B]">{option.description}</p>

                    <div className="mt-1.5 flex items-baseline gap-0.5 text-[#0F172A]">
                      <span className="text-base font-bold leading-none">£</span>
                      <span className="text-[28px] font-bold leading-none tracking-[-0.03em]">
                        {interval === "monthly" ? option.launchAmount : `${option.launchAmount}0`}
                      </span>
                      <span className="ml-0.5 text-[11px] font-semibold text-[#64748B]">
                        /{interval === "monthly" ? "mo" : "yr"}
                      </span>
                      <span className="ml-1 text-[10px] font-medium text-[#94A3B8] line-through">
                        £{interval === "monthly" ? option.regularAmount : `${option.regularAmount}0`}
                      </span>
                    </div>

                    <p className="text-[10px] font-medium text-[#64748B]">
                      {interval === "yearly"
                        ? `£${option.monthlyLaunchAmount}/mo billed annually`
                        : option.note[interval]}
                    </p>

                    <ul className="mt-1.5 flex-1 space-y-px border-t border-[#F1F5F9] pt-1.5 text-[10px] leading-[1.5] text-[#334155]">
                      {option.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-1">
                          <svg className="h-2.5 w-2.5 flex-none text-[#4F46E5]" viewBox="0 0 16 16" fill="none">
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
                      className={`mt-1.5 w-full rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
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
            </div>

            {/* Footer */}
            <div className="flex flex-none items-center gap-2 border-t border-[#E2E8F0] px-4 py-1.5 text-[10px] text-[#64748B]">
              <span className="font-semibold text-[#4F46E5]">Launch pricing</span>
              <span>·</span>
              <span>{props.customerEmail || "Email will be requested at checkout"}</span>
            </div>

            {error ? (
              <div className="border-t border-[#FECACA] bg-[#FEF2F2] px-5 py-2 text-[12px] text-[#991B1B]">
                {error}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
