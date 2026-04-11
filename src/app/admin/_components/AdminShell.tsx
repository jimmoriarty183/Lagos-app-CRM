"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftCircle,
  BarChart3,
  Building2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  HeartPulse,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Megaphone,
  MessageSquareQuote,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import { BrandLockup } from "@/components/Brand";

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
    label: "Businesses",
    description: "Owners, activity, and orders",
    icon: <Building2 className="h-4 w-4" />,
  },
  {
    href: "/admin/billing",
    label: "Billing",
    description: "Accounts, subscriptions, entitlements, overrides",
    icon: <CreditCard className="h-4 w-4" />,
  },
  {
    href: "/admin/invites",
    label: "Приглашения",
    description: "Статусы и зависшие инвайты",
    icon: <Shield className="h-4 w-4" />,
  },
  {
    href: "/admin/campaigns",
    label: "Рассылки и опросы",
    description: "Уведомления, опросы и статистика",
    icon: <Megaphone className="h-4 w-4" />,
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
  {
    href: "/admin/support",
    label: "Support",
    description: "Support requests and admin workflows",
    icon: <LifeBuoy className="h-4 w-4" />,
  },
  {
    href: "/admin/sales",
    label: "Sales requests",
    description: "Inbound enterprise and pricing-contact leads",
    icon: <MessageSquareQuote className="h-4 w-4" />,
  },
];

export function AdminShell({
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
  const [navCollapsed, setNavCollapsed] = useState<boolean>(true);

  useEffect(() => {
    const stored = window.localStorage.getItem("admin-nav-collapsed");
    if (stored === "0") setNavCollapsed(false);
  }, []);

  function handleToggleNav() {
    const next = !navCollapsed;
    setNavCollapsed(next);
    window.localStorage.setItem("admin-nav-collapsed", next ? "1" : "0");
  }

  return (
    <div className="min-h-[100svh] bg-[#f6f8fb] text-slate-900">
      <div className="mx-auto max-w-[1320px] px-3 py-4 sm:px-4 sm:py-5 xl:px-8 2xl:px-10">
        <div
          className={`grid gap-4 ${navCollapsed ? "xl:grid-cols-[92px_minmax(0,1fr)]" : "xl:grid-cols-[250px_minmax(0,1fr)]"}`}
        >
          <aside className="xl:sticky xl:top-4 xl:self-start">
            <div className="rounded-[22px] border border-white/70 bg-white/80 p-2.5 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur-md xl:p-2">
              <div className="mb-2 hidden xl:flex xl:justify-end">
                <button
                  type="button"
                  onClick={handleToggleNav}
                  aria-label={navCollapsed ? "Expand menu" : "Collapse menu"}
                  title={navCollapsed ? "Expand menu" : "Collapse menu"}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  {navCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" />
                  )}
                </button>
              </div>
              <Link
                href={workspaceHref}
                className={[
                  "flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2.5 shadow-sm transition hover:border-slate-300",
                  navCollapsed ? "xl:justify-center xl:px-2" : "xl:px-2.5",
                ].join(" ")}
                title="Ordo Admin"
              >
                <BrandLockup iconSize={30} textClassName="text-[1.5rem]" />
                <div className={`min-w-0 ${navCollapsed ? "xl:hidden" : ""}`}>
                  <div className="truncate text-sm font-semibold tracking-tight text-slate-900">
                    Ordo Admin
                  </div>
                  <div className="hidden text-[11px] text-slate-500 xl:block">
                    Перейти во внутренний кабинет
                  </div>
                </div>
              </Link>

              <nav className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:block xl:space-y-1.5">
                {ADMIN_NAV.map((item) => {
                  const active = activeHref === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-label={item.label}
                      title={item.label}
                      className={[
                        "flex items-center gap-2.5 rounded-xl border px-2.5 py-2.5 transition",
                        navCollapsed
                          ? "xl:justify-center xl:px-2"
                          : "xl:px-2.5",
                        active
                          ? "border-[#bfd0ea] bg-[#eef5ff] shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg xl:mt-0.5",
                          active
                            ? "bg-white text-[#1d4ed8]"
                            : "bg-slate-100 text-slate-500",
                        ].join(" ")}
                      >
                        {item.icon}
                      </span>
                      <div
                        className={`min-w-0 ${navCollapsed ? "xl:hidden" : ""}`}
                      >
                        <div className="truncate text-xs font-semibold text-slate-900 sm:text-sm">
                          {item.label}
                        </div>
                        <div className="mt-0.5 hidden text-[11px] leading-4 text-slate-500 xl:block">
                          {item.description}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-3 border-t border-slate-200 pt-3">
                <Link
                  href={workspaceHref}
                  className={[
                    "flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2.5 transition hover:border-slate-300 hover:bg-slate-50",
                    navCollapsed ? "xl:justify-center xl:px-2" : "xl:px-2.5",
                  ].join(" ")}
                  title="Назад в приложение"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 xl:mt-0.5">
                    <ArrowLeftCircle className="h-4 w-4" />
                  </span>
                  <div className={navCollapsed ? "xl:hidden" : ""}>
                    <div className="truncate text-xs font-semibold text-slate-900 sm:text-sm">
                      Назад в приложение
                    </div>
                    <div className="mt-0.5 hidden text-[11px] leading-4 text-slate-500 xl:block">
                      Выйти из режима администрирования и вернуться в рабочее
                      пространство
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </aside>

          <main className="min-w-0">
            <section className="rounded-[22px] border border-white/70 bg-white/80 p-3 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur-md sm:p-5 xl:p-6">
              <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <div className="product-page-kicker">Администрирование</div>
                  <h1 className="product-page-title mt-1">{title}</h1>
                  <p className="product-page-subtitle mt-1 max-w-4xl">
                    {description}
                  </p>
                </div>
                {actions ? (
                  <div className="flex flex-wrap items-center gap-3">
                    {actions}
                  </div>
                ) : null}
              </div>

              <div className="mt-4">{children}</div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
