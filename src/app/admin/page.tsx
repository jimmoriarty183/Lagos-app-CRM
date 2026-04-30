import Link from "next/link";
import { AdminTrendChart, AdminPieChartBlock, AdminStatusBarChart } from "@/app/admin/_components/AdminCharts";
import { AdminSectionCard, AdminStatCard } from "@/app/admin/_components/AdminCards";
import { AdminShell } from "@/app/admin/_components/AdminShell";
import {
  type AdminSearchParams,
  formatDateTime,
  formatNumber,
  getSingleParam,
  SectionList,
} from "@/app/admin/_components/AdminShared";
import { Button } from "@/components/ui/button";
import { requireAdminUser } from "@/lib/admin/access";
import { loadAdminDataset } from "@/lib/admin/queries";

type PeriodPreset =
  | "today"
  | "yesterday"
  | "week"
  | "month_current"
  | "month_previous"
  | "all"
  | "custom";

type PeriodRange = {
  preset: PeriodPreset;
  fromMs: number | null;
  toMs: number | null;
  referenceNowMs: number;
  label: string;
  fromInput: string;
  toInput: string;
};

const PERIOD_PRESETS: PeriodPreset[] = [
  "today",
  "yesterday",
  "week",
  "month_current",
  "month_previous",
  "all",
  "custom",
];

const DAY_MS = 1000 * 60 * 60 * 24;

function startOfDay(date = new Date()) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function toDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateInput(value: string) {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const [y, m, d] = trimmed.split("-").map((part) => Number.parseInt(part, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  const parsed = new Date(y, m - 1, d);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function resolvePeriod(params: AdminSearchParams): PeriodRange {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = new Date(todayStart.getTime() + DAY_MS);
  const yesterdayStart = new Date(todayStart.getTime() - DAY_MS);
  const weekStart = new Date(todayStart.getTime() - DAY_MS * 6);
  const monthCurrentStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
  const monthNextStart = new Date(todayStart.getFullYear(), todayStart.getMonth() + 1, 1);
  const monthPreviousStart = new Date(todayStart.getFullYear(), todayStart.getMonth() - 1, 1);

  const rawPreset = getSingleParam(params.period) as PeriodPreset;
  const preset: PeriodPreset = PERIOD_PRESETS.includes(rawPreset) ? rawPreset : "week";

  const rawFrom = getSingleParam(params.from);
  const rawTo = getSingleParam(params.to);

  if (preset === "today") {
    return {
      preset,
      fromMs: todayStart.getTime(),
      toMs: todayEnd.getTime(),
      referenceNowMs: todayEnd.getTime(),
      label: "Сегодня",
      fromInput: toDateInputValue(todayStart),
      toInput: toDateInputValue(todayStart),
    };
  }

  if (preset === "yesterday") {
    return {
      preset,
      fromMs: yesterdayStart.getTime(),
      toMs: todayStart.getTime(),
      referenceNowMs: todayEnd.getTime(),
      label: "Вчера",
      fromInput: toDateInputValue(yesterdayStart),
      toInput: toDateInputValue(yesterdayStart),
    };
  }

  if (preset === "week") {
    return {
      preset,
      fromMs: weekStart.getTime(),
      toMs: todayEnd.getTime(),
      referenceNowMs: todayEnd.getTime(),
      label: "Неделя",
      fromInput: toDateInputValue(weekStart),
      toInput: toDateInputValue(todayStart),
    };
  }

  if (preset === "month_current") {
    return {
      preset,
      fromMs: monthCurrentStart.getTime(),
      toMs: monthNextStart.getTime(),
      referenceNowMs: todayEnd.getTime(),
      label: "Текущий месяц",
      fromInput: toDateInputValue(monthCurrentStart),
      toInput: toDateInputValue(new Date(monthNextStart.getTime() - DAY_MS)),
    };
  }

  if (preset === "month_previous") {
    return {
      preset,
      fromMs: monthPreviousStart.getTime(),
      toMs: monthCurrentStart.getTime(),
      referenceNowMs: todayEnd.getTime(),
      label: "Предыдущий месяц",
      fromInput: toDateInputValue(monthPreviousStart),
      toInput: toDateInputValue(new Date(monthCurrentStart.getTime() - DAY_MS)),
    };
  }

  if (preset === "custom") {
    const fromDate = parseDateInput(rawFrom);
    const toDate = parseDateInput(rawTo);
    if (fromDate && toDate && fromDate.getTime() <= toDate.getTime()) {
      return {
        preset,
        fromMs: fromDate.getTime(),
        toMs: toDate.getTime() + DAY_MS,
        referenceNowMs: todayEnd.getTime(),
        label: `${toDateInputValue(fromDate)} - ${toDateInputValue(toDate)}`,
        fromInput: toDateInputValue(fromDate),
        toInput: toDateInputValue(toDate),
      };
    }
  }

  return {
    preset: "all",
    fromMs: null,
    toMs: null,
    referenceNowMs: todayEnd.getTime(),
    label: "Все время",
    fromInput: rawFrom,
    toInput: rawTo,
  };
}

function inRange(valueMs: number, range: PeriodRange) {
  if (!valueMs) return false;
  if (range.fromMs !== null && valueMs < range.fromMs) return false;
  if (range.toMs !== null && valueMs >= range.toMs) return false;
  return true;
}

function buildSeries(
  values: { createdAtMs: number }[],
  key: "registrations" | "businesses",
  range: PeriodRange,
) {
  const points = values.filter((item) => inRange(item.createdAtMs, range));
  if (!points.length) return [];

  const minMs = Math.min(...points.map((item) => item.createdAtMs));
  const maxMs = Math.max(...points.map((item) => item.createdAtMs));

  const chartStartMs = range.fromMs ?? startOfDay(new Date(minMs)).getTime();
  const chartEndMs = range.toMs ?? (startOfDay(new Date(maxMs)).getTime() + DAY_MS);
  const spanDays = Math.max(1, Math.round((chartEndMs - chartStartMs) / DAY_MS));

  if (spanDays <= 62) {
    return Array.from({ length: spanDays }).map((_, index) => {
      const dayStartMs = chartStartMs + index * DAY_MS;
      const dayEndMs = dayStartMs + DAY_MS;
      const count = points.filter(
        (item) => item.createdAtMs >= dayStartMs && item.createdAtMs < dayEndMs,
      ).length;

      return {
        label: new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(
          new Date(dayStartMs),
        ),
        [key]: count,
      };
    });
  }

  const monthly: { label: string; registrations?: number; businesses?: number }[] = [];
  let cursor = new Date(chartStartMs);
  cursor = new Date(cursor.getFullYear(), cursor.getMonth(), 1);

  while (cursor.getTime() < chartEndMs) {
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getTime();
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1).getTime();
    const count = points.filter((item) => item.createdAtMs >= monthStart && item.createdAtMs < monthEnd).length;

    monthly.push({
      label: new Intl.DateTimeFormat("ru-RU", { month: "short", year: "2-digit" }).format(cursor),
      [key]: count,
    });

    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  return monthly;
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<AdminSearchParams>;
}) {
  const { user, workspaceHref } = await requireAdminUser("/admin");
  const params = (await searchParams) ?? {};
  const period = resolvePeriod(params);

  const dataset = await loadAdminDataset();
  const now = period.referenceNowMs;

  const usersInPeriod = dataset.authUsers.filter((item) => inRange(item.createdAtMs, period));
  const usersActiveInPeriod = dataset.authUsers.filter((item) => inRange(item.lastSeenAtMs, period));
  const businessesInPeriod = dataset.businesses.filter((item) => inRange(item.createdAtMs, period));
  const invitesInPeriod = dataset.invites.filter((item) => inRange(item.createdAtMs, period));
  const ordersInPeriod = dataset.orders.filter((item) => inRange(item.createdAtMs, period));
  const activitiesInPeriod = dataset.activities.filter((item) => inRange(item.createdAtMs, period));

  const registrationsTrend = buildSeries(dataset.authUsers, "registrations", period);
  const businessesTrend = buildSeries(dataset.businesses, "businesses", period);

  const recentRegistrations = [...usersInPeriod]
    .sort((a, b) => b.createdAtMs - a.createdAtMs)
    .slice(0, 6);
  const recentBusinesses = [...businessesInPeriod]
    .sort((a, b) => b.createdAtMs - a.createdAtMs)
    .slice(0, 6);
  const recentActivity = activitiesInPeriod.slice(0, 8);

  const totalUsers = dataset.authUsers.length;
  const registeredToday = dataset.authUsers.filter((item) => now - item.createdAtMs <= DAY_MS).length;
  const registeredLast7Days = dataset.authUsers.filter((item) => now - item.createdAtMs <= DAY_MS * 7).length;
  const confirmedEmail = dataset.authUsers.filter((item) => Boolean(item.emailConfirmedAt)).length;
  const unconfirmedEmail = Math.max(0, totalUsers - confirmedEmail);
  const usersWithSignIn = usersActiveInPeriod.length;
  const usersNeverSignedIn = Math.max(0, totalUsers - dataset.authUsers.filter((item) => item.hasSignIn).length);
  const usersWithBusiness = dataset.authUsers.filter((item) => item.hasBusiness).length;
  const usersWithoutBusiness = Math.max(0, totalUsers - usersWithBusiness);
  const totalBusinesses = businessesInPeriod.length;
  const invitesPending = invitesInPeriod.filter((item) => item.status === "PENDING").length;
  const invitesAccepted = invitesInPeriod.filter((item) => item.status === "ACCEPTED").length;
  const invitesRevoked = invitesInPeriod.filter((item) => item.status === "REVOKED").length;
  const totalOrders = ordersInPeriod.length;

  const emailStatusChart = [
    { name: "Подтверждены", value: confirmedEmail, fill: "#16a34a" },
    { name: "Не подтверждены", value: unconfirmedEmail, fill: "#f59e0b" },
  ];
  const signInStatusChart = [
    { name: "Был вход", value: usersWithSignIn, fill: "#2563eb" },
    { name: "Без входа", value: usersNeverSignedIn, fill: "#94a3b8" },
  ];
  const invitesStatusChart = [
    { name: "Ожидают", value: invitesPending },
    { name: "Приняты", value: invitesAccepted },
    { name: "Отозваны", value: invitesRevoked },
  ];

  const healthAlerts = [
    {
      title: `${formatNumber(usersWithoutBusiness)} пользователей без бизнеса`,
      meta: "Проверьте onboarding для новых регистраций.",
      href: "/admin/health",
    },
    {
      title: `${formatNumber(usersNeverSignedIn)} пользователей без первого входа`,
      meta: "Индикатор проблем в sign-in потоке.",
      href: "/admin/health",
    },
    {
      title: `${formatNumber(businessesInPeriod.filter((item) => !item.ownerId).length)} бизнесов без владельца`,
      meta: "Нужна ручная проверка роли owner.",
      href: "/admin/health",
    },
    {
      title: `${formatNumber(
        invitesInPeriod.filter(
          (invite) => invite.status === "PENDING" && invite.createdAtMs < now - DAY_MS * 7,
        ).length,
      )} старых ожидающих приглашений`,
      meta: "Застрявшие инвайты в воронке.",
      href: "/admin/health",
    },
  ];

  return (
    <AdminShell
      activeHref="/admin"
      workspaceHref={workspaceHref}
      title="Сводка"
      description="Главная панель владельца продукта: регистрации, входы, бизнесы, приглашения, заказы и проблемные зоны."
      actions={
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 py-2 text-sm text-slate-600 dark:text-white/70">
          Вход как <span className="font-semibold text-slate-900 dark:text-white">{user.email}</span>
        </div>
      }
    >
      <AdminSectionCard title="Период сводки">
        <form action="/admin" className="grid gap-2 md:grid-cols-[220px_1fr_1fr_auto]">
          <select
            name="period"
            defaultValue={period.preset}
            className="h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm text-slate-900 dark:text-white outline-none transition hover:border-slate-300 dark:hover:border-white/20 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          >
            <option value="today">Сегодня</option>
            <option value="yesterday">Вчера</option>
            <option value="week">Неделя</option>
            <option value="month_current">Текущий месяц</option>
            <option value="month_previous">Предыдущий месяц</option>
            <option value="all">Все время</option>
            <option value="custom">Кастомный период</option>
          </select>
          <input
            type="date"
            name="from"
            defaultValue={period.fromInput}
            className="h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm text-slate-900 dark:text-white outline-none transition hover:border-slate-300 dark:hover:border-white/20 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          />
          <input
            type="date"
            name="to"
            defaultValue={period.toInput}
            className="h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm text-slate-900 dark:text-white outline-none transition hover:border-slate-300 dark:hover:border-white/20 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          />
          <Button
            type="submit"
            className="h-10 min-w-[116px] rounded-lg px-4 text-sm font-semibold text-white"
          >
            Применить
          </Button>
        </form>
        <div className="mt-2 text-xs text-slate-500 dark:text-white/55">Текущий фильтр: {period.label}</div>
      </AdminSectionCard>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        <AdminStatCard label="Всего пользователей" value={formatNumber(totalUsers)} hint="Все пользователи авторизации" href="/admin/users" />
        <AdminStatCard label="Регистрации сегодня" value={formatNumber(registeredToday)} hint="За последние 24 часа" href="/admin/users?window=24h" />
        <AdminStatCard label="Регистрации за 7 дней" value={formatNumber(registeredLast7Days)} hint="За последние 7 дней" href="/admin/users?window=7d" />
        <AdminStatCard label="Подтвержденные email" value={formatNumber(confirmedEmail)} hint="По всей базе пользователей" href="/admin/users?status=confirmed" />
        <AdminStatCard label="Пользователи с входом" value={formatNumber(usersWithSignIn)} hint={`Активность в период: ${period.label}`} href="/admin/activity" />
        <AdminStatCard label="Пользователи с бизнесом" value={formatNumber(usersWithBusiness)} hint="По всей базе пользователей" href="/admin/users?business=has" />
        <AdminStatCard label="Всего бизнесов" value={formatNumber(totalBusinesses)} hint="Созданы в выбранный период" href="/admin/businesses" />
        <AdminStatCard label="Всего заказов" value={formatNumber(totalOrders)} hint="Созданы в выбранный период" href="/admin/orders" />
      </div>

      <div className="mt-4 grid gap-3 2xl:grid-cols-2">
        <AdminTrendChart data={registrationsTrend} dataKey="registrations" title="Регистрации пользователей" subtitle={`Динамика: ${period.label}`} />
        <AdminTrendChart data={businessesTrend} dataKey="businesses" title="Созданные бизнесы" subtitle={`Динамика: ${period.label}`} />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        <AdminPieChartBlock title="Подтверждение почты" data={emailStatusChart} subtitle={`Срез: ${period.label}`} />
        <AdminPieChartBlock title="Первый вход" data={signInStatusChart} subtitle={`Срез: ${period.label}`} />
        <AdminStatusBarChart title="Статусы приглашений" data={invitesStatusChart} subtitle={`Срез: ${period.label}`} />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <AdminSectionCard
          title="Последние регистрации"
          actions={
            <Link href="/admin/users" className="text-sm font-medium text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white">
              Открыть список
            </Link>
          }
        >
          <SectionList
            items={recentRegistrations.map((item) => ({
              title: item.fullName || item.email || item.id,
              meta: `${item.email || "без email"} • ${formatDateTime(item.createdAt)}`,
              href: `/admin/users/${item.id}`,
            }))}
            emptyTitle="Регистраций за период нет"
            emptyDescription="Измените фильтр периода, чтобы увидеть больше данных."
          />
        </AdminSectionCard>

        <AdminSectionCard
          title="Последние бизнесы"
          actions={
            <Link href="/admin/businesses" className="text-sm font-medium text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white">
              Открыть список
            </Link>
          }
        >
          <SectionList
            items={recentBusinesses.map((item) => ({
              title: item.slug || item.name || item.id,
              meta: `${formatDateTime(item.createdAt)} • владелец: ${item.ownerLabel || "не назначен"}`,
              href: `/admin/businesses/${item.id}`,
            }))}
            emptyTitle="Бизнесов за период нет"
            emptyDescription="Измените фильтр периода, чтобы увидеть больше данных."
          />
        </AdminSectionCard>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
        <AdminSectionCard
          title="Последняя активность"
          actions={
            <Link href="/admin/activity" className="text-sm font-medium text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white">
              Открыть ленту
            </Link>
          }
        >
          <SectionList
            items={recentActivity.map((item) => ({
              title: `${item.title}${item.businessLabel ? ` • ${item.businessLabel}` : ""}`,
              meta: `${formatDateTime(item.createdAt)}${item.userLabel ? ` • ${item.userLabel}` : ""}${item.meta ? ` • ${item.meta}` : ""}`,
            }))}
            emptyTitle="Активности за период нет"
            emptyDescription="Измените фильтр периода, чтобы увидеть больше данных."
          />
        </AdminSectionCard>

        <AdminSectionCard
          title="Требует внимания"
          actions={
            <Link href="/admin/health" className="text-sm font-medium text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white">
              Открыть контроль
            </Link>
          }
        >
          <SectionList
            items={healthAlerts}
            emptyTitle="Критичных проблем не найдено"
            emptyDescription="По выбранному периоду сигналы в норме."
          />
        </AdminSectionCard>
      </div>
    </AdminShell>
  );
}
