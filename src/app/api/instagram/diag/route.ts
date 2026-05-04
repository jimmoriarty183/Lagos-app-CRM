import { NextResponse, type NextRequest } from "next/server";
import { loadCatalog, askGemini, sendInstagramMessage } from "@/lib/instagram/sales-bot";
import {
  getFirstEnabledInstagramConnection,
  getInstagramConnectionByIgUserId,
  type InstagramConnection,
} from "@/lib/instagram/connections";

/**
 * Server-side IG API + sales-bot diagnostic.
 *
 *   ?action=me            — which IG account does the resolved connection's token belong to
 *   ?action=status        — is webhook subscription active for the resolved connection
 *   ?action=subscribe     — activate messages+postbacks subscription
 *   ?action=unsubscribe   — full reset
 *   ?action=conversations — list DM conversations + extract participant PSIDs
 *   ?action=simulate&text=...&to=PSID
 *                         — run the full sales-bot pipeline (catalog →
 *                           Gemini → optional IG send) without waiting
 *                           for Meta to deliver a real webhook.
 *
 * Connection selection (any action):
 *   ?ig_user_id=XXX       — pick the connection for this IG account id
 *   (otherwise)           — pick the most recent enabled connection
 *
 * Gated by VERIFY_TOKEN so it's not publicly callable.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VERIFY_TOKEN = (process.env.VERIFY_TOKEN ?? "").trim();
const IG_BASE = "https://graph.instagram.com/v21.0";

async function resolveConnection(
  req: NextRequest,
): Promise<InstagramConnection | null> {
  const igUserId = req.nextUrl.searchParams.get("ig_user_id")?.trim();
  if (igUserId) {
    return getInstagramConnectionByIgUserId(igUserId);
  }
  return getFirstEnabledInstagramConnection();
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const secret = sp.get("secret");

  if (!VERIFY_TOKEN || secret !== VERIFY_TOKEN) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const connection = await resolveConnection(req);
  if (!connection) {
    return NextResponse.json(
      {
        error:
          "No Instagram connection found. Connect a merchant via /app/ai-sales first, or pass ?ig_user_id=<id>.",
      },
      { status: 404 },
    );
  }

  const action = sp.get("action") ?? "status";
  const tokenParam = `access_token=${encodeURIComponent(connection.ig_access_token)}`;

  try {
    if (action === "me") {
      const res = await fetch(
        `${IG_BASE}/me?fields=id,username,account_type,user_id&${tokenParam}`,
      );
      return NextResponse.json({
        action,
        connectionId: connection.id,
        igUsername: connection.ig_username,
        httpStatus: res.status,
        response: await res.json(),
      });
    }

    if (action === "status") {
      const res = await fetch(`${IG_BASE}/me/subscribed_apps?${tokenParam}`);
      return NextResponse.json({
        action,
        connectionId: connection.id,
        igUsername: connection.ig_username,
        httpStatus: res.status,
        response: await res.json(),
        hint:
          "Empty data array = subscription dropped. Hit ?action=subscribe to re-activate.",
      });
    }

    if (action === "subscribe") {
      const res = await fetch(
        `${IG_BASE}/me/subscribed_apps?subscribed_fields=messages,messaging_postbacks&${tokenParam}`,
        { method: "POST" },
      );
      return NextResponse.json({
        action,
        connectionId: connection.id,
        igUsername: connection.ig_username,
        httpStatus: res.status,
        response: await res.json(),
        hint:
          "Expect {success: true}. Now send a real DM to this account; webhook should fire.",
      });
    }

    if (action === "unsubscribe") {
      const res = await fetch(
        `${IG_BASE}/me/subscribed_apps?${tokenParam}`,
        { method: "DELETE" },
      );
      return NextResponse.json({
        action,
        connectionId: connection.id,
        igUsername: connection.ig_username,
        httpStatus: res.status,
        response: await res.json(),
        hint: "After this, hit ?action=subscribe to start clean.",
      });
    }

    if (action === "conversations") {
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

      const customerPsids = allParticipants
        .filter((p) => p.id !== connection.ig_user_id)
        .map((p) => p.id);

      return NextResponse.json({
        action,
        connectionId: connection.id,
        igUsername: connection.ig_username,
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
            : "No customer PSIDs found.",
      });
    }

    if (action === "simulate") {
      const text = sp.get("text") ?? "";
      const to = sp.get("to") ?? "";
      if (!text.trim()) {
        return NextResponse.json(
          {
            error: "Missing ?text=... query param",
            example:
              "/api/instagram/diag?secret=...&action=simulate&text=Хочу%20наушники%20до%20100%24&to=PSID",
          },
          { status: 400 },
        );
      }

      const catalogStart = Date.now();
      const catalog = await loadCatalog(
        connection.catalog_sheet_id,
        connection.catalog_sheet_gid ?? "0",
      );
      const catalogMs = Date.now() - catalogStart;

      const geminiStart = Date.now();
      const reply = await askGemini(text.trim(), catalog, connection.system_prompt);
      const geminiMs = Date.now() - geminiStart;

      let igSendResult: { ok: true } | { ok: false; error: string } | null = null;
      if (to.trim()) {
        try {
          await sendInstagramMessage(connection.ig_access_token, to.trim(), reply);
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
        connectionId: connection.id,
        igUsername: connection.ig_username,
        userMessage: text.trim(),
        reply,
        catalog: {
          loaded: catalog !== null,
          bytes: catalog?.length ?? 0,
          fetchMs: catalogMs,
          sheetId: connection.catalog_sheet_id,
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
