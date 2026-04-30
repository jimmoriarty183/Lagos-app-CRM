"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLockup } from "@/components/Brand";

import BuyCtaButton from "@/components/BuyCtaButton";
import { PublicFooter } from "@/components/PublicFooter";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

type BillingCycle = "monthly" | "yearly";

type Plan = {
  name: string;
  // Internal plan code (stable, matches plans.code in DB and Paddle mapping).
  // Middle-high tier is displayed as "Pro" but code='business';
  // top tier is displayed as "Business" but code='pro'.
  code: "solo" | "starter" | "business" | "pro";
  launchAmount: string;
  regularAmount: string;
  monthlyLaunchAmount: string;
  priceNote: {
    monthly: string;
    yearly: string;
  };
  description: string;
  features: string[];
  cta: string;
  highlight?: boolean;
  priceIdMonthly: string;
  priceIdYearly: string;
};

// Column keys use the INTERNAL plan code (`business`=middle-high/Pro, `pro`=top/Business).
// Display order in the table is: Solo | Starter | Pro (business) | Business (pro).
const comparisonRows = [
  {
    feature: "Businesses",
    solo: "1",
    starter: "2",
    business: "5",
    pro: "10",
  },
  {
    feature: "Team members",
    solo: "1",
    starter: "5",
    business: "10",
    pro: "20",
  },
  {
    feature: "CRM (orders + kanban)",
    solo: "Yes",
    starter: "Yes",
    business: "Yes",
    pro: "Yes",
  },
  {
    feature: "Filters / search",
    solo: "Yes",
    starter: "Yes",
    business: "Yes",
    pro: "Yes",
  },
  {
    feature: "Custom statuses",
    solo: "Yes",
    starter: "Yes",
    business: "Yes",
    pro: "Yes",
  },
  {
    feature: "Inbox",
    solo: "Basic",
    starter: "Yes",
    business: "Yes",
    pro: "Yes",
  },
  {
    feature: "Today / follow-ups",
    solo: "Yes",
    starter: "Yes",
    business: "Yes",
    pro: "Yes",
  },
  {
    feature: "Team management",
    solo: "—",
    starter: "Yes",
    business: "Yes",
    pro: "Yes",
  },
  {
    feature: "Manager dashboards",
    solo: "No",
    starter: "No",
    business: "Yes",
    pro: "Yes",
  },
  {
    feature: "KPI tracking",
    solo: "No",
    starter: "No",
    business: "Yes",
    pro: "Yes",
  },
  {
    feature: "Productivity analytics",
    solo: "No",
    starter: "No",
    business: "Yes",
    pro: "Yes",
  },
  { feature: "Alerts", solo: "No", starter: "No", business: "Yes", pro: "Yes" },
  {
    feature: "Export clients & products",
    solo: "No",
    starter: "No",
    business: "Yes",
    pro: "Yes",
  },
  {
    feature: "Import from CSV",
    solo: "No",
    starter: "No",
    business: "No",
    pro: "Yes",
  },
  {
    feature: "Risk score",
    solo: "No",
    starter: "No",
    business: "No",
    pro: "Yes",
  },
  {
    feature: "Audit log",
    solo: "No",
    starter: "No",
    business: "No",
    pro: "Yes",
  },
  {
    feature: "Support workflow",
    solo: "No",
    starter: "Basic",
    business: "Basic",
    pro: "Full",
  },
  {
    feature: "Priority support",
    solo: "No",
    starter: "No",
    business: "No",
    pro: "Yes",
  },
];

const whoIsThisFor = [
  {
    name: "Solo",
    text: "For individuals who want to organize orders and never miss a follow-up.",
  },
  {
    name: "Starter",
    text: "For small teams running up to 2 businesses with shared visibility and basic coordination.",
  },
  {
    name: "Pro",
    text: "For growing teams that need manager dashboards, KPI tracking, and performance analytics across up to 5 businesses.",
  },
  {
    name: "Business",
    text: "For multi-location operations and agencies managing up to 10 businesses with full support workflow, audit log, and priority support.",
  },
];

const faqs = [
  {
    q: "How many users and businesses are included?",
    a: "Solo: 1 user, 1 business. Starter: up to 5 users, 2 businesses. Pro: up to 10 users, 5 businesses. Business: up to 20 users, 10 businesses.",
  },
  {
    q: "How are users counted across businesses?",
    a: "Users are counted per unique email across all your businesses. If the same person works in two of your businesses, they count as one seat.",
  },
  {
    q: "What does the free trial include?",
    a: "Free trial: 30 days on monthly billing or 14 days on yearly. Cancel before the trial ends and you won't be charged. Card details are required at checkout (this is how Paddle works).",
  },
  {
    q: "Are prices shown with VAT?",
    a: "Prices on this page are shown excluding VAT. UK VAT at 20% is added at checkout where applicable.",
  },
  {
    q: "Can I upgrade later?",
    a: "Yes, you can upgrade your plan at any time as your team grows.",
  },
  {
    q: "Is this launch pricing?",
    a: "Yes. Current prices are part of the founding launch offer for a limited period.",
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [showSalesForm, setShowSalesForm] = useState(false);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState<string | null>(null);
  const [salesSuccess, setSalesSuccess] = useState<string | null>(null);
  const [salesForm, setSalesForm] = useState({
    fullName: "",
    workEmail: "",
    companyName: "",
    teamSize: "",
    currentTool: "",
    mainGoal: "",
    timeline: "",
    notes: "",
    website: "",
  });
  const [salesTouched, setSalesTouched] = useState({
    fullName: false,
    workEmail: false,
    companyName: false,
    mainGoal: false,
  });

  const salesFieldErrors = useMemo(() => {
    const email = salesForm.workEmail.trim();
    return {
      fullName:
        salesForm.fullName.trim().length >= 2
          ? ""
          : "Enter at least 2 characters.",
      workEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ? ""
        : "Enter a valid email (example@company.com).",
      companyName:
        salesForm.companyName.trim().length >= 2
          ? ""
          : "Enter your company name.",
      mainGoal:
        salesForm.mainGoal.trim().length >= 10
          ? ""
          : "Describe your goal in at least 10 characters.",
    };
  }, [salesForm]);

  const hasSalesFieldErrors = useMemo(() => {
    return Object.values(salesFieldErrors).some(Boolean);
  }, [salesFieldErrors]);

  async function onSubmitSalesForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (salesLoading) return;

    setSalesTouched({
      fullName: true,
      workEmail: true,
      companyName: true,
      mainGoal: true,
    });

    if (hasSalesFieldErrors) {
      setSalesError("Please fix highlighted fields and try again.");
      return;
    }

    setSalesLoading(true);
    setSalesError(null);
    setSalesSuccess(null);

    try {
      const payload = new FormData();
      payload.set("full_name", salesForm.fullName.trim());
      payload.set("work_email", salesForm.workEmail.trim());
      payload.set("company_name", salesForm.companyName.trim());
      payload.set("team_size", salesForm.teamSize.trim());
      payload.set("current_tool", salesForm.currentTool.trim());
      payload.set("main_goal", salesForm.mainGoal.trim());
      payload.set("timeline", salesForm.timeline.trim());
      payload.set("notes", salesForm.notes.trim());
      payload.set("website", salesForm.website.trim());

      const response = await fetch("/api/sales/requests", {
        method: "POST",
        body: payload,
      });

      const data = (await response.json()) as {
        ok?: boolean;
        requestId?: string;
        error?: string;
      };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to submit sales request");
      }

      setSalesSuccess(
        "Thanks. We received your request and will contact you shortly.",
      );
      setSalesTouched({
        fullName: false,
        workEmail: false,
        companyName: false,
        mainGoal: false,
      });
      setSalesForm({
        fullName: "",
        workEmail: "",
        companyName: "",
        teamSize: "",
        currentTool: "",
        mainGoal: "",
        timeline: "",
        notes: "",
        website: "",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setSalesError(message);
    } finally {
      setSalesLoading(false);
    }
  }

  const plans: Plan[] = [
    {
      name: "Solo",
      code: "solo",
      launchAmount: billingCycle === "monthly" ? "8" : "80",
      regularAmount: billingCycle === "monthly" ? "12" : "120",
      monthlyLaunchAmount: "8",
      priceNote: {
        monthly: "1 user • 1 business",
        yearly: "1 user • 1 business",
      },
      description:
        "For individuals who need structure and follow-up discipline",
      features: [
        "CRM (orders + kanban)",
        "Filters & search",
        "Custom statuses",
        "Basic inbox",
        "Today & follow-ups",
      ],
      cta: "Start with Solo",
      priceIdMonthly: "pri_01kmncmgt9csnfq6hwvz6eg5m3",
      priceIdYearly: "pri_01kn1ztvh3d8mf3c7msstc4yj4",
    },
    {
      name: "Starter",
      code: "starter",
      launchAmount: billingCycle === "monthly" ? "39" : "390",
      regularAmount: billingCycle === "monthly" ? "49" : "490",
      monthlyLaunchAmount: "39",
      priceNote: {
        monthly: "Up to 5 users • 2 businesses",
        yearly: "Up to 5 users • 2 businesses",
      },
      description: "For small teams getting control over daily operations",
      features: [
        "Everything in Solo",
        "Full inbox",
        "Team management",
        "Basic support workflow",
      ],
      cta: "Start with Starter",
      priceIdMonthly: "pri_01kmncq914c512x590mj142cm9",
      priceIdYearly: "pri_01kn1zrysbhmecpa8dmn3mjkwv",
    },
    {
      // Middle-high tier — displayed as "Pro" (code='business' in DB / Paddle).
      name: "Pro",
      code: "business",
      launchAmount: billingCycle === "monthly" ? "79" : "790",
      regularAmount: billingCycle === "monthly" ? "99" : "990",
      monthlyLaunchAmount: "79",
      priceNote: {
        monthly: "Up to 10 users • 5 businesses",
        yearly: "Up to 10 users • 5 businesses",
      },
      description:
        "For growing teams that need manager dashboards and KPI visibility",
      features: [
        "Everything in Starter",
        "Manager dashboards",
        "KPI tracking",
        "Productivity analytics",
        "Alerts",
        "Export clients & products",
      ],
      cta: "Start with Pro",
      highlight: true,
      priceIdMonthly: "pri_01kmncrvjyqb3y1rwf6w2zcpbq",
      priceIdYearly: "pri_01kn1zq31rkhqbgxys3f1fgqgj",
    },
    {
      // Top tier — displayed as "Business" (code='pro' in DB / Paddle).
      name: "Business",
      code: "pro",
      launchAmount: billingCycle === "monthly" ? "149" : "1490",
      regularAmount: billingCycle === "monthly" ? "179" : "1790",
      monthlyLaunchAmount: "149",
      priceNote: {
        monthly: "Up to 20 users • 10 businesses",
        yearly: "Up to 20 users • 10 businesses",
      },
      description:
        "For multi-location teams and agencies that need full operational control",
      features: [
        "Everything in Pro",
        "Risk score",
        "Full support workflow",
        "Priority support",
        "Import from CSV",
        "Audit log",
      ],
      cta: "Start with Business",
      priceIdMonthly: "pri_01kmncvk1ytkmj0tar1wxb8cw4",
      priceIdYearly: "pri_01kn1zmv87cs2he9v7xy01xpns",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <main className="page">
        <div className="shell">
          <nav className="topNav">
            <button
              className="brand"
              onClick={() => router.push("/")}
              aria-label="Go to Ordo home"
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
              }}
            >
              <BrandLockup variant="default" iconSize={24} />
            </button>
            <div className="links">
              <button onClick={() => router.push("/")}>Home</button>
              <button className="active">Pricing</button>
              <button onClick={() => router.push("/login")}>Log in</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                className="primary"
                onClick={() => router.push("/login?next=%2Fb%2Ftest")}
              >
                Open system
              </button>
              <ThemeToggle size="sm" />
            </div>
          </nav>

          <section className="hero card">
            <p className="eyebrow">UK launch pricing</p>
            <h1>Control execution. Not just tasks.</h1>
            <p className="heroCopy">
              A CRM built for real operations — track orders, manage follow-ups,
              and keep your team accountable with full visibility and control.
            </p>
            <div className="billingToggle">
              <button
                type="button"
                className={
                  billingCycle === "monthly" ? "toggle active" : "toggle"
                }
                onClick={() => setBillingCycle("monthly")}
                aria-pressed={billingCycle === "monthly"}
              >
                Monthly
              </button>
              <button
                type="button"
                className={
                  billingCycle === "yearly" ? "toggle active" : "toggle"
                }
                onClick={() => setBillingCycle("yearly")}
                aria-pressed={billingCycle === "yearly"}
              >
                Yearly
                <span className="toggleBadge">2 months free</span>
              </button>
            </div>

            <p className="launchBanner">
              Founding launch pricing available for a limited period.
            </p>

            <div className="heroCtas">
              <button className="primary" onClick={() => router.push("/login")}>
                Get started
              </button>
              <button
                className="secondary"
                onClick={() =>
                  document
                    .getElementById("compare")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Compare plans
              </button>
            </div>
          </section>

          <section className="pricingGrid" aria-label="Pricing plans">
            {plans.map((plan) => (
              <article
                className={`plan card ${plan.highlight ? "highlight" : ""}`}
                key={plan.name}
              >
                {plan.highlight && <span className="pill">Most popular</span>}
                <h2>{plan.name}</h2>
                <p className="note">{plan.description}</p>

                <div className="launchMeta">
                  <span className="launchPill">Launch price</span>
                  <span className="launchText">
                    Limited-time founding offer
                  </span>
                </div>

                <div className="priceRow">
                  <span className="sr-only">
                    Regular price £{plan.regularAmount} /{" "}
                    {billingCycle === "monthly" ? "month" : "year"}, launch
                    price £{plan.launchAmount} /{" "}
                    {billingCycle === "monthly" ? "month" : "year"}
                  </span>
                  <div className="priceStack" aria-hidden>
                    <div className="oldPrice">
                      <span className="oldCurrency">£</span>
                      <span className="oldAmount">{plan.regularAmount}</span>
                      <span className="oldPeriod">
                        / {billingCycle === "monthly" ? "month" : "year"}
                      </span>
                    </div>
                    <span className="price">
                      <span className="currency">£</span>
                      <span className="amount">{plan.launchAmount}</span>
                      <span className="period">
                        / {billingCycle === "monthly" ? "month" : "year"}
                      </span>
                    </span>
                  </div>
                </div>

                <p className="vatNote">+ VAT</p>

                {billingCycle === "yearly" ? (
                  <p className="yearlySavings">
                    Equivalent to £{plan.monthlyLaunchAmount}/month, billed
                    annually
                  </p>
                ) : null}

                <p className="priceNote">{plan.priceNote[billingCycle]}</p>
                <p className="trialNote">
                  {billingCycle === "monthly"
                    ? "30-day free trial · Cancel anytime before day 31"
                    : "14-day free trial · Cancel anytime before day 15"}
                </p>

                <ul>
                  {plan.features.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <div className="planCta">
                  <BuyCtaButton
                    planCode={plan.code}
                    interval={billingCycle === "monthly" ? "monthly" : "yearly"}
                    priceId={billingCycle === "monthly" ? plan.priceIdMonthly : plan.priceIdYearly}
                    label={plan.cta}
                    className={plan.highlight ? "primary" : "secondary"}
                  />
                </div>
              </article>
            ))}
          </section>

          <section
            className="card enterpriseCta"
            aria-label="Enterprise contact"
          >
            <div className="enterpriseTop">
              <div>
                <h3>Enterprise</h3>
                <p>Need enterprise-level rollout and support? Contact sales.</p>
                <p className="enterpriseContact">
                  Contact:{" "}
                  <a href="mailto:support@ordo.uno">support@ordo.uno</a>
                </p>
              </div>
              <button
                className="secondary"
                onClick={() => setShowSalesForm((prev) => !prev)}
              >
                {showSalesForm ? "Hide form" : "Contact sales"}
              </button>
            </div>
            {showSalesForm ? (
              <form className="salesForm" onSubmit={onSubmitSalesForm}>
                <div className="salesGrid">
                  <label>
                    <span>Full name</span>
                    <input
                      className={
                        salesTouched.fullName && salesFieldErrors.fullName
                          ? "invalid"
                          : ""
                      }
                      value={salesForm.fullName}
                      onChange={(event) =>
                        setSalesForm((prev) => ({
                          ...prev,
                          fullName: event.target.value,
                        }))
                      }
                      onBlur={() =>
                        setSalesTouched((prev) => ({ ...prev, fullName: true }))
                      }
                      required
                      minLength={2}
                    />
                    {salesTouched.fullName && salesFieldErrors.fullName ? (
                      <small className="fieldError">
                        {salesFieldErrors.fullName}
                      </small>
                    ) : null}
                  </label>
                  <label>
                    <span>Work email</span>
                    <input
                      type="email"
                      className={
                        salesTouched.workEmail && salesFieldErrors.workEmail
                          ? "invalid"
                          : ""
                      }
                      value={salesForm.workEmail}
                      onChange={(event) =>
                        setSalesForm((prev) => ({
                          ...prev,
                          workEmail: event.target.value,
                        }))
                      }
                      onBlur={() =>
                        setSalesTouched((prev) => ({
                          ...prev,
                          workEmail: true,
                        }))
                      }
                      required
                    />
                    {salesTouched.workEmail && salesFieldErrors.workEmail ? (
                      <small className="fieldError">
                        {salesFieldErrors.workEmail}
                      </small>
                    ) : null}
                  </label>
                  <label>
                    <span>Company name</span>
                    <input
                      className={
                        salesTouched.companyName && salesFieldErrors.companyName
                          ? "invalid"
                          : ""
                      }
                      value={salesForm.companyName}
                      onChange={(event) =>
                        setSalesForm((prev) => ({
                          ...prev,
                          companyName: event.target.value,
                        }))
                      }
                      onBlur={() =>
                        setSalesTouched((prev) => ({
                          ...prev,
                          companyName: true,
                        }))
                      }
                      required
                      minLength={2}
                    />
                    {salesTouched.companyName &&
                    salesFieldErrors.companyName ? (
                      <small className="fieldError">
                        {salesFieldErrors.companyName}
                      </small>
                    ) : null}
                  </label>
                  <label>
                    <span>Team size</span>
                    <select
                      value={salesForm.teamSize}
                      onChange={(event) =>
                        setSalesForm((prev) => ({
                          ...prev,
                          teamSize: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select...</option>
                      <option value="1">1</option>
                      <option value="2-5">2-5</option>
                      <option value="6-10">6-10</option>
                      <option value="11-20">11-20</option>
                      <option value="21-50">21-50</option>
                      <option value="50+">50+</option>
                    </select>
                  </label>
                </div>

                <div className="salesGrid salesGridSecondary">
                  <label>
                    <span>Current tool (optional)</span>
                    <input
                      value={salesForm.currentTool}
                      onChange={(event) =>
                        setSalesForm((prev) => ({
                          ...prev,
                          currentTool: event.target.value,
                        }))
                      }
                      placeholder="HubSpot, Pipedrive, spreadsheets, etc."
                    />
                  </label>
                  <label>
                    <span>Timeline (optional)</span>
                    <select
                      value={salesForm.timeline}
                      onChange={(event) =>
                        setSalesForm((prev) => ({
                          ...prev,
                          timeline: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select...</option>
                      <option value="ASAP">ASAP</option>
                      <option value="This month">This month</option>
                      <option value="Next 1-2 months">Next 1-2 months</option>
                      <option value="This quarter">This quarter</option>
                      <option value="Researching">Researching</option>
                    </select>
                  </label>
                </div>

                <label>
                  <span>Main goal</span>
                  <textarea
                    className={
                      salesTouched.mainGoal && salesFieldErrors.mainGoal
                        ? "invalid"
                        : ""
                    }
                    value={salesForm.mainGoal}
                    onChange={(event) =>
                      setSalesForm((prev) => ({
                        ...prev,
                        mainGoal: event.target.value,
                      }))
                    }
                    onBlur={() =>
                      setSalesTouched((prev) => ({ ...prev, mainGoal: true }))
                    }
                    required
                    minLength={10}
                    placeholder="What should improve first in your operations workflow?"
                  />
                  {salesTouched.mainGoal && salesFieldErrors.mainGoal ? (
                    <small className="fieldError">
                      {salesFieldErrors.mainGoal}
                    </small>
                  ) : null}
                </label>

                <label>
                  <span>Additional notes (optional)</span>
                  <textarea
                    value={salesForm.notes}
                    onChange={(event) =>
                      setSalesForm((prev) => ({
                        ...prev,
                        notes: event.target.value,
                      }))
                    }
                    placeholder="Anything important for rollout, integrations, or team setup?"
                  />
                </label>

                <label className="honey">
                  <span>Website</span>
                  <input
                    value={salesForm.website}
                    onChange={(event) =>
                      setSalesForm((prev) => ({
                        ...prev,
                        website: event.target.value,
                      }))
                    }
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </label>

                {salesError ? (
                  <div className="salesError">{salesError}</div>
                ) : null}
                {salesSuccess ? (
                  <div className="salesSuccess">{salesSuccess}</div>
                ) : null}

                <div className="salesActions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setShowSalesForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="primary"
                    disabled={salesLoading}
                  >
                    {salesLoading ? "Sending..." : "Send sales request"}
                  </button>
                </div>
              </form>
            ) : null}
          </section>

          <section id="compare" className="card tableWrap">
            <h3>Compare plans</h3>
            <div className="tableScroller">
              <table>
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Solo</th>
                    <th>Starter</th>
                    <th>Pro</th>
                    <th>Business</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.feature}>
                      <td>{row.feature}</td>
                      <td>{row.solo}</td>
                      <td>{row.starter}</td>
                      {/* Pro column shows the middle-high tier (row.business). */}
                      <td>{row.business}</td>
                      {/* Business column shows the top tier (row.pro). */}
                      <td>{row.pro}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card whoIsFor">
            <h3>Who is this for</h3>
            <div className="steps">
              {whoIsThisFor.map((item) => (
                <article key={item.name}>
                  <h4>{item.name}</h4>
                  <p>{item.text}</p>
                </article>
              ))}
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
        </div>

        <style jsx>{`
          /* THEME-AWARE: surface/text/border colours come from CSS vars
             defined in globals.css ([:root] = dark, [data-theme="light"] = light).
             Brand-tinted accents use --brand-* directly so they read OK in
             both themes. */
          .page {
            min-height: 100vh;
            background: var(--bg-app);
            color: var(--text-primary);
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
            background: var(--bg-elevated);
            border: 1px solid var(--border-default);
            border-radius: 18px;
            box-shadow: var(--shadow);
            min-width: 0;
          }
          .topNav {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            background: var(--bg-elevated);
            border: 1px solid var(--border-default);
            border-radius: 16px;
            padding: 12px;
            min-width: 0;
          }
          .brand {
            border: none;
            background: transparent;
            font-size: 20px;
            font-weight: 800;
            color: var(--text-primary);
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
            color: var(--text-secondary);
            font-weight: 600;
          }
          .links .active {
            background: rgba(91, 91, 179, 0.12);
            color: var(--brand-600);
          }
          button.primary,
          button.secondary,
          .toggle {
            height: 42px;
            border-radius: 12px;
            padding: 0 16px;
            font-weight: 600;
            cursor: pointer;
          }
          button.primary {
            box-shadow: 0 10px 20px -12px rgba(91, 91, 179, 0.6);
            border: 1px solid var(--brand-600);
            background: var(--brand-600);
            color: white;
          }
          button.secondary {
            border: 1px solid var(--border-strong);
            background: var(--bg-elevated);
            color: var(--text-primary);
          }
          .hero {
            padding: 30px;
            min-width: 0;
          }
          .eyebrow {
            margin: 0;
            display: inline-block;
            border: 1px solid rgba(124, 124, 200, 0.4);
            background: rgba(91, 91, 179, 0.12);
            color: var(--brand-600);
            font-size: 12px;
            font-weight: 600;
            border-radius: 999px;
            padding: 6px 12px;
          }
          [data-theme="dark"] .eyebrow {
            color: var(--brand-200);
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
            color: var(--text-tertiary);
            font-size: 16px;
          }
          .billingToggle {
            margin-top: 18px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px;
            background: var(--bg-elevated-strong);
            border: 1px solid var(--border-default);
            border-radius: 14px;
            flex-wrap: wrap;
          }
          .toggle {
            border: none;
            background: transparent;
            color: var(--text-tertiary);
            display: inline-flex;
            align-items: center;
            gap: 8px;
          }
          .toggle.active {
            background: var(--bg-elevated);
            color: var(--text-primary);
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
          }
          [data-theme="dark"] .toggle.active {
            background: rgba(255, 255, 255, 0.1);
          }
          .toggleBadge {
            display: inline-flex;
            align-items: center;
            border-radius: 999px;
            padding: 3px 8px;
            font-size: 11px;
            font-weight: 700;
            background: rgba(91, 91, 179, 0.15);
            color: var(--brand-600);
            border: 1px solid rgba(124, 124, 200, 0.4);
          }
          [data-theme="dark"] .toggleBadge {
            color: var(--brand-200);
          }
          .launchBanner {
            margin: 12px 0 0;
            color: var(--brand-600);
            font-size: 14px;
            font-weight: 600;
          }
          [data-theme="dark"] .launchBanner {
            color: var(--brand-300);
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
            gap: 16px;
            margin-top: 2px;
          }
          .plan {
            padding: 22px;
            position: relative;
            display: flex;
            flex-direction: column;
            border-color: var(--border-default);
          }
          .plan.highlight {
            border-color: rgba(124, 124, 200, 0.6);
            box-shadow: 0 6px 16px rgba(91, 91, 179, 0.18);
            background: linear-gradient(
              180deg,
              var(--bg-elevated) 0%,
              rgba(91, 91, 179, 0.04) 100%
            );
          }
          [data-theme="dark"] .plan.highlight {
            background: linear-gradient(
              180deg,
              rgba(91, 91, 179, 0.12) 0%,
              rgba(91, 91, 179, 0.02) 100%
            );
          }
          .pill {
            position: absolute;
            top: 12px;
            right: 12px;
            background: rgba(91, 91, 179, 0.15);
            color: var(--brand-600);
            border: 1px solid rgba(124, 124, 200, 0.4);
            border-radius: 999px;
            font-size: 11px;
            font-weight: 600;
            padding: 4px 9px;
          }
          [data-theme="dark"] .pill {
            color: var(--brand-200);
          }
          h2 {
            margin: 0;
            font-size: 20px;
          }
          .note {
            margin: 8px 0 0;
            color: var(--text-tertiary);
            line-height: 1.45;
            min-height: 78px;
          }
          .launchMeta {
            margin-top: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
          }
          .launchPill {
            display: inline-flex;
            align-items: center;
            border-radius: 999px;
            padding: 5px 10px;
            font-size: 11px;
            font-weight: 700;
            background: rgba(91, 91, 179, 0.15);
            color: var(--brand-600);
            border: 1px solid rgba(124, 124, 200, 0.4);
          }
          [data-theme="dark"] .launchPill {
            color: var(--brand-200);
          }
          .launchText {
            color: var(--text-muted);
            font-size: 12px;
            font-weight: 600;
          }
          .priceRow {
            margin-top: 10px;
            min-height: 72px;
            display: flex;
            align-items: flex-end;
          }
          .priceStack {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .oldPrice {
            display: inline-flex;
            align-items: baseline;
            gap: 4px;
            color: var(--text-muted);
            text-decoration: line-through;
            text-decoration-thickness: 2px;
            text-decoration-color: var(--border-strong);
            line-height: 1;
          }
          .oldCurrency {
            font-size: 16px;
            font-weight: 700;
          }
          .oldAmount {
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.02em;
          }
          .oldPeriod {
            font-size: 14px;
            font-weight: 600;
          }
          .price {
            display: inline-flex;
            align-items: baseline;
            gap: 6px;
            line-height: 1.05;
            font-weight: 800;
          }
          .currency {
            font-size: 26px;
            letter-spacing: -0.01em;
          }
          .amount {
            font-size: 48px;
            letter-spacing: -0.03em;
          }
          .period {
            font-size: 20px;
            color: var(--text-secondary);
            font-weight: 600;
            letter-spacing: -0.01em;
          }
          .vatNote {
            margin: 4px 0 0;
            color: var(--text-muted);
            font-weight: 600;
            font-size: 12px;
            letter-spacing: 0.02em;
          }
          .yearlySavings {
            margin: 8px 0 0;
            color: var(--brand-600);
            font-weight: 600;
            font-size: 13px;
            min-height: 20px;
          }
          [data-theme="dark"] .yearlySavings {
            color: var(--brand-300);
          }
          .priceNote {
            margin: 8px 0 0;
            color: var(--text-tertiary);
            font-weight: 600;
            font-size: 14px;
            min-height: 22px;
          }
          .trialNote {
            margin: 4px 0 0;
            color: var(--text-tertiary);
            font-size: 12px;
            font-weight: 500;
          }
          .plan ul {
            margin: 14px 0 0;
            padding-left: 20px;
            color: var(--text-primary);
            line-height: 1.58;
            flex: 1 1 auto;
          }
          .plan li + li {
            margin-top: 2px;
          }
          .planCta {
            margin-top: auto;
            padding-top: 16px;
            align-self: stretch;
          }
          .enterpriseCta {
            padding: 14px 18px;
            display: grid;
            gap: 14px;
          }
          .enterpriseTop {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
          }
          .enterpriseCta h3 {
            margin: 0 0 6px;
            font-size: 20px;
          }
          .enterpriseCta p {
            margin: 0;
            color: var(--text-tertiary);
          }
          .enterpriseContact {
            margin-top: 6px !important;
            font-size: 14px;
          }
          .enterpriseContact a {
            color: var(--brand-600);
            text-decoration: none;
            font-weight: 600;
          }
          [data-theme="dark"] .enterpriseContact a {
            color: var(--brand-300);
          }
          .enterpriseContact a:hover {
            text-decoration: underline;
          }
          .salesForm {
            border-top: 1px solid var(--border-default);
            padding-top: 14px;
            display: grid;
            gap: 12px;
          }
          .salesGrid {
            display: grid;
            gap: 12px;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .salesGridSecondary {
            grid-template-columns: 1.4fr 0.6fr;
          }
          .salesForm label {
            display: grid;
            gap: 6px;
          }
          .salesForm label > span {
            font-size: 13px;
            color: var(--text-secondary);
            font-weight: 600;
          }
          .fieldError {
            color: #be123c;
            font-size: 12px;
            line-height: 1.3;
          }
          [data-theme="dark"] .fieldError {
            color: #fb7185;
          }
          .salesForm input,
          .salesForm select,
          .salesForm textarea {
            width: 100%;
            border: 1px solid var(--border-strong);
            border-radius: 10px;
            background: var(--bg-elevated);
            color: var(--text-primary);
            outline: none;
            font-size: 14px;
            padding: 10px 12px;
            transition: border-color 0.15s ease;
          }
          .salesForm textarea {
            min-height: 96px;
            resize: vertical;
          }
          .salesForm input:focus,
          .salesForm select:focus,
          .salesForm textarea:focus {
            border-color: var(--brand-600);
          }
          .salesForm .invalid {
            border-color: #fb7185;
            background: rgba(251, 113, 133, 0.08);
          }
          .salesActions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 2px;
          }
          .salesError,
          .salesSuccess {
            border-radius: 10px;
            padding: 10px 12px;
            font-size: 14px;
          }
          .salesError {
            border: 1px solid rgba(254, 205, 211, 1);
            background: rgba(255, 241, 242, 1);
            color: #be123c;
          }
          [data-theme="dark"] .salesError {
            border-color: rgba(251, 113, 133, 0.35);
            background: rgba(232, 69, 69, 0.1);
            color: #fda4af;
          }
          .salesSuccess {
            border: 1px solid rgba(187, 247, 208, 1);
            background: rgba(240, 253, 244, 1);
            color: #166534;
          }
          [data-theme="dark"] .salesSuccess {
            border-color: rgba(74, 222, 128, 0.35);
            background: rgba(14, 169, 113, 0.1);
            color: #6ee7b7;
          }
          .honey {
            position: absolute;
            left: -10000px;
            top: auto;
            width: 1px;
            height: 1px;
            overflow: hidden;
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
            border: 1px solid var(--border-default);
            border-radius: 12px;
            overflow: hidden;
          }
          th,
          td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid var(--border-default);
            color: var(--text-secondary);
          }
          th {
            background: var(--bg-elevated-strong);
            color: var(--text-primary);
            font-weight: 600;
          }
          .whoIsFor {
            padding: 20px;
          }
          .steps {
            display: grid;
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .steps article {
            border: 1px solid var(--border-default);
            border-radius: 14px;
            padding: 14px;
          }
          h4 {
            margin: 0 0 6px;
            font-size: 17px;
          }
          .steps p,
          .faq p {
            margin: 0;
            color: var(--text-tertiary);
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
            border: 1px solid var(--border-default);
            border-radius: 14px;
            padding: 14px;
          }
          @media (min-width: 800px) {
            .pricingGrid {
              grid-template-columns: repeat(4, 1fr);
            }
            .steps {
              grid-template-columns: repeat(2, 1fr);
            }
            .faqGrid {
              grid-template-columns: repeat(2, 1fr);
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
            .billingToggle {
              width: 100%;
            }
            .toggle {
              flex: 1 1 calc(50% - 3px);
              justify-content: center;
              min-width: 0;
            }
            .heroCtas > button {
              flex: 1 1 calc(50% - 5px);
              min-width: 0;
            }
            .hero,
            .plan,
            .tableWrap,
            .whoIsFor,
            .faq {
              padding: 18px;
            }
            .note {
              min-height: 0;
            }
            .priceRow {
              min-height: 0;
            }
            .amount {
              font-size: 44px;
            }
            .period {
              font-size: 18px;
            }
            .priceNote,
            .yearlySavings {
              min-height: 0;
            }
            .enterpriseTop {
              width: 100%;
              flex-direction: column;
              align-items: flex-start;
            }
            .enterpriseTop > button {
              width: 100%;
            }
            .salesGrid,
            .salesGridSecondary {
              grid-template-columns: 1fr;
            }
            .salesActions {
              flex-direction: column-reverse;
            }
            .salesActions button {
              width: 100%;
            }
          }
        `}</style>
      </main>
      <PublicFooter />
    </div>
  );
}
