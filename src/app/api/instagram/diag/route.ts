import { NextResponse, type NextRequest } from "next/server";

/**
 * Server-side IG API diagnostic. Lets us hit the Graph API from the
 * Vercel deployment (where IG_ACCESS_TOKEN already lives) without
 * having to copy the token to a local PowerShell or paste it into a
 * proxy-based testing tool that mangles long URLs.
 *
 *   GET /api/instagram/diag?secret=VERIFY_TOKEN&action=me
 *   GET /api/instagram/diag?secret=VERIFY_TOKEN&action=status
 *   GET /api/instagram/diag?secret=VERIFY_TOKEN&action=subscribe
 *
 * Gated by VERIFY_TOKEN so it's not publicly callable. Token never
 * leaves the server — only the IG API response shape comes back.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VERIFY_TOKEN = (process.env.VERIFY_TOKEN ?? "").trim();
const IG_ACCESS_TOKEN = (process.env.IG_ACCESS_TOKEN ?? "").trim();
const IG_BASE = "https://graph.instagram.com/v21.0";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const secret = sp.get("secret");

  if (!VERIFY_TOKEN || secret !== VERIFY_TOKEN) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!IG_ACCESS_TOKEN) {
    return NextResponse.json(
      { error: "IG_ACCESS_TOKEN not configured in Vercel env" },
      { status: 500 },
    );
  }

  const action = sp.get("action") ?? "status";
  const tokenParam = `access_token=${encodeURIComponent(IG_ACCESS_TOKEN)}`;

  try {
    if (action === "me") {
      // Confirm which IG account the token belongs to.
      const res = await fetch(
        `${IG_BASE}/me?fields=id,username,account_type,user_id&${tokenParam}`,
      );
      return NextResponse.json({
        action,
        httpStatus: res.status,
        igTokenLength: IG_ACCESS_TOKEN.length,
        response: await res.json(),
      });
    }

    if (action === "status") {
      // Is our app subscribed to webhook events for this IG account?
      const res = await fetch(`${IG_BASE}/me/subscribed_apps?${tokenParam}`);
      return NextResponse.json({
        action,
        httpStatus: res.status,
        response: await res.json(),
        hint:
          "Empty data array = subscription dropped. Hit ?action=subscribe to re-activate.",
      });
    }

    if (action === "subscribe") {
      // Activate webhook delivery for messages + postbacks on this IG account.
      const res = await fetch(
        `${IG_BASE}/me/subscribed_apps?subscribed_fields=messages,messaging_postbacks&${tokenParam}`,
        { method: "POST" },
      );
      return NextResponse.json({
        action,
        httpStatus: res.status,
        response: await res.json(),
        hint:
          "Expect {success: true}. Now send a real DM to the bot account; webhook should fire.",
      });
    }

    if (action === "unsubscribe") {
      // Remove app from this IG account's subscribers (full reset).
      const res = await fetch(
        `${IG_BASE}/me/subscribed_apps?${tokenParam}`,
        { method: "DELETE" },
      );
      return NextResponse.json({
        action,
        httpStatus: res.status,
        response: await res.json(),
        hint: "After this, hit ?action=subscribe to start clean.",
      });
    }

    return NextResponse.json(
      {
        error: `Unknown action "${action}"`,
        availableActions: ["me", "status", "subscribe", "unsubscribe"],
      },
      { status: 400 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 },
    );
  }
}
