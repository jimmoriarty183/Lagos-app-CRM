import { cache } from "react";
import { cookies } from "next/headers";
import { supabaseServerReadOnly } from "@/lib/supabase/server";

type MembershipRow = {
  business_id: string;
  created_at: string | null;
  role: string | null;
};

type BusinessRow = {
  id: string;
  slug: string | null;
  name: string | null;
};

export type CurrentWorkspace = {
  id: string;
  slug: string;
  name: string | null;
  role: string | null;
};

export const resolveCurrentWorkspace = cache(async () => {
  const supabase = await supabaseServerReadOnly();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, workspace: null as CurrentWorkspace | null };
  }

  const { data: membershipRows, error: membershipError } = await supabase
    .from("memberships")
    .select("business_id, role, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (membershipError) throw membershipError;

  const memberships = (membershipRows ?? []) as MembershipRow[];
  if (memberships.length === 0) {
    return { user, workspace: null as CurrentWorkspace | null };
  }

  const businessIds = memberships.map((membership) => membership.business_id);
  const { data: businessRows, error: businessError } = await supabase
    .from("businesses")
    .select("id, slug, name")
    .in("id", businessIds);

  if (businessError) throw businessError;

  const businesses = (businessRows ?? []) as BusinessRow[];
  const cookieStore = await cookies();
  const activeBusinessSlug = cookieStore.get("active_business_slug")?.value?.trim();

  const businessById = new Map(businesses.map((business) => [business.id, business]));

  const selectedMembership =
    (activeBusinessSlug
      ? memberships.find((membership) => {
          const business = businessById.get(membership.business_id);
          return business?.slug === activeBusinessSlug;
        })
      : null) ?? memberships[0];

  if (!selectedMembership) {
    return { user, workspace: null as CurrentWorkspace | null };
  }

  const selectedBusiness = businessById.get(selectedMembership.business_id);
  if (!selectedBusiness?.slug) {
    return { user, workspace: null as CurrentWorkspace | null };
  }

  return {
    user,
    workspace: {
      id: selectedBusiness.id,
      slug: selectedBusiness.slug,
      name: selectedBusiness.name,
      role: selectedMembership.role,
    } satisfies CurrentWorkspace,
  };
});
