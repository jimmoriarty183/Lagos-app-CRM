"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ChevronDown, ChevronUp, CornerUpLeft, MessageSquareText, Send, UserRound, X } from "lucide-react";

type Props = {
  order: { id: string; business_id: string };
  supabase: SupabaseClient;
  author: { phone: string; role: "OWNER" | "MANAGER" | "GUEST"; name: string };
  ownerName?: string | null;
  managerName?: string | null;
};

type CommentRow = {
  id: string;
  body: string;
  author_phone: string | null;
  author_role: string | null;
  created_at: string;
  reply_to_comment_id?: string | null;
  reply_snapshot?: {
    id?: string;
    kind?: "comment" | "file";
    authorName?: string;
    body?: string;
    fileName?: string;
    fileType?: string | null;
  } | null;
};

function normalizeRole(role: string | null | undefined): "OWNER" | "MANAGER" | "GUEST" {
  const value = String(role ?? "").trim().toUpperCase();
  if (value === "OWNER") return "OWNER";
  if (value === "MANAGER") return "MANAGER";
  return "GUEST";
}

function fmtDate(ts: string) {
  try {
    return new Date(ts).toLocaleString("uk-UA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

function getRoleBadge(role: "OWNER" | "MANAGER" | "GUEST") {
  if (role === "OWNER") {
    return {
      label: "Owner",
      className: "border-[#bfdbfe] bg-[#eff6ff] dark:bg-[var(--brand-600)]/15 text-[#1d4ed8]",
    };
  }

  if (role === "MANAGER") {
    return {
      label: "Manager",
      className: "border-[#dbe3ef] bg-[#f8fafc] dark:bg-white/[0.04] text-[#475467] dark:text-white/70",
    };
  }

  return {
    label: "Guest",
    className: "border-[#eaecf0] bg-[#f8fafc] dark:bg-white/[0.04] text-[#667085]",
  };
}

function getInitials(value: string) {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "?";
}

function getCommentPreview(body: string) {
  const compact = body.replace(/\s+/g, " ").trim();
  if (compact.length <= 120) return compact;
  return `${compact.slice(0, 117).trimEnd()}...`;
}

function resolveAuthorName(
  comment: CommentRow,
  currentAuthor: Props["author"],
  ownerName?: string | null,
  managerName?: string | null,
) {
  const commentPhone = comment.author_phone?.trim() ?? "";
  const currentPhone = currentAuthor.phone?.trim() ?? "";
  if (commentPhone && currentPhone && commentPhone === currentPhone && currentAuthor.name.trim()) {
    return currentAuthor.name.trim();
  }

  const role = normalizeRole(comment.author_role);
  if (role === "MANAGER") {
    return managerName?.trim() || commentPhone || "Manager";
  }
  if (role === "OWNER") {
    return ownerName?.trim() || "Owner";
  }

  return commentPhone || "Guest";
}

export function OrderComments({ order, supabase, author, ownerName, managerName }: Props) {
  const [list, setList] = useState<CommentRow[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [replyTo, setReplyTo] = useState<CommentRow | null>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const canWrite = author.role === "OWNER" || author.role === "MANAGER";
  const hasText = useMemo(() => text.trim().length > 0, [text]);
  const visibleCount = 5;
  const hiddenCount = Math.max(0, list.length - visibleCount);
  const visibleList = expanded || list.length <= visibleCount ? list : list.slice(-visibleCount);

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data, error } = await supabase
        .from("order_comments")
        .select("id, body, author_phone, author_role, created_at, reply_to_comment_id, reply_snapshot")
        .eq("order_id", order.id)
        .order("created_at", { ascending: true });

      if (!alive) return;

      if (error) {
        console.error("load comments error:", error);
        setList([]);
        return;
      }

      setList((data ?? []) as CommentRow[]);
    })();

    return () => {
      alive = false;
    };
  }, [order.id, supabase]);

  useEffect(() => {
    if (!replyTo) return;

    replyTextareaRef.current?.focus();
    document.getElementById(`comment-${replyTo.id}`)?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [replyTo]);

  async function send() {
    const body = text.trim();
    if (!body || loading || !canWrite) return;

    setLoading(true);

    const payload = {
      order_id: order.id,
      business_id: order.business_id,
      body,
      author_phone: author.phone || null,
      author_role: author.role,
      reply_to_comment_id: replyTo?.id ?? null,
      reply_snapshot: replyTo
        ? {
            id: replyTo.id,
            kind: "comment",
            authorName: resolveAuthorName(replyTo, author, ownerName, managerName),
            body: getCommentPreview(replyTo.body),
          }
        : null,
    };

    const { data, error } = await supabase
      .from("order_comments")
      .insert(payload)
      .select("id, body, author_phone, author_role, created_at, reply_to_comment_id, reply_snapshot")
      .single();

    if (error) {
      console.error("insert comment error:", error);
      setLoading(false);
      return;
    }

    if (data) {
      setList((prev) => [...prev, data as CommentRow]);
      setText("");
      setReplyTo(null);
      setExpanded(true);
    }

    setLoading(false);
  }

  function renderComposer(mode: "new" | "reply") {
    const isReply = mode === "reply";
    const activeReply = isReply ? replyTo : null;

    return (
      <div className="rounded-[20px] border border-[#e4e7ec] bg-white dark:bg-white/[0.03] p-3 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
        <div className="flex flex-col gap-3">
          {activeReply ? (
            <div className="rounded-2xl border border-[#dbeafe] bg-[#f8fbff] dark:bg-[var(--bg-app)] px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#475467] dark:text-white/70">
                    <CornerUpLeft className="h-3.5 w-3.5 text-[#667085]" />
                    <span>{resolveAuthorName(activeReply, author, ownerName, managerName)}</span>
                    <span className="text-[#98a2b3] dark:text-white/45">{fmtDate(activeReply.created_at)}</span>
                  </div>
                  <div className="mt-1 text-sm leading-5 text-[#344054] line-clamp-2">
                    {getCommentPreview(activeReply.body)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#667085] transition hover:bg-white dark:hover:bg-white/[0.07] hover:text-[#111827]"
                  aria-label="Cancel reply"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}

          <textarea
            ref={isReply ? replyTextareaRef : undefined}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                send();
              }
            }}
            placeholder={isReply ? "Write a reply..." : "Write a comment, decision, or handoff note..."}
            rows={isReply ? 2 : 3}
            className="min-h-[88px] w-full resize-none rounded-[18px] border border-[#dde3ee] bg-[#fbfcfe] px-4 py-3 text-sm text-[#111827] outline-none transition placeholder:text-[#98a2b3] focus:border-[#111827] focus:bg-white"
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-[#98a2b3] dark:text-white/45">
              Press <span className="font-semibold text-[#667085]">Ctrl/Cmd + Enter</span> to send faster.
            </p>

            <div className="flex flex-col gap-2 sm:flex-row">
              {isReply ? (
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  className="inline-flex h-11 w-full min-w-0 shrink-0 items-center justify-center rounded-2xl border border-[#dbe3ef] px-4 text-sm font-semibold text-[#667085] transition hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:text-[#111827] sm:w-auto"
                >
                  Cancel
                </button>
              ) : null}

              <button
                type="button"
                onClick={send}
                disabled={loading || !hasText}
                aria-disabled={loading || !hasText}
                className={[
                  "inline-flex h-11 w-full min-w-0 shrink-0 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827]/15 sm:w-auto sm:min-w-[140px]",
                  !hasText || loading
                    ? "cursor-not-allowed border-[#e4e7ec] bg-[#f2f4f7] text-[#98a2b3] dark:text-white/45"
                    : "border-[#cbd5e1] bg-[linear-gradient(180deg,#ffffff_0%,#eef4ff_100%)] text-[#111827] shadow-[0_6px_18px_rgba(148,163,184,0.2)] hover:border-[#b8c4d8] hover:bg-[linear-gradient(180deg,#ffffff_0%,#e7f0ff_100%)]",
                ].join(" ")}
              >
                <Send className="h-4 w-4" />
                {loading ? "Sending..." : isReply ? "Send reply" : "Send comment"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[20px] border border-[#e6ebf2] bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="space-y-2.5">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold tracking-[0.01em] text-[#111827]">
              <MessageSquareText className="h-4 w-4 text-[#667085]" />
              <span>
                Comments <span className="text-xs font-semibold text-[#98a2b3] dark:text-white/45">({list.length})</span>
              </span>
            </div>
            <p className="mt-1 text-sm text-[#667085]">Keep approvals, decisions, and handoff context on the order.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef2ff] dark:bg-[var(--brand-600)]/15 px-3 py-1 text-[#344054]">
              <MessageSquareText className="h-3.5 w-3.5 text-[#111827]" />
              {list.length} total
            </span>
            {hiddenCount > 0 ? (
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#f4f6f8] px-3 py-1 text-[#667085] transition hover:bg-[#edf2f7] hover:text-[#344054]"
              >
                {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {expanded ? "Hide earlier messages" : `Show ${hiddenCount} earlier`}
              </button>
            ) : null}
            {loading ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff7ed] px-3 py-1 text-[#b54708]">
                Sending comment...
              </span>
            ) : null}
          </div>
        </div>

        <div className="w-full rounded-[18px] border border-[#e4e7ec] bg-white/90 dark:bg-white/[0.05] px-4 py-2.5 sm:w-auto sm:min-w-[220px]">
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#98a2b3] dark:text-white/45">Best practice</div>
          <p className="mt-1.5 text-xs leading-5 text-[#667085]">Use separate lines for decisions, blockers, and next steps.</p>
        </div>
      </div>

      <div className="mt-4 max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
        {list.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-[#d8dee8] bg-white dark:bg-white/[0.03] px-5 py-7 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4f6f8] text-[#667085]">
              <MessageSquareText className="h-5 w-5" />
            </div>
            <div className="mt-3 text-sm font-semibold text-[#111827]">No comments yet</div>
            <p className="mt-1 text-xs leading-5 text-[#98a2b3] dark:text-white/45">
              Add context, client decisions, or handoff notes so the next teammate sees the full picture.
            </p>
          </div>
        ) : (
          visibleList.map((c) => {
            const role = normalizeRole(c.author_role);
            const badge = getRoleBadge(role);
            const isOwner = role === "OWNER";
            const authorName = resolveAuthorName(c, author, ownerName, managerName);
            const isReplyTarget = replyTo?.id === c.id;
            const isReply = Boolean(c.reply_to_comment_id);
            return (
              <div
                key={c.id}
                id={`comment-${c.id}`}
                className={[
                  "rounded-[22px] border px-4 py-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.03)] transition",
                  isOwner
                    ? "border-[#d8e6fb] bg-[linear-gradient(180deg,#fbfdff_0%,#ffffff_100%)]"
                    : "border-[#e7edf5] bg-white dark:bg-white/[0.03] hover:border-[#d9e2ec] hover:bg-[#fcfdff]",
                  isReply ? "ml-4 border-[#e5edf8]" : "",
                  isReplyTarget ? "ring-2 ring-[#bfd0ec]" : "",
                ].join(" ")}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={[
                      "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs font-semibold",
                      isOwner ? "bg-[#eaf2ff] text-[#2459d3]" : "bg-[#f4f6f8] text-[#475467] dark:text-white/70",
                    ].join(" ")}
                  >
                    {role === "OWNER" ? getInitials(authorName || "Owner") : <UserRound className="h-4 w-4" />}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-[#344054]">{authorName}</span>
                        <span
                          className={[
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                            badge.className,
                          ].join(" ")}
                        >
                          {badge.label}
                        </span>
                        {isReply ? (
                          <span className="inline-flex items-center rounded-full border border-[#e5edf8] bg-[#f8fbff] dark:bg-[var(--bg-app)] px-2 py-0.5 text-[11px] font-semibold text-[#52607a]">
                            Reply
                          </span>
                        ) : null}
                        <span className="text-[#98a2b3] dark:text-white/45">{fmtDate(c.created_at)}</span>
                      </div>

                      {canWrite ? (
                        <button
                          type="button"
                          onClick={() => setReplyTo(c)}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-transparent bg-[#f8fafc] dark:bg-white/[0.04] text-[#667085] transition hover:border-[#dbe3ef] hover:bg-white dark:hover:bg-white/[0.07] hover:text-[#111827]"
                          aria-label={`Reply to ${authorName}`}
                          title="Reply"
                        >
                          <CornerUpLeft className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>

                    {c.reply_snapshot ? (
                      <div className="mb-2.5 rounded-[18px] border border-[#e5edf8] bg-[#f8fbff] dark:bg-[var(--bg-app)] px-3 py-2.5">
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#7c8aa5]">
                          <CornerUpLeft className="h-3.5 w-3.5" />
                          <span>{c.reply_snapshot.kind === "file" ? c.reply_snapshot.fileName || "Attachment" : c.reply_snapshot.authorName || "Reply"}</span>
                        </div>
                        <div className="mt-1 line-clamp-2 text-sm leading-5 text-[#52607a]">
                          {c.reply_snapshot.body || c.reply_snapshot.fileType || ""}
                        </div>
                      </div>
                    ) : null}

                    <div className="whitespace-pre-wrap text-sm leading-5 text-[#111827]">
                      {c.body}
                    </div>
                  </div>
                </div>

                {isReplyTarget && canWrite ? <div className="mt-2.5">{renderComposer("reply")}</div> : null}
              </div>
            );
          })
        )}
      </div>

      {canWrite ? (
        replyTo ? null : <div className="mt-4">{renderComposer("new")}</div>
      ) : (
        <div className="mt-3 text-xs text-[#98a2b3] dark:text-white/45">Only Owner / Manager can add comments.</div>
      )}
    </div>
  );
}

