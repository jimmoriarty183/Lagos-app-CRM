import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { supabaseServiceRole } from "@/lib/supabase/server";
import { parseAndVerifySignedRequest } from "@/lib/instagram/signed-request";

/**
 * Meta calls this when a merchant requests deletion of their data via
 * Facebook Settings → Your Information → Apps and Websites → Request my
 * data deletion. We:
 *   - delete every instagram_connections row for this user_id
 *   - return a confirmation_code + status URL Meta shows the user.
 *
 * URL configured in Meta App → Instagram → API setup with Instagram
 * Login → Business login settings → Data deletion request URL.
 *
 * Format spec:
 * https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback/
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUBLIC_BASE = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://ordo.uno"
).trim();

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  let signedRequest = "";

  try {
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await req.formData();
      signedRequest = String(form.get("signed_request") ?? "");
    } else if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      signedRequest = String(body?.signed_request ?? "");
    } else {
      const text = await req.text();
      const params = new URLSearchParams(text);
      signedRequest = params.get("signed_request") ?? "";
    }
  } catch (err) {
    console.warn("[ig-deletion] body parse failed", err);
  }

  if (!signedRequest) {
    return NextResponse.json(
      { error: "Missing signed_request" },
      { status: 400 },
    );
  }

  const verified = parseAndVerifySignedRequest(signedRequest);
  if (!verified.ok) {
    console.warn("[ig-deletion] signature verification failed", {
      reason: verified.reason,
    });
    return NextResponse.json(
      { error: `Invalid signed_request: ${verified.reason}` },
      { status: 401 },
    );
  }

  const userId = verified.userId;
  const confirmationCode = crypto.randomBytes(8).toString("hex");

  // Hard delete connections for this user. cascade FKs (none currently
  // beyond the row itself) take care of related rows.
  const admin = supabaseServiceRole();
  const { error, count } = await admin
    .from("instagram_connections")
    .delete({ count: "exact" })
    .eq("ig_user_id", userId);

  if (error) {
    console.error("[ig-deletion] DB delete failed", { userId, error });
    return NextResponse.json(
      { error: "DB delete failed" },
      { status: 500 },
    );
  }

  console.log("[ig-deletion] connection(s) deleted", {
    userId,
    deleted: count ?? 0,
    confirmationCode,
  });

  const statusUrl = `${PUBLIC_BASE.replace(/\/+$/, "")}/data-deletion?id=${encodeURIComponent(confirmationCode)}`;

  return NextResponse.json({
    url: statusUrl,
    confirmation_code: confirmationCode,
  });
}
