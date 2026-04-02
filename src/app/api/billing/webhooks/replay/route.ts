import { NextResponse } from "next/server";
import { requireJobSecret } from "@/lib/billing/auth";
import { replayWebhookEventById } from "@/lib/billing/webhooks";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const auth = requireJobSecret(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = (await req.json()) as { event_id?: string };
    const eventId = String(body.event_id ?? "").trim();
    if (!eventId) {
      return NextResponse.json({ error: "event_id is required" }, { status: 400 });
    }

    await replayWebhookEventById(supabaseAdmin(), eventId);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Replay failed" },
      { status: 500 },
    );
  }
}

