import { type NextRequest, NextResponse } from "next/server";
import { supabaseServerAction, supabaseServiceRole } from "@/lib/supabase/server";
import {
  IG_OAUTH_STATE_COOKIE,
  verifyOAuthState,
} from "@/lib/instagram/oauth-state";

/**
 * Instagram Business Login OAuth callback.
 *
 *   GET /api/instagram/oauth/callback?code=...&state=...
 *
 * Flow:
 *   1. CSRF: state param must match the signed cookie set by /start.
 *   2. Exchange code → short-lived token (api.instagram.com).
 *   3. Exchange short-lived → long-lived 60-day token (graph.instagram.com).
 *   4. GET /me to capture id, username, account_type.
 *   5. POST /me/subscribed_apps to enable webhook delivery.
 *   6. Upsert into instagram_connections (by business_id + ig_user_id).
 *   7. Redirect back to /app/ai-sales with status flag.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IG_APP_ID = (process.env.INSTAGRAM_APP_ID ?? "").trim();
const IG_APP_SECRET = (
  process.env.INSTAGRAM_APP_SECRET ??
  process.env.FACEBOOK_APP_SECRET ??
  ""
).trim();
const PUBLIC_BASE = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://ordo.uno"
).trim();
const REDIRECT_URI = `${PUBLIC_BASE.replace(/\/+$/, "")}/api/instagram/oauth/callback`;
const RETURN_URL = `${PUBLIC_BASE.replace(/\/+$/, "")}/app/ai-sales`;
const IG_API = "https://api.instagram.com";
const IG_GRAPH = "https://graph.instagram.com/v21.0";

function returnTo(status: string, extra: Record<string, string> = {}) {
  const url = new URL(RETURN_URL);
  url.searchParams.set("status", status);
  for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
  const res = NextResponse.redirect(url.toString());
  res.cookies.delete(IG_OAUTH_STATE_COOKIE);
  return res;
}

export async function GET(req: NextRequest) {
  if (!IG_APP_ID || !IG_APP_SECRET) {
    return returnTo("error", {
      reason: "server_misconfigured",
    });
  }

  const sp = req.nextUrl.searchParams;
  const code = sp.get("code");
  const stateParam = sp.get("state");
  const errorParam = sp.get("error");
  const errorReason = sp.get("error_reason");

  if (errorParam) {
    return returnTo("denied", {
      reason: errorReason ?? errorParam,
    });
  }

  if (!code || !stateParam) {
    return returnTo("error", { reason: "missing_code_or_state" });
  }

  const cookieState = req.cookies.get(IG_OAUTH_STATE_COOKIE)?.value;
  if (!cookieState || cookieState !== stateParam) {
    return returnTo("error", { reason: "csrf_mismatch" });
  }

  const verified = verifyOAuthState(cookieState);
  if (!verified.ok) {
    return returnTo("error", { reason: `state_${verified.reason}` });
  }
  const businessId = verified.businessId;

  // Re-confirm the caller still has owner/manager on this business — the
  // cookie proves intent, RLS on memberships proves authorization.
  const supabase = await supabaseServerAction();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return returnTo("error", { reason: "not_logged_in" });
  }
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("business_id", businessId)
    .maybeSingle();
  const role = String(membership?.role ?? "").toLowerCase();
  if (role !== "owner" && role !== "manager") {
    return returnTo("error", { reason: "forbidden" });
  }

  // ─── 1. code → short-lived token ─────────────────────────────────
  const tokenForm = new URLSearchParams();
  tokenForm.set("client_id", IG_APP_ID);
  tokenForm.set("client_secret", IG_APP_SECRET);
  tokenForm.set("grant_type", "authorization_code");
  tokenForm.set("redirect_uri", REDIRECT_URI);
  tokenForm.set("code", code);

  const shortRes = await fetch(`${IG_API}/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenForm.toString(),
  });
  const shortJson = await shortRes.json().catch(() => null);
  if (!shortRes.ok || !shortJson?.access_token) {
    console.error("[ig-oauth] short-lived exchange failed", {
      status: shortRes.status,
      response: shortJson,
    });
    return returnTo("error", {
      reason: "short_token_exchange_failed",
      status: String(shortRes.status),
    });
  }
  const shortToken = String(shortJson.access_token);
  const shortIgUserId = shortJson.user_id ? String(shortJson.user_id) : "";

  // ─── 2. short-lived → long-lived (60-day) ────────────────────────
  const longUrl = new URL(`${IG_GRAPH}/access_token`);
  longUrl.searchParams.set("grant_type", "ig_exchange_token");
  longUrl.searchParams.set("client_secret", IG_APP_SECRET);
  longUrl.searchParams.set("access_token", shortToken);

  const longRes = await fetch(longUrl.toString());
  const longJson = await longRes.json().catch(() => null);
  if (!longRes.ok || !longJson?.access_token) {
    console.error("[ig-oauth] long-lived exchange failed", {
      status: longRes.status,
      response: longJson,
    });
    return returnTo("error", { reason: "long_token_exchange_failed" });
  }
  const longToken = String(longJson.access_token);
  const expiresInSec = Number(longJson.expires_in) || 60 * 24 * 60 * 60;
  const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

  // ─── 3. /me — id, username, account_type, user_id ───────────────
  // We need BOTH ids returned by /me:
  //   - `id`       : Instagram-scoped login-flow ID (e.g. 274207...)
  //   - `user_id`  : legacy Page-linked Business Account ID (e.g. 178414...)
  // The IG webhook payload puts the LEGACY id in entry[].id, so that's
  // what we store as ig_user_id (the column the webhook lookup hits).
  const meUrl = new URL(`${IG_GRAPH}/me`);
  meUrl.searchParams.set("fields", "id,username,account_type,user_id");
  meUrl.searchParams.set("access_token", longToken);
  const meRes = await fetch(meUrl.toString());
  const meJson = await meRes.json().catch(() => null);
  if (!meRes.ok || !meJson?.id) {
    console.error("[ig-oauth] /me failed", {
      status: meRes.status,
      response: meJson,
    });
    return returnTo("error", { reason: "me_lookup_failed" });
  }
  const igUserId = String(meJson.user_id || meJson.id || shortIgUserId);
  const igUsername = String(meJson.username ?? "");
  const igAccountType = meJson.account_type
    ? String(meJson.account_type)
    : null;

  // ─── 4. subscribe webhook ────────────────────────────────────────
  const subRes = await fetch(
    `${IG_GRAPH}/me/subscribed_apps?subscribed_fields=messages,messaging_postbacks&access_token=${encodeURIComponent(longToken)}`,
    { method: "POST" },
  );
  const subJson = await subRes.json().catch(() => null);
  const webhookSubscribed = Boolean(subRes.ok && subJson?.success);
  if (!webhookSubscribed) {
    console.warn("[ig-oauth] webhook subscribe failed (non-fatal)", {
      status: subRes.status,
      response: subJson,
    });
  }

  // ─── 5. upsert connection (service role bypasses RLS) ────────────
  const admin = supabaseServiceRole();
  const { error: upsertError } = await admin
    .from("instagram_connections")
    .upsert(
      {
        business_id: businessId,
        ig_user_id: igUserId,
        ig_username: igUsername,
        ig_account_type: igAccountType,
        ig_access_token: longToken,
        expires_at: expiresAt,
        webhook_subscribed: webhookSubscribed,
        enabled: true,
      },
      { onConflict: "business_id,ig_user_id" },
    );

  if (upsertError) {
    console.error("[ig-oauth] DB upsert failed", upsertError);
    return returnTo("error", { reason: "db_upsert_failed" });
  }

  console.log("[ig-oauth] connected", {
    businessId,
    igUserId,
    igUsername,
    webhookSubscribed,
  });

  return returnTo("connected", { username: igUsername });
}
