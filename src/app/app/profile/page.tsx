import { redirect } from "next/navigation";

import ProfileEditor from "@/app/app/profile/ProfileEditor";
import { loadUserProfileSafe } from "@/lib/profile";
import { resolveCurrentWorkspace } from "@/lib/platform/workspace";
import { supabaseServerReadOnly } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const [{ user, workspace }, supabase] = await Promise.all([
    resolveCurrentWorkspace(),
    supabaseServerReadOnly(),
  ]);

  if (!user) {
    redirect("/login?next=%2Fapp%2Fprofile");
  }

  if (!workspace) {
    redirect("/select-business");
  }

  const profile = await loadUserProfileSafe(supabase, user.id);
  const firstName = String(profile?.first_name ?? "").trim();
  const lastName = String(profile?.last_name ?? "").trim();
  const fullName = String(profile?.full_name ?? "").trim();
  const displayName = fullName || `${firstName} ${lastName}`.trim() || user.email || user.phone || "User";

  return (
    <ProfileEditor
      initial={{
        displayName,
        email: String(profile?.email ?? user.email ?? "").trim(),
        firstName,
        lastName,
        phone: String(profile?.phone ?? user.phone ?? "").trim(),
        birthDate: String(profile?.birth_date ?? "").trim(),
        bio: String(profile?.bio ?? "").trim(),
        avatarUrl: String(profile?.avatar_url ?? "").trim(),
      }}
      workspace={{
        name: workspace.name || workspace.slug,
        slug: workspace.slug,
      }}
    />
  );
}
