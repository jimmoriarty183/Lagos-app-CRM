import { SlidersHorizontal } from "lucide-react";

type Props = {
  totalCount: number;
  overdueCount: number;
  waitingPaymentCount: number;
  activeAmountLabel: string;
  hasActiveFilters: boolean;
  clearHref: string;
};

export default function MobileSummaryBar({
  totalCount,
  overdueCount,
  waitingPaymentCount,
  activeAmountLabel,
  hasActiveFilters,
  clearHref,
}: Props) {
  const chipCls =
    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap";

  return (
    <section className="mobileOnly space-y-3 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-extrabold text-gray-900">Orders</div>
          <div className="text-xs text-gray-500 mt-1">
            {totalCount} total {hasActiveFilters ? "• filtered" : ""}
          </div>
        </div>

        {hasActiveFilters ? (
          <a
            href={clearHref}
            className="h-9 inline-flex items-center justify-center px-3 rounded-lg border border-gray-200 bg-white text-sm font-extrabold text-gray-900 hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            Clear
          </a>
        ) : (
          <span className="h-9 inline-flex items-center gap-2 px-3 rounded-lg border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600">
            <SlidersHorizontal className="h-4 w-4 text-gray-400" />
            No filters
          </span>
        )}
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <span className={`${chipCls} border-blue-200 bg-blue-50 text-blue-700`}>
          Orders {totalCount}
        </span>
        <span className={`${chipCls} border-red-200 bg-red-50 text-red-700`}>
          Overdue {overdueCount}
        </span>
        <span className={`${chipCls} border-amber-200 bg-amber-50 text-amber-700`}>
          Waiting {waitingPaymentCount}
        </span>
        <span className={`${chipCls} border-emerald-200 bg-emerald-50 text-emerald-700`}>
          Active ₴{activeAmountLabel}
        </span>
      </div>
    </section>
  );
}
