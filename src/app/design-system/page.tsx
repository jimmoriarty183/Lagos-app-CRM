import type { ReactNode } from "react";

import {
  ArrowRight,
  Bell,
  CalendarDays,
  ChevronRight,
  CircleAlert,
  CreditCard,
  LayoutGrid,
  Menu,
  Search,
  Settings,
  Shield,
  Sparkles,
  User,
  Zap,
} from "lucide-react";

import { BrandIcon, BrandLockup } from "@/components/Brand";

const colors = [
  ["--brand-50", "#F7F7FC"],
  ["--brand-100", "#EDEDF9"],
  ["--brand-200", "#DCDCF3"],
  ["--brand-300", "#C4C4E8"],
  ["--brand-400", "#A8A8DA"],
  ["--brand-500", "#7C7CC8"],
  ["--brand-600", "#5B5BB3"],
  ["--brand-700", "#4444A0"],
  ["--brand-800", "#333387"],
  ["--brand-900", "#262670"],
  ["--neutral-50", "#FAFBFC"],
  ["--neutral-100", "#F5F6F7"],
  ["--neutral-200", "#EBEDEF"],
  ["--neutral-300", "#DFE1E4"],
  ["--neutral-400", "#B8BCC3"],
  ["--neutral-500", "#868C98"],
  ["--neutral-600", "#5F6672"],
  ["--neutral-700", "#3F4651"],
  ["--neutral-800", "#262B35"],
  ["--neutral-900", "#0F1419"],
];

const spacing = [
  ["--space-1", "4px"],
  ["--space-2", "8px"],
  ["--space-3", "12px"],
  ["--space-4", "16px"],
  ["--space-5", "20px"],
  ["--space-6", "24px"],
  ["--space-8", "32px"],
  ["--space-10", "40px"],
  ["--space-12", "48px"],
  ["--space-16", "64px"],
];

function Section({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-8 rounded-[20px] border border-[var(--neutral-200)] bg-white p-6 shadow-[var(--shadow-sm)] md:p-8">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--neutral-500)]">
          {eyebrow}
        </p>
        <h2>{title}</h2>
        <p className="max-w-3xl text-[var(--neutral-600)]">{body}</p>
      </div>
      {children}
    </section>
  );
}

function Swatch({ token, value }: { token: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-[var(--neutral-200)] bg-white p-4 shadow-[var(--shadow-xs)]">
      <div
        className="mb-4 h-20 rounded-[12px] border border-[color:color-mix(in_srgb,var(--neutral-200)_70%,transparent)]"
        style={{ backgroundColor: value }}
      />
      <p className="text-sm font-medium text-[var(--neutral-900)]">{token}</p>
      <p className="text-sm text-[var(--neutral-500)]">{value}</p>
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 md:px-8 md:py-10 xl:px-16">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8">
        <section className="overflow-hidden rounded-[28px] border border-[var(--neutral-200)] bg-white shadow-[var(--shadow-sm)]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--neutral-200)] px-6 py-5 md:px-8">
            <BrandLockup iconSize={40} textClassName="text-[2rem]" />
            <div className="flex flex-wrap items-center gap-3">
              <button className="brand-secondary-btn inline-flex h-11 items-center gap-2 px-5 text-[15px] transition-all duration-200">
                <Bell size={18} />
                Updates
              </button>
              <button className="brand-primary-btn inline-flex h-11 items-center gap-2 px-5 text-[15px] font-medium transition-all duration-200">
                <Sparkles size={18} />
                Launch Ordo
              </button>
            </div>
          </div>
          <div className="grid gap-8 px-6 py-8 md:grid-cols-[1.35fr_0.95fr] md:px-8 md:py-10">
            <div className="space-y-6">
              <span className="inline-flex items-center rounded-full border border-[var(--brand-200)] bg-[var(--brand-50)] px-3 py-1 text-xs font-medium text-[var(--brand-700)]">
                ZIP source integrated into d:\lagos-mvp
              </span>
              <div className="space-y-4">
                <h1>Ordo Design System</h1>
                <p className="max-w-2xl text-lg text-[var(--neutral-600)]">
                  This page brings the design-system source from the ZIP into
                  the local Next.js project and applies the same premium Ordo
                  language to the live app shell.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ["Brand assets", "Logo, icon, favicon, wordmark"],
                  ["Foundation", "Colors, typography, spacing"],
                  ["UI patterns", "Buttons, forms, cards, icons"],
                ].map(([title, copy]) => (
                  <div
                    key={title}
                    className="rounded-[16px] border border-[var(--neutral-200)] bg-[var(--neutral-50)] p-5"
                  >
                    <p className="mb-2 text-sm font-medium text-[var(--neutral-900)]">
                      {title}
                    </p>
                    <p className="text-sm text-[var(--neutral-600)]">{copy}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[24px] border border-[var(--neutral-200)] bg-[linear-gradient(180deg,#FFFFFF_0%,#F7F7FC_100%)] p-5 shadow-[var(--shadow-sm)]">
              <div className="rounded-[20px] border border-[var(--neutral-200)] bg-white p-4">
                <div className="flex items-center justify-between border-b border-[var(--neutral-200)] pb-4">
                  <BrandLockup iconSize={32} textClassName="text-[1.6rem]" />
                  <div className="inline-flex items-center gap-2 rounded-full border border-[var(--neutral-200)] px-3 py-2 text-sm text-[var(--neutral-600)]">
                    <CalendarDays size={16} />
                    March release
                  </div>
                </div>
                <div className="mt-5 grid gap-4">
                  {[
                    [
                      "Muted premium palette",
                      "Brand-600 plus neutral scale from the ZIP theme file.",
                    ],
                    [
                      "Geist typography",
                      "Heading tracking, body rhythm, mono styles.",
                    ],
                    [
                      "Enterprise primitives",
                      "Buttons, cards, forms, states, and spacing scale.",
                    ],
                  ].map(([title, copy], index) => (
                    <div
                      key={title}
                      className="flex items-start gap-4 rounded-[16px] border border-[var(--neutral-200)] p-4"
                    >
                      <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--brand-50)] text-[var(--brand-700)]">
                        {index === 0 ? (
                          <LayoutGrid size={18} />
                        ) : index === 1 ? (
                          <Zap size={18} />
                        ) : (
                          <Shield size={18} />
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-[var(--neutral-900)]">
                          {title}
                        </p>
                        <p className="text-sm text-[var(--neutral-600)]">
                          {copy}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <Section
          eyebrow="Brand"
          title="Logo and favicon"
          body="The live site now uses the square-grid mark from the ZIP as the source of truth. Compact slots use the icon mark; larger surfaces use the lockup."
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-[18px] border border-[var(--neutral-200)] bg-[var(--neutral-50)] p-8">
              <p className="mb-5 text-sm font-medium text-[var(--neutral-900)]">
                Primary lockup
              </p>
              <BrandLockup iconSize={48} textClassName="text-[2.5rem]" />
            </div>
            <div className="rounded-[18px] border border-[var(--neutral-200)] bg-[#0F1419] p-8">
              <p className="mb-5 text-sm font-medium text-white/90">
                On dark surfaces
              </p>
              <div className="inline-flex items-center gap-3">
                <BrandIcon size={48} className="shadow-[var(--shadow-sm)]" />
                <span className="text-[2.5rem] font-semibold tracking-[-0.03em] text-white">
                  Ordo
                </span>
              </div>
            </div>
          </div>
        </Section>

        <Section
          eyebrow="Foundation"
          title="Color palette"
          body="These tokens come from the ZIP theme and are now the baseline palette for the local project."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {colors.map(([token, value]) => (
              <Swatch key={token} token={token} value={value} />
            ))}
          </div>
        </Section>

        <Section
          eyebrow="Foundation"
          title="Typography"
          body="Geist is the primary family, with tighter tracking on headings and neutral body copy to keep the product premium and clear."
        >
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              <h1>Heading one for product hero states</h1>
              <h2>Heading two for section structure</h2>
              <h3>Heading three for nested content groups</h3>
              <h4>Heading four for cards and panels</h4>
              <p>
                Body copy uses the neutral scale and comfortable line height
                from the ZIP prompt. The result is quieter than the original
                local styling and closer to a premium B2B SaaS surface.
              </p>
            </div>
            <div className="rounded-[18px] border border-[var(--neutral-200)] bg-[var(--neutral-50)] p-6">
              <p className="mb-3 text-sm font-medium text-[var(--neutral-900)]">
                Geist Mono
              </p>
              <code className="block rounded-[12px] border border-[var(--neutral-200)] bg-white p-4 text-sm text-[var(--neutral-700)]">
                font-family: "Geist Mono", monospace;
                <br />
                letter-spacing: -0.01em;
                <br />
                color: var(--neutral-900);
              </code>
            </div>
          </div>
        </Section>

        <Section
          eyebrow="Foundation"
          title="Spacing and layout"
          body="A 4px base scale from the ZIP now drives the layout rhythm. The page container stays within a 1200px maximum width."
        >
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3">
              {spacing.map(([token, value]) => (
                <div
                  key={token}
                  className="flex items-center justify-between rounded-[14px] border border-[var(--neutral-200)] bg-white px-4 py-3"
                >
                  <span className="text-sm font-medium text-[var(--neutral-900)]">
                    {token}
                  </span>
                  <span className="text-sm text-[var(--neutral-600)]">
                    {value}
                  </span>
                </div>
              ))}
            </div>
            <div className="rounded-[18px] border border-[var(--neutral-200)] bg-white p-6">
              <div className="grid grid-cols-12 gap-4">
                {Array.from({ length: 12 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex h-20 items-end justify-center rounded-[12px] bg-[var(--brand-50)] pb-3 text-xs font-medium text-[var(--brand-700)]"
                  >
                    {index + 1}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-[var(--neutral-600)]">
                Twelve-column grid with `var(--space-6)` gaps for product
                dashboards and settings surfaces.
              </p>
            </div>
          </div>
        </Section>

        <Section
          eyebrow="Components"
          title="Buttons, forms, and cards"
          body="These patterns mirror the ZIP guidance and can be reused across the local product."
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6 rounded-[18px] border border-[var(--neutral-200)] bg-white p-6">
              <div className="flex flex-wrap gap-3">
                <button className="brand-primary-btn inline-flex h-11 items-center gap-2 px-5 text-[15px] font-medium transition-all duration-200">
                  <ArrowRight size={18} />
                  Primary
                </button>
                <button className="brand-secondary-btn inline-flex h-11 items-center gap-2 px-5 text-[15px] font-medium transition-all duration-200">
                  <CreditCard size={18} />
                  Secondary
                </button>
                <button className="brand-ghost-btn inline-flex h-11 items-center gap-2 px-5 text-[15px] font-medium transition-all duration-200">
                  <Settings size={18} />
                  Ghost
                </button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="search-field">Search</label>
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--neutral-400)]"
                      size={18}
                    />
                    <input
                      id="search-field"
                      placeholder="Name, phone, or company"
                      className="h-11 w-full rounded-[10px] border border-[var(--neutral-300)] bg-white pl-11 pr-4 text-[15px] text-[var(--neutral-900)] outline-none transition-all duration-200 placeholder:text-[var(--neutral-400)] focus:border-[var(--brand-600)] focus:ring-[3px] focus:ring-[var(--brand-100)]"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="notes-field">Notes</label>
                  <textarea
                    id="notes-field"
                    placeholder="Add context for the sales team"
                    className="min-h-[120px] w-full rounded-[10px] border border-[var(--neutral-300)] bg-white px-4 py-3 text-[15px] text-[var(--neutral-900)] outline-none transition-all duration-200 placeholder:text-[var(--neutral-400)] focus:border-[var(--brand-600)] focus:ring-[3px] focus:ring-[var(--brand-100)]"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-4 rounded-[18px] border border-[var(--neutral-200)] bg-white p-6 shadow-[var(--shadow-sm)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--neutral-900)]">
                    Pipeline summary
                  </p>
                  <p className="text-sm text-[var(--neutral-500)]">
                    Quiet luxury, not dashboard noise.
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full bg-[var(--brand-100)] px-3 py-1 text-xs font-medium text-[var(--brand-700)]">
                  Monthly
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ["34", "Qualified"],
                  ["12", "Proposal sent"],
                  ["6", "Closing this week"],
                ].map(([value, label]) => (
                  <div
                    key={label}
                    className="rounded-[14px] border border-[var(--neutral-200)] bg-[var(--neutral-50)] p-4"
                  >
                    <p className="text-2xl font-semibold text-[var(--neutral-900)]">
                      {value}
                    </p>
                    <p className="text-sm text-[var(--neutral-500)]">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section
          eyebrow="Components"
          title="Icons"
          body="The ZIP specified `lucide-react`; the local project already has it installed, so the design-system route uses those icons directly."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Menu", <Menu key="menu" size={20} />],
              ["User", <User key="user" size={20} />],
              ["Settings", <Settings key="settings" size={20} />],
              ["Alert", <CircleAlert key="alert" size={20} />],
              ["Shield", <Shield key="shield" size={20} />],
              ["Chevron", <ChevronRight key="chevron" size={20} />],
              ["Calendar", <CalendarDays key="calendar" size={20} />],
              ["Sparkles", <Sparkles key="sparkles" size={20} />],
            ].map(([label, icon]) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-[16px] border border-[var(--neutral-200)] bg-white p-4"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-[var(--neutral-50)] text-[var(--neutral-700)]">
                  {icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--neutral-900)]">
                    {label}
                  </p>
                  <p className="text-xs text-[var(--neutral-500)]">
                    lucide-react / 20px
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </main>
  );
}
