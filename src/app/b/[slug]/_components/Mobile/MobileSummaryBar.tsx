import { SlidersHorizontal } from "lucide-react";

type Props = {
  totalCount: number;
  hasActiveFilters: boolean;
  clearHref: string;

  // оставил, чтобы не ломать текущий вызов (можно потом удалить)
  pill: React.CSSProperties;
  card: React.CSSProperties;
};

export default function MobileSummaryBar({
  totalCount,
  hasActiveFilters,
  clearHref,
}: Props) {
  return (
    <section className="mobileOnly bg-white rounded-xl border border-gray-200 shadow-sm p-4">
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
    </section>
  );
}
