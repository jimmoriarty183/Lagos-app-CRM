import { notFound, redirect } from "next/navigation";
import { supabaseServerReadOnly } from "@/lib/supabase/server";
import { getAdminUsersPath, isAdminEmail } from "@/lib/admin-access";

export async function requireAdminUser(nextPath?: string) {
  const supabase = await supabaseServerReadOnly();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath || getAdminUsersPath())}`);
  }

  // TECH DEBT: admin access is allowlist-email based. Replace with a real admin role/ACL table.
  if (!isAdminEmail(user.email)) {
    notFound();
  }

  return user;
}
