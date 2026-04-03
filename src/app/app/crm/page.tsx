import { redirect } from "next/navigation";
import { resolveCurrentWorkspace } from "@/lib/platform/workspace";
import { isPlatformModuleEnabled } from "@/config/modules";

export default async function PlatformCrmPage() {
  if (!isPlatformModuleEnabled("crm")) {
    redirect("/app");
  }

  const { user, workspace } = await resolveCurrentWorkspace();

  if (!user) {
    redirect("/login?next=%2Fapp%2Fcrm");
  }

  if (!workspace) {
    redirect("/onboarding/business");
  }

  redirect(`/b/${workspace.slug}`);
}
