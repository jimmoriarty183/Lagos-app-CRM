import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyPaddleWebhookSignature } from "@/lib/billing/paddle-signature";
import {
  insertWebhookEvent,
  normalizePaddleWebhookEvent,
  processWebhookEventRow,
} from "@/lib/billing/webhooks";
import { billingLog } from "@/lib/billing/logging";

export async function POST(req: Request) {
  const admin = supabaseAdmin();

  try {
    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET || "";
    if (!webhookSecret) {
      return NextResponse.json(
        { error: "Missing PADDLE_WEBHOOK_SECRET" },
        { status: 500 },
      );
    }

    const rawBody = await req.text();
    const signatureHeader = req.headers.get("paddle-signature");
    const isVerified = verifyPaddleWebhookSignature({
      rawBody,
      signatureHeader,
      webhookSecret,
    });
    if (!isVerified) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const normalized = normalizePaddleWebhookEvent(payload);
    if (!normalized.externalEventId) {
      return NextResponse.json({ error: "Missing event_id" }, { status: 400 });
    }

    const inserted = await insertWebhookEvent(admin, {
      provider: "paddle",
      externalEventId: normalized.externalEventId,
      eventType: normalized.eventType,
      payload,
      relatedAccountId: normalized.accountId,
    });

    if (!inserted.created || !inserted.event) {
      billingLog("info", "webhook.duplicate", {
        provider: "paddle",
        external_event_id: normalized.externalEventId,
      });
      return NextResponse.json({ ok: true, duplicate: true });
    }

    await processWebhookEventRow(admin, inserted.event);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    billingLog("error", "webhook.fatal", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed" },
      { status: 500 },
    );
  }
}

