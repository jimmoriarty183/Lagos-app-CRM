import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = (searchParams.get("business_id") || "").trim();

    if (!businessId) {
      return NextResponse.json(
        { ok: false, error: "business_id required" },
        { status: 400 },
      );
    }

    const supabase = await supabaseServer();

    // Find OWNER membership, then join profile
    const { data, error } = await supabase
      .from("memberships")
      .select("user_id, role, profiles:profiles(id, full_name, email)")
      .eq("business_id", businessId)
      .eq("role", "OWNER")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    const owner = data?.profiles ?? null;

    return NextResponse.json({ ok: true, owner });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 },
    );
  }
}