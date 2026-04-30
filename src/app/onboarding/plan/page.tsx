import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { resolveCurrentWorkspace } from "@/lib/platform/workspace";
import { getSubscriptionSnapshot } from "@/lib/billing/subscriptions";
import { resolveOwnerAccountId } from "@/lib/businesses/business-limits-service";
import { isDemoEmail } from "@/lib/billing/demo";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { OnboardingPlanPicker } from "./PlanPicker";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Choose your plan | Ordo",
  description: "Pick a plan to activate your Ordo workspace.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function OnboardingPlanPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = (await searchParams) ?? {};
  const requestedPlan = String(resolved.plan ?? "").trim();
  const requestedInterval = String(resolved.interval ?? "").trim();
  const autoCheckout = String(resolved.autocheckout ?? "").trim() === "1";

  const selfPath = (() => {
    const params = new URLSearchParams();
    if (requestedPlan) params.set("plan", requestedPlan);
    if (requestedInterval) params.set("interval", requestedInterval);
    if (autoCheckout) params.set("autocheckout", "1");
    const query = params.toString();
    return query ? `/onboarding/plan?${query}` : "/onboarding/plan";
  })();

  const { user } = await resolveCurrentWorkspace();

  // Public pages must funnel through login first so the user clearly sees
  // which email they're subscribing under (the whole point of this page).
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(selfPath)}`);
  }

  // Already has an active paid subscription? The proper surface for plan
  // changes is the in-app billing settings (workspace-scoped, with topbar).
  // We don't redirect on workspace presence alone because brand-new owners
  // who just created their first business arrive here legitimately to pick
  // their first paid plan.
  try {
    const admin = supabaseAdmin();
    const accountId = await resolveOwnerAccountId(admin, user.id);
    if (accountId) {
      const snapshot = await getSubscriptionSnapshot(admin, accountId);
      if (snapshot?.subscriptionId) {
        const params = new URLSearchParams();
        if (requestedPlan) params.set("plan", requestedPlan);
        if (requestedInterval) params.set("interval", requestedInterval);
        if (autoCheckout) params.set("autocheckout", "1");
        const query = params.toString();
        redirect(
          query ? `/app/settings/billing?${query}` : "/app/settings/billing",
        );
      }
    }
  } catch {
    // If the snapshot lookup fails we degrade gracefully and just render the
    // plan picker — overshowing it is better than a redirect loop.
  }

  return (
    <main
      className="min-h-screen bg-[#f6f8fb] dark:bg-[var(--bg-app)] px-4 py-8 text-slate-900 dark:text-white sm:px-6"
    >
      <OnboardingPlanPicker
        userEmail={String(user.email ?? "")}
        userId={user.id}
        isDemo={isDemoEmail(user.email)}
        initialPlan={requestedPlan}
        initialInterval={requestedInterval}
        autoCheckout={autoCheckout}
      />
    </main>
  );
}
