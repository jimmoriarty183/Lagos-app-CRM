import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  ListChecks,
  Smartphone,
} from "lucide-react";
import { Logo } from "./Logo";

const ORDER_STATES = [
  { label: "NEW", tone: "bg-blue-50 text-blue-700 border-blue-100" },
  {
    label: "IN_PROGRESS",
    tone: "bg-amber-50 text-amber-700 border-amber-100",
  },
  { label: "DONE", tone: "bg-emerald-50 text-emerald-700 border-emerald-100" },
];

export function LandingPage() {
  return (
    <div className="w-full bg-gradient-to-b from-white via-slate-50/40 to-white text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Logo size={34} />
            <div>
              <p className="text-base font-semibold leading-none text-slate-900">Ordero</p>
              <p className="pt-1 text-xs text-slate-500">Orders. Simple. Fast.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/pricing"
              className="hidden rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:inline-flex"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Log in
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Open app <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-8 lg:py-20">
        <section className="space-y-8 lg:space-y-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-blue-700 sm:text-sm sm:normal-case sm:tracking-normal">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Built for small business operations
          </div>

          <div className="space-y-5">
            <h1 className="text-4xl font-semibold leading-[1.06] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Track every order.
              <br />
              Keep every customer informed.
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              One lightweight workspace to create orders, update statuses, and
              stay on top of due dates and payments from any device.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-slate-800 hover:shadow"
            >
              Open my orders
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              See pricing
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <FeatureCard
              icon={<Clock3 size={18} />}
              title="Fast setup"
              description="Get started in minutes"
            />
            <FeatureCard
              icon={<Smartphone size={18} />}
              title="Mobile-first"
              description="Built for work on the go"
            />
            <FeatureCard
              icon={<ListChecks size={18} />}
              title="Clear workflow"
              description="Track every order state"
            />
          </div>

          <p className="text-xs text-slate-400">
            If you were redirected here, sign in to continue to your business dashboard.
          </p>
        </section>

        <section className="space-y-4 lg:pt-4">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            Live customer view preview
          </p>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/60">
            <div className="space-y-6 p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Order #123
                  </p>
                  <p className="pt-1 text-sm font-semibold text-slate-700">
                    Amal Cakes & Bakery
                  </p>
                </div>
                <span className="rounded-md border border-amber-100 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                  IN_PROGRESS
                </span>
              </div>

              <div className="h-px bg-slate-100" />

              <div className="grid gap-5 sm:grid-cols-2">
                <InfoCard label="Due date" value="Tomorrow" />
                <InfoCard label="Payment" value="Waiting payment" />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Workflow states
                </p>
                <div className="flex flex-wrap gap-2">
                  {ORDER_STATES.map((state) => (
                    <span
                      key={state.label}
                      className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${state.tone}`}
                    >
                      {state.label}
                    </span>
                  ))}
                </div>
              </div>

              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold !text-white transition hover:bg-slate-800"
              >
                <CheckCircle2 size={16} aria-hidden="true" />
                Contact store
              </Link>

              <p className="text-center text-xs text-slate-400">Redirect target: /login</p>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-slate-500">
            A clean status-first screen with due date and payment updates that works on mobile and desktop.
          </p>
        </section>
      </main>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <article className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm">
      <div className="flex flex-col gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition group-hover:bg-slate-200">
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
    </article>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <p className="pt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
