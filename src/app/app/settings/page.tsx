import { redirect } from "next/navigation";
import { resolveCurrentWorkspace } from "@/lib/platform/workspace";

export default async function PlatformSettingsPage() {
  const { user, workspace } = await resolveCurrentWorkspace();

  if (!user) {
    redirect("/login?next=%2Fapp%2Fsettings");
  }

  if (!workspace) {
    redirect("/select-business");
  }

  redirect(`/b/${workspace.slug}/settings`);
}
