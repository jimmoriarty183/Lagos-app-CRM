"use client";

import { useMemo, useState } from "react";
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
};

type PlanCode = "solo" | "starter" | "business" | "pro";
type BillingInterval = "monthly" | "yearly";

const PLAN_OPTIONS: Array<{ code: PlanCode; label: string }> = [
  { code: "solo", label: "Solo" },
  { code: "starter", label: "Starter" },
  { code: "business", label: "Business" },
  { code: "pro", label: "Pro" },
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

function normalizeInterval(input: string | undefined): BillingInterval {
  return String(input ?? "").trim().toLowerCase() === "yearly" ? "yearly" : "monthly";
}

export default function BillingCheckoutModal(props: BillingCheckoutModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<PlanCode>(normalizePlan(props.initialPlan));
  const [interval, setInterval] = useState<BillingInterval>(
    normalizeInterval(props.initialInterval),
  );

  const priceId = useMemo(() => PRICE_IDS[plan][interval], [plan, interval]);

  const handleOpenCheckout = async () => {
    if (!props.isOwner || loading) return;
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
          plan_code: plan,
          billing_interval: interval,
          source: "crm_settings_billing",
        },
        successUrl: `${window.location.origin}/app/settings/billing`,
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
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-[520px] rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-[#111827]">Update plan</div>
                <div className="mt-1 text-sm text-[#6B7280]">
                  Select a plan in your workspace and continue to checkout.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {PLAN_OPTIONS.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => setPlan(option.code)}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    plan === option.code
                      ? "border-[#111827] bg-[#111827] text-white"
                      : "border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="mt-3 inline-flex rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-1">
              <button
                type="button"
                onClick={() => setInterval("monthly")}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  interval === "monthly"
                    ? "bg-white text-[#111827] shadow"
                    : "text-[#6B7280]"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setInterval("yearly")}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  interval === "yearly"
                    ? "bg-white text-[#111827] shadow"
                    : "text-[#6B7280]"
                }`}
              >
                Yearly
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3 text-sm text-[#4B5563]">
              <div>
                Checkout email:{" "}
                <span className="font-semibold text-[#111827]">
                  {props.customerEmail || "will be requested in checkout"}
                </span>
              </div>
            </div>

            {error ? (
              <div className="mt-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-sm text-[#991B1B]">
                {error}
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-[#F9FAFB]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOpenCheckout}
                disabled={loading}
                className="rounded-full border border-[#111827] bg-[#111827] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {loading ? "Opening..." : "Continue to checkout"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
