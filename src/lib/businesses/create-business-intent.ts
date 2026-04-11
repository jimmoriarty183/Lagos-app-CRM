const STORAGE_KEY = "ordo:create-business:intent:v1";
const INTENT_TTL_MS = 1000 * 60 * 60 * 2;

export type CreateBusinessDraft = {
  business_name: string;
  business_segment?: string;
};

export type CreateBusinessIntent = {
  kind: "create_business";
  created_at: number;
  expires_at: number;
  retry_count: number;
  upgrade_started_at: number | null;
  last_retry_at: number | null;
  draft: CreateBusinessDraft;
};

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.sessionStorage);
}

export function saveCreateBusinessIntent(draft: CreateBusinessDraft) {
  if (!canUseStorage()) return;
  const now = Date.now();
  const intent: CreateBusinessIntent = {
    kind: "create_business",
    created_at: now,
    expires_at: now + INTENT_TTL_MS,
    retry_count: 0,
    upgrade_started_at: null,
    last_retry_at: null,
    draft,
  };
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(intent));
}

export function readCreateBusinessIntent(): CreateBusinessIntent | null {
  if (!canUseStorage()) return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CreateBusinessIntent>;
    if (
      parsed.kind !== "create_business" ||
      typeof parsed.created_at !== "number" ||
      typeof parsed.expires_at !== "number" ||
      !parsed.draft ||
      typeof parsed.draft.business_name !== "string"
    ) {
      clearCreateBusinessIntent();
      return null;
    }
    if (Date.now() > parsed.expires_at) {
      clearCreateBusinessIntent();
      return null;
    }
    return {
      kind: "create_business",
      created_at: parsed.created_at,
      expires_at: parsed.expires_at,
      retry_count:
        typeof parsed.retry_count === "number" && parsed.retry_count >= 0
          ? parsed.retry_count
          : 0,
      upgrade_started_at:
        typeof parsed.upgrade_started_at === "number" ? parsed.upgrade_started_at : null,
      last_retry_at:
        typeof parsed.last_retry_at === "number" ? parsed.last_retry_at : null,
      draft: {
        business_name: parsed.draft.business_name,
        business_segment:
          typeof parsed.draft.business_segment === "string"
            ? parsed.draft.business_segment
            : undefined,
      },
    };
  } catch {
    clearCreateBusinessIntent();
    return null;
  }
}

export function markCreateBusinessIntentRetry() {
  const intent = readCreateBusinessIntent();
  if (!intent || !canUseStorage()) return;
  const nextIntent: CreateBusinessIntent = {
    ...intent,
    retry_count: intent.retry_count + 1,
    last_retry_at: Date.now(),
  };
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextIntent));
}

export function markCreateBusinessIntentUpgradeStarted() {
  const intent = readCreateBusinessIntent();
  if (!intent || !canUseStorage()) return;
  const nextIntent: CreateBusinessIntent = {
    ...intent,
    upgrade_started_at: Date.now(),
  };
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextIntent));
}

export function clearCreateBusinessIntent() {
  if (!canUseStorage()) return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}
