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

async function loadOwnerManagerMemberships(admin: SupabaseClient, businessId: string) {
  const { data: primary, error: primaryErr } = await admin
    .from("memberships")
    .select("role, user_id")
    .eq("business_id", businessId);

  if (!primaryErr && Array.isArray(primary)) {
    return primary as MembershipRow[];
  }

  const { data: fallback, error: fallbackErr } = await admin
    .from("business_memberships")
    .select("role, user_id")
    .eq("business_id", businessId);

  if (!fallbackErr && Array.isArray(fallback)) {
    return fallback as MembershipRow[];
  }

  throw primaryErr || fallbackErr || new Error("Failed to load memberships");
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

  // ✅ require session (so random people can’t probe business ids)
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // legacy phones (can be null now)
  const { data: biz, error: bizErr } = await admin
    .from("businesses")
    .select("owner_phone, manager_phone")
    .eq("id", business_id)
    .limit(1)
    .maybeSingle();

  if (bizErr) return NextResponse.json({ error: bizErr.message }, { status: 500 });

  // ✅ OWNER + MANAGER from memberships (source of truth), with fallback table support
  let mems: MembershipRow[] = [];
  try {
    mems = await loadOwnerManagerMemberships(admin, business_id);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to load memberships";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const ownerUserId =
    mems.find((m) => upperRole(m.role) === "OWNER")?.user_id || null;
  const managerUserId =
    mems.find((m) => upperRole(m.role) === "MANAGER")?.user_id || null;

  // owner profile
  let ownerProfile: { id: string; full_name: string | null; email: string | null } | null = null;
  if (ownerUserId) {
    const { data: op } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", ownerUserId)
      .maybeSingle();
    if (op?.id) ownerProfile = op as { id: string; full_name: string | null; email: string | null };
  }

  // manager ACTIVE
  if (managerUserId) {
    const { data: mp } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", managerUserId)
      .maybeSingle();

    return NextResponse.json({
      // legacy
      owner_phone: biz?.owner_phone ?? null,
      legacy_manager_phone: biz?.manager_phone ?? null,

      // ✅ new
      owner: ownerProfile,
      manager: {
        state: "ACTIVE",
        user_id: managerUserId,
        full_name: mp?.full_name ?? null,
        phone: null,
        email: mp?.email ?? null,
      },
    });
  }

  // manager PENDING invite
  const { data: inv } = await admin
    .from("business_invites")
    .select("email, created_at")
    .eq("business_id", business_id)
    .ilike("role", "MANAGER")
    .eq("status", "PENDING")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (inv?.email) {
    return NextResponse.json({
      owner_phone: biz?.owner_phone ?? null,
      legacy_manager_phone: biz?.manager_phone ?? null,

      owner: ownerProfile,
      manager: { state: "PENDING", email: inv.email, created_at: inv.created_at },
    });
  }

  // Fallback: invite is accepted but membership row may lag/mismatch between tables.
  const { data: accepted } = await admin
    .from("business_invites")
    .select("accepted_by")
    .eq("business_id", business_id)
    .ilike("role", "MANAGER")
    .eq("status", "ACCEPTED")
    .not("accepted_by", "is", null)
    .order("accepted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (accepted?.accepted_by) {
    const { data: ap } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", accepted.accepted_by)
      .maybeSingle();

    return NextResponse.json({
      owner_phone: biz?.owner_phone ?? null,
      legacy_manager_phone: biz?.manager_phone ?? null,

      owner: ownerProfile,
      manager: {
        state: "ACTIVE",
        user_id: accepted.accepted_by,
        full_name: ap?.full_name ?? null,
        phone: null,
        email: ap?.email ?? null,
      },
    });
  }

  return NextResponse.json({
    owner_phone: biz?.owner_phone ?? null,
    legacy_manager_phone: biz?.manager_phone ?? null,

    owner: ownerProfile,
    manager: { state: "NONE" },
  });
}
