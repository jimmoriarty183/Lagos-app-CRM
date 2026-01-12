type Props = {
  clearHref: string;
  totalCount: number;
  canSeeAnalytics: boolean;
};

export default function DesktopSidebar({
  clearHref,
  totalCount,
  canSeeAnalytics,
}: Props) {
  const navItem = (active?: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "10px 10px",
    borderRadius: 12,
    textDecoration: "none",
    color: "#0f172a",
    border: active ? "1px solid #dbeafe" : "1px solid transparent",
    background: active ? "#eff6ff" : "transparent",
    fontWeight: active ? 800 : 700,
    cursor: "pointer",
  });

  const navMeta: React.CSSProperties = {
    fontSize: 12,
    opacity: 0.6,
    fontWeight: 700,
  };

  return (
    <aside style={{ display: "grid", gap: 4 }}>
      <a style={navItem(true)} href={clearHref}>
        <span>Orders</span>
        <span style={navMeta}>{totalCount}</span>
      </a>

      {canSeeAnalytics ? (
        <a style={navItem(false)} href="#analytics">
          <span>Analytics</span>
          <span style={navMeta}>Owner</span>
        </a>
      ) : (
        <div style={{ ...navItem(false), opacity: 0.5 }}>
          <span>Analytics</span>
          <span style={navMeta}>Owner</span>
        </div>
      )}

      <div style={{ ...navItem(false), opacity: 0.7 }}>
        <span>Settings</span>
        <span style={navMeta}>soon</span>
      </div>
    </aside>
  );
}
