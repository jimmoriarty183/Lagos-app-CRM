import { NextResponse, type NextRequest } from "next/server";
import { askGemini, loadCatalog, sendInstagramMessage } from "@/lib/instagram/sales-bot";

/**
 * Server-side IG API + sales-bot diagnostic.
 *
 *   ?action=me           — which IG account does our token belong to
 *   ?action=status       — is webhook subscription active
 *   ?action=subscribe    — activate messages+postbacks subscription
 *   ?action=unsubscribe  — full reset
 *   ?action=simulate&text=...&to=PSID
 *                        — run the full sales-bot pipeline (catalog →
 *                          Gemini → optional IG send) without waiting
 *                          for Meta to deliver a real webhook.
 *                          Use this in Dev mode where Meta won't
 *                          deliver real DMs to the webhook.
 *
 * Gated by VERIFY_TOKEN so it's not publicly callable.
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

    if (action === "conversations") {
      // List conversations + participants. Useful when webhooks don't
      // surface sender PSIDs (read/reaction events lack sender.id) but we
      // still need a valid PSID for App Review test calls.
      // Auto-follows pagination up to 5 pages to find non-empty data.
      let url: string | null =
        `${IG_BASE}/me/conversations?platform=instagram&fields=participants,updated_time&limit=100&${tokenParam}`;
      const allConversations: unknown[] = [];
      const allParticipants: { id: string; username?: string }[] = [];
      let pagesFetched = 0;
      let lastStatus = 0;
      let lastError: unknown = null;

      while (url && pagesFetched < 5) {
        const res = await fetch(url);
        lastStatus = res.status;
        const json: any = await res.json();
        if (json.error) {
          lastError = json.error;
          break;
        }
        const data: any[] = Array.isArray(json.data) ? json.data : [];
        allConversations.push(...data);
        for (const conv of data) {
          const participants = conv?.participants?.data;
          if (Array.isArray(participants)) {
            for (const p of participants) {
              if (typeof p?.id === "string") {
                allParticipants.push({ id: p.id, username: p.username });
              }
            }
          }
        }
        url = json?.paging?.next ?? null;
        pagesFetched += 1;
      }

      const botId = "17841401307528587";
      const customerPsids = allParticipants
        .filter((p) => p.id !== botId)
        .map((p) => p.id);

      return NextResponse.json({
        action,
        httpStatus: lastStatus,
        pagesFetched,
        conversationCount: allConversations.length,
        participantCount: allParticipants.length,
        customerPsids: [...new Set(customerPsids)],
        sampleConversations: allConversations.slice(0, 3),
        error: lastError,
        hint:
          customerPsids.length > 0
            ? `Use any value from customerPsids in ?action=simulate&to=...`
            : "No customer PSIDs found. The bot account may have no DM history yet.",
      });
    }

    if (action === "simulate") {
      // Run the same pipeline a real webhook would: load catalog from
      // the Sheet, ask Gemini, optionally send the reply to IG.
      // The bot in Dev mode never gets real webhooks delivered, so this
      // is the canonical way to verify "does the bot actually answer
      // smartly using my catalog".
      const text = sp.get("text") ?? "";
      const to = sp.get("to") ?? "";
      if (!text.trim()) {
        return NextResponse.json(
          {
            error: "Missing ?text=... query param",
            example:
              "/api/instagram/diag?secret=...&action=simulate&text=Хочу%20наушники%20до%20100%24",
          },
          { status: 400 },
        );
      }

      const catalogStart = Date.now();
      const catalog = await loadCatalog();
      const catalogMs = Date.now() - catalogStart;

      const geminiStart = Date.now();
      const reply = await askGemini(text.trim(), catalog);
      const geminiMs = Date.now() - geminiStart;

      let igSendResult: { ok: true } | { ok: false; error: string } | null = null;
      if (to.trim()) {
        try {
          await sendInstagramMessage(to.trim(), reply);
          igSendResult = { ok: true };
        } catch (err) {
          igSendResult = {
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }

      return NextResponse.json({
        action,
        userMessage: text.trim(),
        reply,
        catalog: {
          loaded: catalog !== null,
          bytes: catalog?.length ?? 0,
          fetchMs: catalogMs,
        },
        gemini: { responseMs: geminiMs },
        igSend: to
          ? igSendResult
          : { skipped: true, hint: "Pass &to=<recipient_psid> to actually send the reply to Instagram" },
      });
    }

    return NextResponse.json(
      {
        error: `Unknown action "${action}"`,
        availableActions: [
          "me",
          "status",
          "subscribe",
          "unsubscribe",
          "conversations",
          "simulate",
        ],
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
