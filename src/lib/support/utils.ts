export const SUPPORT_ATTACHMENT_BUCKET = "support-attachments";

export function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

export function normalizeEnumLabel(value: string | null | undefined) {
  const normalized = cleanText(value).toUpperCase();
  if (!normalized) return "UNKNOWN";
  return normalized;
}

export function toIsoOrNull(value: unknown) {
  const text = cleanText(value);
  if (!text) return null;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function formatSupportDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function supportStatusTone(status: string | null | undefined) {
  const normalized = normalizeEnumLabel(status);
  if (["NEW", "OPEN"].includes(normalized)) return "bg-blue-100 text-blue-700";
  if (["IN_PROGRESS", "ACTIVE"].includes(normalized)) return "bg-amber-100 text-amber-700";
  if (["WAITING_FOR_CUSTOMER", "PENDING_CUSTOMER"].includes(normalized)) return "bg-orange-100 text-orange-700";
  if (["RESOLVED", "DONE"].includes(normalized)) return "bg-emerald-100 text-emerald-700";
  if (["CLOSED", "CANCELLED", "CANCELED"].includes(normalized)) return "bg-slate-200 text-slate-700";
  return "bg-slate-100 text-slate-700";
}

export function supportPriorityTone(priority: string | null | undefined) {
  const normalized = normalizeEnumLabel(priority);
  if (["URGENT", "CRITICAL", "P1"].includes(normalized)) return "bg-rose-100 text-rose-700";
  if (["HIGH", "P2"].includes(normalized)) return "bg-orange-100 text-orange-700";
  if (["MEDIUM", "NORMAL", "P3"].includes(normalized)) return "bg-blue-100 text-blue-700";
  if (["LOW", "P4"].includes(normalized)) return "bg-slate-100 text-slate-700";
  return "bg-slate-100 text-slate-700";
}

export function sanitizeFileName(fileName: string) {
  const safe = fileName.replace(/[^\w.\-]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  return safe.slice(0, 180) || "attachment";
}

export function buildSupportAttachmentObjectPath(
  businessId: string,
  requestId: string,
  fileName: string,
) {
  return `${businessId}/${requestId}/${sanitizeFileName(fileName)}`;
}


