import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  sendAccountInviteEmail,
  inferBaseUrl,
} from "@/lib/invites/send-account-invite-email";
import { resolveUserDisplay } from "@/lib/user-display";

function clean(v: unknown) {
  return String(v ?? "").trim();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      accountId?: string;
      email?: string;
      businessIds?: string[];
      canManageTeam?: boolean;
    };

    const accountId = clean(body.accountId);
    const email = clean(body.email).toLowerCase();
    const businessIds = Array.isArray(body.businessIds) ? body.businessIds.map(clean).filter(Boolean) : [];
    const canManageTeam = Boolean(body.canManageTeam);

    if (!accountId) {
      return NextResponse.json({ ok: false, error: "accountId is required" }, { status: 400 });
    }
    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "valid email is required" }, { status: 400 });
    }
    if (businessIds.length === 0) {
      return NextResponse.json({ ok: false, error: "at least one business must be selected" }, { status: 400 });
    }

    const supabase = await supabaseServer();
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const user = userData?.user;
    if (userErr || !user) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const admin = supabaseAdmin();

    const { data, error } = await admin.rpc("create_or_update_account_invite", {
      p_actor_user_id: user.id,
      p_account_id: accountId,
      p_email: email,
      p_business_ids: businessIds,
      p_can_manage_team: canManageTeam,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row || row.ok === false) {
      return NextResponse.json(
        {
          ok: false,
          error: row?.error_message || "Could not create invite",
          code: row?.error_code || "UNKNOWN",
          currentUsage: row?.current_usage ?? null,
          limitValue: row?.limit_value ?? null,
        },
        { status: row?.error_code === "FORBIDDEN" ? 403 : row?.error_code === "SEAT_LIMIT_REACHED" ? 402 : 400 },
      );
    }

    // Only send email for a fresh invite / invite update. For
    // `added_memberships` (existing team member added to another business) the
    // recipient already has access so no email is needed.
    let emailResult: { sent: boolean; existingUser: boolean; reason?: string } = {
      sent: false,
      existingUser: false,
    };
    if ((row.action === "invited" || row.action === "updated_invite") && row.token) {
      try {
        const bizRes = await admin
          .from("businesses")
          .select("name, slug")
          .in("id", businessIds);
        const businessNames = (bizRes.data ?? [])
          .map((b: { name: string | null; slug: string }) =>
            (b.name && String(b.name).trim()) || String(b.slug),
          )
          .filter(Boolean);

        const profileRes = await admin
          .from("profiles")
          .select("first_name, last_name, full_name, email")
          .eq("id", user.id)
          .maybeSingle();
        const profile = profileRes.data as
          | { first_name?: string | null; last_name?: string | null; full_name?: string | null; email?: string | null }
          | null;
        const invitedByLabel = profile
          ? resolveUserDisplay({
              full_name: profile.full_name ?? null,
              first_name: profile.first_name ?? null,
              last_name: profile.last_name ?? null,
              email: profile.email ?? user.email ?? null,
            }).primary
          : String(user.email ?? "").trim() || null;

        emailResult = await sendAccountInviteEmail({
          admin,
          email,
          token: String(row.token),
          inviteId: String(row.invite_id),
          baseUrl: inferBaseUrl(req),
          businessNames,
          invitedByLabel,
        });
      } catch (err) {
        emailResult = {
          sent: false,
          existingUser: false,
          reason: err instanceof Error ? err.message : "email send failed",
        };
      }
    }

    return NextResponse.json({
      ok: true,
      inviteId: row.invite_id,
      token: row.token,
      action: row.action,
      currentUsage: row.current_usage,
      limitValue: row.limit_value,
      emailSent: emailResult.sent,
      existingUser: emailResult.existingUser,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
