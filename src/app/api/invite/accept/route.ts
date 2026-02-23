import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

function clean(v: string) {
  return String(v || "").trim();
}

export async function POST(req: Request) {
  const supabase = await supabaseServer();
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

  // 1) current user
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const user = authData.user;

  // 2) load invite
  const { data: inv, error: invErr } = await supabase
    .from("business_invites")
    .select("id, business_id, email, status, role")
    .eq("id", invite_id)
    .single();

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 404 });
  if (inv.status !== "PENDING") {
    return NextResponse.json({ error: "Invite is not pending" }, { status: 409 });
  }
  if (inv.role !== "MANAGER") {
    return NextResponse.json({ error: "Invite role is not MANAGER" }, { status: 400 });
  }

  // 3) security: email must match session user email
  const userEmail = (user.email || "").toLowerCase();
  const inviteEmail = String(inv.email || "").toLowerCase();
  if (!userEmail || userEmail !== inviteEmail) {
    return NextResponse.json(
      { error: "This invite does not belong to your email" },
      { status: 403 },
    );
  }

  // 4) upsert profile (so we can show name in Business card)
  // Требует policies: profiles_insert_own + profiles_update_own
  const { error: profErr } = await supabase
    .from("profiles")
    .upsert(
      { id: user.id, full_name: fullName, phone },
      { onConflict: "id" },
    );

  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 500 });
  }

  // 5) add membership (grant access)
  // Требует policies: OWNER creates invites, а accept лучше делать через service role,
  // но если ты не используешь service role — сделаем через текущего юзера:
  // понадобится политика, позволяющая вставку membership при наличии pending invite для этого user.email.
  // Чтобы не усложнять — вставим через RPC ниже (см. пункт 3).
  const { error: memErr } = await supabase
    .from("business_memberships")
    .upsert(
      { business_id: inv.business_id, user_id: user.id, role: "MANAGER" },
      { onConflict: "business_id,user_id" },
    );

  if (memErr) {
    return NextResponse.json({ error: memErr.message }, { status: 500 });
  }

  // 6) mark invite accepted
  const { error: accErr } = await supabase
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

  // 7) return business slug for redirect
  const { data: biz, error: bizErr } = await supabase
    .from("businesses")
    .select("slug")
    .eq("id", inv.business_id)
    .single();

  if (bizErr) return NextResponse.json({ error: bizErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, businessSlug: biz.slug });
}