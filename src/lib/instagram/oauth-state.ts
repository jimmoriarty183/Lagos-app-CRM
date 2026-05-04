import crypto from "node:crypto";

/**
 * CSRF-protected state for Instagram OAuth round-trip.
 * Encoded as base64url(JSON).hex(HMAC) — like a tiny JWT, signed
 * with INSTAGRAM_APP_SECRET so a leaked redirect URL can't be replayed.
 */

const COOKIE_NAME = "ig_oauth_state";
const COOKIE_TTL_MS = 10 * 60 * 1000;

type StatePayload = {
  nonce: string;
  business_id: string;
  exp: number;
};

function getSecret(): string {
  const secret = (
    process.env.INSTAGRAM_APP_SECRET ??
    process.env.FACEBOOK_APP_SECRET ??
    ""
  ).trim();
  if (!secret) {
    throw new Error(
      "INSTAGRAM_APP_SECRET (or FACEBOOK_APP_SECRET) must be set to sign OAuth state.",
    );
  }
  return secret;
}

function base64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function fromBase64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function createOAuthState(businessId: string): {
  token: string;
  cookieName: string;
  cookieMaxAgeSec: number;
} {
  const payload: StatePayload = {
    nonce: crypto.randomBytes(16).toString("hex"),
    business_id: businessId,
    exp: Date.now() + COOKIE_TTL_MS,
  };
  const payloadB64 = base64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = crypto
    .createHmac("sha256", getSecret())
    .update(payloadB64)
    .digest("hex");
  return {
    token: `${payloadB64}.${sig}`,
    cookieName: COOKIE_NAME,
    cookieMaxAgeSec: COOKIE_TTL_MS / 1000,
  };
}

export function verifyOAuthState(
  token: string | undefined,
): { ok: true; businessId: string } | { ok: false; reason: string } {
  if (!token || !token.includes(".")) {
    return { ok: false, reason: "missing_or_malformed" };
  }
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return { ok: false, reason: "malformed" };

  const expected = crypto
    .createHmac("sha256", getSecret())
    .update(payloadB64)
    .digest("hex");

  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad_signature" };
  }

  let payload: StatePayload;
  try {
    payload = JSON.parse(fromBase64url(payloadB64).toString("utf8"));
  } catch {
    return { ok: false, reason: "bad_payload" };
  }

  if (typeof payload.exp !== "number" || payload.exp < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  if (typeof payload.business_id !== "string" || !payload.business_id) {
    return { ok: false, reason: "missing_business_id" };
  }

  return { ok: true, businessId: payload.business_id };
}

export const IG_OAUTH_STATE_COOKIE = COOKIE_NAME;
