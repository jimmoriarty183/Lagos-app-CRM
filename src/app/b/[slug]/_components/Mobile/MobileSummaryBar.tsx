type Props = {
  totalCount: number;
  hasActiveFilters: boolean;
  clearHref: string;
  pill: React.CSSProperties;
  card: React.CSSProperties;
};

export default function MobileSummaryBar({
  totalCount,
  hasActiveFilters,
  clearHref,
  pill,
  card,
}: Props) {
  return (
    <section className="mobileOnly" style={card}>
      <div
        style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
      >
        <div>
          <div style={{ fontWeight: 950 }}>Orders</div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
            {totalCount} total {hasActiveFilters ? "• filtered" : ""}
          </div>
        </div>

        {hasActiveFilters ? (
          <a
            href={clearHref}
            style={{
              height: 36,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 12px",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              fontWeight: 900,
              background: "white",
              textDecoration: "none",
              color: "inherit",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Clear
          </a>
        ) : (
          <span style={{ ...pill, height: 36, opacity: 0.75 }}>No filters</span>
        )}
      </div>
    </section>
  );
}
