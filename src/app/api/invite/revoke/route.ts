import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { inviteId } = body as { inviteId?: string };

  if (!inviteId) return NextResponse.json({ error: "inviteId required" }, { status: 400 });

  const supabase = await supabaseServer();

  const { error } = await supabase
    .from("business_invites")
    .update({ status: "REVOKED" })
    .eq("id", inviteId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}