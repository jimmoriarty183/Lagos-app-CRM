import Link from "next/link";
import { AdminTrendChart, AdminPieChartBlock, AdminStatusBarChart } from "@/app/admin/_components/AdminCharts";
import { AdminSectionCard, AdminStatCard } from "@/app/admin/_components/AdminCards";
import { AdminShell } from "@/app/admin/_components/AdminShell";
import { formatDateTime, formatNumber, SectionList } from "@/app/admin/_components/AdminShared";
import { requireAdminUser } from "@/lib/admin/access";
import { loadAdminDataset, loadAdminSummary } from "@/lib/admin/queries";

function buildDailySeries(values: { createdAtMs: number }[], key: "registrations" | "businesses") {
  const days = 14;
  const dayMs = 1000 * 60 * 60 * 24;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  return Array.from({ length: days }).map((_, index) => {
    const currentDay = new Date(startOfToday.getTime() - dayMs * (days - index - 1));
    const nextDay = new Date(currentDay.getTime() + dayMs);
    const count = values.filter(
      (item) => item.createdAtMs >= currentDay.getTime() && item.createdAtMs < nextDay.getTime(),
    ).length;

    return {
      date: new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(currentDay),
      [key]: count,
    };
  });
}

export default async function AdminDashboardPage() {
  const { user, workspaceHref } = await requireAdminUser("/admin");
  const [summary, dataset] = await Promise.all([loadAdminSummary(), loadAdminDataset()]);

  const registrationsTrend = buildDailySeries(dataset.authUsers, "registrations");
  const businessesTrend = buildDailySeries(dataset.businesses, "businesses");
  const recentRegistrations = dataset.authUsers.slice(0, 6);
  const recentBusinesses = [...dataset.businesses].sort((a, b) => b.createdAtMs - a.createdAtMs).slice(0, 6);
  const recentActivity = dataset.activities.slice(0, 8);

  const emailStatusChart = [
    { name: "Подтверждены", value: summary.confirmedEmail, fill: "#16a34a" },
    { name: "Не подтверждены", value: summary.unconfirmedEmail, fill: "#f59e0b" },
  ];
  const signInStatusChart = [
    { name: "Был вход", value: summary.usersWithSignIn, fill: "#2563eb" },
    { name: "Без входа", value: summary.usersNeverSignedIn, fill: "#94a3b8" },
  ];
  const invitesStatusChart = [
    { name: "Ожидают", value: summary.invitesPending },
    { name: "Приняты", value: summary.invitesAccepted },
    { name: "Отозваны", value: summary.invitesRevoked },
  ];

  const healthAlerts = [
    {
      title: `${formatNumber(summary.usersWithoutBusiness)} пользователей без бизнеса`,
      meta: "Стоит проверить, кто зарегистрировался, но не дошёл до создания рабочего пространства.",
      href: "/admin/health",
    },
    {
      title: `${formatNumber(summary.usersNeverSignedIn)} пользователей без первого входа`,
      meta: "Это прямой индикатор узкого места в onboarding или подтверждении почты.",
      href: "/admin/health",
    },
    {
      title: `${formatNumber(dataset.businesses.filter((item) => !item.ownerId).length)} бизнесов без владельца`,
      meta: "Нужно проверить владельца и состав участников у этих бизнесов.",
      href: "/admin/health",
    },
    {
      title: `${formatNumber(
        dataset.invites.filter((invite) => invite.status === "PENDING" && invite.createdAtMs < Date.now() - 1000 * 60 * 60 * 24 * 7).length,
      )} старых ожидающих приглашений`,
      meta: "Эти приглашения застряли в воронке и требуют внимания.",
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
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
          Вход как <span className="font-semibold text-slate-900">{user.email}</span>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        <AdminStatCard label="Всего пользователей" value={formatNumber(summary.totalUsers)} hint="Все пользователи авторизации в системе" href="/admin/users" />
        <AdminStatCard label="Регистрации сегодня" value={formatNumber(summary.registeredToday)} hint="Новые аккаунты за 24 часа" href="/admin/users?window=24h" />
        <AdminStatCard label="Регистрации за 7 дней" value={formatNumber(summary.registeredLast7Days)} hint="Новый приток пользователей" href="/admin/users?window=7d" />
        <AdminStatCard label="Подтвержденные email" value={formatNumber(summary.confirmedEmail)} hint="Почта уже подтверждена" href="/admin/users?status=confirmed" />
        <AdminStatCard label="Пользователи с входом" value={formatNumber(summary.usersWithSignIn)} hint="Хотя бы один успешный вход" href="/admin/users?signIn=has" />
        <AdminStatCard label="Пользователи с бизнесом" value={formatNumber(summary.usersWithBusiness)} hint="Есть хотя бы одно рабочее пространство" href="/admin/users?business=has" />
        <AdminStatCard label="Всего бизнесов" value={formatNumber(summary.totalBusinesses)} hint="Созданные рабочие пространства" href="/admin/businesses" />
        <AdminStatCard label="Всего заказов" value={formatNumber(summary.totalOrders)} hint="Все заказы в текущей БД" href="/admin/orders" />
      </div>

      <div className="mt-6 grid gap-4 2xl:grid-cols-2">
        <AdminTrendChart data={registrationsTrend} dataKey="registrations" title="Регистрации пользователей" />
        <AdminTrendChart data={businessesTrend} dataKey="businesses" title="Созданные бизнесы" />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <AdminPieChartBlock title="Подтверждение почты" data={emailStatusChart} />
        <AdminPieChartBlock title="Первый вход" data={signInStatusChart} />
        <AdminStatusBarChart title="Статусы приглашений" data={invitesStatusChart} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <AdminSectionCard title="Последние регистрации" actions={<Link href="/admin/users" className="text-sm font-medium text-slate-600 hover:text-slate-900">Открыть список</Link>}>
          <SectionList
            items={recentRegistrations.map((item) => ({
              title: item.fullName || item.email || item.id,
              meta: `${item.email || "без email"} • ${formatDateTime(item.createdAt)}`,
              href: `/admin/users/${item.id}`,
            }))}
            emptyTitle="Регистраций пока нет"
            emptyDescription="Когда появятся пользователи, здесь будет последний поток регистраций."
          />
        </AdminSectionCard>

        <AdminSectionCard title="Последние бизнесы" actions={<Link href="/admin/businesses" className="text-sm font-medium text-slate-600 hover:text-slate-900">Открыть список</Link>}>
          <SectionList
            items={recentBusinesses.map((item) => ({
              title: item.slug || item.name || item.id,
              meta: `${formatDateTime(item.createdAt)} • владелец: ${item.ownerLabel || "не назначен"}`,
              href: `/admin/businesses/${item.id}`,
            }))}
            emptyTitle="Бизнесов пока нет"
            emptyDescription="Когда появятся новые рабочие пространства, они будут показаны здесь."
          />
        </AdminSectionCard>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <AdminSectionCard title="Последняя активность" actions={<Link href="/admin/activity" className="text-sm font-medium text-slate-600 hover:text-slate-900">Открыть ленту</Link>}>
          <SectionList
            items={recentActivity.map((item) => ({
              title: `${item.title}${item.businessLabel ? ` • ${item.businessLabel}` : ""}`,
              meta: `${formatDateTime(item.createdAt)}${item.userLabel ? ` • ${item.userLabel}` : ""}${item.meta ? ` • ${item.meta}` : ""}`,
            }))}
            emptyTitle="Активности пока нет"
            emptyDescription="Когда в системе появятся события, они будут показаны здесь."
          />
        </AdminSectionCard>

        <AdminSectionCard title="Требует внимания" actions={<Link href="/admin/health" className="text-sm font-medium text-slate-600 hover:text-slate-900">Открыть контроль</Link>}>
          <SectionList
            items={healthAlerts}
            emptyTitle="Критичных проблем не найдено"
            emptyDescription="Базовые health-check показатели сейчас выглядят стабильно."
          />
        </AdminSectionCard>
      </div>
    </AdminShell>
  );
}
