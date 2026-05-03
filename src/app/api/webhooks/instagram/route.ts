import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";

/**
 * Instagram Direct Messaging — full pipeline:
 *
 *   GET  → Meta verification handshake (hub.challenge echo)
 *   POST → for each real text DM: Gemini reply → IG Graph API send
 *          (echoes, reads, deliveries, reactions are filtered out)
 *
 * We always ACK 200 once signature is valid, even if Gemini or the IG
 * send call fail — re-trying a failed Gemini call by way of Meta retry
 * spam is the wrong recovery path.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Env (trimmed defensively) ───────────────────────────────────────
const VERIFY_TOKEN = (process.env.VERIFY_TOKEN ?? "").trim();

// IG Login flow signs with the Instagram-specific App Secret, which is
// a different value from FACEBOOK_APP_SECRET (App Settings → Basic).
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

const IG_ACCESS_TOKEN = (process.env.IG_ACCESS_TOKEN ?? "").trim();
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY ?? "").trim();

// Gemini model + IG Graph API base. Both pinned so behaviour doesn't
// drift when Google or Meta ship breaking changes to "latest".
const GEMINI_MODEL = "gemini-2.5-flash";
const IG_GRAPH_BASE = "https://graph.instagram.com/v21.0";

// Max reply length we send to IG. IG message body cap is ~1000 chars.
const IG_REPLY_MAX_CHARS = 950;

const SYSTEM_PROMPT =
  "Ты — AI-менеджер по продажам для SaaS CRM-платформы Ordo. " +
  "Отвечай клиентам кратко (2–3 предложения), вежливо и по делу. " +
  "Помогай с вопросами по продукту, тарифам и интеграциям. " +
  "Если не знаешь ответ — честно скажи об этом и предложи связаться с поддержкой support@ordo.uno.";

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
  // Read RAW BYTES — req.text() round-trips through UTF-8 decode/encode
  // and can mutate non-canonical bytes, breaking HMAC silently.
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
    // Echoes, reads, deliveries, reactions, postbacks — anything that
    // isn't a fresh user-typed text. Acknowledged silently.
    console.log("[ig-webhook] no text events to handle");
    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  }

  // Process replies in parallel. Each one is independently caught so a
  // single Gemini/IG failure can't poison the others. Awaited so the
  // serverless container stays alive until all replies are sent;
  // typical end-to-end is 1.5–3s, well inside Meta's 20s window.
  await Promise.all(
    events.map((event) =>
      replyTo(event).catch((err) => {
        console.error(
          "[ig-webhook] reply pipeline failed",
          { senderId: event.senderId },
          err,
        );
      }),
    ),
  );

  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}

// ─── Webhook payload parsing ─────────────────────────────────────────

type TextMessageEvent = {
  senderId: string;
  text: string;
};

/**
 * Walk the IG webhook envelope and pull out only fresh, user-typed text
 * messages we should reply to. Filters out:
 *   - non-instagram envelopes (`object !== "instagram"`)
 *   - echoes (our own bot's outgoing messages, IG webhooks them back)
 *   - read receipts (`messaging[].read`)
 *   - delivery receipts (`messaging[].delivery`)
 *   - reactions (`messaging[].reaction`)
 *   - postbacks (`messaging[].postback`)
 *   - attachments without a text field (images, audio, stickers)
 */
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

      // Hard skip: anything that isn't a `message` payload.
      if ("read" in m) continue;
      if ("delivery" in m) continue;
      if ("reaction" in m) continue;
      if ("postback" in m) continue;

      const sender = isRecord(m.sender) ? m.sender : null;
      const senderId = typeof sender?.id === "string" ? sender.id : null;
      const message = isRecord(m.message) ? m.message : null;
      if (!senderId || !message) continue;

      // Skip echoes — our own bot's messages come back through the
      // webhook with is_echo=true. Replying to them = infinite loop.
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

// ─── Reply pipeline ──────────────────────────────────────────────────

async function replyTo(event: TextMessageEvent): Promise<void> {
  console.log("[ig-webhook] message in", {
    from: event.senderId,
    text: event.text,
  });

  const reply = await askGemini(event.text);
  console.log("[ig-webhook] gemini reply", { reply });

  await sendInstagramMessage(event.senderId, reply);
  console.log("[ig-webhook] reply sent", { to: event.senderId });
}

// ─── Gemini ──────────────────────────────────────────────────────────

async function askGemini(userMessage: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}` +
    `:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userMessage }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        // ~250 tokens leaves comfortable room under IG's char limit.
        maxOutputTokens: 250,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Gemini ${res.status} ${res.statusText}: ${errText.slice(0, 400)}`,
    );
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
    promptFeedback?: { blockReason?: string };
  };

  const blockReason = data.promptFeedback?.blockReason;
  if (blockReason) {
    throw new Error(`Gemini blocked: ${blockReason}`);
  }

  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => (typeof p.text === "string" ? p.text : ""))
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini returned empty response");
  }

  return text;
}

// ─── Instagram send ──────────────────────────────────────────────────

async function sendInstagramMessage(
  recipientPsid: string,
  text: string,
): Promise<void> {
  if (!IG_ACCESS_TOKEN) {
    throw new Error("IG_ACCESS_TOKEN not configured");
  }

  const trimmed = text.length > IG_REPLY_MAX_CHARS
    ? text.slice(0, IG_REPLY_MAX_CHARS - 1) + "…"
    : text;

  const url = `${IG_GRAPH_BASE}/me/messages?access_token=${encodeURIComponent(IG_ACCESS_TOKEN)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientPsid },
      message: { text: trimmed },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `IG send ${res.status} ${res.statusText}: ${errText.slice(0, 400)}`,
    );
  }
}
