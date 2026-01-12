import Accordion from "../../Accordion";
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
};

export default function MobileFiltersAccordion({
  phoneRaw,
  filters,
  clearHref,
  hasActiveFilters,
}: Props) {
  return (
    <Accordion title="Filters" defaultOpen={false}>
      <form method="get" style={{ display: "grid", gap: 10 }}>
        <input type="hidden" name="u" value={phoneRaw} />
        <input type="hidden" name="page" value="1" />

        <input
          name="q"
          defaultValue={filters.q}
          placeholder="Search: name, phone, amount…"
          style={{
            height: 44,
            width: "100%",
            borderRadius: 14,
            border: "1px solid #e5e7eb",
            padding: "0 12px",
            outline: "none",
          }}
        />

        <select
          name="status"
          defaultValue={filters.status}
          style={{
            height: 44,
            width: "100%",
            borderRadius: 14,
            border: "1px solid #e5e7eb",
            padding: "0 12px",
            background: "white",
          }}
        >
          <option value="ALL">Status: All</option>
          <option value="NEW">NEW</option>
          <option value="IN_PROGRESS">IN PROGRESS</option>
          <option value="WAITING_PAYMENT">WAITING PAYMENT</option>
          <option value="DONE">DONE</option>
          <option value="CANCELED">CANCELED</option>
          <option value="DUPLICATE">DUPLICATE</option>
        </select>

        <select
          name="range"
          defaultValue={filters.range}
          style={{
            height: 44,
            width: "100%",
            borderRadius: 14,
            border: "1px solid #e5e7eb",
            padding: "0 12px",
            background: "white",
          }}
        >
          <option value="ALL">Period: All time</option>
          <option value="today">Today</option>
          <option value="week">Last 7 days</option>
          <option value="month">This month</option>
          <option value="year">This year</option>
        </select>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          <Button type="submit" size="sm" style={{ width: "100%" }}>
            Apply
          </Button>

          {hasActiveFilters ? (
            <a
              href={clearHref}
              style={{
                height: 40,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 16px",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                fontWeight: 900,
                background: "white",
                textDecoration: "none",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              Clear
            </a>
          ) : (
            <div style={{ height: 40 }} />
          )}
        </div>
      </form>
    </Accordion>
  );
}
