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

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    const user = authData?.user;

    if (authErr || !user?.id || !user.email) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const { data: invite, error: inviteErr } = await admin
      .from("business_invites")
      .select("id,email,status")
      .eq("id", invite_id)
      .limit(1)
      .maybeSingle();

    if (inviteErr) {
      return NextResponse.json({ ok: false, error: inviteErr.message }, { status: 500 });
    }
    if (!invite) {
      return NextResponse.json({ ok: false, error: "Invite not found" }, { status: 404 });
    }
    if (String(invite.status).toUpperCase() !== "PENDING") {
      return NextResponse.json({ ok: false, error: "Invite is not pending" }, { status: 409 });
    }

    const inviteEmail = String(invite.email ?? "").trim().toLowerCase();
    const userEmail = String(user.email ?? "").trim().toLowerCase();
    if (!inviteEmail || inviteEmail !== userEmail) {
      return NextResponse.json(
        { ok: false, error: "This invite does not belong to your email" },
        { status: 403 },
      );
    }

    const { error: updateErr } = await admin
      .from("business_invites")
      .update({
        status: "REVOKED",
        revoked_at: new Date().toISOString(),
        revoked_by: user.id,
      })
      .eq("id", invite_id)
      .eq("status", "PENDING");

    if (updateErr) {
      return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unexpected error" },
      { status: 500 },
    );
  }
}
