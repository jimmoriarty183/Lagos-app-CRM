type Props = {
  business: { slug: string; owner_phone: string; manager_phone: string | null };
  role: "OWNER" | "MANAGER" | "GUEST";
  phone: string;
  isOwnerManager: boolean;
  card: React.CSSProperties;
  cardHeader: React.CSSProperties;
  cardTitle: React.CSSProperties;
};

export default function DesktopBusinessCard({
  business,
  role,
  phone,
  isOwnerManager,
  card,
  cardHeader,
  cardTitle,
}: Props) {
  return (
    <section className="desktopOnly" style={card}>
      <div style={cardHeader}>
        <div style={cardTitle}>Business</div>
        <div style={{ fontSize: 12, opacity: 0.65 }}>{business.slug}</div>
      </div>

      {role === "MANAGER" && !isOwnerManager && (
        <div style={{ opacity: 0.9 }}>
          Manager phone: <b>{business.manager_phone || phone}</b>
        </div>
      )}

      {role === "OWNER" && !isOwnerManager && (
        <div style={{ opacity: 0.9 }}>
          Owner phone: <b>{business.owner_phone}</b>
          <span style={{ opacity: 0.6 }}> &nbsp;|&nbsp; </span>
          Manager phone: <b>{business.manager_phone || "—"}</b>
        </div>
      )}

      {isOwnerManager && (
        <div style={{ opacity: 0.9 }}>
          Owner/Manager phone: <b>{business.owner_phone}</b>
        </div>
      )}
    </section>
  );
}
