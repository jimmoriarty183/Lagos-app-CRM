import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
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

  // ✅ OWNER + MANAGER from memberships (this is the source of truth)
  const { data: mems, error: memErr } = await admin
    .from("memberships")
    .select("role, user_id")
    .eq("business_id", business_id)
    .in("role", ["OWNER", "MANAGER"]);

  if (memErr) return NextResponse.json({ error: memErr.message }, { status: 500 });

  const ownerUserId = mems?.find((m: any) => String(m.role).toUpperCase() === "OWNER")?.user_id || null;
  const managerUserId = mems?.find((m: any) => String(m.role).toUpperCase() === "MANAGER")?.user_id || null;

  // owner profile
  let ownerProfile: { id: string; full_name: string | null; email: string | null } | null = null;
  if (ownerUserId) {
    const { data: op } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", ownerUserId)
      .maybeSingle();
    if (op?.id) ownerProfile = op as any;
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
    .eq("role", "MANAGER")
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

  return NextResponse.json({
    owner_phone: biz?.owner_phone ?? null,
    legacy_manager_phone: biz?.manager_phone ?? null,

    owner: ownerProfile,
    manager: { state: "NONE" },
  });
}