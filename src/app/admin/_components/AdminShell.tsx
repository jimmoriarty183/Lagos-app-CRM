import Link from "next/link";
import {
  ArrowLeftCircle,
  BarChart3,
  Building2,
  HeartPulse,
  LayoutDashboard,
  ListChecks,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import { BrandWordmark } from "@/components/Brand";

export type AdminNavItem = {
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
};

export const ADMIN_NAV: AdminNavItem[] = [
  {
    href: "/admin",
    label: "Сводка",
    description: "Ключевые цифры и обзор системы",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    href: "/admin/users",
    label: "Пользователи",
    description: "Регистрации, входы и онбординг",
    icon: <Users className="h-4 w-4" />,
  },
  {
    href: "/admin/analytics",
    label: "Аналитика",
    description: "Рост, активация, использование и воронка",
    icon: <TrendingUp className="h-4 w-4" />,
  },
  {
    href: "/admin/businesses",
    label: "Бизнесы",
    description: "Владельцы, активность и заказы",
    icon: <Building2 className="h-4 w-4" />,
  },
  {
    href: "/admin/invites",
    label: "Приглашения",
    description: "Статусы и зависшие инвайты",
    icon: <Shield className="h-4 w-4" />,
  },
  {
    href: "/admin/health",
    label: "Контроль",
    description: "Проблемы и ручное внимание",
    icon: <HeartPulse className="h-4 w-4" />,
  },
  {
    href: "/admin/activity",
    label: "Активность",
    description: "Системные события и действия",
    icon: <ListChecks className="h-4 w-4" />,
  },
  {
    href: "/admin/orders",
    label: "Заказы",
    description: "Агрегированный обзор использования",
    icon: <BarChart3 className="h-4 w-4" />,
  },
];

export async function AdminShell({
  activeHref,
  title,
  description,
  actions,
  workspaceHref,
  children,
}: {
  activeHref: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  workspaceHref: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100svh] bg-[#f6f8fb] text-slate-900">
      <div className="mx-auto max-w-[1760px] px-4 py-6 sm:px-6 xl:px-8 2xl:px-10">
        <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="xl:sticky xl:top-6 xl:self-start">
            <div className="rounded-[28px] border border-white/70 bg-white/80 p-4 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur-md">
              <Link
                href={workspaceHref}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm transition hover:border-slate-300"
              >
                <BrandWordmark variant="gradient" height={24} />
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-semibold tracking-tight text-slate-900">
                    Corelix Admin
                  </div>
                  <div className="text-[11px] text-slate-500">Перейти во внутренний кабинет</div>
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
                        "flex items-start gap-3 rounded-2xl border px-3 py-3 transition",
                        active
                          ? "border-[#bfd0ea] bg-[#eef5ff] shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                          active ? "bg-white text-[#1d4ed8]" : "bg-slate-100 text-slate-500",
                        ].join(" ")}
                      >
                        {item.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">{item.description}</div>
                      </div>
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-4 border-t border-slate-200 pt-4">
                <Link
                  href={workspaceHref}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <ArrowLeftCircle className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Назад в приложение</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">
                      Выйти из режима администрирования и вернуться в рабочее пространство
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </aside>

          <main className="min-w-0">
            <section className="rounded-[28px] border border-white/70 bg-white/80 p-4 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur-md sm:p-6 xl:p-7">
              <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Администрирование
                  </div>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
                  <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">{description}</p>
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
