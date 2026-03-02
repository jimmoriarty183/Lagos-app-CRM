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
  created_at?: string | null;
};

type Person = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at?: string | null;
};

async function loadOwnerManagerMemberships(
  admin: SupabaseClient,
  businessId: string,
) {
  const { data: primary, error: primaryErr } = await admin
    .from("memberships")
    .select("role, user_id, created_at")
    .eq("business_id", businessId);

  if (!primaryErr && Array.isArray(primary)) {
    return primary as MembershipRow[];
  }

  const { data: fallback, error: fallbackErr } = await admin
    .from("business_memberships")
    .select("role, user_id, created_at")
    .eq("business_id", businessId);

  if (!fallbackErr && Array.isArray(fallback)) {
    return fallback as MembershipRow[];
  }

  throw primaryErr || fallbackErr || new Error("Failed to load memberships");
}

async function loadPeopleByIds(admin: SupabaseClient, userIds: string[]) {
  if (userIds.length === 0) return new Map<string, { full_name: string | null; email: string | null }>();

  const { data, error } = await admin
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);

  if (error || !Array.isArray(data)) {
    return new Map<string, { full_name: string | null; email: string | null }>();
  }

  return new Map(
    data
      .filter((x: { id?: string | null }) => Boolean(x?.id))
      .map((x: { id: string; full_name: string | null; email: string | null }) => [
        String(x.id),
        { full_name: x.full_name ?? null, email: x.email ?? null },
      ]),
  );
}

function toPeople(rows: MembershipRow[], profileMap: Map<string, { full_name: string | null; email: string | null }>) {
  const list: Person[] = [];

  for (const row of rows) {
    const userId = String(row.user_id ?? "").trim();
    if (!userId) continue;

    const profile = profileMap.get(userId);
    list.push({
      user_id: userId,
      full_name: profile?.full_name ?? null,
      email: profile?.email ?? null,
      phone: null,
      created_at: row.created_at ?? null,
    });
  }

  return list;
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
  const authUser = authData?.user;
  if (!authUser?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: myMembership, error: myMembershipErr } = await admin
    .from("memberships")
    .select("role")
    .eq("business_id", business_id)
    .eq("user_id", authUser.id)
    .limit(1)
    .maybeSingle();

  if (myMembershipErr) {
    return NextResponse.json({ error: myMembershipErr.message }, { status: 500 });
  }

  const myRole = upperRole(myMembership?.role);
  if (myRole !== "OWNER" && myRole !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  const ownersRows = mems.filter((m) => upperRole(m.role) === "OWNER");
  const managersRows = mems.filter((m) => upperRole(m.role) === "MANAGER");

  const ids = Array.from(
    new Set(
      mems
        .map((m) => String(m.user_id ?? "").trim())
        .filter(Boolean),
    ),
  );

  const profileMap = await loadPeopleByIds(admin, ids);

  const owners = toPeople(ownersRows, profileMap);
  const managers = toPeople(managersRows, profileMap).sort((a, b) => {
    const da = a.created_at ? new Date(a.created_at).getTime() : 0;
    const db = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (da !== db) return da - db;
    return (a.full_name || a.email || "").localeCompare(b.full_name || b.email || "");
  });

  const { data: pendingInvites } = await admin
    .from("business_invites")
    .select("id, email, created_at, status, role")
    .eq("business_id", business_id)
    .ilike("role", "MANAGER")
    .eq("status", "PENDING")
    .order("created_at", { ascending: false });

  return NextResponse.json({
    owner_phone: biz?.owner_phone ?? null,
    legacy_manager_phone: biz?.manager_phone ?? null,
    owners,
    managers,
    pending_manager_invites: pendingInvites ?? [],
  });
}
