import Button from "../../Button";

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

  // ✅ оставляем для совместимости, но НЕ требуем
  card?: React.CSSProperties;
  cardHeader?: React.CSSProperties;
  cardTitle?: React.CSSProperties;
};

export default function DesktopFilters({
  phoneRaw,
  filters,
  clearHref,
  hasActiveFilters,
  card,
  cardHeader,
  cardTitle,
}: Props) {
  const inputCls =
    "h-10 w-full rounded-xl border border-gray-200 px-3 outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white";
  const labelCls = "text-xs font-semibold text-gray-600";

  return (
    <section
      className="desktopOnly bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6"
      style={card}
    >
      <div
        className="flex items-start justify-between gap-3"
        style={cardHeader}
      >
        <div>
          <div
            className="text-base sm:text-lg font-semibold text-gray-900"
            style={cardTitle}
          >
            Filters
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Search, status, period
          </div>
        </div>

        {hasActiveFilters ? (
          <a
            href={clearHref}
            className="h-9 inline-flex items-center justify-center px-3 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
          >
            Clear
          </a>
        ) : null}
      </div>

      <form method="get" className="mt-4 flex flex-wrap gap-3 items-end">
        <input type="hidden" name="u" value={phoneRaw} />
        <input type="hidden" name="page" value="1" />

        <label className="grid gap-1 flex-1 min-w-[220px]">
          <span className={labelCls}>Search</span>
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Name, phone, amount…"
            className={inputCls}
          />
        </label>

        <label className="grid gap-1 min-w-[180px]">
          <span className={labelCls}>Status</span>
          <select
            name="status"
            defaultValue={filters.status}
            className={inputCls}
          >
            <option value="ALL">All</option>
            <option value="NEW">NEW</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="WAITING_PAYMENT">WAITING PAYMENT</option>
            <option value="DONE">DONE</option>
            <option value="CANCELED">CANCELED</option>
            <option value="DUPLICATE">DUPLICATE</option>
          </select>
        </label>

        <label className="grid gap-1 min-w-[160px]">
          <span className={labelCls}>Period</span>
          <select
            name="range"
            defaultValue={filters.range}
            className={inputCls}
          >
            <option value="ALL">All time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 days</option>
            <option value="month">This month</option>
            <option value="year">This year</option>
          </select>
        </label>

        <Button type="submit" size="sm">
          Apply
        </Button>
      </form>
    </section>
  );
}
