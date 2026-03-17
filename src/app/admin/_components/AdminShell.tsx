import Link from "next/link";
import { Logo } from "@/components/Logo";

export type AdminNavItem = {
  href: string;
  label: string;
  description: string;
};

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", description: "Общая сводка по системе" },
  { href: "/admin/users", label: "Users", description: "Пользователи и onboarding" },
  { href: "/admin/businesses", label: "Businesses", description: "Бизнесы и ownership" },
  { href: "/admin/invites", label: "Invites", description: "Приглашения и статусы" },
  { href: "/admin/health", label: "Health", description: "Проблемы и ручной контроль" },
  { href: "/admin/activity", label: "Activity", description: "Глобальная активность" },
  { href: "/admin/orders", label: "Orders", description: "Обзор заказов" },
];

export function AdminShell({
  activeHref,
  title,
  description,
  actions,
  children,
}: {
  activeHref: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100svh] bg-[#f6f8fb] text-slate-900">
      <div className="mx-auto max-w-[1380px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-[28px] border border-white/70 bg-white/70 p-4 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur-md">
              <Link
                href="/"
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm"
              >
                <Logo size={32} />
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-semibold tracking-tight text-slate-900">
                    Ordero Admin
                  </div>
                  <div className="text-[11px] text-slate-500">Product control panel</div>
                </div>
              </Link>

              <nav className="mt-4 space-y-2">
                {ADMIN_NAV.map((item) => {
                  const active = activeHref === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={[
                        "block rounded-2xl border px-3 py-3 transition",
                        active
                          ? "border-[#bfd0ea] bg-[#eef5ff] shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-500">{item.description}</div>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>

          <main className="min-w-0">
            <section className="rounded-[28px] border border-white/70 bg-white/70 p-5 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur-md sm:p-7">
              <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Admin
                  </div>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                    {title}
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
                </div>
                {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
              </div>

              <div className="mt-5">{children}</div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
