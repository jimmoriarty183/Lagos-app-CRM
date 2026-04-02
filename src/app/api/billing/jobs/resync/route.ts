import { NextResponse } from "next/server";
import { requireJobSecret } from "@/lib/billing/auth";
import { resyncSubscriptions } from "@/lib/billing/paddle-service";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const auth = requireJobSecret(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = (await req.json().catch(() => ({}))) as { limit?: number };
    const limit = Number.isFinite(body.limit) ? Math.max(1, Number(body.limit)) : 100;

    const result = await resyncSubscriptions(supabaseAdmin(), limit);
    return NextResponse.json({ ok: true, ...result });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Resync job failed" },
      { status: 500 },
    );
  }
}

