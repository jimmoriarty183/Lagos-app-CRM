import Button from "../../Button";
import { Filter, Search } from "lucide-react";

type Status =
  | "NEW"
  | "IN_PROGRESS"
  | "WAITING_PAYMENT"
  | "DONE"
  | "CANCELED"
  | "DUPLICATE";

type Range = "ALL" | "today" | "week" | "month" | "year";
type Filters = { q: string; status: "ALL" | Status; range: Range };

type Props = {
  phoneRaw: string;
  filters: Filters;
  clearHref: string;
  hasActiveFilters: boolean;

  // старые пропсы оставил для совместимости
  card?: React.CSSProperties;
  cardHeader?: React.CSSProperties;
  cardTitle?: React.CSSProperties;
};

export default function DesktopFilters({
  phoneRaw,
  filters,
  clearHref,
  hasActiveFilters,
}: Props) {
  const fieldCls =
    "px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900";
  const labelCls = "text-xs font-semibold text-gray-700";

  return (
    <section className="desktopOnly bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <div className="text-base sm:text-lg font-semibold text-gray-900">
            Filters
          </div>
        </div>
        <div className="text-xs text-gray-500">Search, status, period</div>
      </div>

      <form
        method="get"
        className="mt-4 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end"
      >
        <input type="hidden" name="u" value={phoneRaw} />
        <input type="hidden" name="page" value="1" />

        <div className="flex-1 min-w-[220px]">
          <div className={labelCls + " mb-2"}>Search</div>
          <div className="relative">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              name="q"
              defaultValue={filters.q}
              placeholder="Name, phone, amount…"
              className={`pl-10 ${fieldCls} w-full`}
            />
          </div>
        </div>

        <div className="min-w-[180px]">
          <div className={labelCls + " mb-2"}>Status</div>
          <select
            name="status"
            defaultValue={filters.status}
            className={`${fieldCls} w-full`}
          >
            <option value="ALL">All</option>
            <option value="NEW">NEW</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="WAITING_PAYMENT">WAITING PAYMENT</option>
            <option value="DONE">DONE</option>
            <option value="CANCELED">CANCELED</option>
            <option value="DUPLICATE">DUPLICATE</option>
          </select>
        </div>

        <div className="min-w-[160px]">
          <div className={labelCls + " mb-2"}>Period</div>
          <select
            name="range"
            defaultValue={filters.range}
            className={`${fieldCls} w-full`}
          >
            <option value="ALL">All time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 days</option>
            <option value="month">This month</option>
            <option value="year">This year</option>
          </select>
        </div>

        <div className="flex gap-3">
          <Button type="submit" size="sm">
            Apply
          </Button>

          {hasActiveFilters && (
            <a
              href={clearHref}
              className="h-10 inline-flex items-center justify-center px-4 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
            >
              Clear
            </a>
          )}
        </div>
      </form>
    </section>
  );
}
