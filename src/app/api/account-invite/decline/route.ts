import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { inviteId?: string };
    const inviteId = String(body.inviteId ?? "").trim();
    if (!inviteId) {
      return NextResponse.json({ ok: false, error: "inviteId is required" }, { status: 400 });
    }

    const supabase = await supabaseServer();
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const user = userData?.user;
    if (userErr || !user) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const admin = supabaseAdmin();

    // The acceptor can decline only if the invite is pending and matches their email.
    const inv = await admin
      .from("account_invites")
      .select("id, email, status, expires_at")
      .eq("id", inviteId)
      .maybeSingle();
    if (inv.error) {
      return NextResponse.json({ ok: false, error: inv.error.message }, { status: 500 });
    }
    const row = inv.data as { id: string; email: string; status: string; expires_at: string | null } | null;
    if (!row) {
      return NextResponse.json({ ok: false, error: "invite not found" }, { status: 404 });
    }
    const invitedEmail = String(row.email ?? "").trim().toLowerCase();
    const myEmail = String(user.email ?? "").trim().toLowerCase();
    if (!invitedEmail || invitedEmail !== myEmail) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    if (String(row.status).toLowerCase() !== "pending") {
      return NextResponse.json({ ok: false, error: `invite is ${row.status}` }, { status: 400 });
    }

    const upd = await admin
      .from("account_invites")
      .update({
        status: "revoked",
        revoked_at: new Date().toISOString(),
        revoked_by: user.id,
      })
      .eq("id", inviteId);
    if (upd.error) {
      return NextResponse.json({ ok: false, error: upd.error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
