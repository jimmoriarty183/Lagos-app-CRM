import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function clean(v: any) {
  return String(v ?? "").trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const invite_id = clean(body?.invite_id || body?.inviteId || body?.id);

    if (!invite_id) {
      return NextResponse.json({ ok: false, error: "invite_id required" }, { status: 400 });
    }

    const supabase = await supabaseServer();
    const admin = supabaseAdmin();

    const { data: u, error: userErr } = await supabase.auth.getUser();
    const user = u?.user;
    if (userErr || !user) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const { data: inv, error: invErr } = await admin
      .from("business_invites")
      .select("id,business_id,status")
      .eq("id", invite_id)
      .maybeSingle();

    if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });
    if (!inv) return NextResponse.json({ ok: false, error: "Invite not found" }, { status: 404 });

    const { data: mem, error: memErr } = await admin
      .from("memberships")
      .select("role")
      .eq("business_id", inv.business_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memErr) return NextResponse.json({ ok: false, error: memErr.message }, { status: 403 });
    if (!mem || String(mem.role).toLowerCase() !== "owner") {
      return NextResponse.json({ ok: false, error: "Only owner can revoke" }, { status: 403 });
    }

    const { data: updated, error: updErr } = await admin
      .from("business_invites")
      .update({
        status: "REVOKED",
        revoked_at: new Date().toISOString(),
        revoked_by: user.id,
      })
      .eq("id", invite_id)
      .select("id,status,revoked_at")
      .limit(1).maybeSingle();

    if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, invite: updated });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}