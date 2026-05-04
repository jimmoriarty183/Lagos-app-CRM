/**
 * Shared Instagram sales-bot pipeline. Used by:
 *   - /api/webhooks/instagram (real webhook events from Meta)
 *   - /api/instagram/diag?action=simulate (manual end-to-end test)
 *
 * Keeping this in one file means the webhook and the test path can't
 * drift apart — whatever real DMs would get is exactly what the
 * simulator returns.
 */

const IG_ACCESS_TOKEN = (process.env.IG_ACCESS_TOKEN ?? "").trim();
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY ?? "").trim();

const CATALOG_SHEET_ID = (process.env.IG_CATALOG_SHEET_ID ?? "").trim();
const CATALOG_SHEET_GID = (process.env.IG_CATALOG_SHEET_GID ?? "0").trim();

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

// ─── Catalog from Google Sheets (cached) ─────────────────────────────

const CATALOG_TTL_MS = 60_000;
type CatalogCache = { fetchedAt: number; csv: string };
let catalogCache: CatalogCache | null = null;

export async function loadCatalog(): Promise<string | null> {
  if (!CATALOG_SHEET_ID) return null;

  const now = Date.now();
  if (catalogCache && now - catalogCache.fetchedAt < CATALOG_TTL_MS) {
    return catalogCache.csv;
  }

  const url =
    `https://docs.google.com/spreadsheets/d/${CATALOG_SHEET_ID}` +
    `/gviz/tq?tqx=out:csv&gid=${CATALOG_SHEET_GID}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 OrdoSalesBot/1.0" },
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn("[sales-bot] catalog fetch failed", res.status);
      return catalogCache?.csv ?? null;
    }
    const csv = await res.text();
    catalogCache = { fetchedAt: now, csv };
    console.log("[sales-bot] catalog refreshed", { bytes: csv.length });
    return csv;
  } catch (err) {
    console.warn("[sales-bot] catalog fetch error", err);
    return catalogCache?.csv ?? null;
  }
}

// ─── Gemini ──────────────────────────────────────────────────────────

export async function askGemini(
  userMessage: string,
  catalog: string | null,
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const systemPrompt = catalog
    ? `${BASE_SYSTEM_PROMPT}\n\n══════ КАТАЛОГ ТОВАРОВ (CSV) ══════\n${catalog}\n══════ КОНЕЦ КАТАЛОГА ══════`
    : `${BASE_SYSTEM_PROMPT}\n\n(Каталог сейчас недоступен — не выдумывай товары, попроси клиента подождать или написать на support@ordo.uno.)`;

  let lastError: Error | null = null;
  for (const model of GEMINI_MODELS) {
    for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS_PER_MODEL; attempt++) {
      try {
        return await callGeminiOnce(model, systemPrompt, userMessage);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const msg = lastError.message;
        // 503/429/UNAVAILABLE = transient. Worth retrying / falling back.
        // Anything else (401, 400, blocked) is permanent — bail out so we
        // don't waste time on identical failures.
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
  // Unreachable in practice — the loop above either returns or throws —
  // but TS needs a terminating statement.
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
        // Bumped from 250 → 1024. For thinking-capable models the
        // budget is shared between reasoning and the visible reply,
        // and 250 was so tight the reply got cut off mid-word.
        maxOutputTokens: 1024,
        // For sales chat we don't need chain-of-thought — a direct
        // answer with the catalog in context is enough. Disabling
        // saves tokens, latency, and prevents truncation.
        // (Models without thinking support silently ignore this.)
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

  // Surface MAX_TOKENS truncation in logs so it's not invisible — if it
  // fires, bump maxOutputTokens or shorten the catalog/system prompt.
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
  recipientPsid: string,
  text: string,
): Promise<void> {
  if (!IG_ACCESS_TOKEN) {
    throw new Error("IG_ACCESS_TOKEN not configured");
  }

  const trimmed =
    text.length > IG_REPLY_MAX_CHARS
      ? text.slice(0, IG_REPLY_MAX_CHARS - 1) + "…"
      : text;

  const url = `${IG_GRAPH_BASE}/me/messages?access_token=${encodeURIComponent(IG_ACCESS_TOKEN)}`;

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
  senderPsid: string,
  text: string,
  options: { sendReply?: boolean } = { sendReply: true },
): Promise<{ userMessage: string; reply: string; sent: boolean }> {
  const catalog = await loadCatalog();
  const reply = await askGemini(text, catalog);

  if (options.sendReply) {
    await sendInstagramMessage(senderPsid, reply);
    return { userMessage: text, reply, sent: true };
  }

  return { userMessage: text, reply, sent: false };
}
