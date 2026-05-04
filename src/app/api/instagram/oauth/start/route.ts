import { type NextRequest, NextResponse } from "next/server";
import { supabaseServerAction } from "@/lib/supabase/server";
import {
  IG_OAUTH_STATE_COOKIE,
  createOAuthState,
} from "@/lib/instagram/oauth-state";

/**
 * Kicks off Instagram Business Login OAuth.
 *
 *   GET /api/instagram/oauth/start?business_id=<uuid>
 *
 * Verifies the caller has owner/manager role on the business, sets a
 * signed CSRF cookie tying the round-trip to that business, then
 * redirects to Instagram's OAuth authorize endpoint.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IG_APP_ID = (process.env.INSTAGRAM_APP_ID ?? "").trim();
const PUBLIC_BASE = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://ordo.uno"
).trim();
const REDIRECT_URI = `${PUBLIC_BASE.replace(/\/+$/, "")}/api/instagram/oauth/callback`;

const SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
].join(",");

export async function GET(req: NextRequest) {
  if (!IG_APP_ID) {
    return NextResponse.json(
      { error: "INSTAGRAM_APP_ID not configured" },
      { status: 500 },
    );
  }

  const businessId = req.nextUrl.searchParams.get("business_id")?.trim();
  if (!businessId) {
    return NextResponse.json(
      { error: "Missing business_id query param" },
      { status: 400 },
    );
  }

  const supabase = await supabaseServerAction();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      new URL(
        `/login?next=${encodeURIComponent(`/api/instagram/oauth/start?business_id=${businessId}`)}`,
        req.url,
      ),
    );
  }

  // Authorize: owner or manager on this business.
  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("business_id", businessId)
    .maybeSingle();

  if (membershipError) {
    return NextResponse.json(
      { error: "Membership lookup failed", detail: membershipError.message },
      { status: 500 },
    );
  }

  const role = String(membership?.role ?? "").toLowerCase();
  if (role !== "owner" && role !== "manager") {
    return NextResponse.json(
      { error: "Forbidden: owner or manager role required" },
      { status: 403 },
    );
  }

  const { token, cookieName, cookieMaxAgeSec } = createOAuthState(businessId);

  const authorize = new URL("https://www.instagram.com/oauth/authorize");
  authorize.searchParams.set("force_reauth", "true");
  authorize.searchParams.set("client_id", IG_APP_ID);
  authorize.searchParams.set("redirect_uri", REDIRECT_URI);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", SCOPES);
  authorize.searchParams.set("state", token);

  const res = NextResponse.redirect(authorize.toString());
  res.cookies.set(cookieName, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: cookieMaxAgeSec,
  });
  // Reference cookie name (avoid TS "unused import" lint).
  void IG_OAUTH_STATE_COOKIE;
  return res;
}
