import { NextResponse } from "next/server";
import { isDemoEmail } from "@/lib/billing/demo";
import { supabaseServerReadOnly } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = await supabaseServerReadOnly();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      return NextResponse.json(
        { authenticated: false, isDemo: false, userId: null, hasBusiness: false },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const userId = data.user.id;
    let hasBusiness = false;
    const { data: membershipRow } = await supabase
      .from("memberships")
      .select("business_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    hasBusiness = Boolean(membershipRow?.business_id);

    return NextResponse.json(
      {
        authenticated: true,
        email: data.user.email ?? null,
        userId,
        hasBusiness,
        // Mirror server-side `isDemoEmail` so client gates can refuse Paddle
        // checkouts for the shared demo account without a second round-trip.
        isDemo: isDemoEmail(data.user.email),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { authenticated: false, isDemo: false, userId: null, hasBusiness: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
