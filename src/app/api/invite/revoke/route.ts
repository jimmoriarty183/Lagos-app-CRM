import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const inviteId =
      body?.invite_id || body?.inviteId || body?.id || body?.invite?.id;

    if (!inviteId) {
      return NextResponse.json(
        { ok: false, error: "inviteId is required" },
        { status: 400 },
      );
    }

    const supabase = await supabaseServer();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    // 1) Получаем invite + business_id
    const { data: inv, error: invErr } = await supabase
      .from("business_invites")
      .select("id,business_id,status")
      .eq("id", inviteId)
      .single();

    if (invErr || !inv) {
      return NextResponse.json(
        { ok: false, error: invErr?.message || "Invite not found" },
        { status: 404 },
      );
    }

    // 2) Проверяем OWNER права
    const { data: mem, error: memErr } = await supabase
      .from("memberships")
      .select("role")
      .eq("business_id", inv.business_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memErr) {
      return NextResponse.json(
        { ok: false, error: memErr.message },
        { status: 403 },
      );
    }

    if (!mem || String(mem.role).toLowerCase() !== "owner") {
      return NextResponse.json(
        { ok: false, error: "Only owner can revoke invites" },
        { status: 403 },
      );
    }

    // 3) Пробуем обновить статус: сначала UPPERCASE, если не прошло — lowercase
    async function tryUpdate(statusValue: string) {
      return supabase
        .from("business_invites")
        .update({ status: statusValue })
        .eq("id", inviteId)
        .select("id,status")
        .maybeSingle();
    }

    let upd = await tryUpdate("REVOKED");

    // если enum/значения lowercase — пробуем "revoked"
    if (upd.error) {
      upd = await tryUpdate("revoked");
    }

    if (upd.error || !upd.data) {
      return NextResponse.json(
        { ok: false, error: upd.error?.message || "Failed to revoke" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, status: upd.data.status });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 },
    );
  }
}