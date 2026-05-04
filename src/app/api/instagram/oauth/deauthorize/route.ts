import { NextResponse, type NextRequest } from "next/server";
import { supabaseServiceRole } from "@/lib/supabase/server";
import { parseAndVerifySignedRequest } from "@/lib/instagram/signed-request";

/**
 * Meta calls this when a merchant revokes Ordo's access from
 * Instagram/Facebook → Settings → Apps and Websites. We mark the
 * matching connection disabled so the webhook handler stops trying to
 * reply on their behalf.
 *
 * URL configured in Meta App → Instagram → API setup with Instagram
 * Login → Business login settings → Deauthorize callback URL.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    console.warn("[ig-deauth] body parse failed", err);
  }

  if (!signedRequest) {
    return NextResponse.json(
      { error: "Missing signed_request" },
      { status: 400 },
    );
  }

  const verified = parseAndVerifySignedRequest(signedRequest);
  if (!verified.ok) {
    console.warn("[ig-deauth] signature verification failed", {
      reason: verified.reason,
    });
    return NextResponse.json(
      { error: `Invalid signed_request: ${verified.reason}` },
      { status: 401 },
    );
  }

  const userId = verified.userId;

  // Mark every connection for this user disabled. We don't delete the
  // row outright — keeps an audit trail; user can reconnect via
  // /app/ai-sales which re-upserts and flips enabled back to true.
  const admin = supabaseServiceRole();
  const { data, error } = await admin
    .from("instagram_connections")
    .update({
      enabled: false,
      webhook_subscribed: false,
    })
    .eq("ig_user_id", userId)
    .select("id, business_id");

  if (error) {
    console.error("[ig-deauth] DB update failed", { userId, error });
    return NextResponse.json(
      { error: "DB update failed" },
      { status: 500 },
    );
  }

  console.log("[ig-deauth] connection(s) disabled", {
    userId,
    affected: data?.length ?? 0,
  });

  return NextResponse.json({ ok: true, disabled: data?.length ?? 0 });
}
