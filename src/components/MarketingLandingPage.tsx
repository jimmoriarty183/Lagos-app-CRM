"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, type Variants } from "motion/react";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  CheckCircle2,
  Clock3,
  FileStack,
  KanbanSquare,
  Quote,
  Sparkles,
  TrendingUp,
  Users2,
  Zap,
} from "lucide-react";
import { BrandLockup } from "./Brand";
import BuyCtaButton from "./BuyCtaButton";
import { PublicFooter } from "./PublicFooter";
import { ThemeToggle } from "./theme/ThemeToggle";

const heroFadeUp: Variants = {
  hidden: { opacity: 0, y: 16, filter: "blur(8px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};

const heroStagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const scrollFadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

const scrollStagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const rowSlideIn: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

type BillingCycle = "monthly" | "yearly";
type DemoView = "kanban" | "crm" | "analytics";

// NOTE: display names are swapped vs internal plan code (single source of truth: /pricing).
// "Pro" (displayed) = code 'business' (highlighted middle-high tier);
// "Business" (displayed) = code 'pro' (top tier).
type PlanCode = "solo" | "starter" | "business" | "pro";

type Plan = {
  name: string;
  code: PlanCode;
  launch: { monthly: number; yearly: number };
  regular: { monthly: number; yearly: number };
  priceIds: { monthly: string; yearly: string };
  note: string;
  description: string;
  cta: string;
  highlight?: boolean;
  features: string[];
};

const plans: Plan[] = [
  {
    name: "Solo",
    code: "solo",
    launch: { monthly: 8, yearly: 80 },
    regular: { monthly: 12, yearly: 120 },
    priceIds: {
      monthly: "pri_01kmncmgt9csnfq6hwvz6eg5m3",
      yearly: "pri_01kn1ztvh3d8mf3c7msstc4yj4",
    },
    note: "1 user · 1 business",
    description: "For individuals who need structure and follow-up discipline",
    cta: "Start with Solo",
    features: [
      "CRM (orders + kanban)",
      "Filters & search",
      "Custom statuses",
      "Basic inbox",
      "Today & follow-ups",
    ],
  },
  {
    name: "Starter",
    code: "starter",
    launch: { monthly: 39, yearly: 390 },
    regular: { monthly: 49, yearly: 490 },
    priceIds: {
      monthly: "pri_01kmncq914c512x590mj142cm9",
      yearly: "pri_01kn1zrysbhmecpa8dmn3mjkwv",
    },
    note: "Up to 5 users · 2 businesses",
    description: "For small teams getting control over daily operations",
    cta: "Start with Starter",
    features: [
      "Everything in Solo",
      "Full inbox",
      "Team management",
      "Basic support workflow",
    ],
  },
  {
    name: "Pro",
    code: "business",
    launch: { monthly: 79, yearly: 790 },
    regular: { monthly: 99, yearly: 990 },
    priceIds: {
      monthly: "pri_01kmncrvjyqb3y1rwf6w2zcpbq",
      yearly: "pri_01kn1zq31rkhqbgxys3f1fgqgj",
    },
    note: "Up to 10 users · 5 businesses",
    description:
      "For growing teams that need manager dashboards and KPI visibility",
    cta: "Start with Pro",
    highlight: true,
    features: [
      "Everything in Starter",
      "Manager dashboards",
      "KPI tracking",
      "Productivity analytics",
      "Alerts",
      "Export clients & products",
    ],
  },
  {
    name: "Business",
    code: "pro",
    launch: { monthly: 149, yearly: 1490 },
    regular: { monthly: 179, yearly: 1790 },
    priceIds: {
      monthly: "pri_01kmncvk1ytkmj0tar1wxb8cw4",
      yearly: "pri_01kn1zmv87cs2he9v7xy01xpns",
    },
    note: "Up to 20 users · 10 businesses",
    description:
      "For multi-location teams and agencies that need full operational control",
    cta: "Start with Business",
    features: [
      "Everything in Pro",
      "Risk score",
      "Full support workflow",
      "Priority support",
      "Import from CSV",
      "Audit log",
    ],
  },
];

const testimonials = [
  {
    quote:
      "We stopped losing leads between managers. Every stage is now visible — the team finally has one place to look.",
    author: "Sarah Mitchell",
    role: "Operations Lead",
    company: "Retail Team",
    initials: "SM",
  },
  {
    quote:
      "Kanban and order cards immediately showed where our process bottlenecks were. We cut average turnaround by 28%.",
    author: "James Whitaker",
    role: "Founder",
    company: "Whitaker & Co.",
    initials: "JW",
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
    <div className="min-h-screen bg-white dark:bg-white/[0.03] text-slate-900 dark:bg-[var(--bg-app)] dark:text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <motion.div
          aria-hidden
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          className="absolute -top-32 -left-20 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,_rgba(91,91,179,0.32)_0%,_rgba(91,91,179,0)_70%)] dark:bg-[radial-gradient(circle,_rgba(91,91,179,0.45)_0%,_rgba(91,91,179,0)_70%)]"
        />
        <motion.div
          aria-hidden
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.6, delay: 0.2, ease: "easeOut" }}
          className="absolute -top-10 right-[-80px] h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,_rgba(124,124,200,0.28)_0%,_rgba(124,124,200,0)_72%)] dark:bg-[radial-gradient(circle,_rgba(124,124,200,0.32)_0%,_rgba(124,124,200,0)_72%)]"
        />
        <motion.div
          aria-hidden
          animate={{ opacity: [0.18, 0.32, 0.18] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[260px] left-1/2 h-[300px] w-[60%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse_at_center,_rgba(91,91,179,0.4)_0%,_rgba(91,91,179,0)_70%)] blur-2xl dark:bg-[radial-gradient(ellipse_at_center,_rgba(91,91,179,0.55)_0%,_rgba(91,91,179,0)_70%)]"
        />
      </div>

      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 dark:bg-white/[0.05] backdrop-blur dark:border-white/5 dark:bg-[#0B0B14]/85">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-3 sm:px-6 lg:px-8">
          <BrandLockup iconSize={32} />
          <div className="flex items-center gap-2">
            <Link
              href="/pricing"
              className="hidden rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 dark:text-white/80 transition hover:bg-slate-50 dark:hover:bg-white/[0.06] sm:inline-flex dark:border-white/10 dark:text-white/75 dark:hover:border-white/20 dark:hover:bg-white/[0.04]"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 dark:text-white/80 transition hover:bg-slate-100 dark:hover:bg-white/[0.08] dark:text-white/75 dark:hover:bg-white/[0.05]"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="brand-primary-btn inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
            >
              Get started <ArrowRight size={15} />
            </Link>
            <ThemeToggle size="sm" className="ml-1" />
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 pb-10 pt-8 sm:gap-8 sm:pb-14 sm:pt-10 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:gap-12 lg:px-8 lg:pt-20">
          <motion.div
            className="space-y-5 sm:space-y-6"
            variants={heroStagger}
            initial="hidden"
            animate="visible"
          >
            <motion.span
              variants={heroFadeUp}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="brand-soft-chip inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide shadow-sm"
            >
              <Sparkles size={13} className="text-[var(--brand-600)]" />
              CRM + Order Management
            </motion.span>
            <motion.h1
              variants={heroFadeUp}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="bg-gradient-to-br from-slate-950 via-slate-800 to-[var(--brand-700)] bg-clip-text text-4xl font-semibold leading-[1.04] tracking-tight text-transparent dark:from-white dark:via-white/85 dark:to-[var(--brand-300)] sm:text-5xl lg:text-6xl"
            >
              Sales, orders, and customers in one platform.
            </motion.h1>
            <motion.p
              variants={heroFadeUp}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="max-w-xl text-base leading-relaxed text-slate-600 dark:text-white/70 sm:text-lg"
            >
              Ordo helps teams move from first contact to completed order with
              one connected workflow: kanban, order cards, statuses, reporting,
              and analytics without switching tools.
            </motion.p>
            <motion.div
              variants={heroFadeUp}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="flex flex-wrap gap-3"
            >
              <Link
                href="/login"
                className="brand-primary-btn group inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold shadow-[0_10px_30px_-12px_rgba(91,91,179,0.6)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-12px_rgba(91,91,179,0.7)] active:scale-[0.98]"
              >
                Start free
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>
              <Link
                href="/demo?next=%2Fapp%2Fcrm"
                className="brand-secondary-btn inline-flex items-center rounded-xl px-5 py-3 font-semibold transition-all hover:-translate-y-0.5 active:scale-[0.98]"
              >
                Try demo
              </Link>
            </motion.div>
            <motion.div
              variants={heroFadeUp}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            >
              <Stat value="120+" label="teams" />
              <Stat value="15k+" label="orders / month" />
              <Stat value="4.8/5" label="UX rating" />
              <Stat value="99.9%" label="uptime" />
            </motion.div>
          </motion.div>

          <motion.article
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -4 }}
            className="relative rounded-3xl border border-slate-200/70 bg-white/80 dark:bg-white/[0.05] p-4 shadow-[0_30px_60px_-20px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03] dark:shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)] sm:p-6"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-px rounded-3xl bg-gradient-to-br from-[var(--brand-200)]/40 via-transparent to-transparent opacity-60 dark:from-[var(--brand-500)]/30"
            />
            <div className="relative">
              <div className="mb-5 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700 dark:text-white/80 dark:text-white/85">
                  Product interface
                </p>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
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
                <MiniMetric
                  label="Customers in CRM"
                  value="427"
                  icon={Users2}
                />
                <MiniMetric
                  label="Checklist tasks"
                  value="96"
                  icon={CheckCircle2}
                />
              </div>
            </div>
          </motion.article>
        </section>

        <section
          id="features"
          className="mx-auto w-full max-w-7xl px-5 pb-14 pt-6 sm:pb-20 sm:pt-10 sm:px-6 lg:px-8"
        >
          <ScrollReveal>
            <SectionTitle
              badge="Feature-rich CRM"
              title="Everything your operations team needs, in one place"
              text="Stop stitching together spreadsheets, chats, and trackers. Ordo unifies orders, customers, and analytics into one operational surface."
            />
          </ScrollReveal>

          <motion.div
            variants={scrollStagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="mt-6 grid gap-3 sm:mt-10 sm:gap-4 lg:auto-rows-[minmax(0,1fr)] lg:grid-cols-6"
          >
            <BentoCard
              className="lg:col-span-4"
              icon={KanbanSquare}
              eyebrow="Order management"
              title="A pipeline that mirrors how your team actually works"
              description="Drag cards between stages, attach files, run checklists. Every order has a single source of truth — no more lost requests."
            >
              <BentoKanbanPreview />
            </BentoCard>

            <BentoCard
              className="lg:col-span-2"
              icon={Users2}
              eyebrow="Customer ops"
              title="One CRM record per customer"
              description="Segments, priority, full activity history."
            >
              <BentoCustomerPreview />
            </BentoCard>

            <BentoCard
              className="lg:col-span-2"
              icon={ChartNoAxesCombined}
              eyebrow="Analytics"
              title="Conversion + cycle-time at a glance"
              description="Stage-by-stage funnel, bottleneck detection, live KPI."
            >
              <BentoAnalyticsPreview />
            </BentoCard>

            <BentoCard
              className="lg:col-span-2"
              icon={BriefcaseBusiness}
              eyebrow="Team collaboration"
              title="Clear ownership, transparent deadlines"
              description="Assign managers, set SLAs, track everything in a timeline."
            >
              <BentoTeamPreview />
            </BentoCard>

            <BentoCard
              className="lg:col-span-2"
              icon={Zap}
              eyebrow="Automation"
              title="Cut repetitive work"
              description="Auto-assign by stage, alerts, and SLA breach signals."
            >
              <BentoAutomationPreview />
            </BentoCard>
          </motion.div>
        </section>

        <section
          id="demo"
          className="relative mx-auto w-full max-w-7xl px-5 pb-14 sm:pb-20 sm:px-6 lg:px-8"
        >
          <ScrollReveal>
            <SectionTitle
              badge="Product Demo"
              title="See the flow from first lead to closed order"
              text="Move between Kanban, the order card, and the analytics view — exactly as your team will use it daily."
            />
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className="relative mt-6 overflow-hidden rounded-3xl border border-slate-200/70 bg-white/80 dark:bg-white/[0.05] p-4 shadow-[0_30px_60px_-30px_rgba(91,91,179,0.35)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03] dark:shadow-[0_30px_60px_-30px_rgba(91,91,179,0.45)] sm:mt-10 sm:p-7">
              <div
                aria-hidden
                className="pointer-events-none absolute -top-32 -right-20 h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle,_rgba(91,91,179,0.18)_0%,_rgba(91,91,179,0)_70%)]"
              />
              <div className="relative">
                <div className="mb-6 flex flex-wrap gap-2">
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

                <motion.div
                  key={demoView}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  {demoView === "kanban" ? <KanbanDemo /> : null}
                  {demoView === "crm" ? <CrmCardDemo /> : null}
                  {demoView === "analytics" ? <AnalyticsDemo /> : null}
                </motion.div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/60 pt-5 dark:border-white/10">
                  <p className="text-sm text-slate-600 dark:text-white/70 dark:text-white/65">
                    Demo mode:{" "}
                    <strong className="text-slate-900 dark:text-white">
                      {demoLabel}
                    </strong>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href="/demo?next=%2Fapp%2Fcrm"
                      className="brand-primary-btn group inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5"
                    >
                      Open full demo
                      <ArrowRight
                        size={15}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </Link>
                    <Link
                      href="/pricing"
                      className="brand-secondary-btn inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5"
                    >
                      View pricing
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>

        <section className="mx-auto w-full max-w-7xl px-5 pb-14 sm:pb-20 sm:px-6 lg:px-8">
          <ScrollReveal>
            <SectionTitle
              badge="How it works"
              title="From first contact to closed deal in four steps"
              text="A clean operational flow your team picks up on day one."
            />
          </ScrollReveal>

          <motion.div
            variants={scrollStagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="mt-6 grid gap-3 sm:mt-10 sm:gap-4 md:grid-cols-2 lg:grid-cols-4"
          >
            <StepCard
              number="01"
              title="Create an order"
              text="Capture request details, due date, owner, and attachments in seconds."
            />
            <StepCard
              number="02"
              title="Manage the customer"
              text="Communication history, segment, and priority — all in one CRM record."
            />
            <StepCard
              number="03"
              title="Run the workflow"
              text="Move orders through kanban while checklists and comments stay in sync."
            />
            <StepCard
              number="04"
              title="Analyse results"
              text="Reports, KPI, and stage-by-stage throughput — without spreadsheets."
            />
          </motion.div>
        </section>

        <section
          id="pricing"
          className="mx-auto w-full max-w-7xl px-5 pb-14 sm:pb-20 sm:px-6 lg:px-8"
        >
          <ScrollReveal>
            <SectionTitle
              badge="Pricing"
              title="Plans that grow with your team"
              text="Transparent packages built for fast rollout. Switch yearly for ~17% off."
            />
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 sm:mt-8">
              <div className="inline-flex rounded-xl border border-slate-200 bg-white/70 dark:bg-white/[0.05] p-1 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
                <button
                  type="button"
                  onClick={() => setBillingCycle("monthly")}
                  className={`relative rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    billingCycle === "monthly"
                      ? "bg-[var(--brand-600)] text-white shadow"
                      : "text-slate-600 dark:text-white/70 hover:text-slate-900 dark:text-white/65 dark:hover:text-white"
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle("yearly")}
                  className={`relative inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    billingCycle === "yearly"
                      ? "bg-[var(--brand-600)] text-white shadow"
                      : "text-slate-600 dark:text-white/70 hover:text-slate-900 dark:text-white/65 dark:hover:text-white"
                  }`}
                >
                  Yearly
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      billingCycle === "yearly"
                        ? "bg-white/25 text-white"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                    }`}
                  >
                    2 months free
                  </span>
                </button>
              </div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--brand-700)] dark:text-[var(--brand-200)]">
                ● Founding launch — limited period
              </p>
            </div>
          </ScrollReveal>

          <motion.div
            variants={scrollStagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03] sm:mt-6 md:grid md:grid-cols-2 xl:grid-cols-4"
          >
            {plans.map((plan, idx) => {
              const launchPrice = plan.launch[billingCycle];
              const regularPrice = plan.regular[billingCycle];
              const period = billingCycle === "monthly" ? "mo" : "yr";

              // 4 cells: stack at <md, 2x2 at md, 1x4 at xl. Borders by index.
              const cellBorder = (() => {
                switch (idx) {
                  case 0:
                    return "md:border-r md:border-b md:border-slate-200 dark:md:border-white/10 xl:border-b-0";
                  case 1:
                    return "md:border-b md:border-slate-200 dark:md:border-white/10 xl:border-b-0 xl:border-r xl:border-slate-200 dark:xl:border-white/10";
                  case 2:
                    return "md:border-r md:border-slate-200 dark:md:border-white/10";
                  default:
                    return "";
                }
              })();
              const stackBorder = idx < 3 ? "border-b border-slate-200 dark:border-white/10 md:border-b-0" : "";

              return (
                <motion.article
                  key={plan.name}
                  variants={scrollFadeUp}
                  className={`relative flex flex-col p-5 sm:p-6 ${stackBorder} ${cellBorder} ${
                    plan.highlight
                      ? "bg-[var(--brand-50)]/40 dark:bg-[var(--brand-600)]/10"
                      : "bg-white dark:bg-white/[0.03] transition hover:bg-slate-50 dark:hover:bg-white/[0.06] dark:bg-transparent dark:hover:bg-white/[0.04]"
                  }`}
                >
                  {plan.highlight ? (
                    <motion.span
                      aria-hidden
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true, margin: "-60px" }}
                      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                      className="absolute inset-x-0 top-0 h-[3px] origin-left bg-[var(--brand-600)]"
                    />
                  ) : null}

                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-[18px] font-semibold text-slate-950 dark:text-white">
                      {plan.name}
                    </h3>
                    {plan.highlight ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[var(--brand-600)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        Most popular
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1.5 text-[13px] leading-snug text-slate-600 dark:text-white/70 dark:text-white/60 md:min-h-[34px]">
                    {plan.description}
                  </p>

                  <div className="mt-4">
                    <p className="text-[12px] text-slate-400 dark:text-white/45 line-through decoration-slate-300 dark:text-white/40 dark:decoration-white/20">
                      £{regularPrice} reg.
                    </p>
                    <p className="mt-0.5 flex items-baseline tracking-tight text-slate-950 dark:text-white">
                      <span className="text-lg font-semibold">£</span>
                      <span className="text-[40px] font-bold leading-none">
                        {launchPrice}
                      </span>
                      <span className="ml-1.5 text-sm font-medium text-slate-500 dark:text-white/55">
                        /{period}
                      </span>
                      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-white/45">
                        + VAT
                      </span>
                    </p>
                    {billingCycle === "yearly" ? (
                      <p className="mt-1 text-[11px] font-semibold text-[var(--brand-700)] dark:text-[var(--brand-200)]">
                        £{plan.launch.monthly}/mo billed annually
                      </p>
                    ) : null}
                  </div>

                  <p className="mt-3 text-[12px] font-semibold text-slate-700 dark:text-white/80 dark:text-white/70">
                    {plan.note}
                  </p>

                  <div className="my-4 h-px bg-slate-200 dark:bg-white/[0.08] dark:bg-white/10" />

                  <ul className="flex-1 space-y-1.5 text-[13px] leading-snug text-slate-700 dark:text-white/80">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-baseline gap-2">
                        <span
                          className={`flex-none text-[14px] leading-none ${
                            plan.highlight
                              ? "text-[var(--brand-600)] dark:text-[var(--brand-300)]"
                              : "text-[var(--brand-500)] dark:text-[var(--brand-400)]"
                          }`}
                        >
                          +
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5">
                    <BuyCtaButton
                      planCode={plan.code}
                      interval={billingCycle}
                      priceId={plan.priceIds[billingCycle]}
                      label={plan.cta}
                      className={`inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-70 ${
                        plan.highlight
                          ? "brand-primary-btn shadow-[0_10px_24px_-14px_rgba(91,91,179,0.7)]"
                          : "border border-slate-300 bg-white dark:bg-white/[0.03] text-slate-900 hover:border-[var(--brand-300)] hover:bg-[var(--brand-50)] hover:text-[var(--brand-700)] dark:border-white/15 dark:bg-white/[0.04] dark:text-white dark:hover:border-[var(--brand-500)]/40 dark:hover:bg-white/[0.07] dark:hover:text-white"
                      }`}
                    />
                    <p className="mt-2 text-center text-[11px] text-slate-500 dark:text-white/55 dark:text-white/45">
                      {billingCycle === "monthly"
                        ? "30-day free trial · cancel before day 31"
                        : "14-day free trial · cancel before day 15"}
                    </p>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-5 pb-14 sm:pb-20 sm:px-6 lg:px-8">
          <ScrollReveal>
            <SectionTitle
              badge="Social Proof"
              title="Teams are switching to operations they can actually see"
              text="The same pattern keeps coming up: when the workflow is visible, conversion and speed improve."
            />
          </ScrollReveal>

          <motion.div
            variants={scrollStagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="mt-6 grid gap-3 sm:mt-10 sm:gap-4 md:grid-cols-2"
          >
            {testimonials.map((item) => (
              <motion.article
                key={item.author}
                variants={scrollFadeUp}
                whileHover={{ y: -4 }}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-7 transition hover:border-[var(--brand-300)] hover:shadow-[0_24px_50px_-30px_rgba(91,91,179,0.4)] dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-[var(--brand-500)]/40 dark:hover:shadow-[0_24px_50px_-30px_rgba(91,91,179,0.6)]"
              >
                <Quote
                  size={28}
                  className="absolute right-5 top-5 text-[var(--brand-200)] transition group-hover:text-[var(--brand-300)] dark:text-[var(--brand-500)]/40 dark:group-hover:text-[var(--brand-400)]/70"
                />
                <p className="relative text-lg leading-relaxed text-slate-800 dark:text-white/90 dark:text-white/85">
                  &ldquo;{item.quote}&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-500)] to-[var(--brand-700)] text-sm font-bold text-white">
                    {item.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {item.author}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-white/55">
                      {item.role} · {item.company}
                    </p>
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-5 pb-12 sm:pb-16 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-[#1a1a3a] p-6 text-white sm:p-12">
              <div
                aria-hidden
                className="pointer-events-none absolute -top-24 -right-24 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,_rgba(124,124,200,0.45)_0%,_rgba(124,124,200,0)_70%)]"
              />
              <motion.div
                aria-hidden
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="pointer-events-none absolute -bottom-32 left-1/4 h-[300px] w-[60%] rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(91,91,179,0.5)_0%,_rgba(91,91,179,0)_70%)] blur-2xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:32px_32px]"
              />
              <div className="relative">
                <span className="brand-soft-chip inline-flex items-center gap-1.5 rounded-full border border-[var(--brand-300)]/30 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--brand-200)] backdrop-blur">
                  <TrendingUp size={12} />
                  Ready when you are
                </span>
                <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">
                  Replace operational chaos with a system{" "}
                  <span className="bg-gradient-to-r from-white via-[var(--brand-200)] to-[var(--brand-300)] bg-clip-text text-transparent">
                    built for growth
                  </span>
                  .
                </h2>
                <p className="mt-4 max-w-2xl text-base text-slate-300 dark:text-white/30 sm:text-lg">
                  Roll out Ordo across your team, run workflows live, and give
                  managers one operating model for customers and orders.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/login"
                    className="group inline-flex items-center gap-2 rounded-xl bg-white dark:bg-white/[0.03] px-6 py-3.5 text-sm font-semibold text-slate-900 dark:text-white shadow-[0_14px_30px_-12px_rgba(255,255,255,0.4)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-12px_rgba(255,255,255,0.5)] active:scale-[0.98]"
                  >
                    Start free
                    <ArrowRight
                      size={15}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                  <Link
                    href="/demo?next=%2Fapp%2Fcrm"
                    className="inline-flex items-center rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/10 active:scale-[0.98]"
                  >
                    Try demo
                  </Link>
                </div>
                <p className="mt-5 text-xs text-slate-400 dark:text-white/45">
                  No credit card required · 30-day trial on monthly · 14-day on yearly
                </p>
              </div>
            </div>
          </ScrollReveal>
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
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
        {title}
      </h2>
      <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-white/70 dark:text-white/65">
        {text}
      </p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:bg-white/[0.03] px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
      <p className="text-xl font-semibold leading-tight text-slate-900 dark:text-white">
        {value}
      </p>
      <p className="text-xs font-medium text-slate-500 dark:text-white/55">
        {label}
      </p>
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
      ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-300"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300"
        : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300";

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
      <div
        className={`mb-3 inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${toneClass}`}
      >
        {title}
      </div>
      <div className="space-y-2">
        {cards.map((card) => (
          <div
            key={card}
            className="rounded-lg border border-slate-200 bg-white dark:bg-white/[0.03] px-2.5 py-2 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/80"
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
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="mb-2 inline-flex rounded-md bg-white dark:bg-white/[0.03] p-1.5 text-slate-600 dark:bg-white/[0.06] dark:text-white/70">
        <Icon size={14} />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-white/55 dark:text-white/50">
        {label}
      </p>
      <p className="text-xl font-semibold text-slate-900 dark:text-white">
        {value}
      </p>
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
          ? "border-[var(--brand-300)] bg-[var(--brand-100)] text-[var(--brand-700)] dark:border-[var(--brand-500)]/50 dark:bg-[var(--brand-600)]/15 dark:text-[var(--brand-200)]"
          : "border-slate-200 text-slate-600 dark:text-white/70 hover:bg-slate-50 dark:hover:bg-white/[0.06] dark:border-white/10 dark:text-white/65 dark:hover:bg-white/[0.05] dark:hover:text-white"
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-white/55 dark:text-white/50">
            ORDER CARD
          </p>
          <p className="text-base font-semibold text-slate-900 dark:text-white">
            ORD-395 • Amal Bakery
          </p>
        </div>
        <span className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300">
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
    <div className="rounded-xl border border-slate-200 bg-white dark:bg-white/[0.03] p-3 dark:border-white/10 dark:bg-white/[0.05]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-white/55 dark:text-white/50">
        {title}
      </p>
      <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
        {value}
      </p>
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
    <motion.article
      variants={rowSlideIn}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="group relative rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-[var(--brand-300)] hover:shadow-[0_20px_40px_-20px_rgba(91,91,179,0.35)] dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-[var(--brand-500)]/40 dark:hover:shadow-[0_20px_40px_-20px_rgba(91,91,179,0.5)] sm:p-6"
    >
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand-100)] to-[var(--brand-200)] text-sm font-bold text-[var(--brand-700)] shadow-sm transition group-hover:from-[var(--brand-500)] group-hover:to-[var(--brand-700)] group-hover:text-white dark:from-[var(--brand-500)]/30 dark:to-[var(--brand-700)]/20 dark:text-[var(--brand-200)]">
        {number}
      </div>
      <p className="text-base font-semibold text-slate-900 dark:text-white">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-white/70 dark:text-white/65">{text}</p>
    </motion.article>
  );
}

function ScrollReveal({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function BentoCard({
  className = "",
  icon: Icon,
  eyebrow,
  title,
  description,
  children,
}: {
  className?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <motion.article
      variants={scrollFadeUp}
      whileHover={{ y: -3 }}
      className={`group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white/80 dark:bg-white/[0.05] p-6 backdrop-blur-xl transition hover:border-[var(--brand-300)] hover:shadow-[0_24px_60px_-30px_rgba(91,91,179,0.45)] dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-[var(--brand-500)]/40 dark:hover:shadow-[0_24px_60px_-30px_rgba(91,91,179,0.6)] sm:p-7 ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--brand-50)]/0 via-transparent to-[var(--brand-100)]/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 dark:from-[var(--brand-500)]/10 dark:to-[var(--brand-700)]/5"
      />
      <div className="relative">
        <div className="mb-4 inline-flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand-100)] to-[var(--brand-200)] text-[var(--brand-700)] shadow-sm dark:from-[var(--brand-500)]/30 dark:to-[var(--brand-700)]/20 dark:text-[var(--brand-200)]">
            <Icon size={17} />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-white/55 dark:text-white/50">
            {eyebrow}
          </p>
        </div>
        <h3 className="text-lg font-semibold leading-snug tracking-tight text-slate-900 dark:text-white sm:text-xl">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-white/70 dark:text-white/65">
          {description}
        </p>
      </div>
      {children ? <div className="relative mt-5 flex-1">{children}</div> : null}
    </motion.article>
  );
}

function BentoKanbanPreview() {
  return (
    <div className="grid gap-2 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/[0.04] sm:grid-cols-3">
      {[
        { title: "New", tone: "blue" as const, items: ["ORD-417", "ORD-422"] },
        {
          title: "In progress",
          tone: "amber" as const,
          items: ["ORD-395", "ORD-406"],
        },
        {
          title: "QA",
          tone: "emerald" as const,
          items: ["ORD-388", "ORD-392"],
        },
      ].map((col) => (
        <div key={col.title} className="space-y-2">
          <div
            className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${
              col.tone === "blue"
                ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-300"
                : col.tone === "amber"
                  ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300"
            }`}
          >
            {col.title}
          </div>
          {col.items.map((item) => (
            <div
              key={item}
              className="rounded-lg border border-slate-200 bg-white dark:bg-white/[0.03] px-2 py-1.5 text-[11px] font-medium text-slate-700 dark:text-white/80 shadow-sm transition hover:-translate-y-0.5 hover:shadow dark:border-white/10 dark:bg-white/[0.06] dark:text-white/85 dark:shadow-none"
            >
              {item}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function BentoCustomerPreview() {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-500)] to-[var(--brand-700)] text-xs font-bold text-white">
          AB
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
            Amal Bakery
          </p>
          <p className="truncate text-[10px] text-slate-500 dark:text-white/55">
            VIP · 12 orders
          </p>
        </div>
        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          ACTIVE
        </span>
      </div>
      <div className="mt-3 space-y-1.5">
        {[
          { label: "Last order", value: "ORD-395" },
          { label: "LTV", value: "£14,280" },
          { label: "Stage", value: "Negotiation" },
        ].map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between rounded-lg bg-white dark:bg-white/[0.03] px-2 py-1.5 text-[11px] dark:bg-white/[0.06]"
          >
            <span className="text-slate-500 dark:text-white/55">{row.label}</span>
            <span className="font-semibold text-slate-800 dark:text-white/90">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BentoAnalyticsPreview() {
  const bars = [38, 62, 45, 78, 55, 92, 68];
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold text-slate-700 dark:text-white/80">
          Conversion
        </p>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-300">
          <TrendingUp size={11} />
          +18%
        </span>
      </div>
      <div className="flex h-20 items-end gap-1.5">
        {bars.map((h, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            whileInView={{ height: `${h}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
            className="flex-1 rounded-t bg-gradient-to-t from-[var(--brand-500)] to-[var(--brand-300)]"
          />
        ))}
      </div>
    </div>
  );
}

function BentoTeamPreview() {
  const members = [
    { initials: "ER", color: "from-pink-400 to-rose-500" },
    { initials: "JW", color: "from-blue-400 to-indigo-500" },
    { initials: "SM", color: "from-emerald-400 to-teal-500" },
    { initials: "AK", color: "from-amber-400 to-orange-500" },
  ];
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-center -space-x-2">
        {members.map((m) => (
          <div
            key={m.initials}
            className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br ${m.color} text-[10px] font-bold text-white shadow-sm dark:border-[#0F0F1B]`}
          >
            {m.initials}
          </div>
        ))}
        <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-slate-100 dark:bg-white/[0.06] text-[10px] font-bold text-slate-600 shadow-sm dark:border-[#0F0F1B] dark:bg-white/[0.08] dark:text-white/70">
          +6
        </div>
      </div>
      <div className="mt-3 rounded-lg bg-white dark:bg-white/[0.03] p-2 text-[11px] dark:bg-white/[0.06]">
        <p className="font-semibold text-slate-800 dark:text-white/90">
          Emma → ORD-395
        </p>
        <p className="text-slate-500 dark:text-white/55">Assigned · due today 18:00</p>
      </div>
    </div>
  );
}

function BentoAutomationPreview() {
  return (
    <div className="space-y-2 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/[0.04]">
      {[
        { trigger: "Order → New", action: "Notify manager", icon: Zap },
        { trigger: "SLA breached", action: "Alert owner", icon: BarChart3 },
        { trigger: "Status → Done", action: "Email customer", icon: CheckCircle2 },
      ].map((rule) => (
        <div
          key={rule.trigger}
          className="flex items-center gap-2 rounded-lg bg-white dark:bg-white/[0.03] px-2 py-1.5 text-[11px] dark:bg-white/[0.06]"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded bg-[var(--brand-100)] text-[var(--brand-700)] dark:bg-[var(--brand-600)]/25 dark:text-[var(--brand-200)]">
            <rule.icon size={11} />
          </div>
          <span className="font-medium text-slate-700 dark:text-white/80 dark:text-white/85">{rule.trigger}</span>
          <ArrowRight size={10} className="text-slate-400 dark:text-white/45 dark:text-white/40" />
          <span className="text-slate-500 dark:text-white/55">{rule.action}</span>
        </div>
      ))}
    </div>
  );
}
