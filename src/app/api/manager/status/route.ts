import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

function isUuid(v: string) {
  // RFC4122 UUID v1-v5 (case-insensitive)
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const { searchParams } = new URL(req.url);

  const business_id_raw = searchParams.get("business_id");
  const business_id = (business_id_raw ?? "").trim();

  // ✅ защита от business_id=undefined/null/пусто
  if (!business_id || business_id === "undefined" || business_id === "null") {
    return NextResponse.json(
      { error: "business_id required" },
      { status: 400 }
    );
  }

  // ✅ защита от не-UUID (иначе Postgres падает)
  if (!isUuid(business_id)) {
    return NextResponse.json(
      { error: "business_id must be a UUID" },
      { status: 400 }
    );
  }

  // owner_phone (из businesses)
  const { data: biz, error: bizErr } = await supabase
    .from("businesses")
    .select("owner_phone, manager_phone")
    .eq("id", business_id)
    .single();

  if (bizErr) return NextResponse.json({ error: bizErr.message }, { status: 500 });

  // ACTIVE manager через membership
  const { data: mm } = await supabase
    .from("business_memberships")
    .select("user_id")
    .eq("business_id", business_id)
    .eq("role", "MANAGER")
    .maybeSingle();

  if (mm?.user_id) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", mm.user_id)
      .maybeSingle();

    return NextResponse.json({
      owner_phone: biz?.owner_phone ?? null,
      legacy_manager_phone: biz?.manager_phone ?? null,
      manager: {
        state: "ACTIVE",
        user_id: mm.user_id,
        full_name: prof?.full_name ?? null,
        phone: prof?.phone ?? null,
      },
    });
  }

  // PENDING invite
  const { data: inv } = await supabase
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
      manager: { state: "PENDING", email: inv.email, created_at: inv.created_at },
    });
  }

  return NextResponse.json({
    owner_phone: biz?.owner_phone ?? null,
    legacy_manager_phone: biz?.manager_phone ?? null,
    manager: { state: "NONE" },
  });
}