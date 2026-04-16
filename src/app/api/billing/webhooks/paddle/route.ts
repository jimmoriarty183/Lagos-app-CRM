import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyPaddleWebhookSignature } from "@/lib/billing/paddle-signature";
import {
  insertWebhookEvent,
  normalizePaddleWebhookEvent,
  processWebhookEventRow,
} from "@/lib/billing/webhooks";
import { billingLog, formatErrorForLog } from "@/lib/billing/logging";

function collectPaddleEnvWarnings() {
  const warnings: string[] = [];
  const apiKey = String(process.env.PADDLE_API_KEY ?? "").trim().toLowerCase();
  const clientToken = String(process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? "")
    .trim()
    .toLowerCase();
  const frontendEnvironment = String(process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT ?? "")
    .trim()
    .toLowerCase();

  const apiLive = apiKey.startsWith("pdl_live_");
  const apiTest = apiKey.startsWith("pdl_test_");
  const tokenLive = clientToken.startsWith("live_");
  const tokenTest = clientToken.startsWith("test_");

  if (apiLive && tokenTest) {
    warnings.push("PADDLE_API_KEY is live but NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is test");
  }
  if (apiTest && tokenLive) {
    warnings.push("PADDLE_API_KEY is test but NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is live");
  }
  if (frontendEnvironment === "production" && tokenTest) {
    warnings.push("NEXT_PUBLIC_PADDLE_ENVIRONMENT=production but client token is test_*");
  }
  if ((frontendEnvironment === "sandbox" || frontendEnvironment === "test") && tokenLive) {
    warnings.push("NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox but client token is live_*");
  }

  return warnings;
}

export async function POST(req: Request) {
  const admin = supabaseAdmin();

  try {
    const envWarnings = collectPaddleEnvWarnings();
    if (envWarnings.length > 0) {
      billingLog("warn", "webhook.env_mismatch", {
        warnings: envWarnings,
        appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
      });
    }

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
      billingLog("error", "webhook.parse_failed", formatErrorForLog(parseError));
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
      occurredAt: normalized.occurredAt,
      payload,
    });

    if (!inserted.created || !inserted.event) {
      billingLog("info", "webhook.duplicate", {
        provider: "paddle",
        provider_event_id: normalized.externalEventId,
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
    const errorDetails = formatErrorForLog(error);
    billingLog("error", "webhook.fatal", errorDetails);
    return NextResponse.json(
      { error: errorDetails.errorMessage || "Webhook processing failed" },
      { status: 500 },
    );
  }
}

