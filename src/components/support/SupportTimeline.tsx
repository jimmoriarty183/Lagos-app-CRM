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
    <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500 dark:text-white/55">No status history.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <SupportStatusBadge status={item.fromStatus || "UNKNOWN"} />
                <span className="text-xs text-slate-400 dark:text-white/45">→</span>
                <SupportStatusBadge status={item.toStatus || "UNKNOWN"} />
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-white/55">
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

