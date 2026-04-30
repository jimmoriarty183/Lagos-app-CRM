"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "motion/react";
import {
  ArrowRight,
  Building2,
  Calendar,
  CalendarCheck,
  Check,
  ClipboardCheck,
  Copy,
  CreditCard,
  Droplets,
  FileSpreadsheet,
  Home,
  Inbox,
  KeyRound,
  LayoutDashboard,
  MessagesSquare,
  Network,
  RefreshCw,
  Send,
  Sparkles,
  SprayCan,
  Tag,
  Users,
  Wrench,
} from "lucide-react";
import { BrandIcon, BrandLockup } from "@/components/Brand";

const SIGNUP_HREF = "/login?mode=register";
const PROMO_CODE = "FOUNDING50";

type BillingCycle = "monthly" | "yearly";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const pains = [
  {
    icon: MessagesSquare,
    title: "Jobs lost in group chats",
    body: "Customer requests buried in WhatsApp. Someone misses a job. You find out when the client calls angry.",
  },
  {
    icon: FileSpreadsheet,
    title: "Spreadsheets that break",
    body: "Your booking sheet works until it doesn't. One wrong formula and the whole week is a mess.",
  },
  {
    icon: Wrench,
    title: "No idea where your team is",
    body: 'Chasing updates from cleaners all day. "Did you finish that job?" "Did the customer pay?"',
  },
  {
    icon: Users,
    title: "Customers fall through the cracks",
    body: "No follow-ups, no reminders, no repeat bookings. You're leaving money on the table every week.",
  },
];

const useCases = [
  {
    icon: Home,
    title: "Residential & domestic",
    body: "Weekly, fortnightly and one-off home cleans with recurring schedules and customer history per address.",
  },
  {
    icon: KeyRound,
    title: "End-of-tenancy & deep cleans",
    body: "One-off jobs with checklists, photo proof and quick turnaround scheduling for letting agents.",
  },
  {
    icon: Building2,
    title: "Office & commercial contracts",
    body: "Long-running contracts, multiple sites per client, recurring invoices and team rotas in one view.",
  },
  {
    icon: SprayCan,
    title: "Carpet, upholstery & specialists",
    body: "Per-service catalogue with pricing, materials and time estimates — quote in seconds, schedule in one click.",
  },
  {
    icon: Network,
    title: "Multi-site teams & franchises",
    body: "Run up to 10 separate businesses from one Ordo workspace. Roll up reporting, isolate per-location data.",
  },
  {
    icon: Droplets,
    title: "Window, gutter & exterior",
    body: "Route the day around postcodes, attach property notes (gate codes, dog at home, ladder access) to every job.",
  },
];

const features = [
  {
    icon: Calendar,
    title: "Job Management",
    body: "Create, assign and track every job from one dashboard. Recurring schedules, custom statuses, kanban view.",
  },
  {
    icon: Users,
    title: "Customer Records",
    body: "Every client in one place — contact info, address, access notes, full job history and outstanding balances.",
  },
  {
    icon: Wrench,
    title: "Team Execution",
    body: "Assign jobs to your cleaners, track status in real time, see who's free this afternoon at a glance.",
  },
  {
    icon: Send,
    title: "Inbox & Campaigns",
    body: "Send updates, reminders and seasonal offers to your customer list — without leaving the system.",
  },
  {
    icon: CreditCard,
    title: "Billing & Subscriptions",
    body: "Built-in billing for one-off invoices and recurring contracts. UK VAT handled at checkout.",
  },
  {
    icon: LayoutDashboard,
    title: "Admin Dashboard",
    body: "Your business at a glance — jobs scheduled today, revenue this week, follow-ups falling through.",
  },
];

const workflow = [
  {
    icon: Inbox,
    title: "New booking lands",
    body: "Web form, phone call or message — every request becomes an Ordo job. Nothing buried in a group chat.",
  },
  {
    icon: CalendarCheck,
    title: "You assign and schedule",
    body: "Pick the cleaner, set the time, attach the address and access notes. Recurring? Set it once, Ordo regenerates.",
  },
  {
    icon: ClipboardCheck,
    title: "Your team executes",
    body: "Cleaners see today's jobs on mobile, update status as they work, attach photos when the job is done.",
  },
  {
    icon: RefreshCw,
    title: "Customer billed and re-booked",
    body: "Invoice goes out, follow-up reminder books the next visit. Repeat business runs on autopilot.",
  },
];

const faqs = [
  {
    q: "Do you handle recurring contracts and weekly / fortnightly cleans?",
    a: "Yes — set a recurrence on any job and Ordo regenerates it on schedule. Every visit ties back to the same customer record so you always see the full history.",
  },
  {
    q: "Can my cleaners use Ordo on their phones?",
    a: "Yes — Ordo is mobile-first. Cleaners sign in on any phone or tablet, see their jobs for the day, and update status in real time. No separate app to install.",
  },
  {
    q: "We're moving from a WhatsApp group and a Google Sheet. How long does set-up take?",
    a: "Most teams are running in under an hour. Add your clients, set your service catalogue, invite your cleaners. Larger client lists can be imported from CSV on the Pro plan.",
  },
  {
    q: "Does Ordo handle invoicing and recurring payments?",
    a: "Yes — built-in billing covers one-off invoices and recurring subscriptions. Works for residential clients on monthly contracts as well as one-off deep cleans.",
  },
  {
    q: "Is it suitable for a single cleaner running their own round?",
    a: "Solo (£8/month) is built exactly for that — one user, one business, full CRM, follow-ups and invoicing. Upgrade later as you hire.",
  },
  {
    q: "Are prices in GBP and do they include VAT?",
    a: "Prices on this page are in GBP excluding VAT. UK VAT (20%) is added at checkout where applicable.",
  },
  {
    q: "How does the free trial work, and what's FOUNDING50?",
    a: "Trial first: 30 days free on monthly billing or 13 days on yearly. You're not charged until the trial ends. When you upgrade within the founding window, FOUNDING50 takes 50% off your first paid invoice — first 10 UK cleaning businesses only.",
  },
];

type Plan = {
  name: string;
  monthly: { regular: number; promo: number };
  yearly: { regular: number; promo: number };
  seats: string;
  description: string;
  features: string[];
  cta: string;
  featured?: boolean;
  badge?: string;
};

const plans: Plan[] = [
  {
    name: "Solo",
    monthly: { regular: 12, promo: 8 },
    yearly: { regular: 120, promo: 80 },
    seats: "1 user · 1 business",
    description:
      "For one-person operators getting organised for the first time.",
    features: [
      "CRM (orders + kanban)",
      "Filters & search",
      "Custom statuses",
      "Basic inbox",
      "Today & follow-ups",
    ],
    cta: "Start with Solo",
  },
  {
    name: "Starter",
    monthly: { regular: 49, promo: 39 },
    yearly: { regular: 490, promo: 390 },
    seats: "Up to 5 users · 2 businesses",
    description:
      "For small cleaning crews that need to share jobs and stop dropping the ball.",
    features: [
      "Everything in Solo",
      "Full inbox & campaigns",
      "Team management",
      "Basic support workflow",
      "Recurring contracts",
      "Multi-cleaner scheduling",
    ],
    cta: "Claim founding offer",
    featured: true,
    badge: "Most popular",
  },
  {
    name: "Pro",
    monthly: { regular: 99, promo: 79 },
    yearly: { regular: 990, promo: 790 },
    seats: "Up to 10 users · 5 businesses",
    description:
      "For growing cleaning businesses that need manager dashboards and KPI visibility.",
    features: [
      "Everything in Starter",
      "Manager dashboards",
      "KPI tracking",
      "Productivity analytics",
      "Alerts",
      "Export clients & products",
    ],
    cta: "Start with Pro",
  },
  {
    name: "Business",
    monthly: { regular: 179, promo: 149 },
    yearly: { regular: 1790, promo: 1490 },
    seats: "Up to 20 users · 10 businesses",
    description:
      "For multi-location operations and franchises that need full operational control.",
    features: [
      "Everything in Pro",
      "Risk score",
      "Full support workflow",
      "Priority support",
      "Import from CSV",
      "Audit log",
    ],
    cta: "Start with Business",
  },
];

function Section({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={[
        "mx-auto w-full max-w-6xl px-5 sm:px-8",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </section>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--brand-300)]">
      {children}
    </p>
  );
}

function PromoCodeChip() {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(PROMO_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="group inline-flex items-center gap-2 rounded-lg border border-[var(--brand-500)]/40 bg-[var(--brand-600)]/15 px-3 py-2 font-mono text-sm font-semibold tracking-[0.08em] text-white transition hover:border-[var(--brand-500)]/70 hover:bg-[var(--brand-600)]/25"
      aria-label={`Copy promo code ${PROMO_CODE}`}
    >
      <Tag className="h-4 w-4 text-[var(--brand-300)]" aria-hidden />
      {PROMO_CODE}
      {copied ? (
        <span className="inline-flex items-center gap-1 rounded-md bg-[var(--brand-500)]/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
          <Check className="h-3 w-3" aria-hidden /> Copied
        </span>
      ) : (
        <Copy
          className="h-3.5 w-3.5 text-white/55 transition group-hover:text-white"
          aria-hidden
        />
      )}
    </button>
  );
}

export function CleaningLanding() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const trialDays = billingCycle === "monthly" ? 30 : 13;

  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-hidden bg-[#0B0B14] text-white">
      {/* Brand glow background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[680px] bg-[radial-gradient(900px_420px_at_50%_-10%,rgba(91,91,179,0.45)_0%,rgba(91,91,179,0)_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,#0B0B14_0%,#0B0B14_60%,#0E0E1B_100%)]"
      />

      {/* Top nav */}
      <header className="relative z-10 border-b border-white/5">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" aria-label="Ordo home" className="flex items-center">
            <BrandLockup iconSize={28} />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/pricing"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition hover:text-white sm:inline-flex"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition hover:text-white sm:inline-flex"
            >
              Log in
            </Link>
            <Link
              href={SIGNUP_HREF}
              className="inline-flex h-10 items-center rounded-lg bg-white px-4 text-sm font-semibold text-[#0B0B14] transition hover:bg-white/90"
            >
              Start free
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1">
        {/* HERO */}
        <Section className="pt-14 pb-20 sm:pt-20 sm:pb-28">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="mx-auto max-w-3xl text-center"
          >
            <motion.span
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-500)]/30 bg-[var(--brand-500)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-200)]"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Built for UK cleaning businesses
            </motion.span>

            <motion.h1
              variants={fadeUp}
              className="mt-6 text-[34px] font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:text-[56px] sm:leading-[1.02]"
            >
              Stop managing jobs on WhatsApp.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg"
            >
              Ordo gives your cleaning business one place for jobs, customers
              and team — so you stop losing hours to spreadsheets and group
              chats.
            </motion.p>

            <motion.div
              variants={fadeUp}
              className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
            >
              <Link
                href={SIGNUP_HREF}
                className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-600)] px-6 text-sm font-semibold text-white shadow-[0_12px_32px_-12px_rgba(91,91,179,0.9)] transition hover:bg-[var(--brand-500)] sm:w-auto"
              >
                Start your free trial
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-white/15 bg-white/[0.03] px-6 text-sm font-semibold text-white/90 transition hover:border-white/25 hover:bg-white/[0.06] sm:w-auto"
              >
                See how it works ↓
              </a>
            </motion.div>

            <motion.ul
              variants={fadeUp}
              className="mt-7 flex flex-wrap items-center justify-center gap-2 text-xs sm:gap-3 sm:text-sm"
            >
              {[
                "30-day trial on monthly",
                "13-day trial on yearly",
                "50% off with FOUNDING50",
                "Cancel anytime",
              ].map((perk) => (
                <li
                  key={perk}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-white/80"
                >
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full bg-[var(--brand-300)]"
                  />
                  {perk}
                </li>
              ))}
            </motion.ul>
          </motion.div>
        </Section>

        {/* PAIN */}
        <Section id="how-it-works" className="py-20 sm:py-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="mx-auto max-w-3xl text-center"
          >
            <motion.div variants={fadeUp}>
              <Eyebrow>Sound familiar?</Eyebrow>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="mt-4 text-3xl font-semibold leading-[1.15] tracking-[-0.02em] sm:text-4xl"
            >
              Running a cleaning business shouldn&apos;t feel like this.
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            {pains.map((pain) => {
              const Icon = pain.icon;
              return (
                <motion.article
                  key={pain.title}
                  variants={fadeUp}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/20 hover:bg-white/[0.05]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-600)]/15 text-[var(--brand-300)]">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">
                    {pain.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">
                    {pain.body}
                  </p>
                </motion.article>
              );
            })}
          </motion.div>
        </Section>

        {/* USE CASES */}
        <Section className="py-20 sm:py-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="mx-auto max-w-3xl text-center"
          >
            <motion.div variants={fadeUp}>
              <Eyebrow>Built for every kind of UK cleaning business</Eyebrow>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="mt-4 text-3xl font-semibold leading-[1.15] tracking-[-0.02em] sm:text-4xl"
            >
              If you clean for a living, Ordo fits.
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="mx-auto mt-4 max-w-2xl text-base text-white/65"
            >
              Whether it&apos;s residential rounds, commercial contracts or
              specialist services — the same workspace handles every job type
              with the right structure for each.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {useCases.map((useCase) => {
              const Icon = useCase.icon;
              return (
                <motion.article
                  key={useCase.title}
                  variants={fadeUp}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-[var(--brand-500)]/40 hover:bg-white/[0.05]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-600)]/15 text-[var(--brand-300)]">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">
                    {useCase.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">
                    {useCase.body}
                  </p>
                </motion.article>
              );
            })}
          </motion.div>
        </Section>

        {/* FEATURES */}
        <Section className="py-20 sm:py-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="mx-auto max-w-3xl text-center"
          >
            <motion.div variants={fadeUp}>
              <Eyebrow>What Ordo does</Eyebrow>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="mt-4 text-3xl font-semibold leading-[1.15] tracking-[-0.02em] sm:text-4xl"
            >
              Everything your cleaning business needs.{" "}
              <span className="text-white/55">Nothing it doesn&apos;t.</span>
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.article
                  key={feature.title}
                  variants={fadeUp}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-[var(--brand-500)]/40 hover:bg-white/[0.06]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand-500)]/30 to-[var(--brand-700)]/20 text-[var(--brand-200)]">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">
                    {feature.body}
                  </p>
                </motion.article>
              );
            })}
          </motion.div>
        </Section>

        {/* WORKFLOW */}
        <Section className="py-20 sm:py-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="mx-auto max-w-3xl text-center"
          >
            <motion.div variants={fadeUp}>
              <Eyebrow>A day with Ordo</Eyebrow>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="mt-4 text-3xl font-semibold leading-[1.15] tracking-[-0.02em] sm:text-4xl"
            >
              How a job flows through Ordo.
            </motion.h2>
          </motion.div>

          <motion.ol
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {workflow.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.li
                  key={step.title}
                  variants={fadeUp}
                  className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/20"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-600)]/15 text-[var(--brand-300)]">
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
                      Step {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">
                    {step.body}
                  </p>
                </motion.li>
              );
            })}
          </motion.ol>
        </Section>

        {/* PRICING */}
        <Section id="pricing" className="py-20 sm:py-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="mx-auto max-w-3xl text-center"
          >
            <motion.div variants={fadeUp}>
              <Eyebrow>Pricing</Eyebrow>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="mt-4 text-3xl font-semibold leading-[1.15] tracking-[-0.02em] sm:text-4xl"
            >
              Simple, honest pricing.
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="mx-auto mt-4 max-w-xl text-base text-white/65"
            >
              {trialDays}-day free trial on{" "}
              {billingCycle === "monthly" ? "monthly" : "yearly"} billing.
              Cancel any time before the trial ends — you won&apos;t be charged.
            </motion.p>

            {/* Billing toggle */}
            <motion.div
              variants={fadeUp}
              className="mt-7 inline-flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5"
              role="tablist"
              aria-label="Billing cycle"
            >
              {(["monthly", "yearly"] as const).map((cycle) => {
                const active = billingCycle === cycle;
                return (
                  <button
                    key={cycle}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setBillingCycle(cycle)}
                    className={[
                      "inline-flex h-9 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition",
                      active
                        ? "bg-white text-[#0B0B14] shadow-sm"
                        : "text-white/65 hover:text-white",
                    ].join(" ")}
                  >
                    {cycle === "monthly" ? "Monthly" : "Yearly"}
                    {cycle === "yearly" ? (
                      <span
                        className={[
                          "rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em]",
                          active
                            ? "bg-[var(--brand-600)]/15 text-[var(--brand-700)]"
                            : "bg-white/10 text-white/70",
                        ].join(" ")}
                      >
                        2 months free
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </motion.div>
          </motion.div>

          {/* Promo banner */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-[var(--brand-500)]/30 bg-gradient-to-r from-[var(--brand-700)]/25 via-[var(--brand-600)]/10 to-transparent p-5 sm:flex-row sm:p-6"
          >
            <div className="flex items-start gap-3 text-left">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-600)]/25 text-[var(--brand-200)]">
                <Sparkles className="h-4 w-4" aria-hidden />
              </div>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--brand-200)]">
                  Founding offer · first 10 customers
                </p>
                <p className="mt-1 text-sm leading-relaxed text-white/85 sm:text-base">
                  50% off your first paid invoice when you upgrade with code{" "}
                  <span className="font-mono font-semibold text-white">
                    {PROMO_CODE}
                  </span>
                  .
                </p>
              </div>
            </div>
            <PromoCodeChip />
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {plans.map((plan) => {
              const cycle = plan[billingCycle];
              const period = billingCycle === "monthly" ? "/month" : "/year";
              return (
                <motion.article
                  key={plan.name}
                  variants={fadeUp}
                  className={[
                    "relative flex flex-col rounded-2xl border p-7 transition",
                    plan.featured
                      ? "border-[var(--brand-500)]/60 bg-gradient-to-b from-[var(--brand-600)]/12 to-white/[0.02] shadow-[0_24px_60px_-30px_rgba(91,91,179,0.7)]"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20",
                  ].join(" ")}
                >
                  {plan.badge ? (
                    <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[var(--brand-600)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white shadow-lg shadow-[var(--brand-600)]/40">
                      <Sparkles className="h-3 w-3" aria-hidden />
                      {plan.badge}
                    </span>
                  ) : null}

                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      {plan.name}
                    </h3>
                    <p className="mt-2 min-h-[72px] text-sm leading-relaxed text-white/60">
                      {plan.description}
                    </p>
                  </div>

                  <div className="mt-5">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="text-4xl font-semibold tracking-[-0.02em] text-white sm:text-[40px]">
                        £{cycle.promo}
                      </span>
                      <span className="text-base font-medium text-white/55">
                        {period}
                      </span>
                      <span className="font-mono text-xs font-medium text-white/40 line-through">
                        £{cycle.regular}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-white/45">
                      + VAT · {plan.seats}
                    </p>
                    {billingCycle === "yearly" ? (
                      <p className="mt-1 text-xs font-medium text-[var(--brand-200)]">
                        £{Math.round((cycle.promo / 12) * 100) / 100}/month,
                        billed annually
                      </p>
                    ) : null}
                  </div>

                  <ul className="mt-6 flex-1 space-y-2.5 text-sm text-white/85">
                    {plan.features.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <Check
                          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-300)]"
                          aria-hidden
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-7 space-y-2">
                    <Link
                      href={SIGNUP_HREF}
                      className={[
                        "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition",
                        plan.featured
                          ? "bg-[var(--brand-600)] text-white shadow-[0_12px_30px_-12px_rgba(91,91,179,0.9)] hover:bg-[var(--brand-500)]"
                          : "border border-white/15 bg-white/[0.04] text-white hover:border-white/30 hover:bg-white/[0.07]",
                      ].join(" ")}
                    >
                      {plan.cta}
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                    <p className="text-center font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
                      Start with {trialDays}-day trial · Apply {PROMO_CODE}{" "}
                      at checkout
                    </p>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        </Section>

        {/* FAQ */}
        <Section className="py-20 sm:py-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="mx-auto max-w-3xl text-center"
          >
            <motion.div variants={fadeUp}>
              <Eyebrow>FAQ</Eyebrow>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="mt-4 text-3xl font-semibold leading-[1.15] tracking-[-0.02em] sm:text-4xl"
            >
              Questions cleaning business owners ask.
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {faqs.map((faq) => (
              <motion.details
                key={faq.q}
                variants={fadeUp}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition open:border-[var(--brand-500)]/40 open:bg-white/[0.05]"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-left text-base font-semibold text-white">
                  <span>{faq.q}</span>
                  <span
                    aria-hidden
                    className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/70 transition group-open:rotate-45 group-open:border-[var(--brand-500)]/60 group-open:text-[var(--brand-200)]"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-white/65">
                  {faq.a}
                </p>
              </motion.details>
            ))}
          </motion.div>
        </Section>

        {/* CTA STRIP */}
        <Section className="pb-24 pt-8 sm:pb-32">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="relative overflow-hidden rounded-3xl border border-[var(--brand-500)]/30 bg-gradient-to-br from-[var(--brand-700)]/30 via-[#0B0B14] to-[#0B0B14] px-6 py-12 text-center sm:px-12 sm:py-16"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_200px_at_50%_-10%,rgba(91,91,179,0.55)_0%,rgba(91,91,179,0)_70%)]"
            />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-200)]">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Limited launch offer
              </div>
              <h2 className="mt-5 text-3xl font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[44px]">
                First 10 UK cleaning businesses get 50% off.
                <br className="hidden sm:block" />{" "}
                <span className="text-[var(--brand-200)]">
                  Are you one of them?
                </span>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
                Start with a {trialDays}-day free trial on{" "}
                {billingCycle === "monthly" ? "monthly" : "yearly"} billing.
                Apply code{" "}
                <span className="font-mono font-semibold text-white">
                  {PROMO_CODE}
                </span>{" "}
                at checkout for 50% off your first paid invoice.
              </p>
              <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href={SIGNUP_HREF}
                  className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-[#0B0B14] transition hover:bg-white/90 sm:w-auto"
                >
                  Claim your spot
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
                <PromoCodeChip />
              </div>
              <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.12em] text-white/55">
                Cancel anytime · UK VAT handled at checkout
              </p>
            </div>
          </motion.div>
        </Section>
      </main>

      <DarkFooter />
    </div>
  );
}

const legalLinks = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refund", label: "Refund Policy" },
];

function DarkFooter() {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-[#0B0B14]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-6 sm:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-3">
              <BrandIcon size={30} />
              <p className="text-base font-semibold tracking-tight text-white">
                Ordo
              </p>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-white/60">
              CRM for managing orders and customers
            </p>
          </div>

          <nav
            aria-label="Legal and contact links"
            className="flex flex-wrap items-center gap-x-4 gap-y-2 md:justify-end"
          >
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-white/65 transition-colors hover:text-[var(--brand-200)]"
              >
                {link.label}
              </Link>
            ))}
            <span className="hidden text-white/20 md:inline" aria-hidden>
              |
            </span>
            <a
              href="mailto:support@ordo.uno"
              className="text-sm font-medium text-white/65 transition-colors hover:text-[var(--brand-200)]"
            >
              support@ordo.uno
            </a>
          </nav>
        </div>

        <div className="border-t border-white/10 pt-3 text-xs font-medium text-white/50">
          © 2026 ORDO
        </div>
      </div>
    </footer>
  );
}
