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
  Filter,
  MessageSquareText,
  Paperclip,
  Pencil,
  Send,
  Tag,
  Trash2,
  UserRound,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { OrderAttachmentLightbox } from "@/app/b/[slug]/_components/orders/OrderAttachmentLightbox";
import { cn } from "@/components/ui/utils";
import {
  appendLocalActivityEvent,
  ORDER_ACTIVITY_REFRESH_EVENT,
  makeLocalActivityEventId,
  readLocalActivityEvents,
  type LocalActivityEvent,
  type LocalActivityEventType,
  type LocalActivityEventPayload,
} from "@/app/b/[slug]/_components/orders/order-activity";

type TeamActor = { id: string; label: string; kind: "OWNER" | "MANAGER" };
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
  author_phone: string | null;
  author_role: string | null;
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
  event_type: "checklist.created" | "checklist.completed" | "checklist.deleted";
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
};

type FilterValue = "all" | "comments" | "updates" | "files";
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
  eventType: LocalActivityEventType | "order_created" | "manager_assigned" | "due_date_set";
  title: string;
  detail?: string;
  tone: "default" | "success" | "warning" | "muted";
  payload?: LocalActivityEventPayload;
};
type TimelineItem = TimelineComment | TimelineEvent;

async function fetchChecklistActivityRows(supabase: SupabaseClient, orderId: string): Promise<ChecklistActivityRow[]> {
  const result = await supabase
    .from("order_checklist_items")
    .select("id, title, created_at, done_at, is_done, created_by, completed_by")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (!result.error) return (result.data ?? []) as ChecklistActivityRow[];

  const message = String(result.error.message ?? "").toLowerCase();
  const missingCreatedBy = message.includes("could not find the 'created_by' column") && message.includes("schema cache");
  const missingCompletedBy = message.includes("could not find the 'completed_by' column") && message.includes("schema cache");
  if (!missingCreatedBy && !missingCompletedBy) return [];

  const fallback = await supabase
    .from("order_checklist_items")
    .select("id, title, created_at, done_at, is_done")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  return ((fallback.data ?? []) as Array<Omit<ChecklistActivityRow, "created_by" | "completed_by">>).map((row) => ({
    ...row,
    created_by: null,
    completed_by: null,
  }));
}

function normalizeRole(role: string | null | undefined): "OWNER" | "MANAGER" | "GUEST" {
  const value = String(role ?? "").trim().toUpperCase();
  if (value === "OWNER") return "OWNER";
  if (value === "MANAGER") return "MANAGER";
  return "GUEST";
}

function getInitials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatDateSeparator(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Older";
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const delta = Math.round((startToday - startTarget) / 86400000);
  if (delta === 0) return "Today";
  if (delta === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function getDateKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function getRoleBadge(role: "OWNER" | "MANAGER" | "GUEST") {
  if (role === "OWNER") return { label: "Owner", className: "border-[#cfe0ff] bg-[#eef4ff] text-[#1f4eb8]" };
  if (role === "MANAGER") return { label: "Manager", className: "border-[#d9e2ec] bg-[#f8fafc] text-[#475467]" };
  return { label: "Guest", className: "border-[#eaecf0] bg-[#f8fafc] text-[#667085]" };
}

function resolveAuthorName(comment: CommentRow, currentPhone: string, currentUserName: string, ownerName?: string | null, managerName?: string | null) {
  const commentPhone = comment.author_phone?.trim() ?? "";
  if (commentPhone && currentPhone && commentPhone === currentPhone && currentUserName.trim()) return currentUserName.trim();
  const role = normalizeRole(comment.author_role);
  if (role === "MANAGER") return managerName?.trim() || commentPhone || "Manager";
  if (role === "OWNER") return ownerName?.trim() || "Owner";
  return commentPhone || "Guest";
}

function replaceMentionToken(text: string, selectionStart: number, label: string) {
  const before = text.slice(0, selectionStart);
  const after = text.slice(selectionStart);
  const match = before.match(/(^|\s)@([^\s@]*)$/);
  if (!match) {
    const inserted = `${text}@[${label}] `;
    return { value: inserted, caret: inserted.length };
  }
  const tokenStart = before.length - match[0].length + match[1].length;
  const value = `${text.slice(0, tokenStart)}@[${label}] ${after}`;
  return { value, caret: tokenStart + label.length + 4 };
}

function getMentionQuery(text: string, selectionStart: number) {
  const before = text.slice(0, selectionStart);
  const match = before.match(/(^|\s)@([^\s@\]]*)$/);
  return match ? match[2] : null;
}

function renderRichText(text: string) {
  return text.split(/(@\[[^\]]+\])/g).map((part, index) => {
    const match = part.match(/^@\[(.+)\]$/);
    if (!match) return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
    return <span key={`${part}-${index}`} className="inline-flex rounded-md bg-[#eef4ff] px-1.5 py-0.5 text-[0.95em] font-medium text-[#1f4eb8]">@{match[1]}</span>;
  });
}

function getCompactPreview(text: string) {
  const compact = text.replace(/\s+/g, " ").trim();
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
    ? { id: target.id, kind: "file", fileName: target.label, body: target.preview }
    : { id: target.id, kind: "comment", authorName: target.label, body: target.preview };
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
  return { id, kind: "event", createdAt, actorName, actorRole, eventType, title, detail, tone, payload };
}

function mapAuditEventType(eventType: ActivityEventRow["event_type"]): LocalActivityEventType {
  if (eventType === "checklist.created") return "checklist_created";
  if (eventType === "checklist.completed") return "checklist_completed";
  return "checklist_deleted";
}

function mapServerActivityEvent(event: ActivityEventRow, actorById: Map<string, TeamActor>): TimelineEvent {
  const payload = (event.payload ?? {}) as LocalActivityEventPayload;
  const itemTitle =
    typeof payload.itemTitle === "string" && payload.itemTitle.trim()
      ? payload.itemTitle.trim()
      : undefined;
  const actor = event.actor_id ? actorById.get(event.actor_id) : null;
  const actorName = event.actor_type === "system" ? "System" : actor?.label ?? "Team member";
  const actorRole = event.actor_type === "system" ? null : actor?.kind ?? null;
  const mappedType = mapAuditEventType(event.event_type);

  if (mappedType === "checklist_completed") {
    return createEvent(event.id, event.created_at, actorName, actorRole, mappedType, "Checklist completed", itemTitle, "success", payload);
  }

  if (mappedType === "checklist_deleted") {
    return createEvent(event.id, event.created_at, actorName, actorRole, mappedType, "Checklist item deleted", itemTitle, "muted", payload);
  }

  return createEvent(event.id, event.created_at, actorName, actorRole, mappedType, "Checklist item created", itemTitle, "muted", payload);
}

function resolveChecklistActor(actorId: string | null | undefined, actorById: Map<string, TeamActor>) {
  if (!actorId) return { actorName: "Team member", actorRole: null as string | null };
  const actor = actorById.get(actorId);
  return {
    actorName: actor?.label ?? "Team member",
    actorRole: actor?.kind ?? null,
  };
}

function mapLocalEvent(event: LocalActivityEvent): TimelineEvent {
  if (event.type === "status_changed") {
    const match = event.description.match(/^changed status from "(.+)" to "(.+)"$/i);
    return createEvent(event.id, event.ts, event.actorName, event.actorRole, event.type, "Status changed", match ? `${match[1]} -> ${match[2]}` : event.description, "default", event.payload ?? {
      field: "status",
      fromLabel: match?.[1] ?? null,
      toLabel: match?.[2] ?? null,
    });
  }
  if (event.type === "manager_changed") {
    const match = event.description.match(/^changed manager from "(.+)" to "(.+)"$/i);
    return createEvent(event.id, event.ts, event.actorName, event.actorRole, event.type, "Manager changed", match ? `${match[1]} -> ${match[2]}` : event.description, "warning", event.payload ?? {
      field: "manager_id",
      fromLabel: match?.[1] ?? null,
      toLabel: match?.[2] ?? null,
    });
  }
  if (event.type === "label_added" || event.type === "label_removed") {
    const match = event.description.match(/^.+? label "(.+)"$/i);
    return createEvent(event.id, event.ts, event.actorName, event.actorRole, event.type, event.type === "label_added" ? "Tag added" : "Tag removed", match?.[1] ?? event.description, event.type === "label_added" ? "success" : "muted", event.payload ?? {
      field: "tags",
      added: event.type === "label_added" ? [match?.[1] ?? event.description] : undefined,
      removed: event.type === "label_removed" ? [match?.[1] ?? event.description] : undefined,
    });
  }
  if (event.type === "file_uploaded" || event.type === "file_deleted") {
    return createEvent(event.id, event.ts, event.actorName, event.actorRole, event.type, event.type === "file_uploaded" ? "File uploaded" : "File deleted", event.description.replace(/^uploaded file /i, "").replace(/^deleted file /i, ""), event.type === "file_uploaded" ? "success" : "muted", event.payload ?? {
      fileName: event.description.replace(/^uploaded file /i, "").replace(/^deleted file /i, ""),
    });
  }
  if (event.type === "comment_edited" || event.type === "comment_deleted") {
    return createEvent(event.id, event.ts, event.actorName, event.actorRole, event.type, event.type === "comment_edited" ? "Comment edited" : "Comment deleted", event.description, "muted", event.payload);
  }
  if (event.type === "checklist_created" || event.type === "checklist_completed" || event.type === "checklist_deleted") {
    const title = event.type === "checklist_completed" ? "Checklist completed" : event.type === "checklist_created" ? "Checklist item created" : "Checklist item deleted";
    return createEvent(event.id, event.ts, event.actorName, event.actorRole, event.type, title, event.description, event.type === "checklist_completed" ? "success" : "muted", event.payload);
  }
  const match = event.description.match(/^changed (.+?) from (.+) to (.+)$/i);
  return createEvent(event.id, event.ts, event.actorName, event.actorRole, event.type, match ? `${match[1].replace(/(^|\s)\w/g, (letter) => letter.toUpperCase())} changed` : "Order updated", match ? `${match[2]} -> ${match[3]}` : event.description, "default", event.payload ?? {
    field: match?.[1],
    fromLabel: match?.[2] ?? null,
    toLabel: match?.[3] ?? null,
  });
}

function formatAuditValue(value: LocalActivityEventPayload["from"], label?: string | null, field?: string) {
  if (label !== undefined && label !== null && String(label).trim()) return String(label);
  if (field === "amount" && value !== null && value !== undefined && value !== "") {
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
  };
  if (aliases[field]) return aliases[field];
  return field
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ActivityHeader({
  totalCount, commentCount, updateCount, fileCount, filter, setFilter, sort, setSort,
}: {
  totalCount: number; commentCount: number; updateCount: number; fileCount: number;
  filter: FilterValue; setFilter: (value: FilterValue) => void; sort: SortValue; setSort: (value: SortValue) => void;
}) {
  const filters: Array<{ value: FilterValue; label: string; count: number }> = [
    { value: "all", label: "All", count: totalCount },
    { value: "comments", label: "Comments", count: commentCount },
    { value: "updates", label: "Updates", count: updateCount },
    { value: "files", label: "Files", count: fileCount },
  ];

  return (
    <div className="rounded-[24px] border border-[#e6ebf2] bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-3 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#101828]"><CalendarClock className="h-4 w-4 text-[#667085]" />Activity</div>
          <p className="mt-1 max-w-xl text-xs leading-5 text-[#667085]">Comments, assignments, checklist changes, tags, and files in one timeline.</p>
        </div>
        <button type="button" onClick={() => setSort(sort === "conversation" ? "newest" : "conversation")} className="inline-flex items-center gap-2 self-start rounded-full border border-[#d9e2ec] bg-white px-3 py-1 text-xs font-semibold text-[#344054] transition hover:border-[#c7d1dd] hover:bg-[#fcfdff]"><Clock3 className="h-3.5 w-3.5 text-[#667085]" />{sort === "conversation" ? "Newest first" : "Conversation view"}</button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#e4e7ec] bg-white px-3 py-1 text-xs font-medium text-[#667085]"><Filter className="h-3.5 w-3.5" />Scannable timeline</span>
        {filters.map((item) => (
          <button key={item.value} type="button" onClick={() => setFilter(item.value)} className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition", filter === item.value ? "border-[#c7d7f8] bg-[#eef4ff] text-[#1f4eb8]" : "border-[#e4e7ec] bg-white text-[#667085] hover:border-[#d9e2ec] hover:text-[#344054]")}>
            <span>{item.label}</span>
            <span className={cn("rounded-full px-1.5 py-0.5 text-[11px]", filter === item.value ? "bg-white/80 text-[#1f4eb8]" : "bg-[#f2f4f7] text-[#667085]")}>{item.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CommentComposer({
  value, onChange, onSubmit, isSubmitting, currentUserName, canWrite, attachments, onAttachFiles, onRemoveAttachment, mentionSuggestions, replyTarget, onClearReply,
}: {
  value: string; onChange: (value: string) => void; onSubmit: () => void; isSubmitting: boolean; currentUserName: string; canWrite: boolean;
  attachments: ComposerAttachment[]; onAttachFiles: (files: FileList | null) => void; onRemoveAttachment: (id: string) => void; mentionSuggestions: TeamActor[];
  replyTarget: ReplyTarget | null; onClearReply: () => void;
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [mentionQuery, setMentionQuery] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState(false);
  const filteredMentions = React.useMemo(() => {
    if (mentionQuery === null) return [];
    const query = mentionQuery.trim().toLowerCase();
    if (!query) return mentionSuggestions.slice(0, 5);
    return mentionSuggestions.filter((actor) => actor.label.toLowerCase().includes(query)).slice(0, 5);
  }, [mentionQuery, mentionSuggestions]);
  const submitDisabled = (!value.trim() && attachments.length === 0) || isSubmitting || !canWrite;

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

  function applyMention(label: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const next = replaceMentionToken(value, textarea.selectionStart ?? value.length, label);
    onChange(next.value);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(next.caret, next.caret);
    });
  }

  return (
    <div className="rounded-[24px] border border-[#e6ebf2] bg-white/96 p-3 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 rounded-2xl">
          <AvatarFallback className="rounded-2xl bg-[#111827] text-xs font-semibold text-white">
            {getInitials(currentUserName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          {replyTarget ? (
            <div className="mb-2 rounded-[18px] border border-[#dbe4ef] bg-[#f8fafc] px-3.5 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                    <CornerUpLeft className="h-3.5 w-3.5" />
                    Replying to {replyTarget.kind}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[#101828]">{replyTarget.label}</div>
                  <div className="mt-1 text-xs leading-5 text-[#667085]">{replyTarget.preview}</div>
                </div>
                <button type="button" onClick={onClearReply} className="text-xs font-semibold text-[#667085] transition hover:text-[#101828]">
                  Clear
                </button>
              </div>
            </div>
          ) : null}
          <div className="relative rounded-[20px] border border-[#d8e1ec] bg-[linear-gradient(180deg,#fcfdff_0%,#f8fafc_100%)] px-4 py-3 transition focus-within:border-[#b9c8da] focus-within:bg-white">
            <textarea ref={textareaRef} value={value} onFocus={() => setExpanded(true)} onChange={(event) => { onChange(event.target.value); setMentionQuery(getMentionQuery(event.target.value, event.target.selectionStart ?? event.target.value.length)); }} disabled={!canWrite} rows={expanded ? 3 : 1} placeholder={canWrite ? "Write a comment..." : "Only Owner / Manager can add comments."} className={cn("w-full resize-none bg-transparent text-sm leading-6 text-[#101828] outline-none placeholder:text-[#98a2b3]", expanded ? "min-h-[88px]" : "min-h-[28px] overflow-hidden")} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); if (!submitDisabled) onSubmit(); } }} />
            {filteredMentions.length > 0 ? <div className="absolute left-4 right-4 top-full z-10 mt-2 rounded-2xl border border-[#d9e2ec] bg-white p-2 shadow-[0_20px_40px_rgba(15,23,42,0.12)]">
              {filteredMentions.map((actor) => <button key={actor.id} type="button" onClick={() => applyMention(actor.label)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-[#f8fafc]"><span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#f2f4f7] text-[11px] font-semibold text-[#475467]">{getInitials(actor.label)}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#101828]">{actor.label}</span><span className="block text-xs text-[#667085]">{actor.kind}</span></span><AtSign className="h-4 w-4 text-[#98a2b3]" /></button>)}
            </div> : null}
          </div>
          {attachments.length > 0 ? <div className="mt-2 flex flex-wrap gap-2">{attachments.map((attachment) => <span key={attachment.id} className="inline-flex items-center gap-2 rounded-full border border-[#d9e2ec] bg-[#f8fafc] px-3 py-1.5 text-xs font-medium text-[#475467]"><Paperclip className="h-3.5 w-3.5 text-[#667085]" /><span className="max-w-[180px] truncate">{attachment.file.name}</span><button type="button" onClick={() => onRemoveAttachment(attachment.id)} className="rounded-full p-0.5 text-[#98a2b3] transition hover:bg-white hover:text-[#344054]" aria-label={`Remove ${attachment.file.name}`}><Trash2 className="h-3.5 w-3.5" /></button></span>)}</div> : null}
          <div className={cn("mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", expanded && "border-t border-[#eef2f7] pt-3")}>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#667085]">
              <button type="button" onClick={openFilePicker} disabled={!canWrite} className="inline-flex items-center gap-2 rounded-full border border-[#d9e2ec] bg-white px-3 py-1.5 font-semibold text-[#344054] transition hover:border-[#c7d1dd] hover:bg-[#fcfdff] disabled:cursor-not-allowed disabled:opacity-50"><Paperclip className="h-3.5 w-3.5" />Attach file</button>
              {expanded ? <span>Type `@` to mention a teammate. Ctrl/Cmd + Enter sends.</span> : <button type="button" onClick={() => { setExpanded(true); textareaRef.current?.focus(); }} className="font-medium text-[#667085] transition hover:text-[#101828]">Expand composer</button>}
            </div>
            <div className="flex items-center justify-end gap-2">
              {expanded && !value.trim() && attachments.length === 0 ? <button type="button" onClick={() => setExpanded(false)} className="inline-flex h-10 items-center justify-center rounded-2xl border border-[#d9e2ec] px-3 text-sm font-semibold text-[#475467] transition hover:border-[#c7d1dd] hover:bg-[#f8fafc]">Collapse</button> : null}
              <button type="button" onClick={onSubmit} disabled={submitDisabled} className={cn("inline-flex h-10 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition", submitDisabled ? "cursor-not-allowed border-[#e4e7ec] bg-[#f2f4f7] text-[#98a2b3]" : "border-[#c7d7f8] bg-[linear-gradient(180deg,#ffffff_0%,#eef4ff_100%)] text-[#111827] shadow-[0_10px_24px_rgba(31,78,184,0.12)] hover:border-[#b6caef] hover:bg-[linear-gradient(180deg,#ffffff_0%,#e9f2ff_100%)]")}><Send className="h-4 w-4" />{isSubmitting ? "Posting..." : expanded ? "Send comment" : "Comment"}</button>
            </div>
          </div>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(event) => { handleAttachFiles(event.target.files); event.currentTarget.value = ""; }} />
        </div>
      </div>
    </div>
  );
}

function DateSeparator({ label }: { label: string }) {
  return <div className="flex items-center gap-3 py-2"><div className="h-px flex-1 bg-[#eef2f7]" /><span className="rounded-full border border-[#e9eef5] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">{label}</span><div className="h-px flex-1 bg-[#eef2f7]" /></div>;
}

function AuditValue({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "new" | "old" }) {
  return (
    <div className={cn("rounded-2xl border px-3 py-2.5", tone === "old" && "border-[#f0d5dd] bg-[#fff1f3]", tone === "new" && "border-[#d1fadf] bg-[#f0fdf4]", tone === "neutral" && "border-[#e4e7ec] bg-[#f8fafc]")}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[#101828]">{value}</div>
    </div>
  );
}

function EventDelta({ payload }: { payload?: LocalActivityEventPayload }) {
  if (!payload) return null;

  if ((payload.added?.length ?? 0) > 0 || (payload.removed?.length ?? 0) > 0) {
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {(payload.removed ?? []).map((value) => (
          <span key={`removed-${value}`} className="inline-flex rounded-full border border-[#f0d5dd] bg-[#fff1f3] px-3 py-1 text-xs font-semibold text-[#b42318]">
            {value} removed
          </span>
        ))}
        {(payload.added ?? []).map((value) => (
          <span key={`added-${value}`} className="inline-flex rounded-full border border-[#d1fadf] bg-[#f0fdf4] px-3 py-1 text-xs font-semibold text-[#067647]">
            {value} added
          </span>
        ))}
      </div>
    );
  }

  if (payload.from !== undefined || payload.to !== undefined || payload.fromLabel || payload.toLabel) {
    return (
      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
        <AuditValue label="Before" value={formatAuditValue(payload.from, payload.fromLabel, payload.field)} tone="old" />
        <div className="hidden text-center text-sm font-semibold text-[#98a2b3] sm:block">-&gt;</div>
        <AuditValue label="After" value={formatAuditValue(payload.to, payload.toLabel, payload.field)} tone="new" />
      </div>
    );
  }

  if (payload.fileName) {
    return <div className="mt-3"><AuditValue label="File" value={payload.fileName} /></div>;
  }

  return null;
}

function EventGlyph({ eventType, tone }: { eventType: TimelineEvent["eventType"]; tone: TimelineEvent["tone"] }) {
  const classes = cn("flex h-9 w-9 items-center justify-center rounded-2xl border", tone === "success" && "border-[#cdebd9] bg-[#f0fbf5] text-[#067647]", tone === "warning" && "border-[#f5d7a6] bg-[#fff7ed] text-[#b54708]", tone === "muted" && "border-[#eaecf0] bg-[#f8fafc] text-[#667085]", tone === "default" && "border-[#d7e3fb] bg-[#eef4ff] text-[#1f4eb8]");
  if (eventType === "status_changed") return <span className={classes}><CalendarClock className="h-4 w-4" /></span>;
  if (eventType === "manager_changed" || eventType === "manager_assigned") return <span className={classes}><UserRound className="h-4 w-4" /></span>;
  if (eventType === "label_added" || eventType === "label_removed") return <span className={classes}><Tag className="h-4 w-4" /></span>;
  if (eventType === "file_uploaded" || eventType === "file_deleted") return <span className={classes}><Paperclip className="h-4 w-4" /></span>;
  if (eventType === "comment_edited" || eventType === "comment_deleted") return <span className={classes}><MessageSquareText className="h-4 w-4" /></span>;
  if (eventType === "checklist_created" || eventType === "checklist_completed" || eventType === "checklist_deleted") return <span className={classes}><CheckCircle2 className="h-4 w-4" /></span>;
  if (eventType === "order_created") return <span className={classes}><FileText className="h-4 w-4" /></span>;
  return <span className={classes}><Clock3 className="h-4 w-4" /></span>;
}

function AttachmentCard({ payload }: { payload?: LocalActivityEventPayload }) {
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
  const isImage = Boolean(previewUrl && (payload.fileType?.startsWith("image/") || hasImageExtension));
  const fileMeta = [payload.fileType, formatFileSize(payload.fileSize)].filter(Boolean).join(" • ");

  return (
    <div className="mt-3 rounded-[18px] border border-[#dde5ee] bg-[#fbfcfe] p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#101828]">
            <Paperclip className="h-4 w-4 text-[#667085]" />
            <span className="truncate">{payload.fileName}</span>
          </div>
          <div className="mt-1 text-xs text-[#667085]">{fileMeta || "Attachment"}</div>
        </div>
        <div className="flex items-center gap-2">
          {isImage && previewUrl ? (
            <OrderAttachmentLightbox
              fileName={payload.fileName}
              src={previewUrl}
            />
          ) : previewUrl ? <a href={previewUrl} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1 rounded-full border border-[#d9e2ec] bg-white px-3 text-xs font-semibold text-[#344054] transition hover:border-[#c7d1dd] hover:bg-[#f8fafc]"><Eye className="h-3.5 w-3.5" />Open</a> : null}
          {downloadUrl ? <a href={downloadUrl} download={payload.fileName} className="inline-flex h-8 items-center gap-1 rounded-full border border-[#d9e2ec] bg-white px-3 text-xs font-semibold text-[#344054] transition hover:border-[#c7d1dd] hover:bg-[#f8fafc]"><Download className="h-3.5 w-3.5" />Download</a> : null}
        </div>
      </div>
    </div>
  );
}

function SystemEventItem({ item, onReply }: { item: TimelineEvent; onReply: (target: ReplyTarget) => void }) {
  const badge = getRoleBadge(normalizeRole(item.actorRole));
  const canReplyToFile = item.eventType === "file_uploaded" && !!item.payload?.fileName;
  return (
    <div className="flex gap-3 rounded-[22px] border border-[#edf1f5] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)] px-4 py-3 transition hover:border-[#dde5ee] hover:shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
      <div className="flex w-12 flex-col items-center"><EventGlyph eventType={item.eventType} tone={item.tone} /><div className="mt-2 h-full w-px bg-[#edf1f5]" /></div>
      <div className="min-w-0 flex-1 pb-2">
        <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-[#101828]">{item.title}</span>{item.payload?.field ? <span className="text-xs font-medium text-[#98a2b3]">{formatFieldLabel(item.payload.field)}</span> : null}</div>
        {item.detail ? <div className="mt-1 text-sm leading-6 text-[#475467]">{item.detail}</div> : null}
        {item.eventType === "file_uploaded" || item.eventType === "file_deleted" ? <AttachmentCard payload={item.payload} /> : <EventDelta payload={item.payload} />}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#98a2b3]"><span className="font-medium text-[#667085]">{item.actorName}</span><span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]", badge.className)}>{badge.label}</span><span>{formatDateTime(item.createdAt)}</span>{canReplyToFile ? <button type="button" onClick={() => onReply({ id: item.id, kind: "file", label: item.payload?.fileName || "Attachment", preview: item.payload?.fileName || item.detail || "Attachment" })} className="inline-flex items-center gap-1 font-semibold text-[#667085] transition hover:text-[#101828]"><CornerUpLeft className="h-3.5 w-3.5" />Reply</button> : null}</div>
      </div>
    </div>
  );
}

function ReplyPreview({ snapshot }: { snapshot?: ReplySnapshot | null }) {
  const reply = getReplyPreviewContent(snapshot);
  if (!reply) return null;

  return (
    <div className="mb-3 rounded-[18px] border border-[#e5edf8] bg-[#f8fbff] px-3 py-2.5">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#7c8aa5]">
        <CornerUpLeft className="h-3.5 w-3.5" />
        <span>{reply.label}</span>
      </div>
      <div className="mt-1 line-clamp-2 text-sm leading-5 text-[#52607a]">{reply.preview}</div>
    </div>
  );
}

function CommentItem({
  item, canWrite, editingId, editingValue, setEditingValue, onStartEdit, onCancelEdit, onSaveEdit, onDelete, expandedComments, toggleExpanded, onReply,
}: {
  item: TimelineComment; canWrite: boolean; editingId: string | null; editingValue: string; setEditingValue: (value: string) => void;
  onStartEdit: (item: TimelineComment) => void; onCancelEdit: () => void; onSaveEdit: (item: TimelineComment) => void; onDelete: (item: TimelineComment) => void;
  expandedComments: Set<string>; toggleExpanded: (id: string) => void; onReply: (target: ReplyTarget) => void;
}) {
  const badge = getRoleBadge(normalizeRole(item.actorRole));
  const isEditing = editingId === item.id;
  const isExpanded = expandedComments.has(item.id);
  const [showChanges, setShowChanges] = React.useState(false);
  const shouldCollapse = item.body.length > 280 || item.body.split("\n").length > 5;
  const canReply = canWrite;
  const canManageItem = canWrite && item.isOwnComment;
  const hasChangeDetails =
    item.editPayload &&
    (item.editPayload.from !== undefined || item.editPayload.to !== undefined || item.editPayload.fromLabel || item.editPayload.toLabel);
  return (
    <div
      className={cn(
        "group flex gap-3 rounded-[24px] border border-[#e6ebf2] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition hover:border-[#d9e2ec] hover:shadow-[0_14px_30px_rgba(15,23,42,0.06)]",
        item.replyToCommentId && "ml-4 border-[#e5edf8] bg-[#fcfdff]",
      )}
    >
      <Avatar className="h-10 w-10 rounded-2xl">
        <AvatarFallback className="rounded-2xl bg-[#111827] text-xs font-semibold text-white">
          {getInitials(item.actorName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-[#101828]">{item.actorName}</span>
              <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]", badge.className)}>{badge.label}</span>
              {item.replyToCommentId ? <span className="inline-flex rounded-full border border-[#e5edf8] bg-[#f8fbff] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#52607a]">Reply</span> : null}
              {item.edited ? <span className="inline-flex rounded-full border border-[#d7e3fb] bg-[#eef4ff] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#1f4eb8]">Edited</span> : null}
              <span className="text-xs text-[#98a2b3]">{formatDateTime(item.createdAt)}</span>
            </div>
          </div>
          {(canReply || canManageItem) ? (
            <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
              {canReply ? (
                <button type="button" onClick={() => onReply({ id: item.id, kind: "comment", label: item.actorName, preview: getCompactPreview(item.body) })} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent bg-[#f8fafc] text-[#667085] transition hover:border-[#d9e2ec] hover:bg-white hover:text-[#101828]" aria-label="Reply to comment"><CornerUpLeft className="h-4 w-4" /></button>
              ) : null}
              {canManageItem ? <button type="button" onClick={() => onStartEdit(item)} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent bg-[#f8fafc] text-[#667085] transition hover:border-[#d9e2ec] hover:bg-white hover:text-[#101828]" aria-label="Edit comment"><Pencil className="h-4 w-4" /></button> : null}
              {canManageItem ? <button type="button" onClick={() => onDelete(item)} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent bg-[#fef3f2] text-[#b42318] transition hover:border-[#fecdca] hover:bg-white" aria-label="Delete comment"><Trash2 className="h-4 w-4" /></button> : null}
            </div>
          ) : null}
        </div>
        {isEditing ? <div className="mt-3"><textarea value={editingValue} onChange={(event) => setEditingValue(event.target.value)} rows={4} className="min-h-[120px] w-full resize-none rounded-[18px] border border-[#d8e1ec] bg-[#fbfcfe] px-4 py-3 text-sm leading-6 text-[#101828] outline-none transition focus:border-[#b9c8da] focus:bg-white" /><div className="mt-3 flex items-center justify-end gap-2"><button type="button" onClick={onCancelEdit} className="inline-flex h-10 items-center justify-center rounded-2xl border border-[#d9e2ec] px-4 text-sm font-semibold text-[#475467] transition hover:border-[#c7d1dd] hover:bg-[#f8fafc]">Cancel</button><button type="button" onClick={() => onSaveEdit(item)} disabled={!editingValue.trim()} className="inline-flex h-10 items-center justify-center rounded-2xl border border-[#c7d7f8] bg-[#eef4ff] px-4 text-sm font-semibold text-[#1f4eb8] transition disabled:cursor-not-allowed disabled:opacity-50">Save</button></div></div> : <div className="mt-3"><ReplyPreview snapshot={item.replySnapshot} /><div className={cn("whitespace-pre-wrap text-sm leading-6 text-[#101828]", shouldCollapse && !isExpanded && "line-clamp-5")}>{renderRichText(item.body)}</div>{shouldCollapse ? <button type="button" onClick={() => toggleExpanded(item.id)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#667085] transition hover:text-[#101828]">{isExpanded ? "Show less" : "Show more"}<ChevronDown className={cn("h-3.5 w-3.5 transition", isExpanded && "rotate-180")} /></button> : null}{hasChangeDetails ? <div className="mt-2"><button type="button" onClick={() => setShowChanges((prev) => !prev)} className="inline-flex items-center gap-1 text-xs font-semibold text-[#667085] transition hover:text-[#101828]">{showChanges ? "Hide changes" : "Show changes"}<ChevronDown className={cn("h-3.5 w-3.5 transition", showChanges && "rotate-180")} /></button>{showChanges ? <EventDelta payload={item.editPayload} /> : null}</div> : null}</div>}
      </div>
    </div>
  );
}

function ActivityTimeline({
  items, hiddenCount, onLoadMore, canWrite, editingId, editingValue, setEditingValue, onStartEdit, onCancelEdit, onSaveEdit, onDelete, expandedComments, toggleExpanded, onReply,
}: {
  items: TimelineItem[]; hiddenCount: number; onLoadMore: () => void; canWrite: boolean; editingId: string | null; editingValue: string; setEditingValue: (value: string) => void;
  onStartEdit: (item: TimelineComment) => void; onCancelEdit: () => void; onSaveEdit: (item: TimelineComment) => void; onDelete: (item: TimelineComment) => void;
  expandedComments: Set<string>; toggleExpanded: (id: string) => void; onReply: (target: ReplyTarget) => void;
}) {
  return (
    <div className="rounded-[24px] border border-[#e6ebf2] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)] p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      {items.length === 0 ? <div className="rounded-[22px] border border-dashed border-[#d9e2ec] bg-white px-5 py-10 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4f6f8] text-[#667085]"><MessageSquareText className="h-5 w-5" /></div><div className="mt-4 text-sm font-semibold text-[#101828]">No activity yet</div><p className="mt-1 text-sm leading-6 text-[#667085]">Comments, assignments, checklist progress, and order changes will appear here as a single timeline.</p></div> : <div className="space-y-3">{items.map((item, index) => {
        const previous = index > 0 ? items[index - 1] : null;
        const showSeparator = !previous || getDateKey(previous.createdAt) !== getDateKey(item.createdAt);
        return <React.Fragment key={item.id}>{showSeparator ? <DateSeparator label={formatDateSeparator(item.createdAt)} /> : null}{item.kind === "comment" ? <CommentItem item={item} canWrite={canWrite} editingId={editingId} editingValue={editingValue} setEditingValue={setEditingValue} onStartEdit={onStartEdit} onCancelEdit={onCancelEdit} onSaveEdit={onSaveEdit} onDelete={onDelete} expandedComments={expandedComments} toggleExpanded={toggleExpanded} onReply={onReply} /> : <SystemEventItem item={item} onReply={onReply} />}</React.Fragment>;
      })}</div>}
      {hiddenCount > 0 ? <div className="mt-4 flex justify-center"><button type="button" onClick={onLoadMore} className="inline-flex items-center gap-2 rounded-full border border-[#d9e2ec] bg-white px-4 py-2 text-sm font-semibold text-[#344054] transition hover:border-[#c7d1dd] hover:bg-[#fcfdff]">Load {Math.min(20, hiddenCount)} older activities</button></div> : null}
    </div>
  );
}

export function OrderActivitySection({ order, businessId, supabase, phoneRaw, currentUserId, currentUserName, userRole, actors, ownerName, managerName }: Props) {
  const [comments, setComments] = React.useState<CommentRow[]>([]);
  const [items, setItems] = React.useState<TimelineItem[]>([]);
  const [composerValue, setComposerValue] = React.useState("");
  const [attachments, setAttachments] = React.useState<ComposerAttachment[]>([]);
  const [replyTarget, setReplyTarget] = React.useState<ReplyTarget | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingValue, setEditingValue] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [filter, setFilter] = React.useState<FilterValue>("all");
  const [sort, setSort] = React.useState<SortValue>("newest");
  const [visibleCount, setVisibleCount] = React.useState(18);
  const [expandedComments, setExpandedComments] = React.useState<Set<string>>(new Set());
  const actorById = React.useMemo(() => new Map(actors.map((actor) => [actor.id, actor])), [actors]);
  const canWrite = userRole === "OWNER" || userRole === "MANAGER";

  const buildItems = React.useCallback((
    nextComments: CommentRow[],
    checklistRows: ChecklistActivityRow[],
    auditEvents: ActivityEventRow[],
    localEvents: LocalActivityEvent[],
    attachments: ActivityAttachmentRow[] = [],
  ) => {
    const nextItems: TimelineItem[] = [];
    const attachmentMap = new Map(attachments.map((attachment) => [attachment.id, attachment]));
    const checklistAuditKeys = new Set<string>();
    const editedCommentIds = new Set(
      localEvents
        .filter((event) => event.type === "comment_edited" && event.payload?.commentId)
        .map((event) => event.payload?.commentId)
        .filter((value): value is string => Boolean(value)),
    );
    const editPayloadByCommentId = new Map(
      localEvents
        .filter((event) => event.type === "comment_edited" && event.payload?.commentId)
        .map((event) => [event.payload?.commentId as string, event.payload]),
    );

    nextItems.push(createEvent(`order-created-${order.id}`, order.created_at, order.created_by_name || (order.created_by ? actorById.get(order.created_by)?.label : null) || order.manager_name || "Team member", order.created_by_role ?? null, "order_created", "Order created", "Initial order record was created.", "default"));
    if (order.manager_name?.trim()) nextItems.push(createEvent(`manager-assigned-${order.id}`, order.created_at, (order.manager_id ? actorById.get(order.manager_id)?.label : null) || order.manager_name, "MANAGER", "manager_assigned", "Manager assigned", (order.manager_id ? actorById.get(order.manager_id)?.label : null) || order.manager_name, "warning", {
      field: "manager_id",
      fromLabel: "System",
      toLabel: (order.manager_id ? actorById.get(order.manager_id)?.label : null) || order.manager_name,
    }));
    if (order.due_date) nextItems.push(createEvent(`due-date-${order.id}`, order.due_date, "System", null, "due_date_set", "Due date set", new Date(order.due_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), "warning", {
      field: "due_date",
      fromLabel: "No due date",
      toLabel: new Date(order.due_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    }));
    for (const comment of nextComments) nextItems.push({
      id: `comment-${comment.id}`,
      kind: "comment",
      createdAt: comment.created_at,
      actorName: resolveAuthorName(comment, phoneRaw, currentUserName, ownerName, managerName),
      actorRole: comment.author_role,
      body: comment.body,
      isOwnComment: (comment.author_phone?.trim() ?? "") === phoneRaw.trim(),
      edited: editedCommentIds.has(comment.id),
      editPayload: editPayloadByCommentId.get(comment.id),
      replyToCommentId: comment.reply_to_comment_id || null,
      replySnapshot: comment.reply_snapshot || null,
    });
    for (const event of auditEvents) {
      const payload = (event.payload ?? {}) as LocalActivityEventPayload;
      const itemId = typeof payload.itemId === "string" ? payload.itemId : "";
      checklistAuditKeys.add(`${event.event_type}:${itemId}`);
      nextItems.push(mapServerActivityEvent(event, actorById));
    }
    for (const row of checklistRows) {
      if (!checklistAuditKeys.has(`checklist.created:${row.id}`)) {
        const { actorName, actorRole } = resolveChecklistActor(row.created_by, actorById);
        nextItems.push(createEvent(`checklist-created-${row.id}`, row.created_at, actorName, actorRole, "checklist_created", "Checklist item created", row.title, "muted", {
          field: "checklist_item",
          itemId: row.id,
          itemTitle: row.title,
        }));
      }
      if (row.is_done && row.done_at && !checklistAuditKeys.has(`checklist.completed:${row.id}`)) {
        const { actorName, actorRole } = resolveChecklistActor(row.completed_by, actorById);
        nextItems.push(createEvent(`checklist-done-${row.id}`, row.done_at, actorName, actorRole, "checklist_completed", "Checklist completed", row.title, "success", {
          field: "completed",
          itemId: row.id,
          itemTitle: row.title,
          from: false,
          to: true,
        }));
      }
    }
    for (const event of localEvents) {
      if (event.type === "comment_edited") continue;
      if (
        (event.type === "checklist_created" || event.type === "checklist_completed" || event.type === "checklist_deleted") &&
        typeof event.payload?.itemId === "string"
      ) {
        const auditEventType =
          event.type === "checklist_created"
            ? "checklist.created"
            : event.type === "checklist_completed"
              ? "checklist.completed"
              : "checklist.deleted";
        if (checklistAuditKeys.has(`${auditEventType}:${event.payload.itemId}`)) continue;
      }
      const mapped = mapLocalEvent(event);
      const attachmentId = getAttachmentPayloadId(mapped.payload);
      const attachment = attachmentId ? attachmentMap.get(attachmentId) : null;
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
  }, [actorById, currentUserName, managerName, order.created_at, order.created_by, order.created_by_name, order.created_by_role, order.due_date, order.id, order.manager_id, order.manager_name, ownerName, phoneRaw]);

  const refreshWith = React.useCallback(async (nextComments: CommentRow[]) => {
    const [checklistResult, auditResult] = await Promise.all([
      fetchChecklistActivityRows(supabase, order.id),
      supabase
        .from("activity_events")
        .select("id, event_type, actor_id, actor_type, payload, created_at")
        .eq("order_id", order.id)
        .in("event_type", ["checklist.created", "checklist.completed", "checklist.deleted"])
        .order("created_at", { ascending: true }),
    ]);
    const localEvents = readLocalActivityEvents(businessId, order.id);
    const attachmentIds = Array.from(
      new Set(localEvents.map((event) => getAttachmentPayloadId(event.payload)).filter((value): value is string => Boolean(value))),
    );
    const attachmentResult =
      attachmentIds.length > 0
        ? await supabase.from("activity_attachments").select("id, file_name, storage_path, mime_type, file_size, created_at").in("id", attachmentIds)
        : { data: [], error: null };
    const nextAttachments = (attachmentResult.data ?? []) as ActivityAttachmentRow[];
    setComments(nextComments);
    setItems(buildItems(nextComments, checklistResult as ChecklistActivityRow[], (auditResult.data ?? []) as ActivityEventRow[], localEvents, nextAttachments));
  }, [buildItems, businessId, order.id, supabase]);

  React.useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const localEvents = readLocalActivityEvents(businessId, order.id);
      const attachmentIds = Array.from(
        new Set(localEvents.map((event) => getAttachmentPayloadId(event.payload)).filter((value): value is string => Boolean(value))),
      );
      const [commentsResult, checklistResult, auditResult, attachmentResult] = await Promise.all([
        supabase.from("order_comments").select("id, body, author_phone, author_role, created_at, reply_to_comment_id, reply_snapshot").eq("order_id", order.id).order("created_at", { ascending: true }),
        fetchChecklistActivityRows(supabase, order.id),
        supabase
          .from("activity_events")
          .select("id, event_type, actor_id, actor_type, payload, created_at")
          .eq("order_id", order.id)
          .in("event_type", ["checklist.created", "checklist.completed", "checklist.deleted"])
          .order("created_at", { ascending: true }),
        attachmentIds.length > 0
          ? supabase.from("activity_attachments").select("id, file_name, storage_path, mime_type, file_size, created_at").in("id", attachmentIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (!active) return;
      const nextComments = (commentsResult.data ?? []) as CommentRow[];
      const nextChecklist = checklistResult as ChecklistActivityRow[];
      const nextAuditEvents = (auditResult.data ?? []) as ActivityEventRow[];
      const nextAttachments = (attachmentResult.data ?? []) as ActivityAttachmentRow[];
      setComments(nextComments);
      setItems(buildItems(nextComments, nextChecklist, nextAuditEvents, localEvents, nextAttachments));
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [buildItems, businessId, order.id, supabase]);

  React.useEffect(() => {
    function handleRefresh(event: Event) {
      const detail = (event as CustomEvent<{ businessId?: string; orderId?: string }>).detail;
      if (!detail || detail.businessId !== businessId || detail.orderId !== order.id) return;
      void refreshWith(comments);
    }

    window.addEventListener(ORDER_ACTIVITY_REFRESH_EVENT, handleRefresh as EventListener);
    return () => {
      window.removeEventListener(ORDER_ACTIVITY_REFRESH_EVENT, handleRefresh as EventListener);
    };
  }, [businessId, comments, order.id, refreshWith]);

  const filteredItems = React.useMemo(() => {
    const sorted = [...items].sort((a, b) => sort === "conversation" ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return sorted.filter((item) => {
      if (filter === "all") return true;
      if (filter === "comments") return item.kind === "comment";
      if (filter === "files") return item.kind === "event" && (item.eventType === "file_uploaded" || item.eventType === "file_deleted");
      return item.kind === "event";
    });
  }, [filter, items, sort]);
  const visibleItems = React.useMemo(() => filteredItems.length <= visibleCount ? filteredItems : sort === "conversation" ? filteredItems.slice(-visibleCount) : filteredItems.slice(0, visibleCount), [filteredItems, sort, visibleCount]);
  const hiddenCount = Math.max(0, filteredItems.length - visibleItems.length);
  const commentCount = items.filter((item) => item.kind === "comment").length;
  const fileCount = items.filter((item) => item.kind === "event" && (item.eventType === "file_uploaded" || item.eventType === "file_deleted")).length;
  const updateCount = items.length - commentCount;

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
    if ((!composerValue.trim() && attachments.length === 0) || isSubmitting || !canWrite) return;
    setIsSubmitting(true);
    let nextComments = comments;
    if (composerValue.trim()) {
      const insertPayload = {
        order_id: order.id,
        business_id: businessId,
        body: composerValue.trim(),
        author_phone: phoneRaw || null,
        author_role: userRole,
        reply_to_comment_id: replyTarget?.kind === "comment" ? replyTarget.id.replace(/^comment-/, "") : null,
        reply_snapshot: replyTarget ? toReplySnapshot(replyTarget) : null,
      };
      const { data, error } = await supabase
        .from("order_comments")
        .insert(insertPayload)
        .select("id, body, author_phone, author_role, created_at, reply_to_comment_id, reply_snapshot")
        .single();
      if (!error && data) nextComments = [...comments, data as CommentRow];
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
    setAttachments([]);
    setReplyTarget(null);
    setIsSubmitting(false);
  }

  async function saveCommentEdit(item: TimelineComment) {
    if (!editingValue.trim()) return;
    const commentId = item.id.replace(/^comment-/, "");
    const { error } = await supabase.from("order_comments").update({ body: editingValue.trim() }).eq("id", commentId);
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
    await refreshWith(comments.map((comment) => comment.id === commentId ? { ...comment, body: editingValue.trim() } : comment));
    setEditingId(null);
    setEditingValue("");
  }

  async function deleteComment(item: TimelineComment) {
    if (!window.confirm("Delete this comment?")) return;
    const commentId = item.id.replace(/^comment-/, "");
    const { error } = await supabase.from("order_comments").delete().eq("id", commentId);
    if (error) return;
    appendLocalActivityEvent(businessId, order.id, { id: makeLocalActivityEventId("comment-deleted"), type: "comment_deleted", actorName: currentUserName || "Manager", actorRole: userRole, description: `Removed a comment posted at ${formatDateTime(item.createdAt)}`, ts: new Date().toISOString(), payload: { commentId } });
    await refreshWith(comments.filter((comment) => comment.id !== commentId));
  }

  return (
    <div className="space-y-4">
      <ActivityHeader totalCount={items.length} commentCount={commentCount} updateCount={updateCount} fileCount={fileCount} filter={filter} setFilter={setFilter} sort={sort} setSort={setSort} />
      {loading ? <div className="rounded-[24px] border border-[#e6ebf2] bg-white px-4 py-10 text-sm text-[#667085] shadow-[0_12px_30px_rgba(15,23,42,0.05)]">Loading activity...</div> : <ActivityTimeline items={visibleItems} hiddenCount={hiddenCount} onLoadMore={() => setVisibleCount((prev) => prev + 20)} canWrite={canWrite} editingId={editingId} editingValue={editingValue} setEditingValue={setEditingValue} onStartEdit={(item) => { setEditingId(item.id); setEditingValue(item.body); }} onCancelEdit={() => { setEditingId(null); setEditingValue(""); }} onSaveEdit={saveCommentEdit} onDelete={deleteComment} expandedComments={expandedComments} toggleExpanded={(id) => setExpandedComments((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; })} onReply={setReplyTarget} />}
      <div className="sticky bottom-0 z-20 -mx-1 rounded-[28px] bg-[linear-gradient(180deg,rgba(248,250,252,0)_0%,rgba(248,250,252,0.94)_22%,rgba(248,250,252,1)_100%)] px-1 pt-6">
        <CommentComposer value={composerValue} onChange={setComposerValue} onSubmit={submitComment} isSubmitting={isSubmitting} currentUserName={currentUserName} canWrite={canWrite} attachments={attachments} onAttachFiles={(files) => { if (!files?.length) return; setAttachments((prev) => [...prev, ...Array.from(files).map((file) => ({ id: makeLocalActivityEventId("attachment"), file }))]); }} onRemoveAttachment={(id) => setAttachments((prev) => prev.filter((item) => item.id !== id))} mentionSuggestions={actors} replyTarget={replyTarget} onClearReply={() => setReplyTarget(null)} />
      </div>
    </div>
  );
}
