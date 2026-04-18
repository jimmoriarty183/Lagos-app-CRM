import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type BusinessRef = { id: string; slug: string; name: string | null };

export async function GET() {
  try {
    const supabase = await supabaseServer();
    const admin = supabaseAdmin();

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    const user = authData?.user;

    if (authErr || !user?.email) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const email = String(user.email).trim().toLowerCase();

    // Legacy per-business invites.
    const legacyRes = await admin
      .from("business_invites")
      .select("id,business_id,email,role,status,created_at")
      .ilike("email", email)
      .eq("role", "MANAGER")
      .eq("status", "PENDING")
      .order("created_at", { ascending: false });

    if (legacyRes.error) {
      return NextResponse.json({ ok: false, error: legacyRes.error.message }, { status: 500 });
    }

    // New account-level invites (multi-business).
    const accountRes = await admin
      .from("account_invites")
      .select("id, account_id, email, can_manage_team, created_at, expires_at")
      .ilike("email", email)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (accountRes.error) {
      return NextResponse.json({ ok: false, error: accountRes.error.message }, { status: 500 });
    }

    const legacy = (legacyRes.data ?? []) as Array<{
      id: string;
      business_id: string;
      email: string;
      role: string;
      status: string;
      created_at: string | null;
    }>;

    const accountInvites = (accountRes.data ?? []) as Array<{
      id: string;
      account_id: string;
      email: string;
      can_manage_team: boolean;
      created_at: string | null;
      expires_at: string | null;
    }>;

    const legacyBusinessIds = Array.from(
      new Set(legacy.map((r) => String(r.business_id ?? "")).filter(Boolean)),
    );

    let accountAccessByInvite = new Map<string, string[]>();
    if (accountInvites.length > 0) {
      const accessRes = await admin
        .from("account_invite_business_access")
        .select("invite_id, business_id")
        .in("invite_id", accountInvites.map((i) => i.id));
      if (accessRes.error) {
        return NextResponse.json({ ok: false, error: accessRes.error.message }, { status: 500 });
      }
      for (const row of (accessRes.data ?? []) as Array<{ invite_id: string; business_id: string }>) {
        const arr = accountAccessByInvite.get(row.invite_id) ?? [];
        arr.push(String(row.business_id));
        accountAccessByInvite.set(row.invite_id, arr);
      }
    }

    const allBusinessIds = new Set<string>([
      ...legacyBusinessIds,
      ...Array.from(accountAccessByInvite.values()).flat(),
    ]);

    let businessesById = new Map<string, BusinessRef>();
    if (allBusinessIds.size > 0) {
      const businessesRes = await admin
        .from("businesses")
        .select("id,slug,name")
        .in("id", Array.from(allBusinessIds));

      if (businessesRes.error) {
        return NextResponse.json({ ok: false, error: businessesRes.error.message }, { status: 500 });
      }

      businessesById = new Map(
        ((businessesRes.data ?? []) as Array<{ id: string; slug: string; name: string | null }>)
          .filter((b) => b.id && b.slug)
          .map((b) => [
            String(b.id),
            { id: String(b.id), slug: String(b.slug), name: b.name ? String(b.name) : null },
          ]),
      );
    }

    const legacyMapped = legacy
      .map((invite) => {
        const business = businessesById.get(String(invite.business_id ?? ""));
        if (!business) return null;
        return {
          id: String(invite.id),
          business_id: String(invite.business_id),
          email: String(invite.email),
          role: String(invite.role),
          status: String(invite.status),
          created_at: invite.created_at ? String(invite.created_at) : null,
          business,
          source: "legacy" as const,
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    const accountMapped = accountInvites
      .map((invite) => {
        const bizIds = accountAccessByInvite.get(invite.id) ?? [];
        const businesses = bizIds
          .map((id) => businessesById.get(id))
          .filter((b): b is BusinessRef => Boolean(b));
        if (businesses.length === 0) return null;
        // Use the first business as the `business` field for backward compat
        // with the existing UI; the full list is in `businesses`.
        return {
          id: String(invite.id),
          business_id: businesses[0].id,
          email: String(invite.email),
          role: "MANAGER",
          status: "PENDING",
          created_at: invite.created_at ? String(invite.created_at) : null,
          business: businesses[0],
          businesses,
          can_manage_team: Boolean(invite.can_manage_team),
          expires_at: invite.expires_at ? String(invite.expires_at) : null,
          source: "account" as const,
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    return NextResponse.json({
      ok: true,
      invites: [...accountMapped, ...legacyMapped],
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
