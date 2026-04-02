import { NextResponse } from "next/server";
import { requireJobSecret } from "@/lib/billing/auth";
import { expireOverrides } from "@/lib/billing/overrides";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const auth = requireJobSecret(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const expired = await expireOverrides(supabaseAdmin());
    return NextResponse.json({ ok: true, expired });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Expire overrides job failed" },
      { status: 500 },
    );
  }
}

