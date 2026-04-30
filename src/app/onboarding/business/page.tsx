import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { resolveCurrentWorkspace } from "@/lib/platform/workspace";
import { supabaseAdmin } from "@/lib/supabase/admin";
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

  // Without a billing account the create-business flow throws
  // "Billing account not found for owner user" before the form ever submits.
  // Send the user to /pricing to subscribe first (Paddle webhook then
  // provisions the account+trial subscription via owner_user_id).
  if (!workspace) {
    const admin = supabaseAdmin();
    const { data: accountRow } = await admin
      .from("accounts")
      .select("id")
      .eq("primary_owner_user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!accountRow?.id) {
      redirect("/pricing");
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto flex max-w-md items-center justify-center pt-8 sm:pt-14">
        <OnboardingBusinessForm />
      </div>
    </main>
  );
}
