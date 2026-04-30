import { Button } from "@/components/ui/button";
import {
  DASHBOARD_RANGE_OPTIONS,
  type DashboardRange,
} from "@/lib/order-dashboard-summary";

type Status =
  | "NEW"
  | "IN_PROGRESS"
  | "WAITING_PAYMENT"
  | "DONE"
  | "CANCELED";

type TeamActor = {
  id: string;
  label: string;
  kind: "OWNER" | "MANAGER";
};

type Filters = { q: string; status: "ALL" | Status; range: DashboardRange };

type Props = {
  phoneRaw: string;
  filters: Filters;
  clearHref: string;
  hasActiveFilters: boolean;
  actor: string;
  actors?: TeamActor[];

  card?: React.CSSProperties;
  cardHeader?: React.CSSProperties;
  cardTitle?: React.CSSProperties;
};

export default function DesktopFilters({
  phoneRaw,
  filters,
  clearHref,
  hasActiveFilters,
  actor,
  actors = [],
  card,
}: Props) {
  const inputCls =
    "h-10 w-full rounded-[var(--radius)] border border-[var(--neutral-200)] bg-white dark:bg-white/[0.03] px-4 text-[0.9375rem] text-[var(--neutral-900)] outline-none transition focus:border-[var(--brand-600)] focus:ring-0";

  return (
    <section
      className="desktopOnly rounded-2xl border border-gray-200 dark:border-white/10 bg-white/95 p-4 shadow-sm backdrop-blur"
      style={card}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-white/55">
            Filters
          </div>
          <div className="mt-1 text-sm text-gray-700 dark:text-white/80">
            Narrow the orders list
          </div>
        </div>
        {hasActiveFilters ? (
          <a
            href={clearHref}
            className="rounded-full border border-gray-200 dark:border-white/10 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-white/70 transition hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white"
          >
            Reset
          </a>
        ) : null}
      </div>

      <form method="get" className="space-y-3">
        <input type="hidden" name="u" value={phoneRaw} />
        <input type="hidden" name="page" value="1" />

        <input type="hidden" name="q" value={filters.q} />

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-white/55">
            Status
          </span>
          <select name="status" defaultValue={filters.status} className={inputCls}>
            <option value="ALL">All</option>
            <option value="NEW">NEW</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="WAITING_PAYMENT">WAITING PAYMENT</option>
            <option value="DONE">DONE</option>
            <option value="CANCELED">CANCELED</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-white/55">
            Period
          </span>
          <select name="range" defaultValue={filters.range} className={inputCls}>
            {DASHBOARD_RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-white/55">
            Team
          </span>
          <select name="actor" defaultValue={actor} className={inputCls}>
            <option value="ALL">All team</option>
            {actors.map((member) => (
              <option key={member.id} value={`user:${member.id}`}>
                {member.label}
              </option>
            ))}
          </select>
        </label>

        <div className="pt-1">
          <Button type="submit" size="sm" className="w-full justify-center">
            Apply
          </Button>
        </div>
      </form>
    </section>
  );
}
