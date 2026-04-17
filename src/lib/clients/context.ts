import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabaseServerReadOnly } from "@/lib/supabase/server";

type Role = "OWNER" | "MANAGER" | "GUEST";

type MembershipRow = {
  business_id: string;
  role: string | null;
};

type BusinessRow = {
  id: string;
  slug: string;
  name: string | null;
  plan: string | null;
};

type ProfileRow = {
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

export type BusinessClientsContext = {
  user: User;
  role: Role;
  business: BusinessRow;
  businesses: BusinessRow[];
  profile: ProfileRow | null;
};

function upperRole(value: string | null | undefined): Role {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "OWNER") return "OWNER";
  if (normalized === "MANAGER") return "MANAGER";
  return "GUEST";
}

export async function getBusinessClientsContext(
  slug: string,
  nextPath: string,
): Promise<BusinessClientsContext> {
  const supabase = await supabaseServerReadOnly();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("memberships")
    .select("business_id, role")
    .eq("user_id", user.id);
  if (membershipsError) throw new Error(membershipsError.message);

  const membershipRows = (memberships ?? []) as MembershipRow[];
  if (!membershipRows.length) redirect("/app/crm");

  const businessIds = membershipRows.map((entry) => entry.business_id);
  const { data: businesses, error: businessesError } = await supabase
    .from("businesses")
    .select("id, slug, name, plan")
    .in("id", businessIds);
  if (businessesError) throw new Error(businessesError.message);

  const businessRows = (businesses ?? []) as BusinessRow[];
  const business = businessRows.find((entry) => entry.slug === slug);
  if (!business) redirect("/app/crm");

  const role = upperRole(
    membershipRows.find((entry) => entry.business_id === business.id)?.role,
  );
  if (role === "GUEST") redirect("/app/crm");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, first_name, last_name, email, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return {
    user,
    role,
    business,
    businesses: businessRows,
    profile: (profile as ProfileRow | null) ?? null,
  };
}
