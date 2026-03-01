import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function clean(v: any) {
  return String(v ?? "").trim();
}

function buildFullName(firstName: string, lastName: string, fullName: string) {
  const fn = clean(firstName);
  const ln = clean(lastName);
  const full = clean(fullName);

  if (full.length >= 2) return full;
  const joined = [fn, ln].filter(Boolean).join(" ").trim();
  return joined;
}

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();

  const body = await req.json().catch(() => ({}));
  const invite_id = clean(body?.inviteId || body?.invite_id);

  const firstName = clean(body?.firstName);
  const lastName = clean(body?.lastName);
  const fullName = buildFullName(firstName, lastName, clean(body?.fullName));

  if (!invite_id) {
    return NextResponse.json({ ok: false, error: "invite_id required" }, { status: 400 });
  }
  if (fullName.length < 2) {
    return NextResponse.json(
      { ok: false, error: "Name is required" },
      { status: 400 },
    );
  }

  // 1) текущий пользователь (cookie session)
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }
  const user = authData.user;

  // 2) инвайт из базы (service role)
  const { data: inv, error: invErr } = await admin
    .from("business_invites")
    .select("id,business_id,email,status,role")
    .eq("id", invite_id)
    .limit(1)
    .maybeSingle();

  if (invErr) {
    return NextResponse.json({ ok: false, error: invErr.message }, { status: 400 });
  }
  if (!inv) {
    return NextResponse.json(
      { ok: false, error: "Invite not found (revoked/expired/invalid link)" },
      { status: 404 },
    );
  }

  if (String(inv.status).toUpperCase() !== "PENDING") {
    return NextResponse.json({ ok: false, error: "Invite is not pending" }, { status: 409 });
  }
  if (String(inv.role).toUpperCase() !== "MANAGER") {
    return NextResponse.json({ ok: false, error: "Invite role is not MANAGER" }, { status: 400 });
  }

  // 3) безопасность: email инвайта должен совпасть с email текущей сессии
  const userEmail = (user.email || "").toLowerCase();
  const inviteEmail = String(inv.email || "").toLowerCase();
  if (!userEmail || userEmail !== inviteEmail) {
    return NextResponse.json(
      { ok: false, error: "This invite does not belong to your email" },
      { status: 403 },
    );
  }

  // 3.1) бизнес-правило: один MANAGER на бизнес
  // Если хочешь "заменять" менеджера — скажи, дам версию с revoke старого.
  const { data: existingManager, error: exErr } = await admin
    .from("memberships")
    .select("user_id")
    .eq("business_id", inv.business_id)
    .eq("role", "MANAGER")
    .limit(1)
    .maybeSingle();

  if (exErr) {
    return NextResponse.json({ ok: false, error: exErr.message }, { status: 500 });
  }
  if (existingManager?.user_id && existingManager.user_id !== user.id) {
    return NextResponse.json(
      { ok: false, error: "This business already has a manager assigned" },
      { status: 409 },
    );
  }

  // 4) upsert profile (service role)
  // Пишем full_name, и если колонки first_name/last_name есть — тоже пишем.
  // Если их нет — Postgres просто вернёт ошибку. Чтобы не ломать прод,
  // пишем безопасно: сначала full_name, потом пробуем first/last.
  const { error: profErr } = await admin
    .from("profiles")
    .upsert({ id: user.id, full_name: fullName }, { onConflict: "id" });

  if (profErr) {
    return NextResponse.json({ ok: false, error: profErr.message }, { status: 500 });
  }

  // OPTIONAL: если у тебя реально есть first_name/last_name — раскомментируй:
  // await admin.from("profiles").update({ first_name: firstName || null, last_name: lastName || null }).eq("id", user.id);

  // 5) membership
  const { error: memErr } = await admin
    .from("memberships")
    .upsert(
      { business_id: inv.business_id, user_id: user.id, role: "MANAGER" },
      { onConflict: "business_id,user_id" },
    );

  if (memErr) {
    return NextResponse.json({ ok: false, error: memErr.message }, { status: 500 });
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
    return NextResponse.json({ ok: false, error: accErr.message }, { status: 500 });
  }

  // 7) slug
  const { data: biz, error: bizErr } = await admin
    .from("businesses")
    .select("slug")
    .eq("id", inv.business_id)
    .limit(1)
    .maybeSingle();

  if (bizErr) {
    return NextResponse.json({ ok: false, error: bizErr.message }, { status: 500 });
  }
  if (!biz?.slug) {
    return NextResponse.json({ ok: false, error: "Business not found" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, businessSlug: biz.slug });
}