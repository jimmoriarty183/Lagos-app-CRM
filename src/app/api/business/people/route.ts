import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId") || "";
    if (!businessId) {
      return NextResponse.json({ ok: false, error: "businessId required" }, { status: 400 });
    }

    const supabase = await supabaseServer();

    // memberships -> profiles (owner + manager)
    const { data, error } = await supabase
      .from("memberships")
      .select("role, user_id, profiles:profiles(id, full_name, email)")
      .eq("business_id", businessId)
      .in("role", ["OWNER", "MANAGER"]);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    const owner = data?.find((x: any) => x.role === "OWNER")?.profiles ?? null;
    const manager = data?.find((x: any) => x.role === "MANAGER")?.profiles ?? null;

    return NextResponse.json({ ok: true, owner, manager });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}