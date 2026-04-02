import crypto from "node:crypto";

type SignatureParts = {
  ts: string;
  h1: string[];
};

function parsePaddleSignature(header: string): SignatureParts | null {
  const parts = header
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);

  const parsed: SignatureParts = { ts: "", h1: [] };
  for (const part of parts) {
    const [key, value] = part.split("=", 2);
    if (!key || !value) continue;
    if (key === "ts") parsed.ts = value;
    if (key === "h1") parsed.h1.push(value);
  }

  if (!parsed.ts || parsed.h1.length === 0) return null;
  return parsed;
}

function timingSafeHexEquals(a: string, b: string) {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function verifyPaddleWebhookSignature(input: {
  rawBody: string;
  signatureHeader: string | null;
  webhookSecret: string;
  toleranceSeconds?: number;
}) {
  if (!input.signatureHeader) return false;
  const parsed = parsePaddleSignature(input.signatureHeader);
  if (!parsed) return false;

  const tolerance = input.toleranceSeconds ?? 300;
  const timestampSec = Number(parsed.ts);
  if (!Number.isFinite(timestampSec)) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - timestampSec) > tolerance) return false;

  const signedPayload = `${parsed.ts}:${input.rawBody}`;
  const digest = crypto
    .createHmac("sha256", input.webhookSecret)
    .update(signedPayload, "utf8")
    .digest("hex");

  return parsed.h1.some((candidate) => {
    if (!/^[a-f0-9]+$/i.test(candidate)) return false;
    return timingSafeHexEquals(digest, candidate);
  });
}

