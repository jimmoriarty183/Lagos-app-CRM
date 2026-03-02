import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function clean(v: unknown) {
  return String(v ?? "").trim();
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const invite_id = clean(url.searchParams.get("invite_id"));

    const admin = supabaseAdmin();
    const supabase = await supabaseServer();

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) {
      return NextResponse.json({ ok: false, error: authErr.message }, { status: 401 });
    }

    const userEmail = (auth?.user?.email || "").toLowerCase();
    if (!userEmail) {
      return NextResponse.json(
        { ok: false, error: "Please open the invite from the same email account." },
        { status: 401 },
      );
    }

    const inviteQuery = admin
      .from("business_invites")
      .select("id,business_id,email,status,role,expires_at")
      .eq("role", "MANAGER")
      .eq("status", "PENDING");

    const { data: inv, error: invErr } = invite_id
      ? await inviteQuery.eq("id", invite_id).limit(1).maybeSingle()
      : await inviteQuery
          .ilike("email", userEmail)
          .order("created_at", { ascending: false })
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

    const inviteEmail = String(inv.email || "").toLowerCase();
    if (userEmail !== inviteEmail) {
      return NextResponse.json(
        { ok: false, error: "Please open the invite from the same email account." },
        { status: 401 },
      );
    }

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
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
