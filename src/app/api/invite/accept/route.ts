import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function clean(v: any) {
  return String(v ?? "").trim();
}

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();

  const body = await req.json().catch(() => ({}));
  const invite_id = clean(body?.inviteId || body?.invite_id);
  const fullName = clean(body?.fullName);
  const phone = clean(body?.phone);

  if (!invite_id) {
    return NextResponse.json({ error: "invite_id required" }, { status: 400 });
  }
  if (fullName.length < 2 || phone.length < 7) {
    return NextResponse.json({ error: "fullName and phone required" }, { status: 400 });
  }

  // 1) текущий пользователь (cookie session)
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const user = authData.user;

  // 2) инвайт из базы (service role)
  const { data: inv, error: invErr } = await admin
    .from("business_invites")
    .select("id,business_id,email,status,role")
    .eq("id", invite_id)
    .single();

  if (invErr || !inv) {
    return NextResponse.json({ error: invErr?.message || "Invite not found" }, { status: 404 });
  }

  if (String(inv.status).toUpperCase() !== "PENDING") {
    return NextResponse.json({ error: "Invite is not pending" }, { status: 409 });
  }
  if (String(inv.role).toUpperCase() !== "MANAGER") {
    return NextResponse.json({ error: "Invite role is not MANAGER" }, { status: 400 });
  }

  // 3) безопасность: email инвайта должен совпасть с email текущей сессии
  const userEmail = (user.email || "").toLowerCase();
  const inviteEmail = String(inv.email || "").toLowerCase();
  if (!userEmail || userEmail !== inviteEmail) {
    return NextResponse.json(
      { error: "This invite does not belong to your email" },
      { status: 403 },
    );
  }

  // 4) upsert profile (service role)
  const { error: profErr } = await admin
    .from("profiles")
    .upsert({ id: user.id, full_name: fullName, phone }, { onConflict: "id" });

  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 500 });
  }

  // 5) membership (ВАЖНО: используй ОДНУ таблицу — у тебя в TeamPage это "memberships")
  const { error: memErr } = await admin
    .from("memberships")
    .upsert(
      { business_id: inv.business_id, user_id: user.id, role: "manager" },
      { onConflict: "business_id,user_id" },
    );

  if (memErr) {
    return NextResponse.json({ error: memErr.message }, { status: 500 });
  }

  // 6) mark invite accepted
  const { error: accErr } = await admin
    .from("business_invites")
    .update({
      status: "ACCEPTED",
      accepted_at: new Date().toISOString(),
      accepted_by: user.id,
    })
    .eq("id", invite_id)
    .eq("status", "PENDING");

  if (accErr) {
    return NextResponse.json({ error: accErr.message }, { status: 500 });
  }

  // 7) slug
  const { data: biz, error: bizErr } = await admin
    .from("businesses")
    .select("slug")
    .eq("id", inv.business_id)
    .single();

  if (bizErr || !biz) {
    return NextResponse.json({ error: bizErr?.message || "Business not found" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, businessSlug: biz.slug });
}