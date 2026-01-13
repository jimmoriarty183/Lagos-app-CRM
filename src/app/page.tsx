import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1200px 600px at 50% 0%, rgba(59,130,246,0.18), rgba(255,255,255,0) 60%), radial-gradient(900px 500px at 75% 20%, rgba(16,185,129,0.15), rgba(255,255,255,0) 55%), #f7f8fb",
        padding: 24,
      }}
    >
      {/* Top mini bar */}
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 14,
              background: "#0f172a",
              color: "white",
              display: "grid",
              placeItems: "center",
              fontWeight: 900,
            }}
          >
            o
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Ordero</div>
            <div style={{ fontSize: 12, opacity: 0.65 }}>
              Orders. Simple. Fast.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Link
            href="/"
            style={{
              height: 36,
              padding: "0 14px",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: "white",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              color: "#0f172a",
              fontWeight: 800,
            }}
          >
            Home
          </Link>

          <Link
            href="/welcome"
            style={{
              height: 36,
              padding: "0 14px",
              borderRadius: 12,
              border: "1px solid #0f172a",
              background: "#0f172a",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              color: "white",
              fontWeight: 800,
            }}
          >
            Log in
          </Link>
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          marginTop: 26,
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: 22,
        }}
      >
        {/* Left card */}
        <section
          style={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 18,
            padding: 22,
            boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid #e5e7eb",
              background: "#fbfbfc",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 99,
                background: "#22c55e",
                display: "inline-block",
              }}
            />
            Built for small businesses
          </div>

          <h1
            style={{
              margin: "14px 0 10px",
              fontSize: 48,
              lineHeight: 1.05,
              letterSpacing: -1,
              fontWeight: 950,
              color: "#0f172a",
            }}
          >
            Manage orders in one
            <br />
            place.
            <br />
            Keep customers updated.
          </h1>

          <p
            style={{
              margin: 0,
              maxWidth: 520,
              opacity: 0.75,
              lineHeight: 1.55,
            }}
          >
            Ordero helps stores track orders, due dates and payments — on mobile
            and desktop. Simple UI. No training.
          </p>

          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 16,
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/welcome"
              style={{
                height: 42,
                padding: "0 16px",
                borderRadius: 12,
                background: "#0f172a",
                color: "white",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                fontWeight: 900,
                minWidth: 180,
              }}
            >
              Open my orders
            </Link>

            <Link
              href="/pricing"
              style={{
                height: 42,
                padding: "0 16px",
                borderRadius: 12,
                background: "white",
                color: "#0f172a",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                fontWeight: 900,
                border: "1px solid #e5e7eb",
                minWidth: 160,
              }}
            >
              See pricing
            </Link>
          </div>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                padding: 12,
                background: "#fbfbfc",
              }}
            >
              <div style={{ fontWeight: 900 }}>Fast setup</div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                Start in minutes
              </div>
            </div>

            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                padding: 12,
                background: "#fbfbfc",
              }}
            >
              <div style={{ fontWeight: 900 }}>Mobile-first</div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                Works great on phones
              </div>
            </div>

            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                padding: 12,
                background: "#fbfbfc",
                gridColumn: "1 / -1",
              }}
            >
              <div style={{ fontWeight: 900 }}>Simple statuses</div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                Track every order
              </div>
            </div>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.55 }}>
            If you were redirected here, you&apos;re not signed in yet.
          </div>
        </section>

        {/* Right card */}
        <aside
          style={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 18,
            padding: 22,
            boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
            height: "fit-content",
          }}
        >
          <div style={{ fontWeight: 950, fontSize: 16 }}>
            What customers see
          </div>
          <div style={{ fontSize: 12, opacity: 0.72, marginTop: 4 }}>
            Clean order page with status, due date and payment mark.
          </div>

          <div
            style={{
              marginTop: 12,
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              padding: 14,
              background: "#fbfbfc",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ fontWeight: 900 }}>Order #123</div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid #e5e7eb",
                  background: "white",
                }}
              >
                IN_PROGRESS
              </div>
            </div>

            <div
              style={{
                marginTop: 10,
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                padding: 12,
                background: "white",
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.65 }}>Due date</div>
              <div style={{ marginTop: 6, fontWeight: 900 }}>Tomorrow</div>
            </div>

            <div
              style={{
                marginTop: 10,
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                padding: 12,
                background: "white",
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.65 }}>Payment</div>
              <div style={{ marginTop: 6, fontWeight: 900 }}>
                WAITING_PAYMENT
              </div>
            </div>

            <button
              type="button"
              style={{
                marginTop: 12,
                width: "100%",
                height: 40,
                borderRadius: 12,
                border: "1px solid #0f172a",
                background: "#0f172a",
                color: "white",
                fontWeight: 900,
              }}
            >
              Contact store
            </button>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.6 }}>
            Redirect target: <code>/b/demo</code>
          </div>
        </aside>
      </div>

      {/* Responsive fallback */}
      <style>{`
        @media (max-width: 980px) {
          main > div:nth-child(2) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}
