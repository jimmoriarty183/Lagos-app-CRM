import { redirect } from "next/navigation";
import { isPlatformModuleEnabled } from "@/config/modules";
import { resolveCurrentWorkspace } from "@/lib/platform/workspace";
import { supabaseServerReadOnly } from "@/lib/supabase/server";
import { getTrackerLandingData } from "@/lib/tracker/service";
import { TrackerModule } from "@/app/app/tasks/TrackerModule";
import TopBar from "@/app/b/[slug]/_components/topbar/TopBar";
import type { BusinessOption } from "@/app/b/[slug]/_components/topbar/BusinessSwitcher";
import { loadUserProfileSafe } from "@/lib/profile";
import { getAdminUsersPath, isAdminEmail } from "@/lib/admin-access";
import { resolveUserDisplay } from "@/lib/user-display";

function upperRole(
  value: string | null | undefined,
): "OWNER" | "MANAGER" | "GUEST" {
  const n = String(value ?? "")
    .trim()
    .toUpperCase();
  if (n === "OWNER") return "OWNER";
  if (n === "MANAGER") return "MANAGER";
  return "GUEST";
}

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

  const { user, workspace } = workspaceData;

  const [trackerData, profile, membershipsResult] = await Promise.all([
    getTrackerLandingData(supabase, user.id),
    loadUserProfileSafe(supabase, user.id),
    supabase
      .from("memberships")
      .select("business_id, role")
      .eq("user_id", user.id),
  ]);

  const membershipRows = (membershipsResult.data ?? []) as {
    business_id: string;
    role: string | null;
  }[];
  const businessIds = membershipRows.map((m) => m.business_id);
  const { data: businessRows } = await supabase
    .from("businesses")
    .select("id, slug, name")
    .in("id", businessIds);

  const businesses: BusinessOption[] = (businessRows ?? []).map((b) => {
    const memberRole = membershipRows.find((m) => m.business_id === b.id)?.role;
    return {
      id: String(b.id),
      slug: String(b.slug ?? b.id),
      name: String(b.name ?? b.slug ?? b.id),
      role: upperRole(memberRole),
    };
  });

  const currentUserName =
    resolveUserDisplay(profile ?? {}).primary || user.email || "User";
  const currentUserAvatarUrl =
    String(profile?.avatar_url ?? "").trim() || undefined;
  const role = upperRole(workspace.role);
  const adminHref = isAdminEmail(user.email) ? getAdminUsersPath() : undefined;

  return (
    <>
      <TopBar
        businessSlug={workspace.slug}
        businessId={workspace.id}
        role={role}
        currentUserName={currentUserName}
        currentUserAvatarUrl={currentUserAvatarUrl}
        currentPlan={workspace.plan}
        businesses={businesses}
        businessHref={`/b/${workspace.slug}`}
        settingsHref="/app/settings"
        adminHref={adminHref}
      />
      <TrackerModule
        workspace={{
          id: workspace.id,
          slug: workspace.slug,
          name: workspace.name ?? workspace.slug,
        }}
        currentUserId={user.id}
        initialProjects={trackerData.projects}
        initialSnapshot={trackerData.snapshot}
      />
    </>
  );
}
