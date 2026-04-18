import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const inviteId = String(id ?? "").trim();
    if (!inviteId) {
      return NextResponse.json({ ok: false, error: "invite id required" }, { status: 400 });
    }
    const url = new URL(req.url);
    const isLegacy = url.searchParams.get("legacy") === "1";

    const supabase = await supabaseServer();
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const user = userData?.user;
    if (userErr || !user) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const admin = supabaseAdmin();

    if (isLegacy) {
      // Legacy per-business invite: check caller is owner/manage-team of the
      // business's account, then mark revoked in `business_invites`.
      const inv = await admin
        .from("business_invites")
        .select("id, business_id, revoked_at, status")
        .eq("id", inviteId)
        .maybeSingle();
      if (inv.error) {
        return NextResponse.json({ ok: false, error: inv.error.message }, { status: 500 });
      }
      const row = inv.data as { id: string; business_id: string; revoked_at: string | null; status: string } | null;
      if (!row) {
        return NextResponse.json({ ok: false, error: "invite not found" }, { status: 404 });
      }
      const biz = await admin
        .from("businesses")
        .select("account_id")
        .eq("id", row.business_id)
        .maybeSingle();
      const accountId = String((biz.data as { account_id?: string } | null)?.account_id ?? "").trim();
      if (!accountId) {
        return NextResponse.json({ ok: false, error: "business not linked to account" }, { status: 400 });
      }
      const perm = await admin.rpc("user_can_manage_team", {
        p_user_id: user.id,
        p_account_id: accountId,
      });
      if (perm.error) {
        return NextResponse.json({ ok: false, error: perm.error.message }, { status: 500 });
      }
      if (!perm.data) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const upd = await admin
        .from("business_invites")
        .update({
          status: "REVOKED",
          revoked_at: new Date().toISOString(),
          revoked_by: user.id,
        })
        .eq("id", inviteId)
        .is("revoked_at", null);
      if (upd.error) {
        return NextResponse.json({ ok: false, error: upd.error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    const { data, error } = await admin.rpc("revoke_account_invite", {
      p_actor_user_id: user.id,
      p_invite_id: inviteId,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row || row.ok === false) {
      return NextResponse.json(
        { ok: false, error: row?.error_message || "Could not revoke", code: row?.error_code || "UNKNOWN" },
        { status: row?.error_code === "FORBIDDEN" ? 403 : 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
