import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
}

function upperRole(v: unknown) {
  return String(v ?? "").trim().toUpperCase();
}

type MembershipRow = {
  role: string | null;
  user_id: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

async function loadOwnerManagerMemberships(
  admin: SupabaseClient,
  businessId: string,
) {
  const { data: primary, error: primaryErr } = await admin
    .from("memberships")
    .select("role, user_id")
    .eq("business_id", businessId)
    .in("role", ["OWNER", "MANAGER"]);

  if (!primaryErr && Array.isArray(primary)) {
    return primary as MembershipRow[];
  }

  const { data: fallback, error: fallbackErr } = await admin
    .from("business_memberships")
    .select("role, user_id")
    .eq("business_id", businessId)
    .in("role", ["OWNER", "MANAGER"]);

  if (!fallbackErr && Array.isArray(fallback)) {
    return fallback as MembershipRow[];
  }

  throw primaryErr || fallbackErr || new Error("Failed to load memberships");
}

async function loadProfilesMap(admin: SupabaseClient, ids: string[]) {
  const uniqIds = Array.from(new Set(ids.filter(Boolean)));
  if (!uniqIds.length) return new Map<string, ProfileRow>();

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, full_name, email")
    .in("id", uniqIds);

  if (error) throw error;

  const map = new Map<string, ProfileRow>();
  for (const p of profiles ?? []) {
    if (p?.id) {
      map.set(String(p.id), p as ProfileRow);
    }
  }
  return map;
}

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();
  const { searchParams } = new URL(req.url);

  const business_id_raw = searchParams.get("business_id");
  const business_id = (business_id_raw ?? "").trim();

  if (!business_id || business_id === "undefined" || business_id === "null") {
    return NextResponse.json({ error: "business_id required" }, { status: 400 });
  }
  if (!isUuid(business_id)) {
    return NextResponse.json({ error: "business_id must be a UUID" }, { status: 400 });
  }

  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: biz, error: bizErr } = await admin
    .from("businesses")
    .select("owner_phone, manager_phone")
    .eq("id", business_id)
    .limit(1)
    .maybeSingle();

  if (bizErr) return NextResponse.json({ error: bizErr.message }, { status: 500 });

  let mems: MembershipRow[] = [];
  try {
    mems = await loadOwnerManagerMemberships(admin, business_id);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to load memberships";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const ownerMembership = mems.find((m) => upperRole(m.role) === "OWNER") ?? null;
  const managerMemberships = mems.filter((m) => upperRole(m.role) === "MANAGER");

  let pendingInvites: { id: string; email: string; created_at: string | null }[] = [];
  const { data: pendingRows } = await admin
    .from("business_invites")
    .select("id,email,created_at")
    .eq("business_id", business_id)
    .ilike("role", "MANAGER")
    .eq("status", "PENDING")
    .order("created_at", { ascending: false });

  if (Array.isArray(pendingRows)) {
    pendingInvites = pendingRows.map((inv: { id: string; email: string; created_at: string | null }) => ({
      id: String(inv.id),
      email: String(inv.email),
      created_at: inv.created_at ? String(inv.created_at) : null,
    }));
  }

  const profileIds = [ownerMembership?.user_id ?? "", ...managerMemberships.map((m) => m.user_id ?? "")];

  let profilesById = new Map<string, ProfileRow>();
  try {
    profilesById = await loadProfilesMap(admin, profileIds);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to load profiles";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const ownerId = ownerMembership?.user_id ? String(ownerMembership.user_id) : null;
  const ownerProfile = ownerId ? profilesById.get(ownerId) ?? null : null;

  const managersActive = managerMemberships
    .map((m) => {
      const userId = m.user_id ? String(m.user_id) : "";
      if (!userId) return null;
      const profile = profilesById.get(userId) ?? null;
      return {
        user_id: userId,
        full_name: profile?.full_name ?? null,
        email: profile?.email ?? null,
        phone: null as string | null,
      };
    })
    .filter(Boolean);

  return NextResponse.json({
    owner_phone: biz?.owner_phone ?? null,
    legacy_manager_phone: biz?.manager_phone ?? null,

    owner: ownerProfile
      ? {
          id: ownerProfile.id,
          full_name: ownerProfile.full_name,
          email: ownerProfile.email,
        }
      : null,

    managers_active: managersActive,
    managers_pending: pendingInvites.map((inv) => ({
      invite_id: inv.id,
      email: inv.email,
      created_at: inv.created_at,
    })),

    // backward compatibility
    manager: managersActive.length
      ? {
          state: "ACTIVE",
          ...managersActive[0],
        }
      : pendingInvites.length
        ? {
            state: "PENDING",
            email: pendingInvites[0].email,
            created_at: pendingInvites[0].created_at,
          }
        : { state: "NONE" },
  });
}
