import type { SupportRequestRecord } from "@/lib/support/types";
import { formatSupportDate } from "@/lib/support/utils";
import { SupportPriorityBadge, SupportStatusBadge } from "@/components/support/SupportBadges";

type ParsedSupportReply = {
  body: string;
  createdAt: string | null;
};

function parseMessageWithSupportReplies(message: string) {
  const text = String(message ?? "").trim();
  if (!text) return { baseMessage: "", replies: [] as ParsedSupportReply[] };

  const marker = /\n\nSupport reply(?: \[([^\]]+)\])?:\n/g;
  const matches = Array.from(text.matchAll(marker));
  if (matches.length === 0) {
    return { baseMessage: text, replies: [] as ParsedSupportReply[] };
  }

  const firstMatchIndex = matches[0].index ?? 0;
  const baseMessage = text.slice(0, firstMatchIndex).trim();
  const replies: ParsedSupportReply[] = [];

  for (let i = 0; i < matches.length; i += 1) {
    const current = matches[i];
    const next = matches[i + 1];
    const start = (current.index ?? 0) + current[0].length;
    const end = next?.index ?? text.length;
    const body = text.slice(start, end).trim();
    if (!body) continue;
    const createdAtRaw = (current[1] ?? "").trim();
    const createdAt = createdAtRaw && !Number.isNaN(new Date(createdAtRaw).getTime()) ? createdAtRaw : null;
    replies.push({ body, createdAt });
  }

  return {
    baseMessage,
    replies,
  };
}

export function SupportRequestDetailsCard({
  request,
  showBusiness = false,
  showSubmitter = false,
}: {
  request: SupportRequestRecord;
  showBusiness?: boolean;
  showSubmitter?: boolean;
}) {
  const parsed = parseMessageWithSupportReplies(request.message || "");

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-white">{request.subject || "No subject"}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-white/55">Request #{request.id.slice(0, 8)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SupportStatusBadge status={request.status} />
          <SupportPriorityBadge priority={request.priority} />
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] px-3 py-2 text-sm">
          <div className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-white/55">Type</div>
          <div className="mt-1 text-slate-800 dark:text-white/90">{request.type?.replaceAll("_", " ") || "-"}</div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] px-3 py-2 text-sm">
          <div className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-white/55">Created</div>
          <div className="mt-1 text-slate-800 dark:text-white/90">{formatSupportDate(request.createdAt)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] px-3 py-2 text-sm">
          <div className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-white/55">Updated</div>
          <div className="mt-1 text-slate-800 dark:text-white/90">{formatSupportDate(request.updatedAt)}</div>
        </div>
        {showBusiness ? (
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] px-3 py-2 text-sm">
            <div className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-white/55">Business</div>
            <div className="mt-1 text-slate-800 dark:text-white/90">{request.businessLabel || request.businessId || "-"}</div>
          </div>
        ) : null}
        {showSubmitter ? (
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] px-3 py-2 text-sm">
            <div className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-white/55">Submitter</div>
            <div className="mt-1 text-slate-800 dark:text-white/90">{request.submitterLabel || request.submitterUserId || "-"}</div>
          </div>
        ) : null}
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] px-3 py-2 text-sm">
          <div className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-white/55">Contact</div>
          <div className="mt-1 text-slate-800 dark:text-white/90">{request.contactEmail || request.contactPhone || "-"}</div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] px-3 py-3">
        <div className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-white/55">Message</div>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800 dark:text-white/90">{parsed.baseMessage || "-"}</p>
        {parsed.replies.map((reply, index) => (
          <div
            key={`support-reply-${index}`}
            className="mt-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2"
          >
            <div className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-blue-700">
              <span>Support reply</span>
              <span className="normal-case tracking-normal text-blue-700/80">
                {reply.createdAt ? formatSupportDate(reply.createdAt) : "Date unavailable"}
              </span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-blue-900">{reply.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
