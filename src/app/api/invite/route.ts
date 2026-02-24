import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function clean(v: any) {
  return String(v ?? "").trim();
}
function normEmail(v: any) {
  return clean(v).toLowerCase();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const business_id = clean(body?.business_id || body?.businessId);
    const email = normEmail(body?.email);
    const role = clean(body?.role || "MANAGER").toUpperCase();

    if (!business_id) {
      return NextResponse.json({ ok: false, error: "business_id required" }, { status: 400 });
    }
    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "valid email required" }, { status: 400 });
    }

    const supabase = await supabaseServer();
    const admin = supabaseAdmin();

    // auth user
    const { data: u, error: userErr } = await supabase.auth.getUser();
    const user = u?.user;
    if (userErr || !user) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    // owner check (через admin, чтобы не упираться в RLS)
    const { data: mem, error: memErr } = await admin
      .from("memberships")
      .select("role")
      .eq("business_id", business_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memErr) {
      return NextResponse.json({ ok: false, error: memErr.message }, { status: 403 });
    }
    if (!mem || String(mem.role).toLowerCase() !== "owner") {
      return NextResponse.json({ ok: false, error: "Only owner can invite" }, { status: 403 });
    }

    // 1) если уже есть активный pending на этот email+role — не создаём дубль
    const { data: existing, error: exErr } = await admin
      .from("business_invites")
      .select("id,email,status,created_at")
      .eq("business_id", business_id)
      .ilike("email", email) // на всякий
      .eq("role", role)
      .eq("status", "PENDING")
      .order("created_at", { ascending: false })
      .maybeSingle();

    if (exErr) {
      return NextResponse.json({ ok: false, error: exErr.message }, { status: 500 });
    }

    if (existing?.id) {
      // идемпотентно: считаем что invite уже отправлен
      return NextResponse.json({ ok: true, invite_id: existing.id, already_pending: true });
    }

    // 2) создаём новый invite
    const { data: created, error: crErr } = await admin
      .from("business_invites")
      .insert({
        business_id,
        email,
        role,
        status: "PENDING",
      })
      .select("id")
      .single();

    if (crErr) {
      return NextResponse.json({ ok: false, error: crErr.message }, { status: 500 });
    }

    // ⚠️ тут у тебя должна быть отправка email (если есть отдельный сервис)
    // например, вызов /api/email/send-invite или supabase function
    // сейчас просто вернём invite_id

    return NextResponse.json({ ok: true, invite_id: created.id, already_pending: false });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}