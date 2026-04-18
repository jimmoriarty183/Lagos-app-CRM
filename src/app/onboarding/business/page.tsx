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

  const { user, workspace } = await resolveCurrentWorkspace();

  if (!user) {
    const nextPath = isAdditional
      ? "/onboarding/business?new=1"
      : "/onboarding/business";
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  // First-time onboarding: user landed here right after signup without any
  // workspace. If they already have one, send them to the CRM — unless they
  // explicitly requested to create an additional business via `?new=1`.
  if (workspace && !isAdditional) {
    redirect("/app/crm");
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto flex max-w-md items-center justify-center pt-8 sm:pt-14">
        <OnboardingBusinessForm />
      </div>
    </main>
  );
}
