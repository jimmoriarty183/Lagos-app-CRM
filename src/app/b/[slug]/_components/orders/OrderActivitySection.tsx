"use client";

import * as React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AtSign,
  CalendarClock,
  CheckCircle2,
  CornerUpLeft,
  ChevronDown,
  Clock3,
  Download,
  Eye,
  FileText,
  MessageSquareText,
  Paperclip,
  Pencil,
  Send,
  Smile,
  Tag,
  ThumbsUp,
  Trash2,
  UserRound,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OrderAttachmentLightbox } from "@/app/b/[slug]/_components/orders/OrderAttachmentLightbox";
import { cn } from "@/components/ui/utils";
import { formatFollowUpDate } from "@/lib/follow-ups";
import {
  appendLocalActivityEvent,
  ORDER_ACTIVITY_REFRESH_EVENT,
  makeLocalActivityEventId,
  readLocalActivityEvents,
  type LocalActivityEvent,
  type LocalActivityEventType,
  type LocalActivityEventPayload,
} from "@/app/b/[slug]/_components/orders/order-activity";

type TeamActor = { id: string; label: string; kind: "OWNER" | "MANAGER"; avatar_url?: string | null };
type ReplySnapshot = {
  id?: string;
  kind?: "comment" | "file";
  authorName?: string;
  body?: string;
  fileName?: string;
  fileType?: string | null;
};
type OrderRow = {
  id: string;
  amount: number;
  created_at: string;
  created_by?: string | null;
  created_by_name?: string | null;
  created_by_role?: "OWNER" | "MANAGER" | null;
  due_date: string | null;
  manager_id: string | null;
  manager_name: string | null;
};
type CommentRow = {
  id: string;
  body: string;
  author_name: string | null;
  author_phone: string | null;
  author_role: string | null;
  author_user_id: string | null;
  created_at: string;
  reply_to_comment_id?: string | null;
  reply_snapshot?: ReplySnapshot | null;
};
type ChecklistActivityRow = {
  id: string;
  title: string;
  created_at: string;
  done_at: string | null;
  is_done: boolean;
  created_by: string | null;
  completed_by: string | null;
};
type ActivityEventRow = {
  id: string;
  event_type:
    | "checklist.created"
    | "checklist.created_again"
    | "checklist.completed"
    | "checklist.reopened"
    | "checklist.deleted"
    | "follow_up.created"
    | "follow_up.rescheduled"
    | "follow_up.completed"
    | "follow_up.completed_with_note"
    | "follow_up.completed_and_next_created"
    | "follow_up.reopened"
    | "follow_up.cancelled";
  actor_id: string | null;
  actor_type: "user" | "system";
  payload: LocalActivityEventPayload | null;
  created_at: string;
};
type ActivityAttachmentRow = {
  id: string;
  business_id?: string;
  entity_type?: string | null;
  entity_id?: string | null;
  order_id?: string | null;
  uploaded_by?: string | null;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  file_size: number | null;
  extra?: Record<string, unknown> | null;
  created_at: string;
};
type ReactionRow = {
  id: string;
  comment_id: string;
  user_id: string;
  user_name: string;
  emoji: string;
};
type Props = {
  order: OrderRow;
  businessId: string;
  supabase: SupabaseClient;
  phoneRaw: string;
  currentUserId?: string | null;
  currentUserName: string;
  userRole: "OWNER" | "MANAGER" | "GUEST";
  actors: TeamActor[];
  ownerName?: string | null;
  managerName?: string | null;
  compact?: boolean;
};

type FilterValue = "all" | "comments" | "updates" | "files" | "followups";
type SortValue = "conversation" | "newest";
type ComposerAttachment = { id: string; file: File };
type ReplyTarget = {
  id: string;
  kind: "comment" | "file";
  label: string;
  preview: string;
};
type TimelineComment = {
  id: string;
  kind: "comment";
  createdAt: string;
  actorName: string;
  actorRole?: string | null;
  actorAvatarUrl?: string | null;
  body: string;
  isOwnComment: boolean;
  edited?: boolean;
  editPayload?: LocalActivityEventPayload;
  replyToCommentId?: string | null;
  replySnapshot?: ReplySnapshot | null;
};
type TimelineEvent = {
  id: string;
  kind: "event";
  createdAt: string;
  actorName: string;
  actorRole?: string | null;
  eventType:
    | LocalActivityEventType
    | "order_created"
    | "manager_assigned"
    | "due_date_set";
  title: string;
  detail?: string;
  tone: "default" | "success" | "warning" | "muted";
  payload?: LocalActivityEventPayload;
};
type TimelineItem = TimelineComment | TimelineEvent;

async function fetchChecklistActivityRows(
  supabase: SupabaseClient,
  orderId: string,
): Promise<ChecklistActivityRow[]> {
  const result = await supabase
    .from("order_checklist_items")
    .select("id, title, created_at, done_at, is_done, created_by, completed_by")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (!result.error) return (result.data ?? []) as ChecklistActivityRow[];

  const message = String(result.error.message ?? "").toLowerCase();
  const missingCreatedBy =
    message.includes("could not find the 'created_by' column") &&
    message.includes("schema cache");
  const missingCompletedBy =
    message.includes("could not find the 'completed_by' column") &&
    message.includes("schema cache");
  if (!missingCreatedBy && !missingCompletedBy) return [];

  const fallback = await supabase
    .from("order_checklist_items")
    .select("id, title, created_at, done_at, is_done")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  return (
    (fallback.data ?? []) as Array<
      Omit<ChecklistActivityRow, "created_by" | "completed_by">
    >
  ).map((row) => ({
    ...row,
    created_by: null,
    completed_by: null,
  }));
}

function normalizeRole(
  role: string | null | undefined,
): "OWNER" | "MANAGER" | "GUEST" {
  const value = String(role ?? "")
    .trim()
    .toUpperCase();
  if (value === "OWNER") return "OWNER";
  if (value === "MANAGER") return "MANAGER";
  return "GUEST";
}

function getInitials(value: string) {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateSeparator(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Older";
  const today = new Date();
  const startToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();
  const startTarget = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
  const delta = Math.round((startToday - startTarget) / 86400000);
  if (delta === 0) return "Today";
  if (delta === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getDateKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function getRoleBadge(role: "OWNER" | "MANAGER" | "GUEST") {
  if (role === "OWNER")
    return {
      label: "Owner",
      className:
        "border-[var(--brand-200)] bg-[var(--brand-50)] text-[var(--brand-600)]",
    };
  if (role === "MANAGER")
    return {
      label: "Manager",
      className: "border-[#E5E7EB] bg-[#F9FAFB] text-[#4B5563]",
    };
  return {
    label: "Guest",
    className: "border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280]",
  };
}

function resolveAuthorName(
  comment: CommentRow,
  currentPhone: string,
  currentUserName: string,
  ownerName?: string | null,
  managerName?: string | null,
) {
  const commentPhone = comment.author_phone?.trim() ?? "";
  if (
    commentPhone &&
    currentPhone &&
    commentPhone === currentPhone &&
    currentUserName.trim()
  )
    return currentUserName.trim();
  const role = normalizeRole(comment.author_role);
  if (role === "MANAGER")
    return managerName?.trim() || commentPhone || "Manager";
  if (role === "OWNER") return ownerName?.trim() || "Owner";
  return commentPhone || "Guest";
}

function replaceMentionToken(
  text: string,
  selectionStart: number,
  label: string,
) {
  const token = `@[${label}]`;
  const before = text.slice(0, selectionStart);
  const after = text.slice(selectionStart);
  const match = before.match(/(^|\s)@([^\s@]*)$/);
  if (!match) {
    const inserted = `${text}${token} `;
    return { value: inserted, caret: inserted.length };
  }
  const tokenStart = before.length - match[0].length + match[1].length;
  const value = `${text.slice(0, tokenStart)}${token} ${after}`;
  return { value, caret: tokenStart + token.length + 1 };
}

/** Replace display names with UUIDs before saving to DB */
function serializeMentions(
  text: string,
  mentionMap: Map<string, string>,
) {
  return text.replace(/@\[([^\]]+)\]/g, (_match, name: string) => {
    const id = mentionMap.get(name);
    return id ? `@[${id}]` : `@[${name}]`;
  });
}

function getMentionQuery(text: string, selectionStart: number) {
  const before = text.slice(0, selectionStart);
  const match = before.match(/(^|\s)@([^\s@\]]*)$/);
  return match ? match[2] : null;
}

function renderRichText(
  text: string,
  actorNames?: Map<string, string>,
) {
  return text.split(/(@\[[^\]]+\])/g).map((part, index) => {
    const match = part.match(/^@\[(.+)\]$/);
    if (!match)
      return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
    const raw = match[1];
    // Resolve UUID to name, fall back to raw value (supports legacy @[Name] format)
    const isUuid = /^[a-f0-9-]{36}$/.test(raw);
    const displayName = isUuid ? (actorNames?.get(raw) ?? raw) : raw;
    return (
      <span
        key={`${part}-${index}`}
        className="inline-flex rounded-md bg-[var(--brand-50)] px-1.5 py-0.5 text-[0.95em] font-medium text-[var(--brand-600)]"
      >
        @{displayName}
      </span>
    );
  });
}

function resolveMentionsPlain(
  text: string,
  actorNames?: Map<string, string>,
) {
  return text.replace(/@\[([^\]]+)\]/g, (_m, raw: string) => {
    if (/^[a-f0-9-]{36}$/.test(raw)) {
      const name = actorNames?.get(raw);
      return name ? `@${name}` : "@mention";
    }
    return `@${raw}`;
  });
}

function getCompactPreview(
  text: string,
  actorNames?: Map<string, string>,
) {
  const resolved = resolveMentionsPlain(text, actorNames);
  const compact = resolved.replace(/\s+/g, " ").trim();
  if (compact.length <= 120) return compact;
  return `${compact.slice(0, 117).trimEnd()}...`;
}

function formatFileSize(value: number | null | undefined) {
  if (!value || value <= 0) return null;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getAttachmentPayloadId(payload?: LocalActivityEventPayload) {
  return payload?.attachmentId || payload?.attachment_id || null;
}

function buildAttachmentAccessUrl(attachmentId: string, download?: boolean) {
  const params = new URLSearchParams();
  if (download) params.set("download", "1");
  const query = params.toString();
  return `/api/activity-attachments/${attachmentId}${query ? `?${query}` : ""}`;
}

function toReplySnapshot(target: ReplyTarget): ReplySnapshot {
  return target.kind === "file"
    ? {
        id: target.id,
        kind: "file",
        fileName: target.label,
        body: target.preview,
      }
    : {
        id: target.id,
        kind: "comment",
        authorName: target.label,
        body: target.preview,
      };
}

function getReplyPreviewContent(snapshot: ReplySnapshot | null | undefined) {
  if (!snapshot) return null;
  if (snapshot.kind === "file") {
    return {
      label: snapshot.fileName || "Attachment",
      preview: snapshot.body || snapshot.fileType || "File attachment",
    };
  }

  return {
    label: snapshot.authorName || "Comment",
    preview: snapshot.body || "",
  };
}

function createEvent(
  id: string,
  createdAt: string,
  actorName: string,
  actorRole: string | null | undefined,
  eventType: TimelineEvent["eventType"],
  title: string,
  detail: string | undefined,
  tone: TimelineEvent["tone"],
  payload?: LocalActivityEventPayload,
): TimelineEvent {
  return {
    id,
    kind: "event",
    createdAt,
    actorName,
    actorRole,
    eventType,
    title,
    detail,
    tone,
    payload,
  };
}

function isFileEvent(item: TimelineItem) {
  return (
    item.kind === "event" &&
    (item.eventType === "file_uploaded" || item.eventType === "file_deleted")
  );
}

function isFollowUpEvent(item: TimelineItem) {
  return (
    item.kind === "event" &&
    (item.eventType === "follow_up_created" ||
      item.eventType === "follow_up_completed" ||
      item.eventType === "follow_up_completed_with_note" ||
      item.eventType === "follow_up_completed_and_next_created" ||
      item.eventType === "follow_up_rescheduled" ||
      item.eventType === "follow_up_reopened" ||
      item.eventType === "follow_up_cancelled")
  );
}

function mapAuditEventType(
  eventType: ActivityEventRow["event_type"],
): LocalActivityEventType {
  if (eventType === "checklist.created") return "checklist_created";
  if (eventType === "checklist.created_again") return "checklist_created_again";
  if (eventType === "checklist.completed") return "checklist_completed";
  if (eventType === "checklist.reopened") return "checklist_reopened";
  if (eventType === "follow_up.created") return "follow_up_created";
  if (eventType === "follow_up.rescheduled") return "follow_up_rescheduled";
  if (eventType === "follow_up.completed") return "follow_up_completed";
  if (eventType === "follow_up.completed_with_note")
    return "follow_up_completed_with_note";
  if (eventType === "follow_up.completed_and_next_created")
    return "follow_up_completed_and_next_created";
  if (eventType === "follow_up.reopened") return "follow_up_reopened";
  if (eventType === "follow_up.cancelled") return "follow_up_cancelled";
  return "checklist_deleted";
}

function mapServerActivityEvent(
  event: ActivityEventRow,
  actorById: Map<string, TeamActor>,
): TimelineEvent {
  const payload = (event.payload ?? {}) as LocalActivityEventPayload;
  const itemTitle =
    typeof payload.itemTitle === "string" && payload.itemTitle.trim()
      ? payload.itemTitle.trim()
      : typeof (payload as Record<string, unknown>).title === "string" &&
          String((payload as Record<string, unknown>).title).trim()
        ? String((payload as Record<string, unknown>).title).trim()
        : undefined;
  const followUpTitle =
    typeof payload.followUpTitle === "string" && payload.followUpTitle.trim()
      ? payload.followUpTitle.trim()
      : typeof (payload as Record<string, unknown>).title === "string" &&
          String((payload as Record<string, unknown>).title).trim()
        ? String((payload as Record<string, unknown>).title).trim()
        : itemTitle;
  const actor = event.actor_id ? actorById.get(event.actor_id) : null;
  const actorName =
    event.actor_type === "system" ? "System" : (actor?.label ?? "Team member");
  const actorRole =
    event.actor_type === "system" ? null : (actor?.kind ?? null);
  const mappedType = mapAuditEventType(event.event_type);

  if (mappedType === "follow_up_rescheduled") {
    return createEvent(
      event.id,
      event.created_at,
      actorName,
      actorRole,
      mappedType,
      "Follow-up rescheduled",
      `${formatFollowUpDate(String((payload as Record<string, unknown>).previous_due_date ?? payload.previousDueDate ?? ""))} -> ${formatFollowUpDate(String((payload as Record<string, unknown>).new_due_date ?? payload.newDueDate ?? ""))}`,
      "warning",
      payload,
    );
  }

  if (mappedType === "follow_up_completed_with_note") {
    return createEvent(
      event.id,
      event.created_at,
      actorName,
      actorRole,
      mappedType,
      "Follow-up completed with note",
      String(
        (payload as Record<string, unknown>).completion_note ?? "",
      ).trim() || followUpTitle,
      "success",
      payload,
    );
  }

  if (mappedType === "follow_up_completed_and_next_created") {
    return createEvent(
      event.id,
      event.created_at,
      actorName,
      actorRole,
      mappedType,
      "Follow-up completed and next created",
      String(
        (payload as Record<string, unknown>).next_follow_up_title ??
          followUpTitle ??
          "",
      ),
      "success",
      payload,
    );
  }

  if (
    mappedType === "follow_up_created" ||
    mappedType === "follow_up_completed" ||
    mappedType === "follow_up_reopened" ||
    mappedType === "follow_up_cancelled"
  ) {
    return createEvent(
      event.id,
      event.created_at,
      actorName,
      actorRole,
      mappedType,
      mappedType === "follow_up_created"
        ? "Follow-up created"
        : mappedType === "follow_up_completed"
          ? "Follow-up completed"
          : mappedType === "follow_up_reopened"
            ? "Follow-up reopened"
            : "Follow-up cancelled",
      followUpTitle,
      mappedType === "follow_up_completed"
        ? "success"
        : mappedType === "follow_up_cancelled"
          ? "muted"
          : "warning",
      payload,
    );
  }

  if (mappedType === "checklist_completed") {
    return createEvent(
      event.id,
      event.created_at,
      actorName,
      actorRole,
      mappedType,
      "Completed checklist item",
      itemTitle,
      "success",
      payload,
    );
  }

  if (mappedType === "checklist_reopened") {
    return createEvent(
      event.id,
      event.created_at,
      actorName,
      actorRole,
      mappedType,
      "Reopened checklist item",
      itemTitle,
      "warning",
      payload,
    );
  }

  if (mappedType === "checklist_deleted") {
    return createEvent(
      event.id,
      event.created_at,
      actorName,
      actorRole,
      mappedType,
      "Deleted checklist item",
      itemTitle,
      "muted",
      payload,
    );
  }

  return createEvent(
    event.id,
    event.created_at,
    actorName,
    actorRole,
    mappedType,
    "Added checklist item",
    itemTitle,
    "muted",
    payload,
  );
}

function resolveChecklistActor(
  actorId: string | null | undefined,
  actorById: Map<string, TeamActor>,
) {
  if (!actorId)
    return { actorName: "Team member", actorRole: null as string | null };
  const actor = actorById.get(actorId);
  return {
    actorName: actor?.label ?? "Team member",
    actorRole: actor?.kind ?? null,
  };
}

function mapLocalEvent(event: LocalActivityEvent): TimelineEvent {
  if (event.type === "status_changed") {
    const match = event.description.match(
      /^changed status from "(.+)" to "(.+)"$/i,
    );
    return createEvent(
      event.id,
      event.ts,
      event.actorName,
      event.actorRole,
      event.type,
      "Status changed",
      match ? `${match[1]} -> ${match[2]}` : event.description,
      "default",
      event.payload ?? {
        field: "status",
        fromLabel: match?.[1] ?? null,
        toLabel: match?.[2] ?? null,
      },
    );
  }
  if (event.type === "manager_changed") {
    const match = event.description.match(
      /^changed manager from "(.+)" to "(.+)"$/i,
    );
    return createEvent(
      event.id,
      event.ts,
      event.actorName,
      event.actorRole,
      event.type,
      "Manager changed",
      match ? `${match[1]} -> ${match[2]}` : event.description,
      "warning",
      event.payload ?? {
        field: "manager_id",
        fromLabel: match?.[1] ?? null,
        toLabel: match?.[2] ?? null,
      },
    );
  }
  if (event.type === "label_added" || event.type === "label_removed") {
    const match = event.description.match(/^.+? label "(.+)"$/i);
    return createEvent(
      event.id,
      event.ts,
      event.actorName,
      event.actorRole,
      event.type,
      event.type === "label_added" ? "Tag added" : "Tag removed",
      match?.[1] ?? event.description,
      event.type === "label_added" ? "success" : "muted",
      event.payload ?? {
        field: "tags",
        added:
          event.type === "label_added"
            ? [match?.[1] ?? event.description]
            : undefined,
        removed:
          event.type === "label_removed"
            ? [match?.[1] ?? event.description]
            : undefined,
      },
    );
  }
  if (event.type === "file_uploaded" || event.type === "file_deleted") {
    return createEvent(
      event.id,
      event.ts,
      event.actorName,
      event.actorRole,
      event.type,
      event.type === "file_uploaded" ? "File uploaded" : "File deleted",
      event.description
        .replace(/^uploaded file /i, "")
        .replace(/^deleted file /i, ""),
      event.type === "file_uploaded" ? "success" : "muted",
      event.payload ?? {
        fileName: event.description
          .replace(/^uploaded file /i, "")
          .replace(/^deleted file /i, ""),
      },
    );
  }
  if (event.type === "comment_edited" || event.type === "comment_deleted") {
    return createEvent(
      event.id,
      event.ts,
      event.actorName,
      event.actorRole,
      event.type,
      event.type === "comment_edited" ? "Comment edited" : "Comment deleted",
      event.description,
      "muted",
      event.payload,
    );
  }
  if (
    event.type === "checklist_created" ||
    event.type === "checklist_created_again" ||
    event.type === "checklist_completed" ||
    event.type === "checklist_reopened" ||
    event.type === "checklist_deleted"
  ) {
    const title =
      event.type === "checklist_completed"
        ? "Completed checklist item"
        : event.type === "checklist_reopened"
          ? "Reopened checklist item"
          : event.type === "checklist_deleted"
            ? "Deleted checklist item"
            : "Added checklist item";
    return createEvent(
      event.id,
      event.ts,
      event.actorName,
      event.actorRole,
      event.type,
      title,
      event.description,
      event.type === "checklist_completed"
        ? "success"
        : event.type === "checklist_reopened"
          ? "warning"
          : "muted",
      event.payload,
    );
  }
  if (
    event.type === "follow_up_created" ||
    event.type === "follow_up_completed" ||
    event.type === "follow_up_completed_with_note" ||
    event.type === "follow_up_completed_and_next_created" ||
    event.type === "follow_up_rescheduled" ||
    event.type === "follow_up_reopened" ||
    event.type === "follow_up_cancelled"
  ) {
    const followUpTitle =
      event.payload?.followUpTitle ||
      event.payload?.itemTitle ||
      event.description
        .replace(/^(created|completed|reopened|cancelled) follow-up /i, "")
        .replace(/^"|"$/g, "");
    const title =
      event.type === "follow_up_created"
        ? "Follow-up created"
        : event.type === "follow_up_completed"
          ? "Follow-up completed"
          : event.type === "follow_up_completed_with_note"
            ? "Follow-up completed with note"
            : event.type === "follow_up_completed_and_next_created"
              ? "Follow-up completed and next created"
              : event.type === "follow_up_rescheduled"
                ? "Follow-up rescheduled"
                : event.type === "follow_up_reopened"
                  ? "Follow-up reopened"
                  : "Follow-up cancelled";
    const tone =
      event.type === "follow_up_completed" ||
      event.type === "follow_up_completed_with_note" ||
      event.type === "follow_up_completed_and_next_created"
        ? "success"
        : event.type === "follow_up_cancelled"
          ? "muted"
          : "warning";

    return createEvent(
      event.id,
      event.ts,
      event.actorName,
      event.actorRole,
      event.type,
      title,
      followUpTitle,
      tone,
      event.payload,
    );
  }
  const match = event.description.match(/^changed (.+?) from (.+) to (.+)$/i);
  return createEvent(
    event.id,
    event.ts,
    event.actorName,
    event.actorRole,
    event.type,
    match
      ? `${match[1].replace(/(^|\s)\w/g, (letter) => letter.toUpperCase())} changed`
      : "Order updated",
    match ? `${match[2]} -> ${match[3]}` : event.description,
    "default",
    event.payload ?? {
      field: match?.[1],
      fromLabel: match?.[2] ?? null,
      toLabel: match?.[3] ?? null,
    },
  );
}

function formatAuditValue(
  value: LocalActivityEventPayload["from"],
  label?: string | null,
  field?: string,
) {
  if (label !== undefined && label !== null && String(label).trim())
    return String(label);
  if (
    field === "amount" &&
    value !== null &&
    value !== undefined &&
    value !== ""
  ) {
    const amount = typeof value === "number" ? value : Number(value);
    if (!Number.isNaN(amount)) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    }
  }
  if (typeof value === "boolean") return value ? "Checked" : "Unchecked";
  if (value === null || value === undefined || value === "") return "Empty";
  return String(value);
}

function formatFieldLabel(field?: string) {
  if (!field) return "Updated field";
  const aliases: Record<string, string> = {
    status: "Status",
    manager_id: "Manager",
    due_date: "Due date",
    first_name: "First name",
    last_name: "Last name",
    phone: "Phone",
    amount: "Amount",
    description: "Description",
    tags: "Tags",
    completed: "Checklist status",
    checklist_item: "Checklist item",
    follow_up: "Follow-up",
  };
  if (aliases[field]) return aliases[field];
  return field
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ActivityHeader({
  totalCount,
  commentCount,
  updateCount,
  fileCount,
  followUpCount,
  filter,
  setFilter,
  sort,
  setSort,
  compact = false,
}: {
  totalCount: number;
  commentCount: number;
  updateCount: number;
  fileCount: number;
  followUpCount: number;
  filter: FilterValue;
  setFilter: (value: FilterValue) => void;
  sort: SortValue;
  setSort: (value: SortValue) => void;
  compact?: boolean;
}) {
  const filters: Array<{ value: FilterValue; label: string; count: number }> = [
    { value: "all", label: "All", count: totalCount },
    { value: "comments", label: "Comments", count: commentCount },
    { value: "updates", label: "Updates", count: updateCount },
    { value: "followups", label: "Follow-ups", count: followUpCount },
    { value: "files", label: "Files", count: fileCount },
  ];

  return (
    <div
      className={cn(
        "border border-[#E5E7EB] bg-[linear-gradient(180deg,#ffffff_0%,#F9FAFB_100%)] shadow-[0_8px_20px_rgba(15,23,42,0.05)]",
        compact ? "rounded-[14px] px-2.5 py-1.5" : "rounded-[20px] px-3 py-2.5",
      )}
    >
      <div
        className={cn(
          "flex flex-col lg:flex-row lg:items-center lg:justify-between",
          compact ? "gap-1.5" : "gap-2",
        )}
      >
        <div className="min-w-0">
          <div
            className={cn(
              "flex items-center gap-2 font-semibold text-[#1F2937]",
              compact ? "text-[13px]" : "text-sm",
            )}
          >
            <CalendarClock className="h-4 w-4 text-[#6B7280]" />
            Activity
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            setSort(sort === "conversation" ? "newest" : "conversation")
          }
          className={cn(
            "inline-flex items-center gap-1.5 self-start rounded-full border border-[#E5E7EB] bg-white font-semibold text-[#374151] transition hover:border-[#C7D2FE] hover:bg-[#F9FAFB]",
            compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1 text-xs",
          )}
        >
          <Clock3 className="h-3.5 w-3.5 text-[#6B7280]" />
          {sort === "conversation" ? "Newest first" : "Conversation view"}
        </button>
      </div>
      <div
        className={cn(
          "mt-1.5 flex flex-wrap items-center",
          compact ? "gap-1" : "gap-1.5",
        )}
      >
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={cn(
              "inline-flex items-center rounded-full border font-semibold transition",
              compact
                ? "gap-1 px-2 py-0.5 text-[10px]"
                : "gap-1.5 px-2.5 py-1 text-[11px]",
              filter === item.value
                ? "border-[var(--brand-200)] bg-[var(--brand-50)] text-[var(--brand-600)]"
                : "border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#C7D2FE] hover:text-[#374151]",
            )}
          >
            <span>{item.label}</span>
            <span
              className={cn(
                compact
                  ? "rounded-full px-1.5 py-0.5 text-[10px]"
                  : "rounded-full px-1.5 py-0.5 text-[11px]",
                filter === item.value
                  ? "bg-white/80 text-[var(--brand-600)]"
                  : "bg-[#F3F4F6] text-[#6B7280]",
              )}
            >
              {item.count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

const EMOJI_LIST = [
  "😀","😂","🥹","😍","🤔","👍","👎","🙏","🔥","❤️",
  "✅","❌","⭐","🎉","💯","👀","🚀","💪","😎","🤝",
  "📎","📌","⚡","💡","🏷️","📝","🗓️","📦","🛠️","✨",
];

function EmojiPicker({
  onSelect,
  compact = false,
}: {
  onSelect: (emoji: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#1F2937]",
          compact ? "h-6 w-6" : "h-8 w-8",
        )}
        aria-label="Emoji"
      >
        <Smile className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>
      {open ? (
        <div className="absolute bottom-full right-0 z-20 mb-1 grid w-[220px] grid-cols-10 gap-0.5 rounded-xl border border-[#E5E7EB] bg-white p-1.5 shadow-[0_-8px_24px_rgba(15,23,42,0.12)]">
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onSelect(emoji);
                setOpen(false);
              }}
              className="flex h-[26px] w-[20px] items-center justify-center rounded text-sm transition hover:bg-[#F3F4F6]"
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CommentComposer({
  value,
  onChange,
  onSubmit,
  isSubmitting,
  currentUserName,
  currentUserAvatarUrl,
  canWrite,
  attachments,
  onAttachFiles,
  onRemoveAttachment,
  mentionSuggestions,
  replyTarget,
  onClearReply,
  compact = false,
  mentionMapRef,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  currentUserName: string;
  currentUserAvatarUrl?: string | null;
  canWrite: boolean;
  attachments: ComposerAttachment[];
  onAttachFiles: (files: FileList | null) => void;
  onRemoveAttachment: (id: string) => void;
  mentionSuggestions: TeamActor[];
  replyTarget: ReplyTarget | null;
  onClearReply: () => void;
  compact?: boolean;
  mentionMapRef?: React.MutableRefObject<Map<string, string>>;
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [mentionQuery, setMentionQuery] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState(false);
  const filteredMentions = React.useMemo(() => {
    if (mentionQuery === null) return [];
    const query = mentionQuery.trim().toLowerCase();
    if (!query) return mentionSuggestions.slice(0, 5);
    return mentionSuggestions
      .filter((actor) => actor.label.toLowerCase().includes(query))
      .slice(0, 5);
  }, [mentionQuery, mentionSuggestions]);
  const submitDisabled =
    (!value.trim() && attachments.length === 0) || isSubmitting || !canWrite;

  React.useEffect(() => {
    if (value.trim() || attachments.length > 0) setExpanded(true);
  }, [attachments.length, value]);

  function openFilePicker() {
    if (!canWrite) return;
    setExpanded(true);
    fileInputRef.current?.click();
  }

  function handleAttachFiles(files: FileList | null) {
    if (!files?.length) return;
    setExpanded(true);
    onAttachFiles(files);
  }

  function applyMention(actorId: string, actorLabel: string) {
    if (mentionMapRef) mentionMapRef.current.set(actorLabel, actorId);
    const textarea = textareaRef.current;
    if (!textarea) return;
    const next = replaceMentionToken(
      value,
      textarea.selectionStart ?? value.length,
      actorLabel,
    );
    onChange(next.value);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(next.caret, next.caret);
    });
  }

  return (
    <div
      className={cn(
        "border border-[#e6ebf2] bg-white/96 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur",
        compact ? "rounded-xl p-1.5" : "rounded-[22px] p-2.5",
      )}
    >
      {compact && replyTarget ? (
        <div className="mb-1.5 flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-2 py-1 text-[11px]">
          <span className="flex items-center gap-1 text-[#9CA3AF]">
            <CornerUpLeft className="h-3 w-3" />
            <span className="font-medium text-[#667085]">{replyTarget.label}</span>
            <span className="max-w-[200px] truncate text-[#9CA3AF]">{replyTarget.preview}</span>
          </span>
          <button type="button" onClick={onClearReply} className="ml-2 font-semibold text-[#6B7280] hover:text-[#1F2937]">
            &times;
          </button>
        </div>
      ) : null}
      {compact ? (
        <>
          <div className="flex items-center gap-1.5">
            <Avatar className="h-6 w-6 rounded-lg">
              {currentUserAvatarUrl ? (
                <AvatarImage src={currentUserAvatarUrl} alt={currentUserName} className="rounded-lg object-cover" />
              ) : null}
              <AvatarFallback className="rounded-lg bg-[#111827] text-[9px] font-semibold text-white">
                {getInitials(currentUserName)}
              </AvatarFallback>
            </Avatar>
            <div className="relative min-w-0 flex-1">
              <textarea
                ref={textareaRef}
                value={value}
                onFocus={() => setExpanded(true)}
                onChange={(event) => {
                  onChange(event.target.value);
                  setMentionQuery(
                    getMentionQuery(
                      event.target.value,
                      event.target.selectionStart ?? event.target.value.length,
                    ),
                  );
                  const el = event.target;
                  el.style.height = "auto";
                  el.style.height = `${el.scrollHeight}px`;
                }}
                disabled={!canWrite}
                rows={1}
                placeholder={canWrite ? "Write a comment..." : "Only Owner / Manager can add comments."}
                className="w-full resize-none bg-transparent text-[13px] leading-5 text-[#1F2937] outline-none placeholder:text-[#9CA3AF]"
                style={{ minHeight: "20px" }}
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                    event.preventDefault();
                    if (!submitDisabled) onSubmit();
                  }
                }}
              />
              {filteredMentions.length > 0 ? (
                <div className="absolute bottom-full left-0 right-0 z-10 mb-1 rounded-xl border border-[#E5E7EB] bg-white p-1.5 shadow-[0_-10px_30px_rgba(15,23,42,0.12)]">
                  {filteredMentions.map((actor) => (
                    <button key={actor.id} type="button" onClick={() => applyMention(actor.id, actor.label)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-[#F9FAFB]">
                      {String(actor.avatar_url ?? "").trim() ? (
                        <img src={actor.avatar_url!} alt={actor.label} className="h-6 w-6 rounded-lg border border-[#E5E7EB] object-cover" />
                      ) : (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[#F3F4F6] text-[10px] font-semibold text-[#4B5563]">{getInitials(actor.label)}</span>
                      )}
                      <span className="truncate text-[13px] font-medium text-[#1F2937]">{actor.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <EmojiPicker
              compact
              onSelect={(emoji) => {
                const ta = textareaRef.current;
                const pos = ta?.selectionStart ?? value.length;
                const next = value.slice(0, pos) + emoji + value.slice(pos);
                onChange(next);
                requestAnimationFrame(() => {
                  if (ta) {
                    ta.focus();
                    const newPos = pos + emoji.length;
                    ta.setSelectionRange(newPos, newPos);
                  }
                });
              }}
            />
            <button type="button" onClick={openFilePicker} disabled={!canWrite} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#1F2937] disabled:opacity-40" aria-label="Attach file">
              <Paperclip className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitDisabled}
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition",
                submitDisabled ? "text-[#D1D5DB]" : "text-[#1F2937] hover:bg-[#F3F4F6]",
              )}
              aria-label="Comment"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
          {attachments.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-1 pl-7">
              {attachments.map((attachment) => (
                <span key={attachment.id} className="inline-flex items-center gap-1 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2 py-0.5 text-[11px] font-medium text-[#4B5563]">
                  <Paperclip className="h-3 w-3 text-[#6B7280]" />
                  <span className="max-w-[120px] truncate">{attachment.file.name}</span>
                  <button type="button" onClick={() => onRemoveAttachment(attachment.id)} className="rounded-full p-px text-[#9CA3AF] hover:text-[#374151]" aria-label={`Remove ${attachment.file.name}`}>
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          <div className="mt-1 pl-7 text-[10px] text-[#9CA3AF]">
            @ to mention &middot; Ctrl+Enter sends
          </div>
        </>
      ) : (
        <div className="flex gap-2.5">
          <Avatar className="h-9 w-9 rounded-2xl">
            {currentUserAvatarUrl ? (
              <AvatarImage src={currentUserAvatarUrl} alt={currentUserName} className="rounded-2xl object-cover" />
            ) : null}
            <AvatarFallback className="rounded-2xl bg-[#111827] text-xs font-semibold text-white">
              {getInitials(currentUserName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            {replyTarget ? (
              <div className="mb-2 rounded-[18px] border border-[#E5E7EB] bg-[#F9FAFB] px-3.5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="product-section-label flex items-center gap-2 text-[#9CA3AF]">
                      <CornerUpLeft className="h-3.5 w-3.5" />
                      Replying to {replyTarget.kind}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-[#1F2937]">{replyTarget.label}</div>
                    <div className="mt-1 text-xs leading-5 text-[#6B7280]">{replyTarget.preview}</div>
                  </div>
                  <button type="button" onClick={onClearReply} className="text-xs font-semibold text-[#6B7280] transition hover:text-[#1F2937]">Clear</button>
                </div>
              </div>
            ) : null}
            <div className="relative rounded-[18px] border border-[#E5E7EB] bg-[linear-gradient(180deg,#FFFFFF_0%,#F9FAFB_100%)] px-3.5 py-2.5 transition focus-within:border-[var(--brand-600)] focus-within:bg-white">
              <textarea
                ref={textareaRef}
                value={value}
                onFocus={() => setExpanded(true)}
                onChange={(event) => {
                  onChange(event.target.value);
                  setMentionQuery(
                    getMentionQuery(event.target.value, event.target.selectionStart ?? event.target.value.length),
                  );
                  const el = event.target;
                  el.style.height = "auto";
                  el.style.height = `${el.scrollHeight}px`;
                }}
                disabled={!canWrite}
                rows={1}
                placeholder={canWrite ? "Write a comment..." : "Only Owner / Manager can add comments."}
                className="min-h-[24px] w-full resize-none bg-transparent text-sm leading-5 text-[#1F2937] outline-none placeholder:text-[#9CA3AF]"
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                    event.preventDefault();
                    if (!submitDisabled) onSubmit();
                  }
                }}
              />
              {filteredMentions.length > 0 ? (
                <div className="absolute left-4 right-4 top-full z-10 mt-2 rounded-2xl border border-[#E5E7EB] bg-white p-2 shadow-[0_20px_40px_rgba(15,23,42,0.12)]">
                  {filteredMentions.map((actor) => (
                    <button key={actor.id} type="button" onClick={() => applyMention(actor.id, actor.label)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-[#F9FAFB]">
                      {String(actor.avatar_url ?? "").trim() ? (
                        <img src={actor.avatar_url!} alt={actor.label} className="h-8 w-8 rounded-xl border border-[#E5E7EB] object-cover" />
                      ) : (
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#F3F4F6] text-[11px] font-semibold text-[#4B5563]">{getInitials(actor.label)}</span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[#1F2937]">{actor.label}</span>
                        <span className="block text-xs text-[#6B7280]">{actor.kind}</span>
                      </span>
                      <AtSign className="h-4 w-4 text-[#9CA3AF]" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            {attachments.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {attachments.map((attachment) => (
                  <span key={attachment.id} className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1.5 text-xs font-medium text-[#4B5563]">
                    <Paperclip className="h-3.5 w-3.5 text-[#6B7280]" />
                    <span className="max-w-[180px] truncate">{attachment.file.name}</span>
                    <button type="button" onClick={() => onRemoveAttachment(attachment.id)} className="rounded-full p-0.5 text-[#9CA3AF] transition hover:bg-white hover:text-[#374151]" aria-label={`Remove ${attachment.file.name}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mt-2 flex flex-col gap-2 border-t border-[#EEF2FF] pt-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B7280]">
                <EmojiPicker
                  onSelect={(emoji) => {
                    const ta = textareaRef.current;
                    const pos = ta?.selectionStart ?? value.length;
                    const next = value.slice(0, pos) + emoji + value.slice(pos);
                    onChange(next);
                    requestAnimationFrame(() => {
                      if (ta) {
                        ta.focus();
                        const newPos = pos + emoji.length;
                        ta.setSelectionRange(newPos, newPos);
                      }
                    });
                  }}
                />
                <button type="button" onClick={openFilePicker} disabled={!canWrite} className="inline-flex h-10 items-center gap-2 rounded-[16px] border border-[#E5E7EB] bg-white px-3.5 text-sm font-semibold text-[#4B5563] shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-[#C7D2FE] hover:bg-[#F9FAFB] hover:text-[#1F2937] disabled:cursor-not-allowed disabled:opacity-50">
                  <Paperclip className="h-3.5 w-3.5" />
                  Attach file
                </button>
                <span>Type `@` to mention a teammate. Ctrl/Cmd + Enter sends.</span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={submitDisabled}
                  className={cn(
                    "inline-flex h-10 items-center justify-center gap-2 rounded-[16px] border px-4 text-sm font-semibold transition",
                    submitDisabled
                      ? "cursor-not-allowed border-[#E5E7EB] bg-[#F3F4F6] text-[#9CA3AF]"
                      : "border-[#E5E7EB] bg-white text-[#1F2937] shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:border-[#C7D2FE] hover:bg-[#F9FAFB]",
                  )}
                >
                  <Send className="h-4 w-4" />
                  {isSubmitting ? "Posting..." : "Comment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          handleAttachFiles(event.target.files);
          event.currentTarget.value = "";
        }}
      />
    </div>
  );
}

function DateSeparator({
  label,
  compact = false,
}: {
  label: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn("flex items-center", compact ? "gap-2 py-1" : "gap-3 py-2")}
    >
      <div className="h-px flex-1 bg-[#EEF2FF]" />
      <span
        className={cn(
          "product-section-label rounded-full border border-[#E5E7EB] bg-white",
          compact ? "px-2.5 py-0.5 text-[10px]" : "px-3 py-1",
        )}
      >
        {label}
      </span>
      <div className="h-px flex-1 bg-[#EEF2FF]" />
    </div>
  );
}

function AuditValue({
  label,
  value,
  tone = "neutral",
  compact = false,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "new" | "old";
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        compact
          ? "rounded-[12px] border px-2 py-1.5"
          : "rounded-2xl border px-3 py-2.5",
        tone === "old" && "border-[#FECACA] bg-[#FFF1F2]",
        tone === "new" && "border-[#A7F3D0] bg-[#ECFDF3]",
        tone === "neutral" && "border-[#E5E7EB] bg-[#F9FAFB]",
      )}
    >
      <div
        className={cn(
          "product-section-label",
          compact && "text-[10px] tracking-[0.06em]",
        )}
      >
        {label}
      </div>
      <div
        className={cn(
          "font-semibold text-[#1F2937]",
          compact ? "mt-0.5 text-sm leading-5" : "mt-1 text-sm",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function EventDelta({
  payload,
  compact = false,
}: {
  payload?: LocalActivityEventPayload;
  compact?: boolean;
}) {
  if (!payload) return null;

  if ((payload.added?.length ?? 0) > 0 || (payload.removed?.length ?? 0) > 0) {
    return (
      <div
        className={cn(
          "flex flex-wrap",
          compact ? "mt-1 gap-1" : "mt-3 gap-2",
        )}
      >
        {(payload.removed ?? []).map((value) => (
          <span
            key={`removed-${value}`}
            className={cn(
              "inline-flex rounded-full border border-[#f0d5dd] bg-[#fff1f3] font-semibold text-[#b42318]",
              compact ? "px-1.5 py-px text-[10px]" : "px-3 py-1 text-xs",
            )}
          >
            {value} removed
          </span>
        ))}
        {(payload.added ?? []).map((value) => (
          <span
            key={`added-${value}`}
            className={cn(
              "inline-flex rounded-full border border-[#d1fadf] bg-[#f0fdf4] font-semibold text-[#067647]",
              compact ? "px-1.5 py-px text-[10px]" : "px-3 py-1 text-xs",
            )}
          >
            {value} added
          </span>
        ))}
      </div>
    );
  }

  if (
    payload.from !== undefined ||
    payload.to !== undefined ||
    payload.fromLabel ||
    payload.toLabel
  ) {
    if (compact) {
      const fromVal = formatAuditValue(
        payload.from,
        payload.fromLabel,
        payload.field,
      );
      const toVal = formatAuditValue(
        payload.to,
        payload.toLabel,
        payload.field,
      );
      return (
        <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px]">
          <span className="rounded border border-[#FECACA] bg-[#FFF1F2] px-1.5 py-px font-medium text-[#991b1b]">
            {fromVal}
          </span>
          <span className="text-[#9CA3AF]">&rarr;</span>
          <span className="rounded border border-[#A7F3D0] bg-[#ECFDF3] px-1.5 py-px font-medium text-[#065f46]">
            {toVal}
          </span>
        </div>
      );
    }
    return (
      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
        <AuditValue
          label="Before"
          value={formatAuditValue(
            payload.from,
            payload.fromLabel,
            payload.field,
          )}
          tone="old"
        />
        <div className="hidden text-center text-sm font-semibold text-[#9CA3AF] sm:block">
          -&gt;
        </div>
        <AuditValue
          label="After"
          value={formatAuditValue(payload.to, payload.toLabel, payload.field)}
          tone="new"
        />
      </div>
    );
  }

  if (payload.fileName) {
    if (compact) {
      return (
        <div className="mt-0.5 text-[11px] text-[#667085]">
          <Paperclip className="mr-0.5 inline h-3 w-3" />
          {payload.fileName}
        </div>
      );
    }
    return (
      <div className="mt-3">
        <AuditValue label="File" value={payload.fileName} />
      </div>
    );
  }

  return null;
}

function EventGlyph({
  eventType,
  tone,
  compact = false,
}: {
  eventType: TimelineEvent["eventType"];
  tone: TimelineEvent["tone"];
  compact?: boolean;
}) {
  const classes = cn(
    compact
      ? "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border"
      : "flex h-9 w-9 items-center justify-center rounded-2xl border",
    tone === "success" && "border-[#A7F3D0] bg-[#ECFDF3] text-[#059669]",
    tone === "warning" && "border-[#FDE68A] bg-[#FFFBEB] text-[#D97706]",
    tone === "muted" && "border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280]",
    tone === "default" &&
      "border-[var(--brand-200)] bg-[var(--brand-50)] text-[var(--brand-600)]",
  );
  const iconCn = compact ? "h-3 w-3" : "h-4 w-4";
  if (eventType === "status_changed")
    return (
      <span className={classes}>
        <CalendarClock className={iconCn} />
      </span>
    );
  if (eventType === "manager_changed" || eventType === "manager_assigned")
    return (
      <span className={classes}>
        <UserRound className={iconCn} />
      </span>
    );
  if (eventType === "label_added" || eventType === "label_removed")
    return (
      <span className={classes}>
        <Tag className={iconCn} />
      </span>
    );
  if (
    eventType === "follow_up_created" ||
    eventType === "follow_up_completed" ||
    eventType === "follow_up_completed_with_note" ||
    eventType === "follow_up_completed_and_next_created" ||
    eventType === "follow_up_rescheduled" ||
    eventType === "follow_up_reopened" ||
    eventType === "follow_up_cancelled"
  )
    return (
      <span className={classes}>
        <CalendarClock className={iconCn} />
      </span>
    );
  if (eventType === "file_uploaded" || eventType === "file_deleted")
    return (
      <span className={classes}>
        <Paperclip className={iconCn} />
      </span>
    );
  if (eventType === "comment_edited" || eventType === "comment_deleted")
    return (
      <span className={classes}>
        <MessageSquareText className={iconCn} />
      </span>
    );
  if (
    eventType === "checklist_created" ||
    eventType === "checklist_completed" ||
    eventType === "checklist_reopened" ||
    eventType === "checklist_deleted"
  )
    return (
      <span className={classes}>
        <CheckCircle2 className={iconCn} />
      </span>
    );
  if (eventType === "order_created")
    return (
      <span className={classes}>
        <FileText className={iconCn} />
      </span>
    );
  return (
    <span className={classes}>
      <Clock3 className={iconCn} />
    </span>
  );
}

function AttachmentCard({
  payload,
  compact = false,
}: {
  payload?: LocalActivityEventPayload;
  compact?: boolean;
}) {
  if (!payload?.fileName) return null;

  const previewUrl = payload.previewUrl || payload.downloadUrl || null;
  const downloadUrl = payload.downloadUrl || payload.previewUrl || null;
  const fileName = payload.fileName.toLowerCase();
  const hasImageExtension =
    fileName.endsWith(".png") ||
    fileName.endsWith(".jpg") ||
    fileName.endsWith(".jpeg") ||
    fileName.endsWith(".webp") ||
    fileName.endsWith(".gif");
  const isImage = Boolean(
    previewUrl && (payload.fileType?.startsWith("image/") || hasImageExtension),
  );
  const fileMeta = [payload.fileType, formatFileSize(payload.fileSize)]
    .filter(Boolean)
    .join(" | ");

  return (
    <div
      className={cn(
        "border border-[#E5E7EB] bg-[#F9FAFB]",
        compact ? "mt-1 rounded-lg px-2 py-1.5" : "mt-3 rounded-[18px] p-3.5",
      )}
    >
      <div className={cn("flex items-start justify-between", compact ? "gap-2" : "gap-3")}>
        <div className="min-w-0">
          <div
            className={cn(
              "flex items-center font-semibold text-[#101828]",
              compact ? "gap-1.5 text-[12px]" : "gap-2 text-sm",
            )}
          >
            <Paperclip className={cn("text-[#667085]", compact ? "h-3 w-3" : "h-4 w-4")} />
            <span className="truncate">{payload.fileName}</span>
          </div>
          <div
            className={cn(
              "text-[#667085]",
              compact ? "mt-0.5 text-[10px]" : "mt-1 text-xs",
            )}
          >
            {fileMeta || "Attachment"}
          </div>
        </div>
        <div className={cn("flex items-center", compact ? "gap-1" : "gap-2")}>
          {isImage && previewUrl ? (
            <OrderAttachmentLightbox
              fileName={payload.fileName}
              src={previewUrl}
            />
          ) : previewUrl ? (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white font-semibold text-[#4B5563] shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-[#C7D2FE] hover:bg-[#F9FAFB] hover:text-[#1F2937]",
                compact ? "h-6 px-2 text-[11px]" : "h-10 px-4 text-sm",
              )}
            >
              <Eye className={compact ? "h-3 w-3" : "h-4 w-4"} />
              Open
            </a>
          ) : null}
          {downloadUrl ? (
            <a
              href={downloadUrl}
              download={payload.fileName}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white font-semibold text-[#4B5563] shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-[#C7D2FE] hover:bg-[#F9FAFB] hover:text-[#1F2937]",
                compact ? "h-6 px-2 text-[11px]" : "h-10 px-4 text-sm",
              )}
            >
              <Download className={compact ? "h-3 w-3" : "h-4 w-4"} />
              Download
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SystemEventItem({
  item,
  onReply,
  compact = false,
}: {
  item: TimelineEvent;
  onReply: (target: ReplyTarget) => void;
  compact?: boolean;
}) {
  const badge = getRoleBadge(normalizeRole(item.actorRole));
  const canReplyToFile =
    item.eventType === "file_uploaded" && !!item.payload?.fileName;

  if (compact) {
    return (
      <div className="flex items-start gap-1.5 rounded-xl border border-[#EEF2FF] bg-[#FAFBFF] px-2 py-1.5 text-[12px] leading-[18px] text-[#475467]">
        <EventGlyph eventType={item.eventType} tone={item.tone} compact />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <span className="font-medium text-[#101828]">{item.title}</span>
            {item.payload?.field ? (
              <span className="text-[11px] text-[#98a2b3]">
                {formatFieldLabel(item.payload.field)}
              </span>
            ) : null}
            {item.detail ? (
              <span className="line-clamp-1 text-[#667085]">
                — {item.detail}
              </span>
            ) : null}
          </div>
          {item.eventType === "file_uploaded" ||
          item.eventType === "file_deleted" ? (
            <AttachmentCard payload={item.payload} compact />
          ) : (
            <EventDelta payload={item.payload} compact />
          )}
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-[#98a2b3]">
            <span className="font-medium text-[#667085]">
              {item.actorName}
            </span>
            <span
              className={cn(
                "inline-flex rounded-full border px-1.5 py-px text-[9px] font-semibold uppercase tracking-[0.08em]",
                badge.className,
              )}
            >
              {badge.label}
            </span>
            <span>{formatDateTime(item.createdAt)}</span>
            {canReplyToFile ? (
              <button
                type="button"
                onClick={() =>
                  onReply({
                    id: item.id,
                    kind: "file",
                    label: item.payload?.fileName || "Attachment",
                    preview:
                      item.payload?.fileName || item.detail || "Attachment",
                  })
                }
                className="inline-flex items-center gap-0.5 font-semibold text-[#667085] transition hover:text-[#101828]"
              >
                <CornerUpLeft className="h-3 w-3" />
                Reply
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex gap-3 rounded-[20px] border border-[#E5E7EB] bg-[linear-gradient(180deg,#FFFFFF_0%,#F9FAFB_100%)] px-4 py-3 transition hover:border-[#C7D2FE] hover:shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
    >
      <div className="flex w-12 flex-col items-center">
        <EventGlyph
          eventType={item.eventType}
          tone={item.tone}
        />
        <div className="mt-2 h-full w-px bg-[#edf1f5]" />
      </div>
      <div className="min-w-0 flex-1 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-[#101828]">
            {item.title}
          </span>
          {item.payload?.field ? (
            <span className="text-xs font-medium text-[#98a2b3]">
              {formatFieldLabel(item.payload.field)}
            </span>
          ) : null}
        </div>
        {item.detail ? (
          <div className="mt-1 text-sm leading-6 text-[#475467]">
            {item.detail}
          </div>
        ) : null}
        {item.eventType === "file_uploaded" ||
        item.eventType === "file_deleted" ? (
          <AttachmentCard payload={item.payload} />
        ) : (
          <EventDelta payload={item.payload} />
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#98a2b3]">
          <span className="font-medium text-[#667085]">{item.actorName}</span>
          <span
            className={cn(
              "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
              badge.className,
            )}
          >
            {badge.label}
          </span>
          <span>{formatDateTime(item.createdAt)}</span>
          {canReplyToFile ? (
            <button
              type="button"
              onClick={() =>
                onReply({
                  id: item.id,
                  kind: "file",
                  label: item.payload?.fileName || "Attachment",
                  preview:
                    item.payload?.fileName || item.detail || "Attachment",
                })
              }
              className="inline-flex items-center gap-1 font-semibold text-[#667085] transition hover:text-[#101828]"
            >
              <CornerUpLeft className="h-3.5 w-3.5" />
              Reply
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ReplyPreview({
  snapshot,
  actorNames,
}: {
  snapshot?: ReplySnapshot | null;
  actorNames?: Map<string, string>;
}) {
  const reply = getReplyPreviewContent(snapshot);
  if (!reply) return null;

  return (
    <div className="mb-2 rounded-[12px] border border-[#e5edf8] bg-[#f8fbff] px-2.5 py-2">
      <div className="product-section-label flex items-center gap-1.5 text-[#7c8aa5]">
        <CornerUpLeft className="h-3 w-3" />
        <span>{reply.label}</span>
      </div>
      <div className="mt-0.5 line-clamp-2 text-[13px] leading-5 text-[#52607a]">
        {resolveMentionsPlain(reply.preview, actorNames)}
      </div>
    </div>
  );
}

function CommentItem({
  item,
  canWrite,
  editingId,
  editingValue,
  setEditingValue,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  expandedComments,
  toggleExpanded,
  onReply,
  compact = false,
  actorNames,
  reactions = [],
  onToggleReaction,
  currentUserId,
}: {
  item: TimelineComment;
  canWrite: boolean;
  editingId: string | null;
  editingValue: string;
  setEditingValue: (value: string) => void;
  onStartEdit: (item: TimelineComment) => void;
  onCancelEdit: () => void;
  onSaveEdit: (item: TimelineComment) => void;
  onDelete: (item: TimelineComment) => void;
  expandedComments: Set<string>;
  toggleExpanded: (id: string) => void;
  onReply: (target: ReplyTarget) => void;
  compact?: boolean;
  actorNames?: Map<string, string>;
  reactions?: ReactionRow[];
  onToggleReaction?: () => void;
  currentUserId?: string | null;
}) {
  const badge = getRoleBadge(normalizeRole(item.actorRole));
  const isEditing = editingId === item.id;
  const isExpanded = expandedComments.has(item.id);
  const [showChanges, setShowChanges] = React.useState(false);
  const shouldCollapse =
    item.body.length > 280 || item.body.split("\n").length > 5;
  const canReply = canWrite;
  const canManageItem = canWrite && item.isOwnComment;
  const hasChangeDetails =
    item.editPayload &&
    (item.editPayload.from !== undefined ||
      item.editPayload.to !== undefined ||
      item.editPayload.fromLabel ||
      item.editPayload.toLabel);
  return (
    <div
      className={cn(
        "group flex border border-[#E5E7EB] bg-white shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition hover:border-[#C7D2FE] hover:shadow-[0_12px_24px_rgba(15,23,42,0.06)]",
        compact ? "gap-2 rounded-[14px] px-2.5 py-2" : "gap-3 rounded-[20px] px-4 py-3",
        item.replyToCommentId && "ml-4 border-[#e5edf8] bg-[#fcfdff]",
      )}
    >
      <Avatar className={cn(compact ? "h-7 w-7 rounded-xl" : "h-10 w-10 rounded-2xl")}>
        {item.actorAvatarUrl ? (
          <AvatarImage src={item.actorAvatarUrl} alt={item.actorName} className={cn("object-cover", compact ? "rounded-xl" : "rounded-2xl")} />
        ) : null}
        <AvatarFallback className={cn("bg-[#111827] font-semibold text-white", compact ? "rounded-xl text-[10px]" : "rounded-2xl text-xs")}>
          {getInitials(item.actorName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "text-[#101828]",
                  compact ? "text-sm font-medium" : "text-sm font-semibold",
                )}
              >
                {item.actorName}
              </span>
              <span
                className={cn(
                  "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
                  badge.className,
                )}
              >
                {badge.label}
              </span>
              {item.replyToCommentId ? (
                <span className="inline-flex rounded-full border border-[#e5edf8] bg-[#f8fbff] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#52607a]">
                  Reply
                </span>
              ) : null}
              {item.edited ? (
                <span className="inline-flex rounded-full border border-[var(--brand-200)] bg-[var(--brand-50)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--brand-600)]">
                  Edited
                </span>
              ) : null}
              <span
                className={cn(
                  "text-[#98a2b3]",
                  compact ? "text-[11px]" : "text-xs",
                )}
              >
                {formatDateTime(item.createdAt)}
              </span>
            </div>
          </div>
          {canReply || canManageItem ? (
            <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
              {canReply ? (
                <button
                  type="button"
                  onClick={() =>
                    onReply({
                      id: item.id,
                      kind: "comment",
                      label: item.actorName,
                      preview: getCompactPreview(item.body, actorNames),
                    })
                  }
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent bg-[#F9FAFB] text-[#6B7280] transition hover:border-[#E5E7EB] hover:bg-white hover:text-[#1F2937]"
                  aria-label="Reply to comment"
                >
                  <CornerUpLeft className="h-4 w-4" />
                </button>
              ) : null}
              {canManageItem ? (
                <button
                  type="button"
                  onClick={() => onStartEdit(item)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent bg-[#F9FAFB] text-[#6B7280] transition hover:border-[#E5E7EB] hover:bg-white hover:text-[#1F2937]"
                  aria-label="Edit comment"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              ) : null}
              {canManageItem ? (
                <button
                  type="button"
                  onClick={() => onDelete(item)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent bg-[#fef3f2] text-[#b42318] transition hover:border-[#fecdca] hover:bg-white"
                  aria-label="Delete comment"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        {isEditing ? (
          <div className={cn(compact ? "mt-2" : "mt-2.5")}>
            <textarea
              value={editingValue}
              onChange={(event) => setEditingValue(event.target.value)}
              rows={4}
              className="min-h-[120px] w-full resize-none rounded-[18px] border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-sm leading-6 text-[#1F2937] outline-none transition focus:border-[var(--brand-600)] focus:bg-white"
            />
            <div
              className={cn(
                "flex items-center justify-end gap-2",
                compact ? "mt-2" : "mt-2.5",
              )}
            >
              <button
                type="button"
                onClick={onCancelEdit}
                className="inline-flex h-10 items-center justify-center rounded-2xl border border-[#E5E7EB] px-4 text-sm font-semibold text-[#4B5563] transition hover:border-[#C7D2FE] hover:bg-[#F9FAFB]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onSaveEdit(item)}
                disabled={!editingValue.trim()}
                className="inline-flex h-10 items-center justify-center rounded-2xl border border-[var(--brand-200)] bg-[var(--brand-50)] px-4 text-sm font-semibold text-[var(--brand-600)] transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className={cn(compact ? "mt-2" : "mt-2.5")}>
            <ReplyPreview snapshot={item.replySnapshot} actorNames={actorNames} />
            <div
              className={cn(
                "whitespace-pre-wrap text-sm text-[#1F2937]",
                compact ? "leading-5" : "leading-6",
                shouldCollapse &&
                  !isExpanded &&
                  (compact ? "line-clamp-3" : "line-clamp-5"),
              )}
            >
              {renderRichText(item.body, actorNames)}
            </div>
            {shouldCollapse ? (
              <button
                type="button"
                onClick={() => toggleExpanded(item.id)}
                className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-[#6B7280] transition hover:text-[#1F2937]"
              >
                {isExpanded ? "Show less" : "Show more"}
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition",
                    isExpanded && "rotate-180",
                  )}
                />
              </button>
            ) : null}
            {hasChangeDetails ? (
              <div className="mt-1.5">
                <button
                  type="button"
                  onClick={() => setShowChanges((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#6B7280] transition hover:text-[#1F2937]"
                >
                  {showChanges ? "Hide changes" : "Show changes"}
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition",
                      showChanges && "rotate-180",
                    )}
                  />
                </button>
                {showChanges ? <EventDelta payload={item.editPayload} compact={compact} /> : null}
              </div>
            ) : null}
            {/* Reactions */}
            <div className="mt-1 flex items-center gap-1">
              <button
                type="button"
                onClick={onToggleReaction}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition",
                  reactions.some((r) => r.user_id === currentUserId)
                    ? "border-[var(--brand-200)] bg-[var(--brand-50)] text-[var(--brand-600)]"
                    : "border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[var(--brand-200)] hover:bg-[var(--brand-50)]",
                )}
              >
                <ThumbsUp className="h-3 w-3" />
                {reactions.length > 0 ? reactions.length : null}
              </button>
              {reactions.length > 0 ? (
                <span className="text-[10px] text-[#9CA3AF]">
                  {reactions.map((r) => r.user_name).join(", ")}
                </span>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityTimeline({
  items,
  hiddenCount,
  onLoadMore,
  canWrite,
  editingId,
  editingValue,
  setEditingValue,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  expandedComments,
  toggleExpanded,
  onReply,
  compact = false,
  actorNames,
  reactionsByComment,
  onToggleReaction,
  currentUserId,
}: {
  items: TimelineItem[];
  hiddenCount: number;
  onLoadMore: () => void;
  canWrite: boolean;
  editingId: string | null;
  editingValue: string;
  setEditingValue: (value: string) => void;
  onStartEdit: (item: TimelineComment) => void;
  onCancelEdit: () => void;
  onSaveEdit: (item: TimelineComment) => void;
  onDelete: (item: TimelineComment) => void;
  expandedComments: Set<string>;
  toggleExpanded: (id: string) => void;
  onReply: (target: ReplyTarget) => void;
  compact?: boolean;
  actorNames?: Map<string, string>;
  reactionsByComment?: Map<string, ReactionRow[]>;
  onToggleReaction?: (commentId: string) => void;
  currentUserId?: string | null;
}) {
  // Build thread chains: for any comment that is part of a reply chain,
  // collect the full chain (walk up to root, then collect all descendants)
  const commentById = React.useMemo(() => {
    const map = new Map<string, TimelineComment>();
    for (const item of items) {
      if (item.kind === "comment") map.set(item.id, item);
    }
    return map;
  }, [items]);

  const getThreadChain = React.useCallback(
    (commentId: string): TimelineComment[] => {
      // Walk up to find root
      let rootId = commentId;
      const visited = new Set<string>();
      while (true) {
        visited.add(rootId);
        const item = commentById.get(rootId);
        const parentId = item?.replyToCommentId
          ? `comment-${item.replyToCommentId}`
          : null;
        if (!parentId || !commentById.has(parentId) || visited.has(parentId)) break;
        rootId = parentId;
      }
      // Collect chain from root downward (BFS)
      const chain: TimelineComment[] = [];
      const queue = [rootId];
      const seen = new Set<string>();
      while (queue.length > 0) {
        const id = queue.shift()!;
        if (seen.has(id)) continue;
        seen.add(id);
        const item = commentById.get(id);
        if (item) chain.push(item);
        // Find children
        for (const c of commentById.values()) {
          if (c.replyToCommentId && `comment-${c.replyToCommentId}` === id) {
            queue.push(c.id);
          }
        }
      }
      return chain.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    },
    [commentById],
  );

  // Check if a comment is part of a thread (has replies or is a reply)
  const hasThread = React.useCallback(
    (item: TimelineComment) => {
      if (item.replyToCommentId) return true;
      for (const c of commentById.values()) {
        if (c.replyToCommentId && `comment-${c.replyToCommentId}` === item.id) return true;
      }
      return false;
    },
    [commentById],
  );

  const [threadViewId, setThreadViewId] = React.useState<string | null>(null);
  const threadChain = React.useMemo(
    () => (threadViewId ? getThreadChain(threadViewId) : []),
    [getThreadChain, threadViewId],
  );

  const renderComment = (item: TimelineComment, showThreadBtn = false) => (
    <div key={item.id}>
      <CommentItem
        item={item}
        canWrite={canWrite}
        editingId={editingId}
        editingValue={editingValue}
        setEditingValue={setEditingValue}
        onStartEdit={onStartEdit}
        onCancelEdit={onCancelEdit}
        onSaveEdit={onSaveEdit}
        onDelete={onDelete}
        expandedComments={expandedComments}
        toggleExpanded={toggleExpanded}
        onReply={onReply}
        compact={compact}
        actorNames={actorNames}
        reactions={reactionsByComment?.get(item.id.replace(/^comment-/, "")) ?? []}
        onToggleReaction={onToggleReaction ? () => onToggleReaction(item.id.replace(/^comment-/, "")) : undefined}
        currentUserId={currentUserId}
      />
      {showThreadBtn && hasThread(item) ? (
        <button
          type="button"
          onClick={() => setThreadViewId(item.id)}
          className={cn(
            "mt-0.5 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold text-[var(--brand-600)] transition hover:bg-[var(--brand-50)]",
            compact && "ml-2",
          )}
        >
          <MessageSquareText className="h-3 w-3" />
          View thread
        </button>
      ) : null}
    </div>
  );

  return (
    <div
      className={cn(
        "border border-[#E5E7EB] bg-[linear-gradient(180deg,#FFFFFF_0%,#F9FAFB_100%)] shadow-[0_10px_24px_rgba(15,23,42,0.05)]",
        compact ? "rounded-[16px] p-1.5" : "rounded-[22px] p-3",
      )}
    >
      {items.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-[#E5E7EB] bg-white px-5 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3F4F6] text-[#6B7280]">
            <MessageSquareText className="h-5 w-5" />
          </div>
          <div className="mt-4 text-sm font-semibold text-[#1F2937]">
            No activity yet
          </div>
          <p className="mt-1 text-sm leading-6 text-[#6B7280]">
            Comments, assignments, checklist progress, and deal updates will
            appear here as one structured timeline.
          </p>
        </div>
      ) : (
        <div className={compact ? "space-y-1" : "space-y-2.5"}>
          {items.map((item, index) => {
            const previous = index > 0 ? items[index - 1] : null;
            const showSeparator =
              !previous ||
              getDateKey(previous.createdAt) !== getDateKey(item.createdAt);
            return (
              <React.Fragment key={item.id}>
                {showSeparator ? (
                  <DateSeparator
                    label={formatDateSeparator(item.createdAt)}
                    compact={compact}
                  />
                ) : null}
                {item.kind === "comment" ? (
                  renderComment(item, true)
                ) : (
                  <SystemEventItem
                    item={item}
                    onReply={onReply}
                    compact={compact}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
      {hiddenCount > 0 ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-[#374151] transition hover:border-[#C7D2FE] hover:bg-[#F9FAFB]"
          >
            Load {Math.min(20, hiddenCount)} older activities
          </button>
        </div>
      ) : null}
      {/* Thread view overlay */}
      {threadViewId && threadChain.length > 0 ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setThreadViewId(null)}>
          <div
            className="mx-4 flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_25px_50px_rgba(15,23,42,0.15)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#EEF2FF] px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#1F2937]">
                <MessageSquareText className="h-4 w-4 text-[var(--brand-600)]" />
                Thread ({threadChain.length} messages)
              </div>
              <button
                type="button"
                onClick={() => setThreadViewId(null)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#1F2937]"
              >
                &times;
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-2">
                {threadChain.map((comment) => renderComment(comment, false))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function OrderActivitySection({
  order,
  businessId,
  supabase,
  phoneRaw,
  currentUserId,
  currentUserName,
  userRole,
  actors,
  ownerName,
  managerName,
  compact = false,
}: Props) {
  const [comments, setComments] = React.useState<CommentRow[]>([]);
  const [items, setItems] = React.useState<TimelineItem[]>([]);
  const [composerValue, setComposerValue] = React.useState("");
  const [attachments, setAttachments] = React.useState<ComposerAttachment[]>(
    [],
  );
  const [replyTarget, setReplyTarget] = React.useState<ReplyTarget | null>(
    null,
  );
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingValue, setEditingValue] = React.useState("");
  const mentionMapRef = React.useRef<Map<string, string>>(new Map());
  const [loading, setLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [reactions, setReactions] = React.useState<ReactionRow[]>([]);

  const loadReactions = React.useCallback(async () => {
    const { data } = await supabase
      .from("comment_reactions")
      .select("id, comment_id, user_id, user_name, emoji")
      .in(
        "comment_id",
        comments.map((c) => c.id),
      );
    if (data) setReactions(data as ReactionRow[]);
  }, [comments, supabase]);

  React.useEffect(() => {
    if (comments.length > 0) void loadReactions();
  }, [comments, loadReactions]);

  const toggleReaction = React.useCallback(
    async (commentId: string) => {
      if (!currentUserId) return;
      const existing = reactions.find(
        (r) => r.comment_id === commentId && r.user_id === currentUserId && r.emoji === "👍",
      );
      if (existing) {
        await supabase.from("comment_reactions").delete().eq("id", existing.id);
        setReactions((prev) => prev.filter((r) => r.id !== existing.id));
      } else {
        const { data } = await supabase
          .from("comment_reactions")
          .insert({
            comment_id: commentId,
            user_id: currentUserId,
            user_name: currentUserName || "User",
            emoji: "👍",
          })
          .select("id, comment_id, user_id, user_name, emoji")
          .single();
        if (data) setReactions((prev) => [...prev, data as ReactionRow]);
      }
    },
    [currentUserId, currentUserName, reactions, supabase],
  );

  const reactionsByComment = React.useMemo(() => {
    const map = new Map<string, ReactionRow[]>();
    for (const r of reactions) {
      const list = map.get(r.comment_id) ?? [];
      list.push(r);
      map.set(r.comment_id, list);
    }
    return map;
  }, [reactions]);
  const [filter, setFilter] = React.useState<FilterValue>("all");
  const [sort, setSort] = React.useState<SortValue>("newest");
  const [visibleCount, setVisibleCount] = React.useState(18);
  const [expandedComments, setExpandedComments] = React.useState<Set<string>>(
    new Set(),
  );
  const actorById = React.useMemo(
    () => new Map(actors.map((actor) => [actor.id, actor])),
    [actors],
  );
  const currentUserAvatarUrl = React.useMemo(() => {
    if (!currentUserId) return null;
    return actorById.get(currentUserId)?.avatar_url ?? null;
  }, [actorById, currentUserId]);
  const actorAvatarByName = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const actor of actors) {
      const url = String(actor.avatar_url ?? "").trim();
      if (url) m.set(actor.label.toLowerCase(), url);
    }
    return m;
  }, [actors]);
  const actorNameById = React.useMemo(
    () => new Map(actors.map((a) => [a.id, a.label])),
    [actors],
  );
  const canWrite = userRole === "OWNER" || userRole === "MANAGER";

  const buildItems = React.useCallback(
    (
      nextComments: CommentRow[],
      checklistRows: ChecklistActivityRow[],
      auditEvents: ActivityEventRow[],
      localEvents: LocalActivityEvent[],
      attachments: ActivityAttachmentRow[] = [],
    ) => {
      const nextItems: TimelineItem[] = [];
      const attachmentMap = new Map(
        attachments.map((attachment) => [attachment.id, attachment]),
      );
      const checklistAuditKeys = new Set<string>();
      const editedCommentIds = new Set(
        localEvents
          .filter(
            (event) =>
              event.type === "comment_edited" && event.payload?.commentId,
          )
          .map((event) => event.payload?.commentId)
          .filter((value): value is string => Boolean(value)),
      );
      const editPayloadByCommentId = new Map(
        localEvents
          .filter(
            (event) =>
              event.type === "comment_edited" && event.payload?.commentId,
          )
          .map((event) => [event.payload?.commentId as string, event.payload]),
      );

      nextItems.push(
        createEvent(
          `order-created-${order.id}`,
          order.created_at,
          order.created_by_name ||
            (order.created_by
              ? actorById.get(order.created_by)?.label
              : null) ||
            order.manager_name ||
            "Team member",
          order.created_by_role ?? null,
          "order_created",
          "Order created",
          "Initial order record was created.",
          "default",
        ),
      );
      if (order.manager_name?.trim())
        nextItems.push(
          createEvent(
            `manager-assigned-${order.id}`,
            order.created_at,
            (order.manager_id
              ? actorById.get(order.manager_id)?.label
              : null) || order.manager_name,
            "MANAGER",
            "manager_assigned",
            "Manager assigned",
            (order.manager_id
              ? actorById.get(order.manager_id)?.label
              : null) || order.manager_name,
            "warning",
            {
              field: "manager_id",
              fromLabel: "System",
              toLabel:
                (order.manager_id
                  ? actorById.get(order.manager_id)?.label
                  : null) || order.manager_name,
            },
          ),
        );
      if (order.due_date)
        nextItems.push(
          createEvent(
            `due-date-${order.id}`,
            order.created_at,
            "System",
            null,
            "due_date_set",
            "Due date set",
            new Date(order.due_date).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            }),
            "warning",
            {
              field: "due_date",
              fromLabel: "No due date",
              toLabel: new Date(order.due_date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              }),
            },
          ),
        );
      for (const comment of nextComments) {
        const isOwn = currentUserId
          ? comment.author_user_id === currentUserId
          : (comment.author_phone?.trim() ?? "") === phoneRaw.trim();
        const storedName = comment.author_name?.trim();
        const hasRealName = storedName && storedName !== "Manager";
        const resolvedName = hasRealName
          ? storedName
          : comment.author_user_id
            ? (actorById.get(comment.author_user_id)?.label ?? storedName ?? "Manager")
            : resolveAuthorName(comment, phoneRaw, currentUserName, ownerName, managerName);
        nextItems.push({
          id: `comment-${comment.id}`,
          kind: "comment",
          createdAt: comment.created_at,
          actorName: resolvedName,
          actorRole: comment.author_role,
          actorAvatarUrl: isOwn
            ? currentUserAvatarUrl
            : (comment.author_user_id
                ? actorById.get(comment.author_user_id)?.avatar_url
                : actorAvatarByName.get(resolvedName.toLowerCase())) ?? null,
          body: comment.body,
          isOwnComment: isOwn,
          edited: editedCommentIds.has(comment.id),
          editPayload: editPayloadByCommentId.get(comment.id),
          replyToCommentId: comment.reply_to_comment_id || null,
          replySnapshot: comment.reply_snapshot || null,
        });
      }
      for (const event of auditEvents) {
        const payload = (event.payload ?? {}) as LocalActivityEventPayload;
        const itemId =
          typeof payload.itemId === "string"
            ? payload.itemId
            : typeof payload.checklistItemId === "string"
              ? payload.checklistItemId
              : typeof (payload as Record<string, unknown>)
                    .checklist_item_id === "string"
                ? String((payload as Record<string, unknown>).checklist_item_id)
                : "";
        const dedupeEventType =
          event.event_type === "checklist.created_again"
            ? "checklist.created"
            : event.event_type;
        checklistAuditKeys.add(`${dedupeEventType}:${itemId}`);
        nextItems.push(mapServerActivityEvent(event, actorById));
      }
      for (const row of checklistRows) {
        if (!checklistAuditKeys.has(`checklist.created:${row.id}`)) {
          const { actorName, actorRole } = resolveChecklistActor(
            row.created_by,
            actorById,
          );
          nextItems.push(
            createEvent(
              `checklist-created-${row.id}`,
              row.created_at,
              actorName,
              actorRole,
              "checklist_created",
              "Added checklist item",
              row.title,
              "muted",
              {
                field: "checklist_item",
                itemId: row.id,
                itemTitle: row.title,
              },
            ),
          );
        }
        if (
          row.is_done &&
          row.done_at &&
          !checklistAuditKeys.has(`checklist.completed:${row.id}`)
        ) {
          const { actorName, actorRole } = resolveChecklistActor(
            row.completed_by,
            actorById,
          );
          nextItems.push(
            createEvent(
              `checklist-done-${row.id}`,
              row.done_at,
              actorName,
              actorRole,
              "checklist_completed",
              "Completed checklist item",
              row.title,
              "success",
              {
                field: "completed",
                itemId: row.id,
                itemTitle: row.title,
                from: false,
                to: true,
              },
            ),
          );
        }
      }
      for (const event of localEvents) {
        if (event.type === "comment_edited") continue;
        if (
          (event.type === "checklist_created" ||
            event.type === "checklist_created_again" ||
            event.type === "checklist_completed" ||
            event.type === "checklist_reopened" ||
            event.type === "checklist_deleted") &&
          typeof event.payload?.itemId === "string"
        ) {
          const auditEventType =
            event.type === "checklist_created" ||
            event.type === "checklist_created_again"
              ? "checklist.created"
              : event.type === "checklist_completed"
                ? "checklist.completed"
                : event.type === "checklist_reopened"
                  ? "checklist.reopened"
                  : "checklist.deleted";
          if (
            checklistAuditKeys.has(`${auditEventType}:${event.payload.itemId}`)
          )
            continue;
        }
        const mapped = mapLocalEvent(event);
        const attachmentId = getAttachmentPayloadId(mapped.payload);
        const attachment = attachmentId
          ? attachmentMap.get(attachmentId)
          : null;
        if (attachment && mapped.payload) {
          mapped.payload = {
            ...mapped.payload,
            fileName: attachment.file_name,
            fileType: attachment.mime_type,
            fileSize: attachment.file_size,
            previewUrl: buildAttachmentAccessUrl(attachment.id),
            downloadUrl: buildAttachmentAccessUrl(attachment.id, true),
            attachmentId: attachment.id,
          };
        }
        nextItems.push(mapped);
      }
      return nextItems;
    },
    [
      actorById,
      currentUserName,
      managerName,
      order.created_at,
      order.created_by,
      order.created_by_name,
      order.created_by_role,
      order.due_date,
      order.id,
      order.manager_id,
      order.manager_name,
      ownerName,
      phoneRaw,
    ],
  );

  const refreshWith = React.useCallback(
    async (nextComments: CommentRow[]) => {
      const [checklistResult, auditResult] = await Promise.all([
        fetchChecklistActivityRows(supabase, order.id),
        supabase
          .from("activity_events")
          .select("id, event_type, actor_id, actor_type, payload, created_at")
          .eq("order_id", order.id)
          .in("event_type", [
            "checklist.created",
            "checklist.created_again",
            "checklist.completed",
            "checklist.reopened",
            "checklist.deleted",
            "follow_up.created",
            "follow_up.rescheduled",
            "follow_up.completed",
            "follow_up.completed_with_note",
            "follow_up.completed_and_next_created",
            "follow_up.reopened",
            "follow_up.cancelled",
          ])
          .order("created_at", { ascending: true }),
      ]);
      const localEvents = readLocalActivityEvents(businessId, order.id);
      const attachmentIds = Array.from(
        new Set(
          localEvents
            .map((event) => getAttachmentPayloadId(event.payload))
            .filter((value): value is string => Boolean(value)),
        ),
      );
      const attachmentResult =
        attachmentIds.length > 0
          ? await supabase
              .from("activity_attachments")
              .select(
                "id, file_name, storage_path, mime_type, file_size, created_at",
              )
              .in("id", attachmentIds)
          : { data: [], error: null };
      const nextAttachments = (attachmentResult.data ??
        []) as ActivityAttachmentRow[];
      setComments(nextComments);
      setItems(
        buildItems(
          nextComments,
          checklistResult as ChecklistActivityRow[],
          (auditResult.data ?? []) as ActivityEventRow[],
          localEvents,
          nextAttachments,
        ),
      );
    },
    [buildItems, businessId, order.id, supabase],
  );

  React.useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const localEvents = readLocalActivityEvents(businessId, order.id);
      const attachmentIds = Array.from(
        new Set(
          localEvents
            .map((event) => getAttachmentPayloadId(event.payload))
            .filter((value): value is string => Boolean(value)),
        ),
      );
      const [commentsResult, checklistResult, auditResult, attachmentResult] =
        await Promise.all([
          supabase
            .from("order_comments")
            .select(
              "id, body, author_name, author_phone, author_role, author_user_id, created_at, reply_to_comment_id, reply_snapshot",
            )
            .eq("order_id", order.id)
            .order("created_at", { ascending: true }),
          fetchChecklistActivityRows(supabase, order.id),
          supabase
            .from("activity_events")
            .select("id, event_type, actor_id, actor_type, payload, created_at")
            .eq("order_id", order.id)
            .in("event_type", [
              "checklist.created",
              "checklist.created_again",
              "checklist.completed",
              "checklist.reopened",
              "checklist.deleted",
              "follow_up.created",
              "follow_up.rescheduled",
              "follow_up.completed",
              "follow_up.completed_with_note",
              "follow_up.completed_and_next_created",
              "follow_up.reopened",
              "follow_up.cancelled",
            ])
            .order("created_at", { ascending: true }),
          attachmentIds.length > 0
            ? supabase
                .from("activity_attachments")
                .select(
                  "id, file_name, storage_path, mime_type, file_size, created_at",
                )
                .in("id", attachmentIds)
            : Promise.resolve({ data: [], error: null }),
        ]);
      if (!active) return;
      const nextComments = (commentsResult.data ?? []) as CommentRow[];
      const nextChecklist = checklistResult as ChecklistActivityRow[];
      const nextAuditEvents = (auditResult.data ?? []) as ActivityEventRow[];
      const nextAttachments = (attachmentResult.data ??
        []) as ActivityAttachmentRow[];
      setComments(nextComments);
      setItems(
        buildItems(
          nextComments,
          nextChecklist,
          nextAuditEvents,
          localEvents,
          nextAttachments,
        ),
      );
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, [buildItems, businessId, order.id, supabase]);

  React.useEffect(() => {
    function handleRefresh(event: Event) {
      const detail = (
        event as CustomEvent<{ businessId?: string; orderId?: string }>
      ).detail;
      if (
        !detail ||
        detail.businessId !== businessId ||
        detail.orderId !== order.id
      )
        return;
      void refreshWith(comments);
    }

    window.addEventListener(
      ORDER_ACTIVITY_REFRESH_EVENT,
      handleRefresh as EventListener,
    );
    return () => {
      window.removeEventListener(
        ORDER_ACTIVITY_REFRESH_EVENT,
        handleRefresh as EventListener,
      );
    };
  }, [businessId, comments, order.id, refreshWith]);

  const filteredItems = React.useMemo(() => {
    const sorted = [...items].sort((a, b) =>
      sort === "conversation"
        ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return sorted.filter((item) => {
      if (filter === "all") return true;
      if (filter === "comments") return item.kind === "comment";
      if (filter === "files") return isFileEvent(item);
      if (filter === "followups") return isFollowUpEvent(item);
      return (
        item.kind === "event" && !isFileEvent(item) && !isFollowUpEvent(item)
      );
    });
  }, [filter, items, sort]);
  const visibleItems = React.useMemo(
    () =>
      filteredItems.length <= visibleCount
        ? filteredItems
        : sort === "conversation"
          ? filteredItems.slice(-visibleCount)
          : filteredItems.slice(0, visibleCount),
    [filteredItems, sort, visibleCount],
  );
  const hiddenCount = Math.max(0, filteredItems.length - visibleItems.length);
  const commentCount = items.filter((item) => item.kind === "comment").length;
  const fileCount = items.filter(isFileEvent).length;
  const followUpCount = items.filter(isFollowUpEvent).length;
  const updateCount = items.filter(
    (item) =>
      item.kind === "event" && !isFileEvent(item) && !isFollowUpEvent(item),
  ).length;

  async function uploadAttachment(file: File) {
    const formData = new FormData();
    formData.set("businessId", businessId);
    formData.set("orderId", order.id);
    formData.set("file", file);

    const response = await fetch("/api/activity-attachments/upload", {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      attachment?: ActivityAttachmentRow;
    };

    if (!response.ok || !payload.attachment) {
      throw new Error(payload.error || "Failed to upload file.");
    }

    return payload.attachment;
  }

  async function submitComment() {
    if (
      (!composerValue.trim() && attachments.length === 0) ||
      isSubmitting ||
      !canWrite
    )
      return;
    setIsSubmitting(true);
    let nextComments = comments;
    if (composerValue.trim()) {
      const serializedBody = serializeMentions(
        composerValue.trim(),
        mentionMapRef.current,
      );
      const insertPayload = {
        order_id: order.id,
        business_id: businessId,
        body: serializedBody,
        author_name: currentUserName || "Manager",
        author_phone: phoneRaw || null,
        author_role: userRole,
        author_user_id: currentUserId || null,
        reply_to_comment_id:
          replyTarget?.kind === "comment"
            ? replyTarget.id.replace(/^comment-/, "")
            : null,
        reply_snapshot: replyTarget ? toReplySnapshot(replyTarget) : null,
      };
      const { data, error } = await supabase
        .from("order_comments")
        .insert(insertPayload)
        .select(
          "id, body, author_name, author_phone, author_role, author_user_id, created_at, reply_to_comment_id, reply_snapshot",
        )
        .single();
      if (error) {
        console.error("insert comment error:", error);
        setIsSubmitting(false);
        return;
      }
      if (data) nextComments = [...comments, data as CommentRow];
    }
    if (attachments.length > 0) {
      for (const attachment of attachments) {
        try {
          const storedAttachment = await uploadAttachment(attachment.file);
          appendLocalActivityEvent(businessId, order.id, {
            id: makeLocalActivityEventId("file-uploaded"),
            type: "file_uploaded",
            actorName: currentUserName || "Manager",
            actorRole: userRole,
            description: `uploaded file ${attachment.file.name}`,
            ts: storedAttachment.created_at || new Date().toISOString(),
            payload: {
              attachmentId: storedAttachment.id,
              attachment_id: storedAttachment.id,
              fileName: storedAttachment.file_name,
              fileType: storedAttachment.mime_type,
              fileSize: storedAttachment.file_size,
            },
          });
        } catch (error) {
          console.error("upload attachment error:", error);
          const objectUrl = URL.createObjectURL(attachment.file);
          appendLocalActivityEvent(businessId, order.id, {
            id: makeLocalActivityEventId("file-uploaded"),
            type: "file_uploaded",
            actorName: currentUserName || "Manager",
            actorRole: userRole,
            description: `uploaded file ${attachment.file.name}`,
            ts: new Date().toISOString(),
            payload: {
              fileName: attachment.file.name,
              fileType: attachment.file.type || null,
              fileSize: attachment.file.size,
              previewUrl: objectUrl,
              downloadUrl: objectUrl,
            },
          });
        }
      }
    }
    await refreshWith(nextComments);
    setComposerValue("");
    mentionMapRef.current.clear();
    setAttachments([]);
    setReplyTarget(null);
    setIsSubmitting(false);
  }

  async function saveCommentEdit(item: TimelineComment) {
    if (!editingValue.trim()) return;
    const commentId = item.id.replace(/^comment-/, "");
    const { error } = await supabase
      .from("order_comments")
      .update({ body: editingValue.trim() })
      .eq("id", commentId);
    if (error) return;
    appendLocalActivityEvent(businessId, order.id, {
      id: makeLocalActivityEventId("comment-edited"),
      type: "comment_edited",
      actorName: currentUserName || "Manager",
      actorRole: userRole,
      description: `Updated a comment posted at ${formatDateTime(item.createdAt)}`,
      ts: new Date().toISOString(),
      payload: {
        commentId,
        edited: true,
        field: "comment",
        from: item.body,
        to: editingValue.trim(),
      },
    });
    await refreshWith(
      comments.map((comment) =>
        comment.id === commentId
          ? { ...comment, body: editingValue.trim() }
          : comment,
      ),
    );
    setEditingId(null);
    setEditingValue("");
  }

  async function deleteComment(item: TimelineComment) {
    if (!window.confirm("Delete this comment?")) return;
    const commentId = item.id.replace(/^comment-/, "");
    const { error } = await supabase
      .from("order_comments")
      .delete()
      .eq("id", commentId);
    if (error) return;
    appendLocalActivityEvent(businessId, order.id, {
      id: makeLocalActivityEventId("comment-deleted"),
      type: "comment_deleted",
      actorName: currentUserName || "Manager",
      actorRole: userRole,
      description: `Removed a comment posted at ${formatDateTime(item.createdAt)}`,
      ts: new Date().toISOString(),
      payload: { commentId },
    });
    await refreshWith(comments.filter((comment) => comment.id !== commentId));
  }

  return (
    <div className="space-y-3">
      <ActivityHeader
        totalCount={items.length}
        commentCount={commentCount}
        updateCount={updateCount}
        fileCount={fileCount}
        followUpCount={followUpCount}
        filter={filter}
        setFilter={setFilter}
        sort={sort}
        setSort={setSort}
        compact={compact}
      />
      {loading ? (
        <div className="rounded-[24px] border border-[#E5E7EB] bg-white px-4 py-10 text-sm text-[#6B7280] shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          Loading activity...
        </div>
      ) : (
        <ActivityTimeline
          items={visibleItems}
          hiddenCount={hiddenCount}
          onLoadMore={() => setVisibleCount((prev) => prev + 20)}
          canWrite={canWrite}
          editingId={editingId}
          editingValue={editingValue}
          setEditingValue={setEditingValue}
          onStartEdit={(item) => {
            setEditingId(item.id);
            setEditingValue(item.body);
          }}
          onCancelEdit={() => {
            setEditingId(null);
            setEditingValue("");
          }}
          onSaveEdit={saveCommentEdit}
          onDelete={deleteComment}
          expandedComments={expandedComments}
          toggleExpanded={(id) =>
            setExpandedComments((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
          onReply={setReplyTarget}
          compact={compact}
          actorNames={actorNameById}
          reactionsByComment={reactionsByComment}
          onToggleReaction={toggleReaction}
          currentUserId={currentUserId}
        />
      )}
      <div
        className={cn(
          "sticky bottom-0 z-20 -mx-1 rounded-[28px] bg-[linear-gradient(180deg,rgba(248,250,252,0)_0%,rgba(248,250,252,0.94)_22%,rgba(248,250,252,1)_100%)] px-1",
          compact ? "pt-2" : "pt-2.5",
        )}
      >
        <CommentComposer
          value={composerValue}
          onChange={setComposerValue}
          onSubmit={submitComment}
          isSubmitting={isSubmitting}
          currentUserName={currentUserName}
          currentUserAvatarUrl={currentUserAvatarUrl}
          canWrite={canWrite}
          attachments={attachments}
          onAttachFiles={(files) => {
            if (!files?.length) return;
            setAttachments((prev) => [
              ...prev,
              ...Array.from(files).map((file) => ({
                id: makeLocalActivityEventId("attachment"),
                file,
              })),
            ]);
          }}
          onRemoveAttachment={(id) =>
            setAttachments((prev) => prev.filter((item) => item.id !== id))
          }
          mentionSuggestions={actors}
          replyTarget={replyTarget}
          onClearReply={() => setReplyTarget(null)}
          compact={compact}
          mentionMapRef={mentionMapRef}
        />
      </div>
    </div>
  );
}
