import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

type InviteBusiness = {
  id: string;
  slug: string;
  name: string | null;
};

type InboxInvite = {
  id: string;
  business_id: string;
  created_at: string | null;
  business: InviteBusiness;
};

type InboxFollowUp = {
  id: string;
  title: string;
  due_date: string;
  order_id: string | null;
  created_at: string | null;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = String(searchParams.get("businessId") ?? "").trim();
    const today = String(searchParams.get("today") ?? "").trim();

    if (!businessId) {
      return NextResponse.json({ ok: false, error: "businessId required" }, { status: 400 });
    }

    if (!today) {
      return NextResponse.json({ ok: false, error: "today required" }, { status: 400 });
    }

    const supabase = await supabaseServer();
    const admin = supabaseAdmin();

    const { data: authData, error: authError } = await supabase.auth.getUser();
    const user = authData?.user;

    if (authError || !user?.id || !user.email) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const email = String(user.email).trim().toLowerCase();

    const [invitesResult, followUpsResult] = await Promise.all([
      admin
        .from("business_invites")
        .select("id,business_id,email,role,status,created_at")
        .ilike("email", email)
        .eq("role", "MANAGER")
        .eq("status", "PENDING")
        .order("created_at", { ascending: false }),
      admin
        .from("follow_ups")
        .select("id,title,due_date,order_id,created_at")
        .eq("business_id", businessId)
        .eq("status", "open")
        .lte("due_date", today)
        .order("due_date", { ascending: true })
        .order("created_at", { ascending: false }),
    ]);

    if (invitesResult.error) {
      return NextResponse.json({ ok: false, error: invitesResult.error.message }, { status: 500 });
    }

    if (followUpsResult.error) {
      return NextResponse.json({ ok: false, error: followUpsResult.error.message }, { status: 500 });
    }

    const businessIds = Array.from(
      new Set((invitesResult.data ?? []).map((invite) => String(invite.business_id ?? "")).filter(Boolean)),
    );

    let businessesById = new Map<string, InviteBusiness>();
    if (businessIds.length > 0) {
      const { data: businesses, error: businessesError } = await admin
        .from("businesses")
        .select("id,slug,name")
        .in("id", businessIds);

      if (businessesError) {
        return NextResponse.json({ ok: false, error: businessesError.message }, { status: 500 });
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

    const invites: InboxInvite[] = (invitesResult.data ?? [])
      .map((invite) => {
        const business = businessesById.get(String(invite.business_id ?? ""));
        if (!business) return null;

        return {
          id: String(invite.id),
          business_id: String(invite.business_id),
          created_at: invite.created_at ? String(invite.created_at) : null,
          business,
        };
      })
      .filter((invite): invite is InboxInvite => Boolean(invite));

    const followUps: InboxFollowUp[] = (followUpsResult.data ?? []).map((followUp) => ({
      id: String(followUp.id),
      title: String(followUp.title ?? ""),
      due_date: String(followUp.due_date ?? ""),
      order_id: followUp.order_id ? String(followUp.order_id) : null,
      created_at: followUp.created_at ? String(followUp.created_at) : null,
    }));

    return NextResponse.json({
      ok: true,
      invites,
      followUps,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
