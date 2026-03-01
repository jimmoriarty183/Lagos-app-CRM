import { NextResponse } from "next/server";
import { supabaseServerReadOnly, supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function clean(v: any) {
  return String(v ?? "").trim();
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const invite_id = clean(url.searchParams.get("invite_id"));

    if (!invite_id) {
      return NextResponse.json({ ok: false, error: "invite_id required" }, { status: 400 });
    }

    const admin = supabaseAdmin();

    // ✅ invite читаем через service-role (RLS не мешает)
    const { data: inv, error: invErr } = await admin
      .from("business_invites")
      .select("id,business_id,email,status,role,expires_at")
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

    // ✅ безопасность: показываем бизнес ТОЛЬКО если залогинен и email совпадает
    const supabase = await supabaseServer();
    const { data: auth, error: authErr } = await supabase.auth.getUser();

    if (authErr) {
      return NextResponse.json({ ok: false, error: authErr.message }, { status: 401 });
    }

    const userEmail = (auth?.user?.email || "").toLowerCase();
    const inviteEmail = String(inv.email || "").toLowerCase();

    if (!userEmail || userEmail !== inviteEmail) {
      return NextResponse.json(
        { ok: false, error: "Please open the invite from the same email account." },
        { status: 401 },
      );
    }

    // ✅ business читаем через service-role
    const { data: biz, error: bizErr } = await admin
      .from("businesses")
      .select("id,slug,name")
      .eq("id", inv.business_id)
      .limit(1)
      .maybeSingle();

    if (bizErr) {
      return NextResponse.json({ ok: false, error: bizErr.message }, { status: 400 });
    }
    if (!biz) {
      return NextResponse.json({ ok: false, error: "Business not found" }, { status: 404 });
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
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unexpected error" },
      { status: 500 },
    );
  }
}