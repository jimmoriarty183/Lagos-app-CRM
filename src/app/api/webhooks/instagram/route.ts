import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";

/**
 * Instagram Graph API webhook receiver.
 *
 * Meta hits this endpoint twice in normal life:
 *
 * 1. GET — verification handshake (one-off, when you save a Callback URL
 *    in the Meta App dashboard). Meta sends ?hub.mode=subscribe
 *    &hub.verify_token=<our token>&hub.challenge=<random string>. If
 *    the token matches what we stored in env, we echo back the challenge
 *    as plain text with 200. Anything else → 403.
 *
 * 2. POST — incoming events (DMs, mentions, comments). Meta signs the
 *    body with HMAC-SHA256 using FACEBOOK_APP_SECRET; signature is in
 *    `x-hub-signature-256`. We verify it, log the payload, and ACK 200
 *    within Meta's 20-second window. Heavy work (Gemini reply) goes in
 *    a follow-up commit — this file is intentionally minimal so Meta
 *    can subscribe right now.
 */

// Force Node runtime — we use the `crypto` module for signature checks,
// which isn't available on the Edge runtime.
export const runtime = "nodejs";
// Webhooks are dynamic by definition; never cache.
export const dynamic = "force-dynamic";

const VERIFY_TOKEN = process.env.VERIFY_TOKEN ?? "";
const APP_SECRET = process.env.FACEBOOK_APP_SECRET ?? "";

// ─── GET: Meta verification handshake ────────────────────────────────
export function GET(req: NextRequest) {
  if (!VERIFY_TOKEN) {
    console.error("[ig-webhook] VERIFY_TOKEN not configured");
    return new NextResponse("Server misconfigured", { status: 500 });
  }

  const sp = req.nextUrl.searchParams;
  const mode = sp.get("hub.mode");
  const token = sp.get("hub.verify_token");
  const challenge = sp.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    console.log("[ig-webhook] verification ok");
    // Meta wants the raw challenge as text/plain.
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  console.warn("[ig-webhook] verification failed", {
    mode,
    tokenMatches: token === VERIFY_TOKEN,
    challengePresent: Boolean(challenge),
  });
  return new NextResponse("Forbidden", { status: 403 });
}

// ─── POST: incoming events ───────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Read raw body BEFORE parsing — signature is computed over the raw
  // bytes, so json-parsing first would invalidate the check.
  const rawBody = await req.text();

  // Verify Meta's HMAC signature. We require it in production but
  // tolerate its absence in dev so local ngrok testing without an app
  // secret still works. If you set APP_SECRET, this is enforced.
  const signature = req.headers.get("x-hub-signature-256");
  if (APP_SECRET) {
    if (!signature) {
      console.warn("[ig-webhook] missing x-hub-signature-256");
      return new NextResponse("Missing signature", { status: 401 });
    }
    const expected =
      "sha256=" +
      crypto.createHmac("sha256", APP_SECRET).update(rawBody).digest("hex");
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    const valid = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!valid) {
      console.warn("[ig-webhook] invalid signature");
      return new NextResponse("Invalid signature", { status: 401 });
    }
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  // Log the whole envelope so we can see what Meta sends. Once Gemini
  // is wired up, the per-message extraction and reply dispatch will
  // happen here (fire-and-forget — return 200 first, do work after).
  console.log(
    "[ig-webhook] event:",
    JSON.stringify(payload, null, 2).slice(0, 4000),
  );

  // ACK quickly — Meta retries with backoff if we don't 200 in time.
  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}
