import Button from "../../Button";

type Status =
  | "NEW"
  | "IN_PROGRESS"
  | "WAITING_PAYMENT"
  | "DONE"
  | "CANCELED"
  | "DUPLICATE";

type Range = "ALL" | "today" | "week" | "month" | "year";

export type TeamActor = {
  id: string;
  label: string;
  kind: "OWNER" | "MANAGER";
};

export type Filters = {
  q: string;
  status: "ALL" | Status;
  range: Range;
};

type Props = {
  phoneRaw: string;
  filters: Filters;
  clearHref: string;
  hasActiveFilters: boolean;
  actor: string;
  actors?: TeamActor[];
};

export default function MobileFiltersAccordion({
  phoneRaw,
  filters,
  actor,
  actors = [],
}: Props) {
  const inputCls =
    "h-10 w-full rounded-xl border border-gray-200 px-3 outline-none " +
    "focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white";

  return (
    <section className="sticky top-[68px] z-20 rounded-xl border border-gray-200 bg-white/95 backdrop-blur p-3 shadow-sm">
      <form method="get" className="grid grid-cols-2 gap-2">
        <input type="hidden" name="u" value={phoneRaw} />
        <input type="hidden" name="page" value="1" />

        <label className="col-span-2">
          <span className="sr-only">Search</span>
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Name, phone, amount..."
            className={inputCls}
          />
        </label>

        <label className="col-span-1">
          <span className="sr-only">Status</span>
          <select name="status" defaultValue={filters.status} className={inputCls}>
            <option value="ALL">All</option>
            <option value="NEW">NEW</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="WAITING_PAYMENT">WAITING PAYMENT</option>
            <option value="DONE">DONE</option>
            <option value="CANCELED">CANCELED</option>
            <option value="DUPLICATE">DUPLICATE</option>
          </select>
        </label>

        <label className="col-span-1">
          <span className="sr-only">Period</span>
          <select name="range" defaultValue={filters.range} className={inputCls}>
            <option value="ALL">All time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 days</option>
            <option value="month">This month</option>
            <option value="year">This year</option>
          </select>
        </label>

        <label className="col-span-2">
          <span className="sr-only">Created by</span>
          <select name="actor" defaultValue={actor} className={inputCls}>
            <option value="ALL">All team</option>
            {actors.map((member) => (
              <option key={member.id} value={`user:${member.id}`}>
                {member.label}
              </option>
            ))}
          </select>
        </label>

        <div className="col-span-2 flex justify-end">
          <Button type="submit" size="sm">
            Apply
          </Button>
        </div>
      </form>
    </section>
  );
}
