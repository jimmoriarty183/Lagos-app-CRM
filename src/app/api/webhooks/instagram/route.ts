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
 *    `x-hub-signature-256`. We verify it over the RAW bytes Meta sent,
 *    log the payload, and ACK 200 within Meta's 20-second window.
 */

// Force Node runtime — we use the `crypto` module + Buffer for signature
// checks, neither of which is available on the Edge runtime.
export const runtime = "nodejs";
// Webhooks are dynamic by definition; never cache.
export const dynamic = "force-dynamic";

// Trim env vars defensively — pasting via Vercel UI sometimes adds a
// trailing newline or surrounding quotes that break HMAC silently.
const VERIFY_TOKEN = (process.env.VERIFY_TOKEN ?? "").trim();

// Instagram Graph API (Instagram Login flow, 2024+) signs webhooks with
// the *Instagram* App Secret, which is a SEPARATE value from the main
// Facebook App Secret. It lives at:
//   Meta App Dashboard → Instagram → API Setup with Instagram Login
//                       → "Instagram App Secret"
// FACEBOOK_APP_SECRET (App Settings → Basic) is for Messenger / FB Login
// flows and will produce the wrong HMAC for IG events.
//
// Prefer the Instagram-specific secret; fall back to Facebook's only so
// older deployments keep working without a forced env rename.
const APP_SECRET = (
  process.env.INSTAGRAM_APP_SECRET ??
  process.env.FACEBOOK_APP_SECRET ??
  ""
).trim();
const APP_SECRET_SOURCE = process.env.INSTAGRAM_APP_SECRET
  ? "INSTAGRAM_APP_SECRET"
  : process.env.FACEBOOK_APP_SECRET
    ? "FACEBOOK_APP_SECRET"
    : "none";

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
  // Read RAW BYTES, not text. req.text() decodes via UTF-8 and would
  // re-encode on .update(), which can mutate any non-canonical bytes
  // (rare but real cause of HMAC mismatches). arrayBuffer keeps the
  // exact bytes Meta signed.
  const rawBuffer = Buffer.from(await req.arrayBuffer());

  // Verify Meta's HMAC signature. Skipped only if APP_SECRET isn't
  // configured (e.g. local dev) — production must enforce.
  const signature = req.headers.get("x-hub-signature-256");
  if (APP_SECRET) {
    if (!signature) {
      console.warn("[ig-webhook] missing x-hub-signature-256 header");
      return new NextResponse("Missing signature", { status: 401 });
    }

    const expected =
      "sha256=" +
      crypto
        .createHmac("sha256", APP_SECRET)
        .update(rawBuffer)
        .digest("hex");

    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    const lengthsMatch = a.length === b.length;
    const valid = lengthsMatch && crypto.timingSafeEqual(a, b);

    if (!valid) {
      // Diagnostic — neither value is a secret (both are HMAC outputs),
      // so safe to log. Lets us tell from Vercel Runtime Logs whether
      // the issue is APP_SECRET (lengths match, values differ) vs body
      // mutation (lengths differ).
      console.warn("[ig-webhook] invalid signature", {
        receivedSignature: signature,
        expectedSignature: expected,
        bodyByteLength: rawBuffer.length,
        appSecretSource: APP_SECRET_SOURCE,
        appSecretLength: APP_SECRET.length,
        lengthsMatch,
      });
      return new NextResponse("Invalid signature", { status: 401 });
    }
  }

  // Parse AFTER signature check, never before.
  let body: unknown;
  try {
    body = JSON.parse(rawBuffer.toString("utf8"));
  } catch (err) {
    console.warn("[ig-webhook] invalid JSON", err);
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  console.log("--- ВХОДЯЩИЙ ВЕБХУК ---", JSON.stringify(body, null, 2));

  // ACK quickly — Meta retries with exponential backoff if we don't
  // 200 within ~20 seconds. Once Gemini is wired in the next commit,
  // it goes here as fire-and-forget AFTER this return.
  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}
