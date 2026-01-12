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
  card: React.CSSProperties;
  cardHeader: React.CSSProperties;
  cardTitle: React.CSSProperties;
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
  return (
    <section className="desktopOnly" style={card}>
      <div style={cardHeader}>
        <div style={cardTitle}>Filters</div>
        <div style={{ fontSize: 12, opacity: 0.65 }}>
          Search, status, period
        </div>
      </div>

      <form
        method="get"
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "flex-end",
        }}
      >
        <input type="hidden" name="u" value={phoneRaw} />
        <input type="hidden" name="page" value="1" />

        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
            Search
          </div>
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Name, phone, amount…"
            style={{
              height: 40,
              width: "100%",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              padding: "0 12px",
              outline: "none",
            }}
          />
        </div>

        <div style={{ minWidth: 180 }}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
            Status
          </div>
          <select
            name="status"
            defaultValue={filters.status}
            style={{
              height: 40,
              width: "100%",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              padding: "0 10px",
            }}
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

        <div style={{ minWidth: 160 }}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
            Period
          </div>
          <select
            name="range"
            defaultValue={filters.range}
            style={{
              height: 40,
              width: "100%",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              padding: "0 10px",
            }}
          >
            <option value="ALL">All time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 days</option>
            <option value="month">This month</option>
            <option value="year">This year</option>
          </select>
        </div>

        <Button type="submit" size="sm">
          Apply
        </Button>

        {hasActiveFilters && (
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
              fontWeight: 700,
              background: "white",
              textDecoration: "none",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            Clear
          </a>
        )}
      </form>
    </section>
  );
}
