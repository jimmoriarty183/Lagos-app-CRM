import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

    const { data: invites, error: inviteErr } = await admin
      .from("business_invites")
      .select("id,business_id,email,role,status,created_at")
      .ilike("email", email)
      .eq("role", "MANAGER")
      .eq("status", "PENDING")
      .order("created_at", { ascending: false });

    if (inviteErr) {
      return NextResponse.json({ ok: false, error: inviteErr.message }, { status: 500 });
    }

    const businessIds = Array.from(
      new Set((invites ?? []).map((invite) => String(invite.business_id ?? "")).filter(Boolean)),
    );

    let businessesById = new Map<string, { id: string; slug: string; name: string | null }>();
    if (businessIds.length > 0) {
      const { data: businesses, error: businessErr } = await admin
        .from("businesses")
        .select("id,slug,name")
        .in("id", businessIds);

      if (businessErr) {
        return NextResponse.json({ ok: false, error: businessErr.message }, { status: 500 });
      }

      businessesById = new Map(
        (businesses ?? [])
          .filter((business) => business?.id && business?.slug)
          .map((business) => [
            String(business.id),
            {
              id: String(business.id),
              slug: String(business.slug),
              name: business.name ? String(business.name) : null,
            },
          ]),
      );
    }

    return NextResponse.json({
      ok: true,
      invites: (invites ?? [])
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
          };
        })
        .filter(Boolean),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unexpected error" },
      { status: 500 },
    );
  }
}
