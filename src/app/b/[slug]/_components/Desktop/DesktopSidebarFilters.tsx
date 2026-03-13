"use client";

import Button from "../../Button";

type Status =
  | "NEW"
  | "IN_PROGRESS"
  | "WAITING_PAYMENT"
  | "DONE"
  | "CANCELED"
  | "DUPLICATE";

type SidebarStatus = "ALL" | "OVERDUE" | Status;
type Range = "ALL" | "today" | "week" | "month" | "year";

type TeamActor = {
  id: string;
  label: string;
  kind: "OWNER" | "MANAGER";
};

type Props = {
  phoneRaw: string;
  q: string;
  status: SidebarStatus;
  range: Range;
  actor: string;
  actors?: TeamActor[];
  hasActiveFilters?: boolean;
  clearHref?: string;
};

export default function DesktopSidebarFilters({
  phoneRaw,
  q,
  status,
  range,
  actor,
  actors = [],
  hasActiveFilters = false,
  clearHref,
}: Props) {
  const inputCls =
    "h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none " +
    "focus:border-gray-900 focus:ring-2 focus:ring-gray-900";

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 pb-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
            Filters
          </div>
          <div className="mt-1 text-sm text-gray-600">
            Clear filter state for the orders list
          </div>
        </div>

        {hasActiveFilters && clearHref ? (
          <a
            href={clearHref}
            className="rounded-full border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900"
          >
            Reset
          </a>
        ) : null}
      </div>

      <form method="get" className="space-y-3 pb-3">
        <input type="hidden" name="u" value={phoneRaw} />
        <input type="hidden" name="page" value="1" />

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-gray-500">
            Search
          </span>
          <div className="flex items-center gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Name, phone, amount..."
              className={inputCls}
            />
            <Button type="submit" size="sm" className="h-10 shrink-0 px-4">
              Search
            </Button>
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-gray-500">
            Status
          </span>
          <select
            name="status"
            defaultValue={status}
            className={inputCls}
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
          >
            <option value="ALL">All orders</option>
            <option value="NEW">New</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="WAITING_PAYMENT">Waiting payment</option>
            <option value="DONE">Done</option>
            <option value="OVERDUE">Overdue</option>
            <option value="CANCELED">Canceled</option>
            <option value="DUPLICATE">Duplicate</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-gray-500">
            Period
          </span>
          <select
            name="range"
            defaultValue={range}
            className={inputCls}
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
          >
            <option value="ALL">All time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 days</option>
            <option value="month">This month</option>
            <option value="year">This year</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-gray-500">
            Team
          </span>
          <select
            name="actor"
            defaultValue={actor}
            className={inputCls}
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
          >
            <option value="ALL">All team</option>
            <option value="OWNER">Owners</option>
            <option value="MANAGER">Managers</option>
            {actors.map((member) => (
              <option key={member.id} value={`user:${member.id}`}>
                {member.label}
              </option>
            ))}
          </select>
        </label>

        <div aria-hidden="true" className="h-2" />
      </form>
    </section>
  );
}
