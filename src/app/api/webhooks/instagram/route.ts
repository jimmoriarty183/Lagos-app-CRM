import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { processSalesMessage } from "@/lib/instagram/sales-bot";

/**
 * Instagram Direct Messaging webhook.
 *   GET  → Meta verification handshake
 *   POST → for each real text DM: Gemini reply (with catalog) → IG send
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VERIFY_TOKEN = (process.env.VERIFY_TOKEN ?? "").trim();
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
  // Read raw bytes — req.text() round-trips UTF-8 and can mutate
  // non-canonical bytes, breaking HMAC silently.
  const rawBuffer = Buffer.from(await req.arrayBuffer());

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

  let body: unknown;
  try {
    body = JSON.parse(rawBuffer.toString("utf8"));
  } catch (err) {
    console.warn("[ig-webhook] invalid JSON", err);
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const events = extractTextMessages(body);
  if (events.length === 0) {
    console.log("[ig-webhook] no text events to handle");
    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  }

  await Promise.all(
    events.map(async (event) => {
      try {
        console.log("[ig-webhook] message in", {
          from: event.senderId,
          text: event.text,
        });
        const result = await processSalesMessage(event.senderId, event.text);
        console.log("[ig-webhook] reply sent", {
          to: event.senderId,
          reply: result.reply,
        });
      } catch (err) {
        console.error(
          "[ig-webhook] reply pipeline failed",
          { senderId: event.senderId },
          err,
        );
      }
    }),
  );

  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}

// ─── Webhook payload parsing ─────────────────────────────────────────

type TextMessageEvent = { senderId: string; text: string };

function extractTextMessages(payload: unknown): TextMessageEvent[] {
  const out: TextMessageEvent[] = [];
  if (!isRecord(payload)) return out;
  if (payload.object !== "instagram") return out;
  const entries = payload.entry;
  if (!Array.isArray(entries)) return out;

  for (const entry of entries) {
    if (!isRecord(entry)) continue;
    const messaging = entry.messaging;
    if (!Array.isArray(messaging)) continue;

    for (const m of messaging) {
      if (!isRecord(m)) continue;
      if ("read" in m) continue;
      if ("delivery" in m) continue;
      if ("reaction" in m) continue;
      if ("postback" in m) continue;

      const sender = isRecord(m.sender) ? m.sender : null;
      const senderId = typeof sender?.id === "string" ? sender.id : null;
      const message = isRecord(m.message) ? m.message : null;
      if (!senderId || !message) continue;
      if (message.is_echo === true) continue;

      const text = typeof message.text === "string" ? message.text.trim() : "";
      if (!text) continue;

      out.push({ senderId, text });
    }
  }

  return out;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
