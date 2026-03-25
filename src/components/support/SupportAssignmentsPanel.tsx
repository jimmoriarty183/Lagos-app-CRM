import type { SupportAssignmentRecord } from "@/lib/support/types";
import { formatSupportDate } from "@/lib/support/utils";

export function SupportAssignmentsPanel({ items }: { items: SupportAssignmentRecord[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Assignments</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">No assignment history.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-sm text-slate-800">
                Assigned to <span className="font-medium">{item.assignedToLabel || item.assignedToUserId || "Unassigned"}</span>
              </p>
              <div className="mt-1 text-xs text-slate-500">
                {formatSupportDate(item.createdAt)}
                {item.assignedByLabel ? ` • by ${item.assignedByLabel}` : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

