import Link from "next/link";
import { AdminSectionCard, AdminStatCard } from "@/app/admin/_components/AdminCards";
import { AdminShell } from "@/app/admin/_components/AdminShell";
import { formatDateTime, formatNumber, SectionList } from "@/app/admin/_components/AdminShared";
import { requireAdminUser } from "@/lib/admin/access";
import { loadAdminDataset, loadAdminSummary } from "@/lib/admin/queries";

export default async function AdminDashboardPage() {
  const user = await requireAdminUser("/admin");
  const [summary, dataset] = await Promise.all([loadAdminSummary(), loadAdminDataset()]);

  const recentRegistrations = dataset.authUsers.slice(0, 6);
  const recentBusinesses = [...dataset.businesses].sort((a, b) => b.createdAtMs - a.createdAtMs).slice(0, 6);
  const recentActivity = dataset.activities.slice(0, 8);

  const healthAlerts = [
    {
      title: `${formatNumber(summary.usersWithoutBusiness)} users without business`,
      meta: "Нужно понять, кто застрял после регистрации и не дошёл до создания workspace.",
      href: "/admin/health",
    },
    {
      title: `${formatNumber(summary.usersNeverSignedIn)} users never signed in`,
      meta: "Это сигнал проблем в onboarding или email confirmation flow.",
      href: "/admin/health",
    },
    {
      title: `${formatNumber(dataset.businesses.filter((item) => !item.ownerId).length)} businesses without owner`,
      meta: "Нужно проверить ownership и memberships у этих workspace.",
      href: "/admin/health",
    },
    {
      title: `${formatNumber(
        dataset.invites.filter((invite) => invite.status === "PENDING" && invite.createdAtMs < Date.now() - 1000 * 60 * 60 * 24 * 7).length,
      )} stale pending invites`,
      meta: "Старые pending invites зависают в воронке и требуют внимания.",
      href: "/admin/health",
    },
  ];

  return (
    <AdminShell
      activeHref="/admin"
      title="Dashboard"
      description="Главная product-owner сводка по пользователям, бизнесам, инвайтам, заказам и проблемным зонам."
      actions={
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
          Вход как <span className="font-semibold text-slate-900">{user.email}</span>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Total users" value={formatNumber(summary.totalUsers)} hint="Все auth users в текущем admin snapshot" href="/admin/users" />
        <AdminStatCard label="Registered today" value={formatNumber(summary.registeredToday)} hint="Новые регистрации за последние 24 часа" href="/admin/users?window=24h" />
        <AdminStatCard label="Registered 7d" value={formatNumber(summary.registeredLast7Days)} hint="Регистрации за последние 7 дней" href="/admin/users?window=7d" />
        <AdminStatCard label="Confirmed email" value={formatNumber(summary.confirmedEmail)} hint="Подтверждённые email" href="/admin/users?status=confirmed" />
        <AdminStatCard label="Unconfirmed email" value={formatNumber(summary.unconfirmedEmail)} hint="Ещё не подтверждены" href="/admin/users?status=unconfirmed" />
        <AdminStatCard label="Signed in" value={formatNumber(summary.usersWithSignIn)} hint="Хотя бы один успешный вход" href="/admin/users?signIn=has" />
        <AdminStatCard label="Never signed in" value={formatNumber(summary.usersNeverSignedIn)} hint="Ни одного входа" href="/admin/users?signIn=never" />
        <AdminStatCard label="Users with business" value={formatNumber(summary.usersWithBusiness)} hint="Есть хотя бы один business membership" href="/admin/users?business=has" />
        <AdminStatCard label="Users without business" value={formatNumber(summary.usersWithoutBusiness)} hint="Застряли до создания бизнеса" href="/admin/users?business=none" />
        <AdminStatCard label="Total businesses" value={formatNumber(summary.totalBusinesses)} hint="Все созданные workspace" href="/admin/businesses" />
        <AdminStatCard label="Businesses 7d" value={formatNumber(summary.businessesCreatedLast7Days)} hint="Новые бизнесы за последние 7 дней" href="/admin/businesses?window=7d" />
        <AdminStatCard label="Active businesses" value={formatNumber(summary.activeBusinesses)} hint="Best effort: была активность за 30 дней" href="/admin/businesses?activity=active" />
        <AdminStatCard label="Invites pending" value={formatNumber(summary.invitesPending)} hint="Ожидают принятия" href="/admin/invites?status=pending" />
        <AdminStatCard label="Invites accepted" value={formatNumber(summary.invitesAccepted)} hint="Уже приняты" href="/admin/invites?status=accepted" />
        <AdminStatCard label="Invites revoked" value={formatNumber(summary.invitesRevoked)} hint="Отозванные приглашения" href="/admin/invites?status=revoked" />
        <AdminStatCard label="Total orders" value={formatNumber(summary.totalOrders)} hint="Все заказы, доступные в текущей БД" href="/admin/orders" />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <AdminSectionCard title="Recent registrations" actions={<Link href="/admin/users" className="text-sm font-medium text-slate-600 hover:text-slate-900">Открыть users</Link>}>
          <SectionList
            items={recentRegistrations.map((item) => ({
              title: item.fullName || item.email || item.id,
              meta: `${item.email || "без email"} • ${formatDateTime(item.createdAt)}`,
              href: `/admin/users/${item.id}`,
            }))}
            emptyTitle="Нет регистраций"
            emptyDescription="В текущем snapshot auth users пока нет данных."
          />
        </AdminSectionCard>

        <AdminSectionCard title="Recent businesses" actions={<Link href="/admin/businesses" className="text-sm font-medium text-slate-600 hover:text-slate-900">Открыть businesses</Link>}>
          <SectionList
            items={recentBusinesses.map((item) => ({
              title: item.slug || item.name || item.id,
              meta: `${formatDateTime(item.createdAt)} • owner: ${item.ownerLabel || "не назначен"}`,
              href: `/admin/businesses/${item.id}`,
            }))}
            emptyTitle="Нет бизнесов"
            emptyDescription="Бизнесы пока не созданы."
          />
        </AdminSectionCard>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <AdminSectionCard title="Recent activity" actions={<Link href="/admin/activity" className="text-sm font-medium text-slate-600 hover:text-slate-900">Вся activity</Link>}>
          <SectionList
            items={recentActivity.map((item) => ({
              title: `${item.title}${item.businessLabel ? ` • ${item.businessLabel}` : ""}`,
              meta: `${formatDateTime(item.createdAt)}${item.userLabel ? ` • ${item.userLabel}` : ""}${item.meta ? ` • ${item.meta}` : ""}`,
            }))}
            emptyTitle="Нет activity"
            emptyDescription="Пока нечего показывать по текущим данным."
          />
        </AdminSectionCard>

        <AdminSectionCard title="Health alerts" actions={<Link href="/admin/health" className="text-sm font-medium text-slate-600 hover:text-slate-900">Открыть health</Link>}>
          <SectionList
            items={healthAlerts}
            emptyTitle="Критичных проблем не найдено"
            emptyDescription="Все базовые health-check блоки сейчас зелёные."
          />
        </AdminSectionCard>
      </div>
    </AdminShell>
  );
}
