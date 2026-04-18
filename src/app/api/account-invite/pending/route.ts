import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function clean(v: unknown) {
  return String(v ?? "").trim();
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = clean(url.searchParams.get("token"));
    const inviteId = clean(url.searchParams.get("invite_id"));
    if (!token && !inviteId) {
      return NextResponse.json({ ok: false, error: "token or invite_id required" }, { status: 400 });
    }

    const admin = supabaseAdmin();

    const baseQuery = admin
      .from("account_invites")
      .select("id, account_id, email, token, status, expires_at, can_manage_team");
    const { data: invite, error: invErr } = await (token
      ? baseQuery.eq("token", token)
      : baseQuery.eq("id", inviteId)
    ).maybeSingle();

    if (invErr) {
      return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });
    }
    if (!invite) {
      return NextResponse.json({ ok: false, error: "invite not found" }, { status: 404 });
    }

    const row = invite as {
      id: string;
      account_id: string;
      email: string;
      token: string;
      status: string;
      expires_at: string | null;
      can_manage_team: boolean;
    };

    if (row.status !== "pending") {
      return NextResponse.json(
        { ok: false, error: `invite is ${row.status}`, code: "INVITE_NOT_PENDING" },
        { status: 410 },
      );
    }
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { ok: false, error: "invite has expired", code: "INVITE_EXPIRED" },
        { status: 410 },
      );
    }

    const accessRes = await admin
      .from("account_invite_business_access")
      .select("business_id")
      .eq("invite_id", row.id);
    if (accessRes.error) {
      return NextResponse.json({ ok: false, error: accessRes.error.message }, { status: 500 });
    }
    const bizIds = (accessRes.data ?? []).map((r: { business_id: string }) => String(r.business_id));

    let businesses: Array<{ id: string; slug: string; name: string | null }> = [];
    if (bizIds.length > 0) {
      const bizRes = await admin
        .from("businesses")
        .select("id, slug, name")
        .in("id", bizIds);
      if (bizRes.error) {
        return NextResponse.json({ ok: false, error: bizRes.error.message }, { status: 500 });
      }
      businesses = (bizRes.data ?? []).map((b: { id: string; slug: string; name: string | null }) => ({
        id: String(b.id),
        slug: String(b.slug),
        name: b.name ? String(b.name) : null,
      }));
    }

    // Inspect the current user if a session is present — the landing page
    // needs to know whether to render "register + accept" vs "accept with
    // existing account".
    const supabase = await supabaseServer();
    const { data: sessionData } = await supabase.auth.getUser();
    const sessionUser = sessionData?.user ?? null;
    let currentUser:
      | { id: string; email: string | null; full_name: string | null; membershipsCount: number }
      | null = null;
    if (sessionUser) {
      const { count } = await admin
        .from("memberships")
        .select("business_id", { count: "exact", head: true })
        .eq("user_id", sessionUser.id);
      currentUser = {
        id: sessionUser.id,
        email: sessionUser.email ?? null,
        full_name: (sessionUser.user_metadata?.full_name as string | undefined) ?? null,
        membershipsCount: count ?? 0,
      };
    }

    return NextResponse.json({
      ok: true,
      invite: {
        id: row.id,
        email: row.email,
        can_manage_team: row.can_manage_team,
        expires_at: row.expires_at,
      },
      businesses,
      // First business used as primary display for backward compat with the
      // existing /invite UI.
      business: businesses[0] ?? null,
      currentUser,
      source: "account",
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
