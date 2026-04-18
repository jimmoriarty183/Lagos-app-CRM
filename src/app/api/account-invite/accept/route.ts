import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { inviteId?: string; token?: string };
    const inviteId = String(body.inviteId ?? "").trim();
    const tokenFromBody = String(body.token ?? "").trim();

    const supabase = await supabaseServer();
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const user = userData?.user;
    if (userErr || !user) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const admin = supabaseAdmin();

    let token = tokenFromBody;
    if (!token && inviteId) {
      const inv = await admin
        .from("account_invites")
        .select("token, email, status")
        .eq("id", inviteId)
        .maybeSingle();
      if (inv.error) {
        return NextResponse.json({ ok: false, error: inv.error.message }, { status: 500 });
      }
      if (!inv.data) {
        return NextResponse.json({ ok: false, error: "invite not found" }, { status: 404 });
      }
      token = String((inv.data as { token?: string }).token ?? "");
    }
    if (!token) {
      return NextResponse.json({ ok: false, error: "inviteId or token is required" }, { status: 400 });
    }

    const { data, error } = await admin.rpc("accept_account_invite", {
      p_acceptor_user_id: user.id,
      p_token: token,
    });
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || row.ok === false) {
      return NextResponse.json(
        { ok: false, error: row?.error_message || "Could not accept invite", code: row?.error_code || "UNKNOWN" },
        { status: 400 },
      );
    }
    return NextResponse.json({
      ok: true,
      accountId: row.account_id,
      businessesAdded: row.businesses_added,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
