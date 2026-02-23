import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { business_id, manager_user_id } = await req.json();

  if (!business_id || !manager_user_id) {
    return NextResponse.json({ error: "business_id and manager_user_id required" }, { status: 400 });
  }

  // Remove membership = забрать доступ
  const { error } = await supabase
    .from("business_memberships")
    .delete()
    .eq("business_id", business_id)
    .eq("user_id", manager_user_id)
    .eq("role", "MANAGER");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Optionally revoke pending invites
  await supabase
    .from("business_invites")
    .update({ status: "REVOKED" })
    .eq("business_id", business_id)
    .eq("role", "MANAGER")
    .eq("status", "PENDING");

  return NextResponse.json({ ok: true });
}