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
      billingLog("error", "webhook.no_secret", {});
      return NextResponse.json(
        { error: "Missing PADDLE_WEBHOOK_SECRET" },
        { status: 500 },
      );
    }

    const rawBody = await req.text();
    billingLog("debug", "webhook.received", {
      bodyLength: rawBody.length,
      contentType: req.headers.get("content-type"),
      hasSignature: !!req.headers.get("paddle-signature"),
    });

    const signatureHeader = req.headers.get("paddle-signature");
    const isVerified = verifyPaddleWebhookSignature({
      rawBody,
      signatureHeader,
      webhookSecret,
    });
    if (!isVerified) {
      billingLog("error", "webhook.signature_invalid", {
        signatureHeaderPresent: !!signatureHeader,
      });
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch (parseError) {
      billingLog("error", "webhook.parse_failed", {
        error: parseError instanceof Error ? parseError.message : "Unknown parse error",
      });
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    billingLog("debug", "webhook.parsed", {
      event_type: payload.event_type,
      event_id: payload.event_id,
      hasData: !!payload.data,
    });

    const normalized = normalizePaddleWebhookEvent(payload);
    if (!normalized.externalEventId) {
      billingLog("error", "webhook.no_event_id", { payload });
      return NextResponse.json({ error: "Missing event_id" }, { status: 400 });
    }

    billingLog("debug", "webhook.normalized", {
      eventType: normalized.eventType,
      externalEventId: normalized.externalEventId,
      accountId: normalized.accountId,
      ownerUserId: normalized.ownerUserId,
    });

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

    billingLog("debug", "webhook.stored", {
      eventRowId: inserted.event.id,
      externalEventId: normalized.externalEventId,
    });

    await processWebhookEventRow(admin, inserted.event);
    billingLog("info", "webhook.processed", {
      eventRowId: inserted.event.id,
      externalEventId: normalized.externalEventId,
    });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    billingLog("error", "webhook.fatal", {
      error: errorMessage,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      stack: errorStack,
    });
    return NextResponse.json(
      { error: errorMessage || "Webhook processing failed" },
      { status: 500 },
    );
  }
}

