import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildNameFromParts, buildSafeUserFallback, resolveUserDisplay } from "@/lib/user-display";

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
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

type AuthUserIdentity = {
  id: string;
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
    .or("role.eq.OWNER,role.eq.owner,role.eq.MANAGER,role.eq.manager");

  const { data: fallback, error: fallbackErr } = await admin
    .from("business_memberships")
    .select("role, user_id")
    .eq("business_id", businessId)
    .or("role.eq.OWNER,role.eq.owner,role.eq.MANAGER,role.eq.manager");

  if (primaryErr && fallbackErr) {
    throw primaryErr || fallbackErr || new Error("Failed to load memberships");
  }

  const merged = [...(Array.isArray(primary) ? primary : []), ...(Array.isArray(fallback) ? fallback : [])];
  const deduped = new Map<string, MembershipRow>();

  for (const row of merged) {
    const userId = String(row?.user_id ?? "").trim();
    const role = upperRole(row?.role);
    if (!userId || (role !== "OWNER" && role !== "MANAGER")) continue;
    deduped.set(`${userId}:${role}`, {
      user_id: userId,
      role,
    });
  }

  return Array.from(deduped.values());
}

async function loadProfilesMap(admin: SupabaseClient, ids: string[]) {
  const uniqIds = Array.from(new Set(ids.filter(Boolean)));
  if (!uniqIds.length) return new Map<string, ProfileRow>();

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, full_name, first_name, last_name, email")
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

async function loadAuthEmailMap(admin: SupabaseClient, ids: string[]) {
  const uniqIds = Array.from(new Set(ids.filter(Boolean)));
  if (!uniqIds.length) return new Map<string, AuthUserIdentity>();

  const lookups = await Promise.all(
    uniqIds.map(async (id) => {
      const { data, error } = await admin.auth.admin.getUserById(id);
      if (error || !data?.user?.id) return null;

      return {
        id: String(data.user.id),
        email: cleanText(data.user.email) || null,
      } satisfies AuthUserIdentity;
    }),
  );

  const map = new Map<string, AuthUserIdentity>();
  for (const user of lookups) {
    if (user?.id) map.set(user.id, user);
  }
  return map;
}

function cleanText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "";
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


  let mems: MembershipRow[] = [];
  try {
    mems = await loadOwnerManagerMemberships(admin, business_id);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to load memberships";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const ownerMemberships = mems.filter((m) => upperRole(m.role) === "OWNER");
  const managerMemberships = mems.filter((m) => upperRole(m.role) === "MANAGER");
  const viewerMembership =
    mems.find((m) => String(m.user_id ?? "").trim() === String(authData.user.id).trim()) ?? null;
  const viewerRole = upperRole(viewerMembership?.role);

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

  const allManagerIds = Array.from(
    new Set(
      managerMemberships
        .map((m) => String(m.user_id ?? "").trim())
        .filter(Boolean),
    ),
  );

  const ownerIds = ownerMemberships
    .map((membership) => String(membership.user_id ?? "").trim())
    .filter(Boolean);
  const profileIds = [...ownerIds, ...allManagerIds];

  let profilesById = new Map<string, ProfileRow>();
  try {
    profilesById = await loadProfilesMap(admin, profileIds);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to load profiles";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  let authUsersById = new Map<string, AuthUserIdentity>();
  try {
    authUsersById = await loadAuthEmailMap(admin, profileIds);
  } catch {
    authUsersById = new Map<string, AuthUserIdentity>();
  }

  const authUser = authData.user;
  const authProfile = profilesById.get(authUser.id) ?? null;
  const authMeta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
  const metadataFirstName = cleanText(authMeta.first_name);
  const metadataLastName = cleanText(authMeta.last_name);
  const metadataFullName = cleanText(authMeta.full_name);
  const metadataEmail = cleanText(authUser.email);
  const needsProfileBackfill =
    !authProfile ||
    (!cleanText(authProfile.full_name) &&
      !cleanText(authProfile.first_name) &&
      !cleanText(authProfile.last_name) &&
      !cleanText(authProfile.email));

  if (needsProfileBackfill && (metadataEmail || metadataFullName || metadataFirstName || metadataLastName)) {
    const profilePayload = {
      id: authUser.id,
      email: metadataEmail || null,
      first_name: metadataFirstName || null,
      last_name: metadataLastName || null,
      full_name:
        metadataFullName ||
        buildNameFromParts(metadataFirstName || null, metadataLastName || null) ||
        null,
    };

    const { error: backfillError } = await admin
      .from("profiles")
      .upsert(profilePayload, { onConflict: "id" });

    if (!backfillError) {
      try {
        profilesById = await loadProfilesMap(admin, profileIds);
      } catch {
        // Keep the current map if the refresh fails; the route still returns safely.
      }
    }
  }

  const ownerMembership =
    (viewerRole === "OWNER"
      ? ownerMemberships.find(
          (membership) =>
            String(membership.user_id ?? "").trim() === String(authData.user.id).trim(),
        )
      : null) ??
    ownerMemberships[0] ??
    null;

  const ownerId = ownerMembership?.user_id ? String(ownerMembership.user_id) : null;
  const ownerProfile = ownerId ? profilesById.get(ownerId) ?? null : null;
  const ownerNormalized = ownerProfile
    ? resolveUserDisplay({
        full_name: ownerProfile.full_name,
        first_name: ownerProfile.first_name,
        last_name: ownerProfile.last_name,
        email: ownerProfile.email || authUsersById.get(ownerId ?? "")?.email || null,
      })
    : ownerId
      ? resolveUserDisplay({
          email: authUsersById.get(ownerId)?.email || null,
        })
      : null;

  const managersActiveAll = allManagerIds.map((userId) => {
    const profile = profilesById.get(userId) ?? null;
    const authEmail = authUsersById.get(userId)?.email || null;
    const normalized = resolveUserDisplay({
      full_name: profile?.full_name,
      first_name: profile?.first_name,
      last_name: profile?.last_name,
      email: profile?.email || authEmail,
    });

    return {
      user_id: userId,
      full_name: normalized.fullName || normalized.fromParts || null,
      first_name: profile?.first_name ?? null,
      last_name: profile?.last_name ?? null,
      email: normalized.email || null,
      phone: normalized.phone || null,
      profile_missing: !profile,
      safe_fallback: !profile ? buildSafeUserFallback(userId) : null,
    };
  });

  const viewerManager =
    managersActiveAll.find(
      (manager) => String(manager.user_id).trim() === String(authData.user.id).trim(),
    ) ?? null;
  const managersActive = managersActiveAll;
  const ownerPayload = ownerId
    ? {
        id: ownerId,
        full_name: ownerNormalized?.fullName || ownerNormalized?.fromParts || null,
        first_name: ownerProfile?.first_name ?? null,
        last_name: ownerProfile?.last_name ?? null,
        email: ownerNormalized?.email || null,
        phone: ownerNormalized?.phone || null,
        profile_missing: !ownerProfile,
        safe_fallback: !ownerProfile ? buildSafeUserFallback(ownerId) : null,
      }
    : null;
  const pendingPayload = pendingInvites;

  return NextResponse.json({
    viewer_role: viewerRole,
    owner: ownerPayload,
    viewer_manager: viewerManager,
    managers_active: managersActive,
    managers_pending: pendingPayload.map((inv) => ({
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
      : pendingPayload.length
        ? {
            state: "PENDING",
            email: pendingPayload[0].email,
            created_at: pendingPayload[0].created_at,
          }
        : { state: "NONE" },
  });
}
