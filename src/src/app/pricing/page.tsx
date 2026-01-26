// src/app/pricing/page.tsx
"use client";

import { useRouter } from "next/navigation";
import TopBar from "@/components/TopBar";

export default function PricingPage() {
  const router = useRouter();

  const plans = [
    {
      name: "Starter",
      price: "$0",
      period: "forever",
      note: "For trying Ordero",
      features: [
        "Up to 30 orders / month",
        "Basic statuses",
        "Mobile-friendly",
      ],
      cta: "Start free",
      action: () => router.push("/login"),
      highlight: false,
    },
    {
      name: "Business",
      price: "$9",
      period: "per month",
      note: "For small stores",
      features: [
        "Unlimited orders",
        "Due dates + payment tracking",
        "Manager access",
        "Search & filters",
      ],
      cta: "Get Business",
      action: () => router.push("/login?next=%2Fb%2Ftest"),
      highlight: true,
    },
    {
      name: "Pro",
      price: "$19",
      period: "per month",
      note: "For teams",
      features: [
        "Everything in Business",
        "Simple analytics",
        "Priority support",
        "Custom branding (soon)",
      ],
      cta: "Get Pro",
      action: () => router.push("/login?next=%2Fb%2Ftest"),
      highlight: false,
    },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1200px 600px at 20% 10%, rgba(59,130,246,0.12), transparent 60%), radial-gradient(900px 500px at 80% 20%, rgba(16,185,129,0.12), transparent 55%), #f8fafc",
        padding: 18,
      }}
    >
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        <TopBar subtitle="Pricing" rightVariant="backHomeLogin" />

        {/* Title */}
        <section style={{ marginTop: 18 }}>
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 22,
              background: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(6px)",
              padding: 18,
              boxShadow: "0 10px 40px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                border: "1px solid #e5e7eb",
                borderRadius: 999,
                padding: "6px 10px",
                background: "white",
                fontSize: 12,
                fontWeight: 800,
                opacity: 0.9,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 99,
                  background: "#10b981",
                  display: "inline-block",
                }}
              />
              Simple plans. No surprises.
            </div>

            <h1
              style={{
                margin: "12px 0 6px",
                fontSize: 38,
                lineHeight: 1.08,
                letterSpacing: -0.6,
                fontWeight: 950,
                color: "#0f172a",
              }}
            >
              Pricing that fits a small business
            </h1>

            <p
              style={{
                margin: 0,
                opacity: 0.75,
                fontSize: 15,
                lineHeight: 1.6,
              }}
            >
              Start free. Upgrade when you’re ready. Cancel anytime.
            </p>
          </div>
        </section>

        {/* Cards */}
        <section
          className="pricingGrid"
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 14,
          }}
        >
          {plans.map((p) => (
            <div
              key={p.name}
              style={{
                border: p.highlight ? "2px solid #111827" : "1px solid #e5e7eb",
                borderRadius: 22,
                background: "white",
                padding: 18,
                boxShadow: "0 10px 40px rgba(0,0,0,0.06)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {p.highlight && (
                <div
                  style={{
                    position: "absolute",
                    top: 14,
                    right: 14,
                    fontSize: 12,
                    fontWeight: 950,
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: "#111827",
                    color: "white",
                  }}
                >
                  Most popular
                </div>
              )}

              <div style={{ fontWeight: 950, fontSize: 18, color: "#0f172a" }}>
                {p.name}
              </div>
              <div style={{ opacity: 0.7, marginTop: 4, fontSize: 13 }}>
                {p.note}
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                }}
              >
                <div
                  style={{ fontSize: 34, fontWeight: 950, letterSpacing: -0.6 }}
                >
                  {p.price}
                </div>
                <div style={{ opacity: 0.65, fontWeight: 800, fontSize: 13 }}>
                  {p.period}
                </div>
              </div>

              <div
                style={{
                  marginTop: 12,
                  border: "1px solid #e5e7eb",
                  borderRadius: 16,
                  padding: 12,
                  background: "#f9fafb",
                }}
              >
                <div style={{ fontWeight: 900, marginBottom: 8 }}>
                  Includes:
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
                  {p.features.map((f) => (
                    <li key={f} style={{ opacity: 0.85 }}>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={p.action}
                style={{
                  marginTop: 14,
                  width: "100%",
                  height: 46,
                  borderRadius: 14,
                  border: p.highlight
                    ? "1px solid #111827"
                    : "1px solid #e5e7eb",
                  background: p.highlight ? "#111827" : "white",
                  color: p.highlight ? "white" : "#111827",
                  fontWeight: 950,
                  cursor: "pointer",
                }}
              >
                {p.cta}
              </button>

              <div style={{ marginTop: 10, opacity: 0.55, fontSize: 12 }}>
                Payments & checkout: coming soon (MVP).
              </div>
            </div>
          ))}
        </section>

        {/* FAQ */}
        <section style={{ marginTop: 18 }}>
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 22,
              background: "rgba(255,255,255,0.85)",
              padding: 18,
              boxShadow: "0 10px 40px rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ fontWeight: 950, fontSize: 16 }}>FAQ</div>

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 16,
                  padding: 12,
                  background: "white",
                }}
              >
                <div style={{ fontWeight: 900 }}>Can I cancel anytime?</div>
                <div style={{ opacity: 0.75, marginTop: 4, lineHeight: 1.6 }}>
                  Yes. Plans are month-to-month. In MVP, billing is not enabled
                  yet.
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 16,
                  padding: 12,
                  background: "white",
                }}
              >
                <div style={{ fontWeight: 900 }}>Does it work on phones?</div>
                <div style={{ opacity: 0.75, marginTop: 4, lineHeight: 1.6 }}>
                  Yes — Ordero is designed mobile-first.
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              {/* This one should go HOME explicitly */}
              <button
                onClick={() => router.push("/")}
                style={{
                  height: 44,
                  padding: "0 14px",
                  borderRadius: 14,
                  border: "1px solid #e5e7eb",
                  background: "white",
                  fontWeight: 900,
                  cursor: "pointer",
                  flex: "1 1 200px",
                }}
              >
                Back to home
              </button>

              <button
                onClick={() => router.push("/login")}
                style={{
                  height: 44,
                  padding: "0 14px",
                  borderRadius: 14,
                  border: "1px solid #111827",
                  background: "#111827",
                  color: "white",
                  fontWeight: 950,
                  cursor: "pointer",
                  flex: "1 1 200px",
                }}
              >
                Log in
              </button>
            </div>
          </div>
        </section>

        <style jsx>{`
          @media (max-width: 920px) {
            .pricingGrid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </main>
  );
}
