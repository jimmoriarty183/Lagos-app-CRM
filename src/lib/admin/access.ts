import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServerReadOnly } from "@/lib/supabase/server";
import { getAdminUsersPath, isAdminEmail } from "@/lib/admin-access";

export const resolveWorkspaceHref = cache(async (userId: string) => {
  const admin = supabaseAdmin();
  const { data: memberships, error } = await admin
    .from("memberships")
    .select("business_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error || !memberships?.length) return "/select-business";
  if (memberships.length > 1) return "/select-business";

  const businessId = String(memberships[0]?.business_id ?? "").trim();
  if (!businessId) return "/select-business";

  const { data: business } = await admin
    .from("businesses")
    .select("slug")
    .eq("id", businessId)
    .maybeSingle();

  return business?.slug ? `/b/${business.slug}` : "/select-business";
});

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

  const workspaceHref = await resolveWorkspaceHref(user.id);

  return { user, workspaceHref };
}
