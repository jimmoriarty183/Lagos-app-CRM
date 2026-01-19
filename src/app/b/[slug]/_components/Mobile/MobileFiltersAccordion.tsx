import Button from "../../Button";
import MobileAccordion from "./MobileAccordion";
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
};

export default function MobileFiltersAccordion({
  phoneRaw,
  filters,
  clearHref,
  hasActiveFilters,
}: Props) {
  const fieldCls =
    "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none " +
    "focus:ring-2 focus:ring-gray-900 focus:border-gray-900";

  return (
    <MobileAccordion
      title="Filters"
      defaultOpen={false}
      rightSlot={
        hasActiveFilters ? (
          <a
            href={clearHref}
            className="h-8 inline-flex items-center justify-center px-3 rounded-full border border-gray-200 bg-white text-xs font-extrabold text-gray-900 hover:bg-gray-50 transition-colors"
          >
            Clear
          </a>
        ) : null
      }
    >
      <form method="get" className="grid gap-3">
        <input type="hidden" name="u" value={phoneRaw} />
        <input type="hidden" name="page" value="1" />

        <label className="grid gap-1">
          <span className="text-xs font-semibold text-gray-700 inline-flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            Search
          </span>
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Name, phone, amount…"
            className={fieldCls}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs font-semibold text-gray-700 inline-flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            Status
          </span>
          <select
            name="status"
            defaultValue={filters.status}
            className={fieldCls}
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

        <label className="grid gap-1">
          <span className="text-xs font-semibold text-gray-700">Period</span>
          <select
            name="range"
            defaultValue={filters.range}
            className={fieldCls}
          >
            <option value="ALL">All time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 days</option>
            <option value="month">This month</option>
            <option value="year">This year</option>
          </select>
        </label>

        <Button type="submit" size="sm" style={{ width: "100%" }}>
          Apply
        </Button>
      </form>
    </MobileAccordion>
  );
}
