import { redirect } from "next/navigation";
import { isPlatformModuleEnabled } from "@/config/modules";
import { resolveCurrentWorkspace } from "@/lib/platform/workspace";
import { supabaseServerReadOnly } from "@/lib/supabase/server";
import { getTrackerLandingData } from "@/lib/tracker/service";
import { TrackerModule } from "@/app/app/tasks/TrackerModule";

export default async function PlatformTasksPage() {
  if (!isPlatformModuleEnabled("tasks")) {
    redirect("/app");
  }

  const [workspaceData, supabase] = await Promise.all([
    resolveCurrentWorkspace(),
    supabaseServerReadOnly(),
  ]);

  if (!workspaceData.user) {
    redirect("/login?next=%2Fapp%2Ftasks");
  }

  if (!workspaceData.workspace) {
    redirect("/select-business");
  }

  const data = await getTrackerLandingData(supabase, workspaceData.user.id);

  return (
    <TrackerModule
      workspace={{
        id: workspaceData.workspace.id,
        slug: workspaceData.workspace.slug,
        name: workspaceData.workspace.name ?? workspaceData.workspace.slug,
      }}
      currentUserId={workspaceData.user.id}
      initialProjects={data.projects}
      initialSnapshot={data.snapshot}
    />
  );
}
