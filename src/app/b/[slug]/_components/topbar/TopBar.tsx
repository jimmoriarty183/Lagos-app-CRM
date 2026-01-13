import LogoutButton from "../LogoutButton";

type Props = {
  businessSlug: string;
  plan: string;
  role: string;
  pill: React.CSSProperties;
};

export default function TopBar({ businessSlug, plan, role, pill }: Props) {
  return (
    <header
      style={{
        height: 64,
        borderBottom: "1px solid #e5e7eb",
        background: "white",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <div
        className="topPad"
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          height: "100%",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        {/* LEFT */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Ordero</div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>/ {businessSlug}</div>
        </div>

        {/* RIGHT */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ ...pill, background: "#f1f5f9" }}>{plan}</div>
          <div style={pill}>{role}</div>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
