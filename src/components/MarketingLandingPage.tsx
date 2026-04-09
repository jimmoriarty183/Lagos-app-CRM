"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  CheckCircle2,
  Clock3,
  FileStack,
  KanbanSquare,
  MessageSquareMore,
  Users2,
} from "lucide-react";
import { BrandLockup } from "./Brand";
import { PublicFooter } from "./PublicFooter";

type BillingCycle = "monthly" | "yearly";
type DemoView = "kanban" | "crm" | "analytics";

const featureGroups = [
  {
    title: "Order management",
    icon: KanbanSquare,
    items: [
      "Pipeline tracking across stages",
      "Card-level statuses",
      "Checklist per order",
      "Files and attachments",
    ],
  },
  {
    title: "Customer operations",
    icon: Users2,
    items: [
      "Single customer database",
      "Segmentation by type and priority",
      "Customer activity history",
      "Team comments",
    ],
  },
  {
    title: "Analytics",
    icon: ChartNoAxesCombined,
    items: [
      "Breakdowns by stage and manager",
      "Conversion and cycle-time reporting",
      "Bottleneck visibility",
      "Live KPI dashboard",
    ],
  },
  {
    title: "Team collaboration",
    icon: BriefcaseBusiness,
    items: [
      "Clear ownership assignment",
      "Transparent deadlines",
      "Change and activity timeline",
      "Execution control without chaos",
    ],
  },
];

const plans = [
  {
    name: "Solo",
    monthly: 8,
    yearly: 80,
    note: "1 user, +£5 for each additional user",
    cta: "Start Solo",
  },
  {
    name: "Starter",
    monthly: 39,
    yearly: 390,
    note: "Up to 5 users",
    cta: "Start Starter",
  },
  {
    name: "Business",
    monthly: 79,
    yearly: 790,
    note: "Up to 10 users, reports and KPI",
    cta: "Choose Business",
    highlight: true,
  },
  {
    name: "Pro",
    monthly: 149,
    yearly: 1490,
    note: "Up to 20 users, full control and priority support",
    cta: "Upgrade to Pro",
  },
];

const testimonials = [
  {
    quote:
      "We stopped losing leads between managers. Every stage is now visible.",
    author: "Operations Lead, Retail Team",
  },
  {
    quote:
      "Kanban and order cards immediately showed where our process bottlenecks were.",
    author: "Small Business Owner",
  },
];

export function MarketingLandingPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [demoView, setDemoView] = useState<DemoView>("kanban");

  const demoLabel = useMemo(() => {
    if (demoView === "kanban") return "Kanban Flow";
    if (demoView === "crm") return "CRM Card";
    return "Analytics";
  }, [demoView]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-28 left-0 h-[440px] w-[440px] rounded-full bg-[radial-gradient(circle,_rgba(91,91,179,0.24)_0%,_rgba(91,91,179,0)_70%)]" />
        <div className="absolute right-0 top-20 h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle,_rgba(15,23,42,0.14)_0%,_rgba(15,23,42,0)_72%)]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-3 sm:px-6 lg:px-8">
          <BrandLockup iconSize={32} />
          <div className="flex items-center gap-2">
            <Link
              href="/pricing"
              className="hidden rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:inline-flex"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="brand-primary-btn inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
            >
              Get started <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 pb-14 pt-10 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:gap-12 lg:px-8 lg:pt-16">
          <div className="space-y-6 [animation:fadeIn_0.5s_ease-out]">
            <span className="brand-soft-chip inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide">
              CRM + Order Management
            </span>
            <h1 className="text-4xl font-semibold leading-[1.06] tracking-tight text-slate-950 sm:text-5xl">
              Sales, orders, and customers in one platform.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Ordo helps teams move from first contact to completed order with
              one connected workflow: kanban, order cards, statuses, reporting,
              and analytics without switching tools.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="brand-primary-btn inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold"
              >
                Start free
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/demo?next=%2Fapp%2Fcrm"
                className="brand-secondary-btn inline-flex items-center rounded-xl px-5 py-3 font-semibold"
              >
                Try demo
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat value="120+" label="teams" />
              <Stat value="15k+" label="orders / month" />
              <Stat value="4.8/5" label="UX rating" />
              <Stat value="99.9%" label="uptime" />
            </div>
          </div>

          <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_24px_50px_rgba(15,23,42,0.12)] sm:p-6 [animation:fadeIn_0.7s_ease-out]">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">
                Product interface
              </p>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Live data
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <KanbanColumn
                title="New"
                tone="blue"
                cards={["ORD-417 / 2h", "ORD-422 / 5h"]}
              />
              <KanbanColumn
                title="In progress"
                tone="amber"
                cards={["ORD-395 / 1d", "ORD-406 / 2d"]}
              />
              <KanbanColumn
                title="QA"
                tone="emerald"
                cards={["ORD-388 / QA", "ORD-392 / Check"]}
              />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MiniMetric label="Active orders" value="34" icon={Clock3} />
              <MiniMetric label="Customers in CRM" value="427" icon={Users2} />
              <MiniMetric
                label="Checklist tasks"
                value="96"
                icon={CheckCircle2}
              />
            </div>
          </article>
        </section>

        <section
          id="features"
          className="mx-auto w-full max-w-7xl px-5 pb-14 sm:px-6 lg:px-8"
        >
          <SectionTitle
            badge="Feature-rich CRM"
            title="Core workflows in one operational system"
            text="The platform covers both operations and commercial execution, from order intake to team performance analytics."
          />
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {featureGroups.map((group) => (
              <article
                key={group.title}
                className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
              >
                <div className="mb-4 inline-flex rounded-xl bg-slate-100 p-2 text-slate-700 transition group-hover:bg-[var(--brand-100)] group-hover:text-[var(--brand-700)]">
                  <group.icon size={18} />
                </div>
                <p className="mb-3 text-base font-semibold text-slate-900">
                  {group.title}
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--brand-600)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section
          id="demo"
          className="mx-auto w-full max-w-7xl px-5 pb-14 sm:px-6 lg:px-8"
        >
          <SectionTitle
            badge="Product Demo"
            title="A realistic in-product workflow"
            text="Use the interactive mock below to move between key product areas and see the flow from order to report."
          />
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_16px_34px_rgba(15,23,42,0.08)] sm:p-6">
            <div className="mb-5 flex flex-wrap gap-2">
              <DemoTab
                active={demoView === "kanban"}
                onClick={() => setDemoView("kanban")}
                label="Kanban"
                icon={KanbanSquare}
              />
              <DemoTab
                active={demoView === "crm"}
                onClick={() => setDemoView("crm")}
                label="Order card"
                icon={FileStack}
              />
              <DemoTab
                active={demoView === "analytics"}
                onClick={() => setDemoView("analytics")}
                label="Analytics"
                icon={BarChart3}
              />
            </div>

            {demoView === "kanban" ? <KanbanDemo /> : null}
            {demoView === "crm" ? <CrmCardDemo /> : null}
            {demoView === "analytics" ? <AnalyticsDemo /> : null}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-600">
                Demo mode:{" "}
                <strong className="text-slate-900">{demoLabel}</strong>
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/demo?next=%2Fapp%2Fcrm"
                  className="brand-primary-btn inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
                >
                  Open demo
                  <ArrowRight size={15} />
                </Link>
                <Link
                  href="/pricing"
                  className="brand-secondary-btn inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold"
                >
                  View pricing
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-5 pb-14 sm:px-6 lg:px-8">
          <SectionTitle
            badge="How it works"
            title="How it works"
            text="A simple flow designed to scale as your team grows."
          />
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StepCard
              number="01"
              title="Create an order"
              text="Capture request details, due date, owner, and attachments."
            />
            <StepCard
              number="02"
              title="Manage the customer"
              text="Keep communication history, segment, and priority in one CRM record."
            />
            <StepCard
              number="03"
              title="Run the workflow"
              text="Move orders through kanban while updating checklists and comments."
            />
            <StepCard
              number="04"
              title="Analyse results"
              text="Track reports, KPI, and stage-by-stage throughput speed."
            />
          </div>
        </section>

        <section
          id="pricing"
          className="mx-auto w-full max-w-7xl px-5 pb-14 sm:px-6 lg:px-8"
        >
          <SectionTitle
            badge="Pricing"
            title="Pricing for teams at every stage"
            text="Transparent packages built for fast rollout. Full comparison is available on the pricing page."
          />
          <div className="mt-6 flex w-fit rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                billingCycle === "monthly"
                  ? "bg-white text-slate-900 shadow"
                  : "text-slate-600"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                billingCycle === "yearly"
                  ? "bg-white text-slate-900 shadow"
                  : "text-slate-600"
              }`}
            >
              Yearly
            </button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`rounded-2xl border bg-white p-5 ${
                  plan.highlight
                    ? "border-[var(--brand-300)] shadow-[0_14px_28px_rgba(91,91,179,0.16)]"
                    : "border-slate-200"
                }`}
              >
                {plan.highlight ? (
                  <span className="mb-3 inline-flex rounded-full border border-[var(--brand-300)] bg-[var(--brand-100)] px-3 py-1 text-xs font-semibold text-[var(--brand-700)]">
                    Most popular
                  </span>
                ) : null}
                <h3 className="text-lg font-semibold text-slate-900">
                  {plan.name}
                </h3>
                <p className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
                  £{billingCycle === "monthly" ? plan.monthly : plan.yearly}
                  <span className="text-base font-medium text-slate-500">
                    /{billingCycle === "monthly" ? "mo" : "yr"}
                  </span>
                </p>
                <p className="mt-2 text-sm text-slate-600">{plan.note}</p>
                <div className="mt-5 flex flex-col gap-2">
                  <Link
                    href="/pricing"
                    className="brand-primary-btn inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold"
                  >
                    {plan.cta}
                  </Link>
                  <Link
                    href="/pricing#compare"
                    className="brand-secondary-btn inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold"
                  >
                    Compare
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-5 pb-14 sm:px-6 lg:px-8">
          <SectionTitle
            badge="Social Proof"
            title="Teams are already switching to managed operations"
            text="Customer feedback and metrics show the same pattern: a clear workflow improves conversion and processing speed."
          />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {testimonials.map((item) => (
              <article
                key={item.author}
                className="rounded-2xl border border-slate-200 bg-white p-6"
              >
                <MessageSquareMore
                  size={18}
                  className="mb-3 text-[var(--brand-600)]"
                />
                <p className="text-base leading-relaxed text-slate-700">
                  “{item.quote}”
                </p>
                <p className="mt-4 text-sm font-semibold text-slate-900">
                  {item.author}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-5 pb-16 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-slate-200 bg-slate-950 p-8 text-white sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
              Final CTA
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Replace operational chaos with a system built for growth.
            </h2>
            <p className="mt-3 max-w-2xl text-slate-300">
              Roll out Ordo across your team, run your workflows live, and give
              managers one operating model for customers and orders.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Start free
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/demo?next=%2Fapp%2Fcrm"
                className="inline-flex items-center rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Try demo
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

function SectionTitle({
  badge,
  title,
  text,
}: {
  badge: string;
  title: string;
  text: string;
}) {
  return (
    <div className="max-w-3xl">
      <span className="brand-soft-chip inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide">
        {badge}
      </span>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
        {title}
      </h2>
      <p className="mt-3 text-base leading-relaxed text-slate-600">{text}</p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xl font-semibold leading-tight text-slate-900">
        {value}
      </p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

function KanbanColumn({
  title,
  cards,
  tone,
}: {
  title: string;
  cards: string[];
  tone: "blue" | "amber" | "emerald";
}) {
  const toneClass =
    tone === "blue"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div
        className={`mb-3 inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${toneClass}`}
      >
        {title}
      </div>
      <div className="space-y-2">
        {cards.map((card) => (
          <div
            key={card}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700"
          >
            {card}
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 inline-flex rounded-md bg-white p-1.5 text-slate-600">
        <Icon size={14} />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <p className="text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function DemoTab({
  active,
  onClick,
  label,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
        active
          ? "border-[var(--brand-300)] bg-[var(--brand-100)] text-[var(--brand-700)]"
          : "border-slate-200 text-slate-600 hover:bg-slate-50"
      }`}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}

function KanbanDemo() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <KanbanColumn
        title="New enquiries"
        tone="blue"
        cards={["ORD-504 / Ivanov", "ORD-507 / Bright Decor", "ORD-512 / A2"]}
      />
      <KanbanColumn
        title="In progress"
        tone="amber"
        cards={["ORD-488 / Technical pack", "ORD-497 / Payment check"]}
      />
      <KanbanColumn
        title="Completed"
        tone="emerald"
        cards={["ORD-472 / Closed", "ORD-479 / Delivery", "ORD-481 / Archive"]}
      />
    </div>
  );
}

function CrmCardDemo() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            ORDER CARD
          </p>
          <p className="text-base font-semibold text-slate-900">
            ORD-395 • Amal Bakery
          </p>
        </div>
        <span className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
          IN_PROGRESS
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MiniBlock title="Manager" value="Emma Reed" />
        <MiniBlock title="Deadline" value="Today 18:00" />
        <MiniBlock title="Checklist" value="8 / 10 done" />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MiniBlock title="Latest comment" value="Layout approved" />
        <MiniBlock title="Attachments" value="invoice.pdf, mockup.zip" />
      </div>
    </div>
  );
}

function AnalyticsDemo() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <MiniBlock title="Orders in progress" value="34" />
      <MiniBlock title="Average turnaround" value="3.1 days" />
      <MiniBlock title="Stage conversion" value="67%" />
    </div>
  );
}

function MiniBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {title}
      </p>
      <p className="mt-1 text-base font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function StepCard({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--brand-600)]">
        Step {number}
      </p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p>
    </article>
  );
}
