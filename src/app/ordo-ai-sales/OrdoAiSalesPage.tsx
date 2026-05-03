"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { motion, AnimatePresence, type Variants } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Check,
  Clock,
  CreditCard,
  Database,
  Facebook,
  Globe,
  Instagram,
  Link as LinkIcon,
  Lock,
  Moon,
  Send,
  Sparkles,
  Sun,
  Zap,
} from "lucide-react";
import { BrandLockup } from "@/components/Brand";
import { openCheckout } from "@/components/BuyButton";
import {
  SUPPORTED_LOCALES,
  dictionaries,
  localeMeta,
  type Dictionary,
  type FeatureIconKey,
  type Locale,
} from "./i18n";

const SIGNUP_HREF = "/login?mode=register&product=ai-sales";
const SIGNIN_HREF = "/login?product=ai-sales";

const SETUP_PRICE_ID = process.env.NEXT_PUBLIC_PADDLE_AI_SALES_SETUP_PRICE_ID;
const MONTHLY_PRICE_ID =
  process.env.NEXT_PUBLIC_PADDLE_AI_SALES_MONTHLY_PRICE_ID;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

export function OrdoAiSalesPage({ locale }: { locale: Locale }) {
  // Sync <html lang> with the URL-driven locale (purely DOM side-effect, no
  // setState — that's why this is allowed even with the strict effect rule).
  useEffect(() => {
    document.documentElement.setAttribute("lang", locale);
  }, [locale]);

  const t = dictionaries[locale];

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-white text-[var(--text-primary)] dark:bg-[#0B0B14]">
      {/* Brand glow background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[700px] bg-[radial-gradient(900px_420px_at_50%_-10%,rgba(91,91,179,0.18)_0%,rgba(91,91,179,0)_70%)] dark:bg-[radial-gradient(900px_420px_at_50%_-10%,rgba(91,91,179,0.45)_0%,rgba(91,91,179,0)_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,#FAFBFC_0%,#FFFFFF_60%,#F5F6F7_100%)] dark:bg-[linear-gradient(180deg,#0B0B14_0%,#0B0B14_60%,#0E0E1B_100%)]"
      />

      <SiteHeader t={t} locale={locale} />

      <main className="relative z-0">
        <Hero t={t} />
        <Features t={t} />
        <DemoSection t={t} locale={locale} />
        <ConfigDashboard t={t} />
        <Pricing t={t} locale={locale} />
      </main>

      <SiteFooter t={t} />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/* Header                                                         */
/* ────────────────────────────────────────────────────────────── */

function SiteHeader({ t, locale }: { t: Dictionary; locale: Locale }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--neutral-200)] bg-white/80 backdrop-blur-xl dark:border-white/5 dark:bg-[#0B0B14]/70">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
        <Link href="/" aria-label="Ordo home" className="flex items-center">
          <BrandLockup iconSize={26} />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink href="#features">{t.nav.features}</NavLink>
          <NavLink href="#demo">{t.nav.demo}</NavLink>
          <NavLink href="#dashboard">{t.nav.dashboard}</NavLink>
          <NavLink href="#pricing">{t.nav.pricing}</NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher locale={locale} />
          <ThemeToggleInline />
          <Link
            href={SIGNIN_HREF}
            className="hidden h-9 items-center rounded-lg px-3 text-sm font-medium text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)] sm:inline-flex"
          >
            {t.nav.signIn}
          </Link>
          <Link
            href={SIGNUP_HREF}
            className="inline-flex h-9 items-center rounded-lg bg-[var(--brand-600)] px-3.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-700)]"
          >
            {t.nav.cta}
          </Link>
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-tertiary)] transition hover:bg-[var(--neutral-100)] hover:text-[var(--text-primary)] dark:hover:bg-white/5"
    >
      {children}
    </a>
  );
}

function LanguageSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const navigateToLocale = (code: Locale) => {
    setOpen(false);
    if (code === locale) return;
    router.push(`/ordo-ai-sales/${code}`);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--neutral-200)] bg-white px-2.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--neutral-300)] hover:bg-[var(--neutral-50)] dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20 dark:hover:bg-white/[0.06]"
      >
        <Globe className="h-3.5 w-3.5" aria-hidden />
        {localeMeta[locale].short}
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-[calc(100%+6px)] z-40 w-44 overflow-hidden rounded-xl border border-[var(--neutral-200)] bg-white py-1 shadow-lg shadow-black/5 dark:border-white/10 dark:bg-[#15151F] dark:shadow-black/40"
            role="menu"
          >
            {SUPPORTED_LOCALES.map((code) => {
              const active = code === locale;
              return (
                <Link
                  key={code}
                  href={`/ordo-ai-sales/${code}`}
                  hrefLang={code}
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={(event) => {
                    event.preventDefault();
                    navigateToLocale(code);
                  }}
                  className={[
                    "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition",
                    active
                      ? "bg-[var(--brand-50)] text-[var(--brand-700)] dark:bg-[var(--brand-600)]/15 dark:text-[var(--brand-200)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--neutral-100)] dark:hover:bg-white/5",
                  ].join(" ")}
                >
                  <span className="font-medium">{localeMeta[code].label}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    {localeMeta[code].short}
                  </span>
                </Link>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ThemeToggleInline() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === "dark" : true;

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      suppressHydrationWarning
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--neutral-200)] bg-white text-[var(--text-secondary)] transition hover:border-[var(--neutral-300)] hover:bg-[var(--neutral-50)] dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20 dark:hover:bg-white/[0.06]"
    >
      {mounted ? (
        isDark ? (
          <Sun className="h-4 w-4" aria-hidden />
        ) : (
          <Moon className="h-4 w-4" aria-hidden />
        )
      ) : (
        <span className="block h-4 w-4" aria-hidden />
      )}
    </button>
  );
}

/* ────────────────────────────────────────────────────────────── */
/* Hero                                                            */
/* ────────────────────────────────────────────────────────────── */

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
    <section id={id} className={className}>
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">{children}</div>
    </section>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-200)] bg-[var(--brand-50)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-700)] dark:border-[var(--brand-500)]/30 dark:bg-[var(--brand-600)]/10 dark:text-[var(--brand-200)]">
      <Sparkles className="h-3.5 w-3.5" aria-hidden />
      {children}
    </span>
  );
}

function Hero({ t }: { t: Dictionary }) {
  return (
    <Section className="pt-12 pb-20 sm:pt-20 sm:pb-28">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="mx-auto max-w-3xl text-center"
      >
        <motion.div variants={fadeUp}>
          <Eyebrow>{t.hero.eyebrow}</Eyebrow>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="mt-6 text-[34px] font-semibold leading-[1.06] tracking-[-0.03em] text-[var(--text-primary)] sm:text-[58px] sm:leading-[1.02]"
        >
          {t.hero.titleLine1}
          <br />
          <span className="bg-gradient-to-r from-[var(--brand-600)] to-[var(--brand-400)] bg-clip-text text-transparent">
            {t.hero.titleLine2Highlight}
          </span>{" "}
          <span className="text-[var(--text-tertiary)]">
            {t.hero.titleLine3}
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[var(--text-tertiary)] sm:text-lg"
        >
          {t.hero.subtitle}
        </motion.p>

        <motion.div
          variants={fadeUp}
          className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-3"
        >
          <Link
            href={SIGNUP_HREF}
            className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-600)] px-6 text-sm font-semibold text-white shadow-[0_12px_32px_-12px_rgba(91,91,179,0.7)] transition hover:bg-[var(--brand-700)] sm:w-auto"
          >
            {t.hero.primaryCta}
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
          <a
            href="#demo"
            className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-[var(--neutral-200)] bg-white px-6 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--neutral-300)] hover:bg-[var(--neutral-50)] dark:border-white/15 dark:bg-white/[0.03] dark:hover:border-white/25 dark:hover:bg-white/[0.06] sm:w-auto"
          >
            {t.hero.secondaryCta}
          </a>
        </motion.div>

        <motion.ul
          variants={fadeUp}
          className="mt-7 flex flex-wrap items-center justify-center gap-2 text-xs sm:gap-3 sm:text-sm"
        >
          {t.hero.badges.map((perk) => (
            <li
              key={perk}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--neutral-200)] bg-white px-3 py-1.5 text-[var(--text-secondary)] dark:border-white/10 dark:bg-white/[0.04] dark:text-white/80"
            >
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full bg-[var(--brand-500)]"
              />
              {perk}
            </li>
          ))}
        </motion.ul>
      </motion.div>
    </Section>
  );
}

/* ────────────────────────────────────────────────────────────── */
/* Features                                                        */
/* ────────────────────────────────────────────────────────────── */

type IconComponent = ComponentType<{ className?: string }>;

const FEATURE_ICON: Record<FeatureIconKey, IconComponent> = {
  consult: BookOpen,
  "always-on": Clock,
  "payment-link": CreditCard,
  "catalog-sync": Database,
};

function Features({ t }: { t: Dictionary }) {
  return (
    <Section id="features" className="py-20 sm:py-24">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
        className="mx-auto max-w-3xl text-center"
      >
        <motion.div variants={fadeUp}>
          <Eyebrow>{t.features.eyebrow}</Eyebrow>
        </motion.div>
        <motion.h2
          variants={fadeUp}
          className="mt-4 text-3xl font-semibold leading-[1.15] tracking-[-0.02em] sm:text-4xl"
        >
          {t.features.title}{" "}
          <span className="text-[var(--text-tertiary)]">
            {t.features.titleAccent}
          </span>
        </motion.h2>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
        className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        {t.features.items.map((item) => {
          const Icon = FEATURE_ICON[item.iconKey];
          return (
            <motion.article
              key={item.title}
              variants={fadeUp}
              className="group rounded-2xl border border-[var(--neutral-200)] bg-white p-6 shadow-[0_1px_2px_rgba(15,20,25,0.04)] transition hover:-translate-y-0.5 hover:border-[var(--brand-300)] hover:shadow-[0_18px_40px_-22px_rgba(91,91,179,0.35)] dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none dark:hover:border-[var(--brand-500)]/40 dark:hover:bg-white/[0.05]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-50)] text-[var(--brand-700)] transition group-hover:bg-[var(--brand-100)] dark:bg-[var(--brand-600)]/15 dark:text-[var(--brand-200)] dark:group-hover:bg-[var(--brand-600)]/25">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-tertiary)]">
                {item.body}
              </p>
            </motion.article>
          );
        })}
      </motion.div>
    </Section>
  );
}

/* ────────────────────────────────────────────────────────────── */
/* Demo (interactive chat)                                         */
/* ────────────────────────────────────────────────────────────── */

type ChatMessage = {
  id: string;
  role: "user" | "ai";
  content: string;
  product?: {
    name: string;
    description: string;
    price: string;
    badge?: string;
  };
  paymentLink?: { productName: string; amount: string };
};

function DemoSection({ t, locale }: { t: Dictionary; locale: Locale }) {
  const initialMessages = useMemo<ChatMessage[]>(
    () => [{ id: "init", role: "ai", content: t.demo.initialAiMessage }],
    [t.demo.initialAiMessage],
  );

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const [usedSuggestions, setUsedSuggestions] = useState<Set<number>>(
    () => new Set(),
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset chat when locale changes (mock conversation is locale-bound).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setMessages(initialMessages);
    setUsedSuggestions(new Set());
    setTyping(false);
    setInput("");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [locale, initialMessages]);

  // Auto-scroll to newest message.
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, typing]);

  const dispatchSuggestion = useCallback(
    (index: number) => {
      const reply = t.demo.replies[index];
      const text = t.demo.suggestions[index];
      if (!reply || !text) return;

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: text,
      };
      setMessages((prev) => [...prev, userMsg]);
      setUsedSuggestions((prev) => {
        const next = new Set(prev);
        next.add(index);
        return next;
      });
      setTyping(true);

      window.setTimeout(() => {
        setTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "ai",
            content: reply.text,
            product: reply.product,
            paymentLink: reply.paymentLink,
          },
        ]);
      }, 850);
    },
    [t.demo.replies, t.demo.suggestions],
  );

  const handleFreeSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = input.trim();
      if (!trimmed) return;
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: trimmed,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setTyping(true);
      window.setTimeout(() => {
        setTyping(false);
        // Soft fallback: route any free-form question to the first unused
        // suggestion's reply, or a generic catalog answer.
        const fallbackIdx = t.demo.suggestions.findIndex(
          (_, i) => !usedSuggestions.has(i),
        );
        const reply =
          fallbackIdx >= 0 ? t.demo.replies[fallbackIdx] : t.demo.replies[0];
        if (fallbackIdx >= 0) {
          setUsedSuggestions((prev) => {
            const next = new Set(prev);
            next.add(fallbackIdx);
            return next;
          });
        }
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "ai",
            content: reply.text,
            product: reply.product,
            paymentLink: reply.paymentLink,
          },
        ]);
      }, 900);
    },
    [input, t.demo.replies, t.demo.suggestions, usedSuggestions],
  );

  return (
    <Section id="demo" className="py-20 sm:py-24">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
        className="mx-auto max-w-3xl text-center"
      >
        <motion.div variants={fadeUp}>
          <Eyebrow>{t.demo.eyebrow}</Eyebrow>
        </motion.div>
        <motion.h2
          variants={fadeUp}
          className="mt-4 text-3xl font-semibold leading-[1.15] tracking-[-0.02em] sm:text-4xl"
        >
          {t.demo.title}
        </motion.h2>
        <motion.p
          variants={fadeUp}
          className="mx-auto mt-4 max-w-2xl text-base text-[var(--text-tertiary)]"
        >
          {t.demo.subtitle}
        </motion.p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mx-auto mt-12 max-w-2xl overflow-hidden rounded-3xl border border-[var(--neutral-200)] bg-white shadow-[0_30px_60px_-30px_rgba(15,20,25,0.18)] dark:border-white/10 dark:bg-[#11111C] dark:shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]"
      >
        {/* Chat header */}
        <div className="flex items-center justify-between border-b border-[var(--neutral-200)] bg-[var(--neutral-50)] px-5 py-3.5 dark:border-white/10 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand-600)] to-[var(--brand-400)] text-white shadow-sm">
              <Bot className="h-5 w-5" aria-hidden />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-[#11111C]" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {t.demo.aiName}
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)]">
                Online · Instagram + Facebook
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300 sm:inline-flex">
            <Zap className="h-3 w-3" aria-hidden />
            Live
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex h-[420px] flex-col gap-3 overflow-y-auto bg-[#FBFBFE] px-4 py-5 sm:px-5 dark:bg-[#0E0E18]"
        >
          {messages.map((m) => (
            <ChatBubble key={m.id} message={m} t={t} />
          ))}
          {typing ? <TypingBubble label={t.demo.typing} /> : null}
        </div>

        {/* Suggestions */}
        <div className="border-t border-[var(--neutral-200)] bg-white px-4 pt-3 pb-2 dark:border-white/10 dark:bg-[#11111C]">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            {t.demo.suggestionsLabel}
          </p>
          <div className="flex flex-wrap gap-2">
            {t.demo.suggestions.map((s, i) => {
              const used = usedSuggestions.has(i);
              return (
                <button
                  key={s}
                  type="button"
                  disabled={used || typing}
                  onClick={() => dispatchSuggestion(i)}
                  className={[
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                    used
                      ? "cursor-not-allowed border-[var(--neutral-200)] bg-[var(--neutral-50)] text-[var(--text-muted)] line-through dark:border-white/5 dark:bg-white/[0.02]"
                      : "border-[var(--brand-200)] bg-[var(--brand-50)] text-[var(--brand-700)] hover:border-[var(--brand-300)] hover:bg-[var(--brand-100)] dark:border-[var(--brand-500)]/30 dark:bg-[var(--brand-600)]/10 dark:text-[var(--brand-200)] dark:hover:border-[var(--brand-500)]/50 dark:hover:bg-[var(--brand-600)]/20",
                  ].join(" ")}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* Free-form input */}
        <form
          onSubmit={handleFreeSubmit}
          className="flex items-center gap-2 border-t border-[var(--neutral-200)] bg-white px-3 py-3 dark:border-white/10 dark:bg-[#11111C]"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.demo.placeholder}
            aria-label={t.demo.placeholder}
            className="h-10 flex-1 rounded-xl border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand-400)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-200)] dark:border-white/10 dark:bg-white/[0.04] dark:focus:border-[var(--brand-500)] dark:focus:bg-white/[0.06] dark:focus:ring-[var(--brand-500)]/30"
          />
          <button
            type="submit"
            disabled={!input.trim() || typing}
            aria-label={t.demo.sendLabel}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-600)] text-white transition hover:bg-[var(--brand-700)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" aria-hidden />
          </button>
        </form>
      </motion.div>
    </Section>
  );
}

function ChatBubble({ message, t }: { message: ChatMessage; t: Dictionary }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={["flex w-full", isUser ? "justify-end" : "justify-start"].join(
        " ",
      )}
    >
      <div className="flex max-w-[85%] flex-col gap-2 sm:max-w-[78%]">
        <div
          className={[
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
            isUser
              ? "rounded-br-md bg-[var(--brand-600)] text-white"
              : "rounded-bl-md border border-[var(--neutral-200)] bg-white text-[var(--text-primary)] dark:border-white/10 dark:bg-white/[0.04] dark:text-white/90",
          ].join(" ")}
        >
          {message.content}
        </div>

        {message.product ? (
          <ProductCard
            product={message.product}
            catalogLabel={t.demo.catalogLabel}
            priceLabel={t.demo.productPriceLabel}
          />
        ) : null}

        {message.paymentLink ? (
          <PaymentLinkCard
            link={message.paymentLink}
            label={t.demo.payLinkLabel}
            cta={t.demo.payLinkCta}
          />
        ) : null}
      </div>
    </motion.div>
  );
}

function ProductCard({
  product,
  catalogLabel,
  priceLabel,
}: {
  product: NonNullable<ChatMessage["product"]>;
  catalogLabel: string;
  priceLabel: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--neutral-200)] bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-center justify-between border-b border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3.5 py-2 dark:border-white/10 dark:bg-white/[0.02]">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          <Database className="h-3 w-3" aria-hidden />
          {catalogLabel}
        </span>
        {product.badge ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-100)] px-2 py-0.5 text-[10px] font-semibold text-[var(--brand-700)] dark:bg-[var(--brand-600)]/20 dark:text-[var(--brand-200)]">
            {product.badge}
          </span>
        ) : null}
      </div>
      <div className="px-3.5 py-3">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {product.name}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--text-tertiary)]">
          {product.description}
        </p>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              {priceLabel}
            </span>
            <p className="text-lg font-semibold text-[var(--text-primary)]">
              {product.price}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentLinkCard({
  link,
  label,
  cta,
}: {
  link: { productName: string; amount: string };
  label: string;
  cta: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-sm dark:border-emerald-400/20 dark:from-emerald-500/10 dark:to-white/[0.02]">
      <div className="flex items-center gap-2 border-b border-emerald-200 bg-white/60 px-3.5 py-2 dark:border-emerald-400/20 dark:bg-white/[0.02]">
        <Lock className="h-3 w-3 text-emerald-600 dark:text-emerald-300" aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
          {label}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 px-3.5 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
            {link.productName}
          </p>
          <p className="mt-0.5 text-lg font-semibold text-emerald-700 dark:text-emerald-300">
            {link.amount}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => e.preventDefault()}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
        >
          <LinkIcon className="h-3.5 w-3.5" aria-hidden />
          {cta}
        </button>
      </div>
    </div>
  );
}

function TypingBubble({ label }: { label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-[var(--neutral-200)] bg-white px-3.5 py-2.5 text-xs text-[var(--text-tertiary)] shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <span className="flex gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--brand-500)] [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--brand-500)] [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--brand-500)]" />
        </span>
        {label}
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/* Configuration Dashboard                                         */
/* ────────────────────────────────────────────────────────────── */

function ConfigDashboard({ t }: { t: Dictionary }) {
  const [sheetId, setSheetId] = useState("");
  const [prompt, setPrompt] = useState(t.config.promptDefault);
  const [instagram, setInstagram] = useState(true);
  const [facebook, setFacebook] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Re-seed prompt default when locale (and therefore default text) changes,
  // unless the user has typed something custom.
  const lastDefaultRef = useRef(t.config.promptDefault);
  useEffect(() => {
    if (prompt === lastDefaultRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPrompt(t.config.promptDefault);
    }
    lastDefaultRef.current = t.config.promptDefault;
  }, [t.config.promptDefault, prompt]);

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavedAt(Date.now());
    window.setTimeout(() => setSavedAt(null), 2200);
  };

  return (
    <Section id="dashboard" className="py-20 sm:py-24">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
        className="mx-auto max-w-3xl text-center"
      >
        <motion.div variants={fadeUp}>
          <Eyebrow>{t.config.eyebrow}</Eyebrow>
        </motion.div>
        <motion.h2
          variants={fadeUp}
          className="mt-4 text-3xl font-semibold leading-[1.15] tracking-[-0.02em] sm:text-4xl"
        >
          {t.config.title}
        </motion.h2>
        <motion.p
          variants={fadeUp}
          className="mx-auto mt-4 max-w-2xl text-base text-[var(--text-tertiary)]"
        >
          {t.config.subtitle}
        </motion.p>
      </motion.div>

      <motion.form
        onSubmit={handleSave}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mx-auto mt-12 max-w-3xl rounded-3xl border border-[var(--neutral-200)] bg-white p-6 shadow-[0_30px_60px_-30px_rgba(15,20,25,0.15)] sm:p-8 dark:border-white/10 dark:bg-white/[0.03] dark:shadow-[0_30px_80px_-30px_rgba(0,0,0,0.5)]"
      >
        {/* Sheet ID */}
        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)]">
            {t.config.sheetIdLabel}
          </label>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            {t.config.sheetIdHelp}
          </p>
          <div className="mt-2.5 flex items-stretch gap-2">
            <div className="flex h-11 items-center justify-center rounded-xl border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 text-[var(--text-tertiary)] dark:border-white/10 dark:bg-white/[0.04]">
              <Database className="h-4 w-4" aria-hidden />
            </div>
            <input
              type="text"
              value={sheetId}
              onChange={(e) => setSheetId(e.target.value)}
              placeholder={t.config.sheetIdPlaceholder}
              className="h-11 flex-1 rounded-xl border border-[var(--neutral-200)] bg-white px-3.5 font-mono text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand-400)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-200)] dark:border-white/10 dark:bg-white/[0.04] dark:focus:border-[var(--brand-500)] dark:focus:ring-[var(--brand-500)]/30"
            />
          </div>
        </div>

        {/* Prompt */}
        <div className="mt-6">
          <label className="block text-sm font-semibold text-[var(--text-primary)]">
            {t.config.promptLabel}
          </label>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            {t.config.promptHelp}
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t.config.promptPlaceholder}
            rows={6}
            className="mt-2.5 block w-full resize-y rounded-xl border border-[var(--neutral-200)] bg-white px-3.5 py-3 text-sm leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand-400)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-200)] dark:border-white/10 dark:bg-white/[0.04] dark:focus:border-[var(--brand-500)] dark:focus:ring-[var(--brand-500)]/30"
          />
        </div>

        {/* Channels */}
        <div className="mt-6">
          <label className="block text-sm font-semibold text-[var(--text-primary)]">
            {t.config.channelsLabel}
          </label>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            {t.config.channelsHelp}
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ChannelRow
              icon={Instagram}
              name={t.config.channelInstagram}
              connected={instagram}
              onToggle={() => setInstagram((v) => !v)}
              connectedLabel={t.config.statusConnected}
              disconnectedLabel={t.config.statusDisconnected}
              connectAction={t.config.connectAction}
              disconnectAction={t.config.disconnectAction}
            />
            <ChannelRow
              icon={Facebook}
              name={t.config.channelFacebook}
              connected={facebook}
              onToggle={() => setFacebook((v) => !v)}
              connectedLabel={t.config.statusConnected}
              disconnectedLabel={t.config.statusDisconnected}
              connectAction={t.config.connectAction}
              disconnectAction={t.config.disconnectAction}
            />
          </div>
        </div>

        {/* Save */}
        <div className="mt-7 flex items-center justify-end gap-3">
          <AnimatePresence>
            {savedAt ? (
              <motion.span
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
              >
                <Check className="h-3.5 w-3.5" aria-hidden />
                {t.config.saveSaved}
              </motion.span>
            ) : null}
          </AnimatePresence>
          <button
            type="submit"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--brand-600)] px-5 text-sm font-semibold text-white shadow-[0_12px_32px_-12px_rgba(91,91,179,0.6)] transition hover:bg-[var(--brand-700)]"
          >
            {t.config.saveAction}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </motion.form>
    </Section>
  );
}

function ChannelRow({
  icon: Icon,
  name,
  connected,
  onToggle,
  connectedLabel,
  disconnectedLabel,
  connectAction,
  disconnectAction,
}: {
  icon: IconComponent;
  name: string;
  connected: boolean;
  onToggle: () => void;
  connectedLabel: string;
  disconnectedLabel: string;
  connectAction: string;
  disconnectAction: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--neutral-200)] bg-[var(--neutral-50)] p-3.5 transition hover:border-[var(--neutral-300)] dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20">
      <div className="flex items-center gap-3">
        <div
          className={[
            "flex h-10 w-10 items-center justify-center rounded-xl transition",
            connected
              ? "bg-[var(--brand-600)]/15 text-[var(--brand-700)] dark:text-[var(--brand-200)]"
              : "bg-white text-[var(--text-tertiary)] dark:bg-white/[0.05]",
          ].join(" ")}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {name}
          </p>
          <p
            className={[
              "mt-0.5 inline-flex items-center gap-1.5 text-[11px] font-medium",
              connected
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-[var(--text-muted)]",
            ].join(" ")}
          >
            <span
              className={[
                "h-1.5 w-1.5 rounded-full",
                connected
                  ? "bg-emerald-500"
                  : "bg-[var(--neutral-400)] dark:bg-white/30",
              ].join(" ")}
            />
            {connected ? connectedLabel : disconnectedLabel}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={[
          "inline-flex h-9 items-center rounded-lg px-3 text-xs font-semibold transition",
          connected
            ? "border border-[var(--neutral-200)] bg-white text-[var(--text-secondary)] hover:bg-[var(--neutral-100)] dark:border-white/15 dark:bg-white/[0.05] dark:text-white/80 dark:hover:bg-white/[0.08]"
            : "bg-[var(--brand-600)] text-white hover:bg-[var(--brand-700)]",
        ].join(" ")}
      >
        {connected ? disconnectAction : connectAction}
      </button>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/* Pricing                                                         */
/* ────────────────────────────────────────────────────────────── */

const MONTHLY_SUFFIX: Record<Locale, string> = {
  en: "/ mo",
  uk: "/ міс.",
  ru: "/ мес.",
};

function Pricing({ t, locale }: { t: Dictionary; locale: Locale }) {
  const [busyKind, setBusyKind] = useState<null | "setup" | "monthly">(null);

  const handlePay = useCallback(async (kind: "setup" | "monthly") => {
    if (busyKind) return;
    const priceId = kind === "setup" ? SETUP_PRICE_ID : MONTHLY_PRICE_ID;
    if (!priceId) {
      // No env wired yet — route through login as the safe public path.
      window.location.href = `${SIGNUP_HREF}&plan=${kind}`;
      return;
    }
    setBusyKind(kind);
    try {
      await openCheckout(priceId, { successUrl: "/app/settings/billing" });
    } finally {
      setBusyKind(null);
    }
  }, [busyKind]);

  return (
    <Section id="pricing" className="py-20 sm:py-28">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
        className="mx-auto max-w-3xl text-center"
      >
        <motion.div variants={fadeUp}>
          <Eyebrow>{t.pricing.eyebrow}</Eyebrow>
        </motion.div>
        <motion.h2
          variants={fadeUp}
          className="mt-4 text-3xl font-semibold leading-[1.15] tracking-[-0.02em] sm:text-4xl"
        >
          {t.pricing.title}
        </motion.h2>
        <motion.p
          variants={fadeUp}
          className="mx-auto mt-4 max-w-2xl text-base text-[var(--text-tertiary)]"
        >
          {t.pricing.subtitle}
        </motion.p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mx-auto mt-12 max-w-4xl"
      >
        <div className="overflow-hidden rounded-3xl border border-[var(--brand-200)] bg-white shadow-[0_30px_70px_-30px_rgba(91,91,179,0.35)] dark:border-[var(--brand-500)]/30 dark:bg-gradient-to-br dark:from-[#15151F] dark:to-[#11111C] dark:shadow-[0_30px_80px_-30px_rgba(91,91,179,0.45)]">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
            {/* Left: prices */}
            <div className="border-b border-[var(--neutral-200)] p-6 sm:p-8 lg:border-b-0 lg:border-r dark:border-white/10">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <PricePill
                  label={t.pricing.setupLabel}
                  price={t.pricing.setupPrice}
                  caption={t.pricing.setupCaption}
                />
                <PricePill
                  label={t.pricing.monthlyLabel}
                  price={t.pricing.monthlyPrice}
                  caption={t.pricing.monthlyCaption}
                  suffix={MONTHLY_SUFFIX[locale]}
                />
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => handlePay("setup")}
                  disabled={busyKind !== null}
                  className="group inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand-600)] px-5 text-sm font-semibold text-white shadow-[0_14px_32px_-14px_rgba(91,91,179,0.7)] transition hover:bg-[var(--brand-700)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busyKind === "setup" ? "…" : t.pricing.primaryCta}
                  <CreditCard className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => handlePay("monthly")}
                  disabled={busyKind !== null}
                  className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--neutral-200)] bg-white px-5 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--neutral-300)] hover:bg-[var(--neutral-50)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-white/[0.04] dark:text-white/85 dark:hover:border-white/25 dark:hover:bg-white/[0.07]"
                >
                  {busyKind === "monthly" ? "…" : t.pricing.secondaryCta}
                </button>
              </div>

              <p className="mt-5 text-xs leading-relaxed text-[var(--text-muted)]">
                {t.pricing.footnote}
              </p>
            </div>

            {/* Right: includes */}
            <div className="bg-[var(--brand-50)]/40 p-6 sm:p-8 dark:bg-[var(--brand-600)]/5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-700)] dark:text-[var(--brand-300)]">
                {t.pricing.includesTitle}
              </p>
              <ul className="mt-4 space-y-3">
                {t.pricing.includes.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-sm leading-relaxed text-[var(--text-secondary)]"
                  >
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--brand-600)]/15 text-[var(--brand-700)] dark:text-[var(--brand-200)]">
                      <Check className="h-3 w-3" aria-hidden />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </motion.div>
    </Section>
  );
}

function PricePill({
  label,
  price,
  caption,
  suffix,
}: {
  label: string;
  price: string;
  caption: string;
  suffix?: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="text-[44px] font-semibold leading-none tracking-[-0.02em] text-[var(--text-primary)]">
          {price}
        </span>
        {suffix ? (
          <span className="text-sm font-medium text-[var(--text-tertiary)]">
            {suffix}
          </span>
        ) : null}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-[var(--text-tertiary)]">
        {caption}
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/* Footer                                                          */
/* ────────────────────────────────────────────────────────────── */

function SiteFooter({ t }: { t: Dictionary }) {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[var(--neutral-200)] bg-white/60 dark:border-white/5 dark:bg-[#0B0B14]/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row sm:px-8">
        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
          <BrandLockup iconSize={20} />
          <span>
            © {year} Ordo. {t.footer.rights}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <Link
            href="/terms"
            className="text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)]"
          >
            {t.footer.terms}
          </Link>
          <Link
            href="/privacy"
            className="text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)]"
          >
            {t.footer.privacy}
          </Link>
        </div>
      </div>
    </footer>
  );
}
