import { NextResponse } from "next/server";
import { supabaseServerReadOnly } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type BusinessRow = {
  id: string;
  slug: string | null;
};

function safeSlug(input: string | null) {
  const slug = String(input ?? "").trim().toLowerCase();
  if (!slug) return null;
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  return slug;
}

function isMissingRelationError(error: { message?: string } | null | undefined, relationName: string) {
  const message = String(error?.message ?? "").toLowerCase();
  const relation = relationName.toLowerCase();
  if (!message) return false;
  return (
    message.includes(`could not find the table 'public.${relation}'`) ||
    message.includes(`relation \"public.${relation}\" does not exist`) ||
    message.includes(`relation \"${relation}\" does not exist`)
  );
}

async function trackWorkspaceSelection(input: {
  userId: string;
  businessId: string;
  slug: string;
}) {
  const admin = supabaseAdmin();
  const { error } = await admin.from("activity_events").insert({
    business_id: input.businessId,
    entity_type: "workspace",
    entity_id: input.businessId,
    actor_id: input.userId,
    actor_type: "user",
    event_type: "user.workspace_selected",
    payload: { slug: input.slug, source: "select_business" },
    visibility: "internal",
    source: "api.workspace.select",
    created_at: new Date().toISOString(),
  });

  if (!error) return;
  if (isMissingRelationError(error, "activity_events")) return;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = safeSlug(url.searchParams.get("slug"));
  if (!slug) {
    return NextResponse.redirect(new URL("/select-business", req.url));
  }

  const supabase = await supabaseServerReadOnly();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { data: businessData, error: businessError } = await supabase
    .from("businesses")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (businessError || !businessData?.id || !businessData?.slug) {
    return NextResponse.redirect(new URL("/select-business", req.url));
  }

  const business = businessData as BusinessRow;
  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("business_id")
    .eq("user_id", user.id)
    .eq("business_id", business.id)
    .maybeSingle();

  if (membershipError || !membership?.business_id) {
    return NextResponse.redirect(new URL("/select-business", req.url));
  }

  await trackWorkspaceSelection({
    userId: user.id,
    businessId: business.id,
    slug: business.slug,
  });

  const response = NextResponse.redirect(new URL(`/b/${business.slug}`, req.url));
  response.cookies.set("active_business_slug", business.slug, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
  });

  return response;
}
