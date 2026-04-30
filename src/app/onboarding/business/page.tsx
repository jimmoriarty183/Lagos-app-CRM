import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { resolveCurrentWorkspace } from "@/lib/platform/workspace";
import { OnboardingBusinessForm } from "./ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Business Setup | Ordo",
  description: "Create your business to continue in Ordo.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function OnboardingBusinessPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = (await searchParams) ?? {};
  const isAdditional = String(resolved.new ?? "").trim() === "1";

  // Plan/interval intent can be carried across the email-confirm → create
  // business → pick plan funnel. We just preserve the params for the form
  // to forward them to /onboarding/plan after a successful creation.
  const planParam = String(resolved.plan ?? "").trim();
  const intervalParam = String(resolved.interval ?? "").trim();

  const { user, workspace } = await resolveCurrentWorkspace();

  const selfQuery = (() => {
    const params = new URLSearchParams();
    if (isAdditional) params.set("new", "1");
    if (planParam) params.set("plan", planParam);
    if (intervalParam) params.set("interval", intervalParam);
    const query = params.toString();
    return query ? `?${query}` : "";
  })();

  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(`/onboarding/business${selfQuery}`)}`,
    );
  }

  // Already has a workspace and didn't ask for a new business: send them to
  // the CRM. With ?new=1 we still allow the form (settings → "Add business").
  if (workspace && !isAdditional) {
    redirect("/app/crm");
  }

  return (
    <main
      className="min-h-screen bg-[#f6f8fb] dark:bg-[var(--bg-app)] px-4 py-8 text-slate-900 dark:text-white sm:px-6"
    >
      <div className="mx-auto flex max-w-md items-center justify-center pt-8 sm:pt-14">
        <OnboardingBusinessForm
          planIntent={planParam}
          intervalIntent={intervalParam}
        />
      </div>
    </main>
  );
}
