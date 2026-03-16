export type LocalActivityEventType =
  | "status_changed"
  | "label_added"
  | "label_removed"
  | "order_updated"
  | "manager_changed"
  | "comment_edited"
  | "comment_deleted"
  | "checklist_created"
  | "checklist_completed"
  | "checklist_deleted"
  | "file_uploaded"
  | "file_deleted";

export type ActivityPayloadValue = string | number | boolean | null;

export type LocalActivityEventPayload = {
  field?: string;
  from?: ActivityPayloadValue;
  to?: ActivityPayloadValue;
  fromLabel?: string | null;
  toLabel?: string | null;
  itemId?: string;
  itemTitle?: string;
  commentId?: string;
  edited?: boolean;
  fileName?: string;
  fileType?: string | null;
  fileSize?: number | null;
  previewUrl?: string | null;
  downloadUrl?: string | null;
  attachmentId?: string;
  attachment_id?: string;
  added?: string[];
  removed?: string[];
};

export type LocalActivityEvent = {
  id: string;
  type: LocalActivityEventType;
  actorName: string;
  actorRole?: string | null;
  description: string;
  ts: string;
  payload?: LocalActivityEventPayload;
};

export const ORDER_ACTIVITY_REFRESH_EVENT = "order-activity:refresh";

export function getActivityStorageKey(businessId: string, orderId: string) {
  return `order-activity:${businessId}:${orderId}`;
}

export function emitOrderActivityRefresh(businessId: string, orderId: string) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(ORDER_ACTIVITY_REFRESH_EVENT, {
      detail: { businessId, orderId },
    }),
  );
}

export function dedupeLocalActivityEvents(events: LocalActivityEvent[]) {
  const deduped: LocalActivityEvent[] = [];
  const seen = new Set<string>();

  for (const event of events) {
    if (!event?.id || seen.has(event.id)) continue;
    seen.add(event.id);
    deduped.push(event);
  }

  return deduped;
}

export function readLocalActivityEvents(businessId: string, orderId: string) {
  if (typeof window === "undefined") return [] as LocalActivityEvent[];

  try {
    const raw = window.localStorage.getItem(getActivityStorageKey(businessId, orderId));
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const deduped = dedupeLocalActivityEvents(parsed as LocalActivityEvent[]);
    if (deduped.length !== parsed.length) {
      window.localStorage.setItem(getActivityStorageKey(businessId, orderId), JSON.stringify(deduped));
    }

    return deduped;
  } catch {
    return [];
  }
}

export function appendLocalActivityEvent(businessId: string, orderId: string, event: LocalActivityEvent) {
  if (typeof window === "undefined") return;

  const next = dedupeLocalActivityEvents([...readLocalActivityEvents(businessId, orderId), event]).slice(-200);
  window.localStorage.setItem(getActivityStorageKey(businessId, orderId), JSON.stringify(next));
}

export function makeLocalActivityEventId(prefix: string) {
  const randomPart =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return `${prefix}-${randomPart}`;
}
