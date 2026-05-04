import crypto from "node:crypto";

/**
 * Meta's signed_request format used by Deauthorize and Data Deletion
 * callbacks. POST body is `signed_request=<sig>.<payload>` where both
 * halves are base64url, and the signature is HMAC-SHA256(payload, app_secret).
 *
 * https://developers.facebook.com/docs/facebook-login/guides/advanced/data-deletion-callback
 */

export type SignedRequestPayload = {
  algorithm?: string;
  user_id?: string;
  issued_at?: number;
  // Some flavors include more fields; we don't rely on them.
  [k: string]: unknown;
};

function base64urlToBuf(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function getAppSecret(): string {
  const s = (
    process.env.INSTAGRAM_APP_SECRET ??
    process.env.FACEBOOK_APP_SECRET ??
    ""
  ).trim();
  if (!s) {
    throw new Error(
      "INSTAGRAM_APP_SECRET (or FACEBOOK_APP_SECRET) required to verify signed_request",
    );
  }
  return s;
}

export function parseAndVerifySignedRequest(
  signedRequest: string,
):
  | { ok: true; payload: SignedRequestPayload; userId: string }
  | { ok: false; reason: string } {
  if (!signedRequest || !signedRequest.includes(".")) {
    return { ok: false, reason: "malformed" };
  }
  const [encSig, encPayload] = signedRequest.split(".");
  if (!encSig || !encPayload) return { ok: false, reason: "malformed" };

  let secret: string;
  try {
    secret = getAppSecret();
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(encPayload)
    .digest();
  const got = base64urlToBuf(encSig);
  if (
    expected.length !== got.length ||
    !crypto.timingSafeEqual(expected, got)
  ) {
    return { ok: false, reason: "bad_signature" };
  }

  let payload: SignedRequestPayload;
  try {
    payload = JSON.parse(base64urlToBuf(encPayload).toString("utf8"));
  } catch {
    return { ok: false, reason: "bad_payload_json" };
  }

  if (payload.algorithm && payload.algorithm !== "HMAC-SHA256") {
    return { ok: false, reason: "unsupported_algorithm" };
  }

  const userId =
    typeof payload.user_id === "string" && payload.user_id
      ? payload.user_id
      : "";
  if (!userId) return { ok: false, reason: "missing_user_id" };

  return { ok: true, payload, userId };
}
