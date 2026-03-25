import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  SupportAssignmentRecord,
  SupportAttachmentRecord,
  SupportInternalNoteRecord,
  SupportRequestRecord,
  SupportStatusHistoryRecord,
  SupportSummaryCounters,
} from "@/lib/support/types";
import {
  SUPPORT_ATTACHMENT_BUCKET,
  cleanText,
  normalizeEnumLabel,
  toIsoOrNull,
} from "@/lib/support/utils";

type AnyRow = Record<string, unknown>;

function getFirstString(row: AnyRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    const text = cleanText(value);
    if (text) return text;
  }
  return null;
}

function getFirstNumber(row: AnyRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const parsed = Number(cleanText(value));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function getErrorMessage(error: unknown) {
  return cleanText((error as { message?: string } | null)?.message);
}

function isFetchFailedError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes("fetch failed") || message.includes("network");
}

async function withOneRetry<T>(operation: () => Promise<T>, fallbackMessage: string) {
  try {
    return await operation();
  } catch (error) {
    if (!isFetchFailedError(error)) throw error;
    await new Promise((resolve) => setTimeout(resolve, 200));
    try {
      return await operation();
    } catch (retryError) {
      throw new Error(getErrorMessage(retryError) || fallbackMessage);
    }
  }
}

function isMissingColumnError(error: unknown, column: string) {
  const message = getErrorMessage(error).toLowerCase();
  return (
    (message.includes("schema cache") && message.includes(column.toLowerCase())) ||
    (message.includes("column") &&
      message.includes(column.toLowerCase()) &&
      message.includes("does not exist"))
  );
}

function mapSupportRequest(row: AnyRow): SupportRequestRecord {
  return {
    id: getFirstString(row, ["id", "request_id"]) ?? "",
    businessId: getFirstString(row, ["business_id"]),
    businessLabel: getFirstString(row, ["business_name", "business_slug", "business_label", "business"]),
    type: getFirstString(row, ["type", "request_type"]),
    subject: getFirstString(row, ["subject"]),
    message: getFirstString(row, ["message", "description"]),
    status: getFirstString(row, ["status", "current_status"]),
    priority: getFirstString(row, ["priority", "request_priority"]),
    source: getFirstString(row, ["source", "request_source"]),
    contactEmail: getFirstString(row, ["contact_email", "email"]),
    contactPhone: getFirstString(row, ["contact_phone", "phone"]),
    createdAt: toIsoOrNull(row.created_at),
    updatedAt: toIsoOrNull(row.updated_at),
    firstResponseAt: toIsoOrNull(row.first_response_at),
    resolvedAt: toIsoOrNull(row.resolved_at),
    closedAt: toIsoOrNull(row.closed_at),
    submitterUserId: getFirstString(row, ["created_by_user_id", "submitter_user_id", "created_by"]),
    submitterLabel: getFirstString(row, ["submitter_name", "submitter_email", "created_by_email", "created_by_name"]),
    assignedUserId: getFirstString(row, ["assigned_to_user_id", "assignee_user_id", "assigned_user_id"]),
    assignedLabel: getFirstString(row, ["assigned_to_name", "assignee_name", "assigned_user_name"]),
  };
}

function parseAttachmentStorage(row: AnyRow) {
  const bucket = getFirstString(row, ["storage_bucket", "bucket"]) ?? SUPPORT_ATTACHMENT_BUCKET;
  const directObjectPath = getFirstString(row, ["storage_object_path", "object_path"]);
  if (directObjectPath) return { bucket, objectPath: directObjectPath };

  const storagePath = getFirstString(row, ["storage_path", "path"]) ?? "";
  if (!storagePath) return { bucket, objectPath: "" };
  if (storagePath.startsWith(`${bucket}/`)) {
    return { bucket, objectPath: storagePath.slice(bucket.length + 1) };
  }
  const [maybeBucket, ...rest] = storagePath.split("/");
  if (maybeBucket && rest.length > 0) {
    return { bucket: maybeBucket, objectPath: rest.join("/") };
  }
  return { bucket, objectPath: storagePath };
}

function mapAttachment(row: AnyRow): SupportAttachmentRecord {
  const storage = parseAttachmentStorage(row);
  return {
    id: getFirstString(row, ["id"]) ?? "",
    requestId: getFirstString(row, ["request_id", "support_request_id"]) ?? "",
    fileName: getFirstString(row, ["file_name", "filename", "original_name"]) ?? "attachment",
    mimeType: getFirstString(row, ["mime_type", "content_type"]),
    fileSize: getFirstNumber(row, ["file_size", "file_size_bytes", "size_bytes"]),
    bucket: storage.bucket,
    objectPath: storage.objectPath,
    createdAt: toIsoOrNull(row.created_at),
  };
}

function mapStatusHistory(row: AnyRow): SupportStatusHistoryRecord {
  return {
    id: getFirstString(row, ["id"]) ?? "",
    requestId: getFirstString(row, ["request_id", "support_request_id"]) ?? "",
    fromStatus: getFirstString(row, ["from_status", "old_status"]),
    toStatus: getFirstString(row, ["to_status", "new_status", "status"]),
    changedAt: toIsoOrNull(row.created_at ?? row.changed_at),
    changedByUserId: getFirstString(row, ["changed_by_user_id", "changed_by", "created_by_user_id"]),
    changedByLabel: getFirstString(row, ["changed_by_name", "changed_by_email", "created_by_name"]),
  };
}

function mapInternalNote(row: AnyRow): SupportInternalNoteRecord {
  return {
    id: getFirstString(row, ["id"]) ?? "",
    requestId: getFirstString(row, ["request_id", "support_request_id"]) ?? "",
    note:
      getFirstString(row, ["note", "message", "body", "internal_note"]) ??
      "",
    createdAt: toIsoOrNull(row.created_at),
    createdByUserId: getFirstString(row, ["created_by_user_id", "created_by", "user_id"]),
    createdByLabel: getFirstString(row, ["created_by_name", "created_by_email", "user_name"]),
  };
}

function mapAssignment(row: AnyRow): SupportAssignmentRecord {
  return {
    id: getFirstString(row, ["id"]) ?? "",
    requestId: getFirstString(row, ["request_id", "support_request_id"]) ?? "",
    assignedToUserId: getFirstString(row, ["assigned_to_user_id", "assignee_user_id", "assigned_user_id"]),
    assignedByUserId: getFirstString(row, ["assigned_by_user_id", "changed_by_user_id", "created_by_user_id"]),
    assignedToLabel: getFirstString(row, ["assigned_to_name", "assigned_to_email", "assignee_name"]),
    assignedByLabel: getFirstString(row, ["assigned_by_name", "assigned_by_email", "changed_by_name"]),
    createdAt: toIsoOrNull(row.created_at),
  };
}

async function fetchByRequestId(
  client: SupabaseClient,
  table: string,
  requestId: string,
  orderAscending = false,
) {
  const requestColumns = ["request_id", "support_request_id"];
  const orderColumns = ["created_at", "changed_at", "updated_at", "assigned_at"];

  async function runQuery(requestColumn: string, orderColumn: string | null) {
    let query = client
      .from(table)
      .select("*")
      .eq(requestColumn, requestId);

    if (orderColumn) {
      query = query.order(orderColumn, { ascending: orderAscending });
    }
    return await query;
  }

  for (const column of requestColumns) {
    for (const orderColumn of [...orderColumns, null]) {
      const { data, error } = await runQuery(column, orderColumn);
      if (!error) return (data ?? []) as AnyRow[];
      if (isMissingColumnError(error, column)) {
        break;
      }
      if (orderColumn && isMissingColumnError(error, orderColumn)) {
        continue;
      }
      throw new Error(getErrorMessage(error) || `Failed to load ${table}`);
    }
  }
  return [] as AnyRow[];
}

export async function fetchBusinessSupportRequests(
  client: SupabaseClient,
  options?: {
    search?: string;
    businessId?: string;
    limit?: number;
  },
) {
  const search = cleanText(options?.search);
  const limit = options?.limit ?? 100;
  let query = client
    .from("support_requests")
    .select("*")
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (options?.businessId) {
    query = query.eq("business_id", options.businessId);
  }

  if (search) {
    const escaped = search.replace(/,/g, " ").replace(/\./g, " ").trim();
    query = query.or(`subject.ilike.%${escaped}%,message.ilike.%${escaped}%`);
  }

  const { data, error } = await withOneRetry(() => query, "Failed to load support requests");
  if (error) throw new Error(getErrorMessage(error) || "Failed to load support requests");
  return ((data ?? []) as AnyRow[]).map(mapSupportRequest).filter((row) => row.id);
}

export async function fetchBusinessSupportRequestById(
  client: SupabaseClient,
  requestId: string,
) {
  const { data, error } = await withOneRetry(
    () =>
      client
        .from("support_requests")
        .select("*")
        .eq("id", requestId)
        .maybeSingle(),
    "Failed to load support request",
  );

  if (error) throw new Error(getErrorMessage(error) || "Failed to load support request");
  if (!data) return null;
  return mapSupportRequest(data as AnyRow);
}

export async function fetchSupportAttachments(
  client: SupabaseClient,
  requestId: string,
) {
  const rows = await fetchByRequestId(client, "support_request_attachments", requestId, true);
  return rows.map(mapAttachment).filter((row) => row.id && row.objectPath);
}

export async function fetchSupportStatusHistory(
  client: SupabaseClient,
  requestId: string,
) {
  const rows = await fetchByRequestId(client, "support_request_status_history", requestId, true);
  return rows.map(mapStatusHistory).filter((row) => row.id);
}

export async function fetchSupportInternalNotes(
  client: SupabaseClient,
  requestId: string,
) {
  const rows = await fetchByRequestId(client, "support_request_internal_notes", requestId, true);
  return rows.map(mapInternalNote).filter((row) => row.id);
}

export async function fetchSupportAssignments(
  client: SupabaseClient,
  requestId: string,
) {
  const rows = await fetchByRequestId(client, "support_request_assignments", requestId, true);
  return rows.map(mapAssignment).filter((row) => row.id);
}

function rowMatchesSearch(row: AnyRow, search: string) {
  const needle = search.toLowerCase();
  return [
    getFirstString(row, ["id", "request_id"]),
    getFirstString(row, ["subject"]),
    getFirstString(row, ["message"]),
    getFirstString(row, ["business_name", "business_slug", "business"]),
    getFirstString(row, ["submitter_email", "created_by_email", "submitter_name"]),
    getFirstString(row, ["status", "current_status"]),
    getFirstString(row, ["priority", "request_priority"]),
    getFirstString(row, ["type", "request_type"]),
  ]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

function rowDateInRange(row: AnyRow, from: string | null, to: string | null) {
  const createdAt = toIsoOrNull(row.created_at) ?? toIsoOrNull(row.updated_at);
  if (!createdAt) return true;
  const date = new Date(createdAt).getTime();
  if (!Number.isFinite(date)) return true;
  if (from) {
    const fromDate = new Date(from).getTime();
    if (Number.isFinite(fromDate) && date < fromDate) return false;
  }
  if (to) {
    const toDate = new Date(`${to}T23:59:59.999Z`).getTime();
    if (Number.isFinite(toDate) && date > toDate) return false;
  }
  return true;
}

export async function fetchAdminSupportList(
  client: SupabaseClient,
  filters?: {
    business?: string;
    type?: string;
    status?: string;
    priority?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  },
) {
  const { data, error } = await withOneRetry(
    () =>
      client
        .from("v_support_requests_admin")
        .select("*")
        .limit(filters?.limit ?? 1000),
    "Failed to load support admin view",
  );

  if (error) throw new Error(getErrorMessage(error) || "Failed to load support admin view");
  const rows = (data ?? []) as AnyRow[];
  const filtered = rows
    .filter((row) => {
      if (filters?.business) {
        const value = cleanText(filters.business).toLowerCase();
        const businessBlob = [
          getFirstString(row, ["business_id"]),
          getFirstString(row, ["business_name", "business_slug", "business"]),
        ]
          .join(" ")
          .toLowerCase();
        if (!businessBlob.includes(value)) return false;
      }
      if (filters?.type) {
        if (normalizeEnumLabel(getFirstString(row, ["type", "request_type"])) !== normalizeEnumLabel(filters.type)) {
          return false;
        }
      }
      if (filters?.status) {
        if (normalizeEnumLabel(getFirstString(row, ["status", "current_status"])) !== normalizeEnumLabel(filters.status)) {
          return false;
        }
      }
      if (filters?.priority) {
        if (normalizeEnumLabel(getFirstString(row, ["priority", "request_priority"])) !== normalizeEnumLabel(filters.priority)) {
          return false;
        }
      }
      if (filters?.search && !rowMatchesSearch(row, filters.search.trim().toLowerCase())) {
        return false;
      }
      if (!rowDateInRange(row, filters?.fromDate ?? null, filters?.toDate ?? null)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const updatedA = new Date(toIsoOrNull(a.updated_at) ?? toIsoOrNull(a.created_at) ?? 0).getTime();
      const updatedB = new Date(toIsoOrNull(b.updated_at) ?? toIsoOrNull(b.created_at) ?? 0).getTime();
      return updatedB - updatedA;
    });

  return filtered.map(mapSupportRequest).filter((row) => row.id);
}

function maybeCountFromSummaryRows(rows: AnyRow[], status: string) {
  const normalized = normalizeEnumLabel(status);
  for (const row of rows) {
    const rowStatus = normalizeEnumLabel(getFirstString(row, ["status", "request_status"]));
    if (rowStatus === normalized) {
      const count = getFirstNumber(row, ["count", "total", "requests_count"]);
      if (typeof count === "number") return count;
    }
  }
  return 0;
}

export async function fetchAdminSupportSummary(
  client: SupabaseClient,
  fallbackList?: SupportRequestRecord[],
) {
  const { data, error } = await withOneRetry(
    () => client.from("v_support_requests_summary").select("*"),
    "Failed to load support summary",
  );
  if (!error && (data ?? []).length > 0) {
    const rows = (data ?? []) as AnyRow[];
    if (rows.length === 1) {
      const row = rows[0];
      const total = getFirstNumber(row, ["total", "total_requests"]) ?? 0;
      const newCount = getFirstNumber(row, ["new", "new_count"]) ?? maybeCountFromSummaryRows(rows, "NEW");
      const inProgress =
        getFirstNumber(row, ["in_progress", "in_progress_count"]) ?? maybeCountFromSummaryRows(rows, "IN_PROGRESS");
      const waiting =
        getFirstNumber(row, ["waiting_for_customer", "waiting_count"]) ??
        maybeCountFromSummaryRows(rows, "WAITING_FOR_CUSTOMER");
      const resolved = getFirstNumber(row, ["resolved", "resolved_count"]) ?? maybeCountFromSummaryRows(rows, "RESOLVED");
      return {
        total,
        new: newCount,
        inProgress,
        waitingForCustomer: waiting,
        resolved,
      } satisfies SupportSummaryCounters;
    }

    const total = rows.reduce((sum, row) => sum + (getFirstNumber(row, ["count", "total", "requests_count"]) ?? 0), 0);
    return {
      total,
      new: maybeCountFromSummaryRows(rows, "NEW"),
      inProgress: maybeCountFromSummaryRows(rows, "IN_PROGRESS"),
      waitingForCustomer: maybeCountFromSummaryRows(rows, "WAITING_FOR_CUSTOMER"),
      resolved: maybeCountFromSummaryRows(rows, "RESOLVED"),
    } satisfies SupportSummaryCounters;
  }

  const items = fallbackList ?? [];
  return {
    total: items.length,
    new: items.filter((item) => normalizeEnumLabel(item.status) === "NEW").length,
    inProgress: items.filter((item) => normalizeEnumLabel(item.status) === "IN_PROGRESS").length,
    waitingForCustomer: items.filter((item) => normalizeEnumLabel(item.status) === "WAITING_FOR_CUSTOMER").length,
    resolved: items.filter((item) => normalizeEnumLabel(item.status) === "RESOLVED").length,
  } satisfies SupportSummaryCounters;
}
