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

export default async function OnboardingBusinessPage() {
  const { user, workspace } = await resolveCurrentWorkspace();

  if (!user) {
    redirect("/login?next=%2Fonboarding%2Fbusiness");
  }

  if (workspace) {
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
