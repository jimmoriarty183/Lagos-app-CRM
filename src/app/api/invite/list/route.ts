import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "businessId required" }, { status: 400 });

  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("business_invites")
    .select("id,email,status,created_at,expires_at")
    .eq("business_id", businessId)
    .in("status", ["PENDING"])
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, invites: data ?? [] });
}