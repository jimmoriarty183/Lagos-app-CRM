"use client";

import { useRouter } from "next/navigation";
import { BrandWordmark } from "@/components/Brand";
import { PublicFooter } from "@/components/PublicFooter";

type Plan = {
  name: string;
  price: string;
  period: string;
  note: string;
  features: string[];
  cta: string;
  highlight?: boolean;
  action: () => void;
};

const comparisonRows = [
  { feature: "Orders per month", starter: "Up to 30", business: "Unlimited", pro: "Unlimited" },
  { feature: "Status tracking", starter: "Basic", business: "Advanced", pro: "Advanced" },
  { feature: "Due dates", starter: "-", business: "Yes", pro: "Yes" },
  { feature: "Payment tracking", starter: "-", business: "Yes", pro: "Yes" },
  { feature: "Manager access", starter: "-", business: "Yes", pro: "Yes" },
  { feature: "Search and filters", starter: "-", business: "Yes", pro: "Yes" },
  { feature: "Analytics", starter: "-", business: "-", pro: "Simple analytics" },
  { feature: "Priority support", starter: "-", business: "-", pro: "Yes" },
  { feature: "Branding", starter: "-", business: "-", pro: "Custom (soon)" },
];

const faqs = [
  {
    q: "Can I cancel anytime?",
    a: "Yes. Every paid plan is month-to-month and you can cancel any time from your settings.",
  },
  {
    q: "Does it work on phones?",
    a: "Absolutely. Ordo works well on phones, so owners and teams can stay on top of clients and tasks on the go.",
  },
  {
    q: "Is billing live already?",
    a: "Billing is in rollout. You can start with Starter now and switch to paid plans as billing opens.",
  },
  {
    q: "Can I upgrade later?",
    a: "Yes. You can upgrade from Starter to Business or Pro whenever your workflow grows.",
  },
];

export default function PricingPage() {
  const router = useRouter();

  const plans: Plan[] = [
    {
      name: "Starter",
      price: "$0",
      period: "/ forever",
      note: "To launch your first workspace in Ordo",
      features: ["Up to 30 orders / month", "Basic statuses", "Mobile-friendly"],
      cta: "Start free",
      action: () => router.push("/login"),
    },
    {
      name: "Business",
      price: "$9",
      period: "/ month",
      note: "For small stores",
      features: [
        "Unlimited orders",
        "Due dates + payment tracking",
        "Manager access",
        "Search & filters",
      ],
      cta: "Get Business",
      highlight: true,
      action: () => router.push("/login?next=%2Fb%2Ftest"),
    },
    {
      name: "Pro",
      price: "$19",
      period: "/ month",
      note: "For teams",
      features: [
        "Everything in Business",
        "Simple analytics",
        "Priority support",
        "Custom branding (soon)",
      ],
      cta: "Get Pro",
      action: () => router.push("/login?next=%2Fb%2Ftest"),
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <main className="page">
      <div className="shell">
        <nav className="topNav">
          <button className="brand" onClick={() => router.push("/")} aria-label="Go to Ordo home">
            <BrandWordmark variant="gradient" height={24} />
          </button>
          <div className="links">
            <button onClick={() => router.push("/")}>Home</button>
            <button className="active">Pricing</button>
            <button onClick={() => router.push("/login")}>Log in</button>
          </div>
          <button className="primary" onClick={() => router.push("/login?next=%2Fb%2Ftest")}>Open system</button>
        </nav>

        <section className="hero card">
          <p className="eyebrow">Bring your business into order</p>
          <h1>Pricing for Ordo</h1>
          <p className="heroCopy">Start with CRM now, keep team operations structured, and unlock more capability as Tasks and Academy come online.</p>
          <div className="heroCtas">
            <button className="primary" onClick={() => router.push("/login")}>Get started</button>
            <button className="secondary" onClick={() => document.getElementById("compare")?.scrollIntoView({ behavior: "smooth" })}>Compare plans</button>
          </div>
        </section>

        <section className="pricingGrid" aria-label="Pricing plans">
          {plans.map((plan) => (
            <article className={`plan card ${plan.highlight ? "highlight" : ""}`} key={plan.name}>
              {plan.highlight && <span className="pill">Most popular</span>}
              <h2>{plan.name}</h2>
              <p className="note">{plan.note}</p>
              <div className="priceRow">
                <span className="price">{plan.price}</span>
                <span className="period">{plan.period}</span>
              </div>
              <ul>
                {plan.features.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <button className={plan.highlight ? "primary" : "secondary"} onClick={plan.action}>
                {plan.cta}
              </button>
            </article>
          ))}
        </section>

        <section className="trustStrip card" aria-label="Reassurance">
          <p>No credit card for Starter</p>
          <p>Cancel anytime</p>
          <p>Setup in 5 minutes</p>
        </section>

        <section id="compare" className="card tableWrap">
          <h3>Compare plans</h3>
          <div className="tableScroller">
            <table>
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Starter</th>
                  <th>Business</th>
                  <th>Pro</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.feature}>
                    <td>{row.feature}</td>
                    <td>{row.starter}</td>
                    <td>{row.business}</td>
                    <td>{row.pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card howItWorks">
          <h3>How it works</h3>
          <div className="steps">
            <article>
              <span>1</span>
              <h4>Create a workspace</h4>
              <p>Create your workspace, invite the team, and set the base for a structured operating flow.</p>
            </article>
            <article>
              <span>2</span>
              <h4>Add the first client or deal</h4>
              <p>Capture the client, next step, and business context in one system instead of scattered chats.</p>
            </article>
            <article>
              <span>3</span>
              <h4>Keep the workflow in order</h4>
              <p>The team sees the current stage, ownership, and context without losing control in messages and ad hoc notes.</p>
            </article>
          </div>
        </section>

        <section className="card faq">
          <h3>FAQ</h3>
          <div className="faqGrid">
            {faqs.map((item) => (
              <article key={item.q}>
                <h4>{item.q}</h4>
                <p>{item.a}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="card bottomCta">
          <h3>Start with CRM and scale inside one system</h3>
          <div className="heroCtas">
            <button className="primary" onClick={() => router.push("/login")}>Get started</button>
            <button className="secondary" onClick={() => router.push("/")}>Back to home</button>
          </div>
        </section>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #f8fbff;
          color: #0f172a;
          padding: 20px 16px 44px;
          overflow-x: hidden;
        }
        .shell {
          max-width: 1120px;
          margin: 0 auto;
          display: grid;
          gap: 18px;
          min-width: 0;
        }
        .card {
          background: #ffffff;
          border: 1px solid #dbe5f1;
          border-radius: 18px;
          box-shadow: 0 6px 20px rgba(15, 23, 42, 0.05);
          min-width: 0;
        }
        .topNav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: #ffffff;
          border: 1px solid #dbe5f1;
          border-radius: 16px;
          padding: 12px;
          min-width: 0;
        }
        .brand {
          border: none;
          background: transparent;
          font-size: 20px;
          font-weight: 800;
          color: #1e3a8a;
          cursor: pointer;
          min-width: 0;
        }
        .links {
          display: flex;
          gap: 8px;
        }
        .links button {
          border: none;
          background: transparent;
          padding: 8px 10px;
          border-radius: 10px;
          cursor: pointer;
          color: #334155;
          font-weight: 600;
        }
        .links .active {
          background: #eff6ff;
          color: #6366F1;
        }
        button.primary,
        button.secondary {
          height: 42px;
          border-radius: 12px;
          padding: 0 16px;
          font-weight: 700;
          cursor: pointer;
        }
        button.primary {
          box-shadow: 0 10px 20px -12px rgba(99, 102, 241, 0.72);
          border: 1px solid #6366F1;
          background: #6366F1;
          color: white;
        }
        button.secondary {
          border: 1px solid #c7d7eb;
          background: #fff;
          color: #0f172a;
        }
        .hero {
          padding: 30px;
          min-width: 0;
        }
        .eyebrow {
          margin: 0;
          display: inline-block;
          border: 1px solid #C7D2FE;
          background: #EEF2FF;
          color: #6366F1;
          font-size: 12px;
          font-weight: 700;
          border-radius: 999px;
          padding: 6px 12px;
        }
        h1 {
          margin: 14px 0 8px;
          font-size: clamp(30px, 3.6vw, 34px);
          line-height: 1.12;
          letter-spacing: -0.03em;
          overflow-wrap: anywhere;
        }
        .heroCopy {
          margin: 0;
          color: #475569;
          font-size: 16px;
        }
        .heroCtas {
          margin-top: 18px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .pricingGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }
        .plan {
          padding: 22px;
          position: relative;
        }
        .plan.highlight {
          border: 2px solid #6366F1;
          box-shadow: 0 8px 26px rgba(29, 78, 216, 0.12);
        }
        .pill {
          position: absolute;
          top: 14px;
          right: 14px;
          background: #EEF2FF;
          color: #4F46E5;
          border: 1px solid #C7D2FE;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          padding: 5px 10px;
        }
        h2 {
          margin: 0;
          font-size: 20px;
        }
        .note {
          margin: 6px 0 0;
          color: #64748b;
        }
        .priceRow {
          margin-top: 10px;
          display: flex;
          align-items: baseline;
          gap: 6px;
        }
        .price {
          font-size: 40px;
          line-height: 1;
          font-weight: 800;
        }
        .period {
          color: #64748b;
          font-weight: 600;
        }
        .plan ul {
          margin: 14px 0;
          padding-left: 20px;
          color: #334155;
          line-height: 1.8;
        }
        .trustStrip {
          padding: 14px 18px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
          color: #1e293b;
          font-weight: 600;
          text-align: center;
        }
        .tableWrap {
          padding: 20px;
        }
        h3 {
          margin: 0 0 14px;
          font-size: 24px;
        }
        .tableScroller {
          overflow-x: auto;
        }
        table {
          width: 100%;
          min-width: 660px;
          border-collapse: collapse;
          border: 1px solid #dbe5f1;
          border-radius: 12px;
          overflow: hidden;
        }
        th,
        td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e5edf6;
          color: #334155;
        }
        th {
          background: #f8fbff;
          color: #0f172a;
          font-weight: 700;
        }
        .howItWorks {
          padding: 20px;
        }
        .steps {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        .steps article {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 14px;
        }
        .steps span {
          width: 28px;
          height: 28px;
          display: inline-grid;
          place-items: center;
          border-radius: 999px;
          background: #EEF2FF;
          color: #4F46E5;
          font-weight: 700;
          font-size: 14px;
        }
        h4 {
          margin: 10px 0 6px;
          font-size: 17px;
        }
        .steps p,
        .faq p {
          margin: 0;
          color: #475569;
          line-height: 1.6;
        }
        .faq {
          padding: 20px;
        }
        .faqGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        .faqGrid article {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 14px;
        }
        .bottomCta {
          padding: 24px;
          text-align: center;
        }

        @media (min-width: 800px) {
          .pricingGrid {
            grid-template-columns: repeat(3, 1fr);
          }
          .steps {
            grid-template-columns: repeat(3, 1fr);
          }
          .faqGrid {
            grid-template-columns: repeat(2, 1fr);
          }
          .trustStrip {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 760px) {
          .page {
            padding: 14px 12px 32px;
          }
          .topNav {
            flex-wrap: wrap;
            align-items: stretch;
          }
          .brand {
            flex: 1 1 auto;
            text-align: left;
          }
          .topNav > .primary {
            width: 100%;
          }
          .links {
            display: none;
          }
          .heroCopy {
            max-width: 28ch;
          }
          .heroCtas > button {
            flex: 1 1 calc(50% - 5px);
            min-width: 0;
          }
          .hero,
          .plan,
          .tableWrap,
          .howItWorks,
          .faq,
          .bottomCta {
            padding: 18px;
          }
        }
      `}</style>
      </main>
      <PublicFooter />
    </div>
  );
}

