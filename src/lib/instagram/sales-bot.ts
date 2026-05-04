/**
 * Shared Instagram sales-bot pipeline. Used by:
 *   - /api/webhooks/instagram (real webhook events from Meta)
 *   - /api/instagram/diag?action=simulate (manual end-to-end test)
 *
 * Multi-tenant: every entry point accepts an InstagramConnection so the
 * same code path serves every connected merchant with their own token,
 * Sheet-based catalog, and (optionally) custom system prompt.
 */

import type { InstagramConnection } from "@/lib/instagram/connections";

const GEMINI_API_KEY = (process.env.GEMINI_API_KEY ?? "").trim();

// Try the newer / smarter model first. If Google's 2.5-flash pool is
// overloaded (frequent 503s on free tier during peak hours), fall
// through to 2.0-flash which has more spare capacity. Same prompting,
// same shape of response — drop-in fallback.
const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-flash-lite",
] as const;
const GEMINI_MAX_ATTEMPTS_PER_MODEL = 2;
const GEMINI_RETRY_DELAY_MS = 800;

const IG_GRAPH_BASE = "https://graph.instagram.com/v21.0";
const IG_REPLY_MAX_CHARS = 950;

export const BASE_SYSTEM_PROMPT =
  "Ты — AI-менеджер продаж интернет-магазина. Твоя задача — помочь клиенту " +
  "выбрать товар из нашего каталога и довести до покупки. " +
  "Правила: " +
  "(1) Отвечай ТОЛЬКО про товары из каталога ниже — никогда не выдумывай товары, " +
  "которых там нет. " +
  "(2) Тон: дружелюбный, экспертный, без напора. " +
  "(3) Кратко: 2–4 предложения, без длинных простыней. " +
  "(4) Если клиент задаёт расплывчатый вопрос — задай встречный (бюджет, сценарий, " +
  "для кого). " +
  "(5) Когда рекомендуешь товар — назови его конкретно (название + цена) и одной " +
  "фразой объясни почему именно он. " +
  "(6) Когда клиент готов купить — отправь ссылку оплаты из колонки «Ссылка оплаты» " +
  "того товара. " +
  "(7) Если в каталоге нет подходящего товара — честно скажи и предложи написать " +
  "на support@ordo.uno. " +
  "(8) Если вопрос совсем не про товары — мягко верни в тему.";

// ─── Catalog from Google Sheets (per-sheet cached) ───────────────────

const CATALOG_TTL_MS = 60_000;
const catalogCache = new Map<string, { fetchedAt: number; csv: string }>();

export async function loadCatalog(
  sheetId: string | null | undefined,
  sheetGid: string = "0",
): Promise<string | null> {
  if (!sheetId) return null;
  const key = `${sheetId}:${sheetGid}`;

  const now = Date.now();
  const cached = catalogCache.get(key);
  if (cached && now - cached.fetchedAt < CATALOG_TTL_MS) {
    return cached.csv;
  }

  const url =
    `https://docs.google.com/spreadsheets/d/${sheetId}` +
    `/gviz/tq?tqx=out:csv&gid=${sheetGid}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 OrdoSalesBot/1.0" },
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn("[sales-bot] catalog fetch failed", {
        status: res.status,
        sheetId,
      });
      return cached?.csv ?? null;
    }
    const csv = await res.text();
    catalogCache.set(key, { fetchedAt: now, csv });
    console.log("[sales-bot] catalog refreshed", {
      sheetId,
      bytes: csv.length,
    });
    return csv;
  } catch (err) {
    console.warn("[sales-bot] catalog fetch error", { sheetId, err });
    return cached?.csv ?? null;
  }
}

// ─── Gemini ──────────────────────────────────────────────────────────

export type ShopContext = {
  name?: string | null;
  about?: string | null;
  address?: string | null;
  contact?: string | null;
};

function buildShopContextBlock(shop: ShopContext | null | undefined): string {
  if (!shop) return "";
  const lines: string[] = [];
  if (shop.name?.trim()) lines.push(`- Название: ${shop.name.trim()}`);
  if (shop.about?.trim()) lines.push(`- О магазине: ${shop.about.trim()}`);
  if (shop.address?.trim()) lines.push(`- Адрес: ${shop.address.trim()}`);
  if (shop.contact?.trim()) lines.push(`- Контакты: ${shop.contact.trim()}`);
  if (lines.length === 0) return "";
  return `\n\n══════ ИНФО О МАГАЗИНЕ ══════\n${lines.join("\n")}\n══════ КОНЕЦ ИНФО ══════`;
}

export async function askGemini(
  userMessage: string,
  catalog: string | null,
  systemPromptOverride?: string | null,
  shop?: ShopContext | null,
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const basePrompt = systemPromptOverride?.trim() || BASE_SYSTEM_PROMPT;
  const shopBlock = buildShopContextBlock(shop);
  const catalogBlock = catalog
    ? `\n\n══════ КАТАЛОГ ТОВАРОВ (CSV) ══════\n${catalog}\n══════ КОНЕЦ КАТАЛОГА ══════`
    : `\n\n(Каталог сейчас недоступен — не выдумывай товары, попроси клиента подождать или написать на support@ordo.uno.)`;
  const systemPrompt = `${basePrompt}${shopBlock}${catalogBlock}`;

  let lastError: Error | null = null;
  for (const model of GEMINI_MODELS) {
    for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS_PER_MODEL; attempt++) {
      try {
        return await callGeminiOnce(model, systemPrompt, userMessage);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const msg = lastError.message;
        const transient =
          msg.includes("503") ||
          msg.includes("429") ||
          msg.includes("UNAVAILABLE") ||
          msg.includes("RESOURCE_EXHAUSTED");
        if (!transient) throw lastError;

        const isLastAttemptOnModel =
          attempt === GEMINI_MAX_ATTEMPTS_PER_MODEL;
        const isLastModel = model === GEMINI_MODELS[GEMINI_MODELS.length - 1];
        console.warn("[gemini] transient error", {
          model,
          attempt,
          willRetry: !(isLastAttemptOnModel && isLastModel),
          error: msg.slice(0, 200),
        });
        if (isLastAttemptOnModel && isLastModel) throw lastError;
        await sleep(GEMINI_RETRY_DELAY_MS * attempt);
      }
    }
  }
  throw lastError ?? new Error("Gemini: exhausted models");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGeminiOnce(
  model: string,
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}` +
    `:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Gemini ${res.status} ${res.statusText}: ${errText.slice(0, 400)}`,
    );
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
    promptFeedback?: { blockReason?: string };
  };

  const blockReason = data.promptFeedback?.blockReason;
  if (blockReason) {
    throw new Error(`Gemini blocked: ${blockReason}`);
  }

  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts
    ?.map((p) => (typeof p.text === "string" ? p.text : ""))
    .join("")
    .trim();

  if (candidate?.finishReason === "MAX_TOKENS") {
    console.warn("[gemini] response hit MAX_TOKENS — reply truncated", {
      model,
      replyLength: text?.length ?? 0,
    });
  }

  if (!text) {
    throw new Error(
      `Gemini returned empty response (finishReason: ${candidate?.finishReason ?? "unknown"})`,
    );
  }

  return text;
}

// ─── Instagram send ──────────────────────────────────────────────────

export async function sendInstagramMessage(
  accessToken: string,
  recipientPsid: string,
  text: string,
): Promise<void> {
  if (!accessToken) {
    throw new Error("Instagram access token missing for send");
  }

  const trimmed =
    text.length > IG_REPLY_MAX_CHARS
      ? text.slice(0, IG_REPLY_MAX_CHARS - 1) + "…"
      : text;

  const url = `${IG_GRAPH_BASE}/me/messages?access_token=${encodeURIComponent(accessToken)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientPsid },
      message: { text: trimmed },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `IG send ${res.status} ${res.statusText}: ${errText.slice(0, 400)}`,
    );
  }
}

// ─── End-to-end pipeline used by both webhook and simulate ───────────

export async function processSalesMessage(
  connection: InstagramConnection,
  senderPsid: string,
  text: string,
  options: { sendReply?: boolean } = { sendReply: true },
): Promise<{
  userMessage: string;
  reply: string;
  sent: boolean;
  catalogBytes: number;
}> {
  const catalog = await loadCatalog(
    connection.catalog_sheet_id,
    connection.catalog_sheet_gid ?? "0",
  );
  const reply = await askGemini(text, catalog, connection.system_prompt, {
    name: connection.shop_name,
    about: connection.shop_about,
    address: connection.shop_address,
    contact: connection.shop_contact,
  });

  if (options.sendReply ?? true) {
    await sendInstagramMessage(connection.ig_access_token, senderPsid, reply);
    return {
      userMessage: text,
      reply,
      sent: true,
      catalogBytes: catalog?.length ?? 0,
    };
  }

  return {
    userMessage: text,
    reply,
    sent: false,
    catalogBytes: catalog?.length ?? 0,
  };
}
