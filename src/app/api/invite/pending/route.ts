import { NextResponse } from "next/server";
import { supabaseServerReadOnly, supabaseServer } from "@/lib/supabase/server";

function clean(v: any) {
  return String(v ?? "").trim();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const invite_id = clean(url.searchParams.get("invite_id"));

  if (!invite_id) {
    return NextResponse.json({ error: "invite_id required" }, { status: 400 });
  }

  // ✅ invite можно читать read-only
  const supabaseRO = await supabaseServerReadOnly();

  const { data: inv, error: invErr } = await supabaseRO
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

  // ✅ безопасность: показываем бизнес ТОЛЬКО если залогинен и email совпадает
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const userEmail = (auth?.user?.email || "").toLowerCase();
  const inviteEmail = String(inv.email || "").toLowerCase();

  if (!userEmail || userEmail !== inviteEmail) {
    return NextResponse.json(
      { error: "Please open the invite from the same email account." },
      { status: 401 },
    );
  }

  // ✅ бизнес (без падений если нет name)
  let biz: any = null;
  const withName = await supabaseRO
    .from("businesses")
    .select("id,slug,name")
    .eq("id", inv.business_id)
    .single();

  if (!withName.error && withName.data) {
    biz = withName.data;
  } else {
    const withoutName = await supabaseRO
      .from("businesses")
      .select("id,slug")
      .eq("id", inv.business_id)
      .single();

    if (withoutName.error || !withoutName.data) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }
    biz = withoutName.data;
  }

  return NextResponse.json({
    ok: true,
    invite: {
      id: inv.id,
      business_id: inv.business_id,
      email: inv.email,
      status: inv.status,
      role: inv.role,
    },
    business: biz,
  });
}