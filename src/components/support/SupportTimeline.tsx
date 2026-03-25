import type { SupportStatusHistoryRecord } from "@/lib/support/types";
import { formatSupportDate } from "@/lib/support/utils";
import { SupportStatusBadge } from "@/components/support/SupportBadges";

export function SupportTimeline({
  items,
  title = "Status timeline",
}: {
  items: SupportStatusHistoryRecord[];
  title?: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">No status history.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <SupportStatusBadge status={item.fromStatus || "UNKNOWN"} />
                <span className="text-xs text-slate-400">→</span>
                <SupportStatusBadge status={item.toStatus || "UNKNOWN"} />
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {formatSupportDate(item.changedAt)}
                {item.changedByLabel ? ` • ${item.changedByLabel}` : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

