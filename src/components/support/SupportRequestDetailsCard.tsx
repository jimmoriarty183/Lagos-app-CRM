import type { SupportRequestRecord } from "@/lib/support/types";
import { formatSupportDate } from "@/lib/support/utils";
import { SupportPriorityBadge, SupportStatusBadge } from "@/components/support/SupportBadges";

export function SupportRequestDetailsCard({
  request,
  showBusiness = false,
  showSubmitter = false,
}: {
  request: SupportRequestRecord;
  showBusiness?: boolean;
  showSubmitter?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-slate-900">{request.subject || "No subject"}</h2>
          <p className="mt-1 text-sm text-slate-500">Request #{request.id.slice(0, 8)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SupportStatusBadge status={request.status} />
          <SupportPriorityBadge priority={request.priority} />
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Type</div>
          <div className="mt-1 text-slate-800">{request.type?.replaceAll("_", " ") || "—"}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Created</div>
          <div className="mt-1 text-slate-800">{formatSupportDate(request.createdAt)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Updated</div>
          <div className="mt-1 text-slate-800">{formatSupportDate(request.updatedAt)}</div>
        </div>
        {showBusiness ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Business</div>
            <div className="mt-1 text-slate-800">{request.businessLabel || request.businessId || "—"}</div>
          </div>
        ) : null}
        {showSubmitter ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Submitter</div>
            <div className="mt-1 text-slate-800">{request.submitterLabel || request.submitterUserId || "—"}</div>
          </div>
        ) : null}
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Contact</div>
          <div className="mt-1 text-slate-800">{request.contactEmail || request.contactPhone || "—"}</div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
        <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Message</div>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{request.message || "—"}</p>
      </div>
    </section>
  );
}

