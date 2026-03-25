import type { SupportInternalNoteRecord } from "@/lib/support/types";
import { formatSupportDate } from "@/lib/support/utils";

export function SupportNotesPanel({ items }: { items: SupportInternalNoteRecord[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Internal notes</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">No internal notes yet.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-sm text-slate-800">{item.note}</p>
              <div className="mt-1 text-xs text-slate-500">
                {formatSupportDate(item.createdAt)}
                {item.createdByLabel ? ` • ${item.createdByLabel}` : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

