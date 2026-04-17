import { AdminSectionCard, AdminStatCard } from "@/app/admin/_components/AdminCards";
import { AdminShell } from "@/app/admin/_components/AdminShell";
import { SectionList, formatDateTime, formatNumber } from "@/app/admin/_components/AdminShared";
import { requireAdminUser } from "@/lib/admin/access";
import { loadAdminDataset } from "@/lib/admin/queries";

export default async function AdminHealthPage() {
  const { workspaceHref } = await requireAdminUser("/admin/health");
  const dataset = await loadAdminDataset();

  const pendingInvitesOlderThan7Days = dataset.invites.filter(
    (invite) => invite.status === "PENDING" && invite.createdAtMs < Date.now() - 1000 * 60 * 60 * 24 * 7,
  );
  const staleBusinesses = dataset.businesses.filter(
    (business) => business.lastActivityAtMs > 0 && business.lastActivityAtMs < Date.now() - 1000 * 60 * 60 * 24 * 30,
  );
  const businessesWithoutMemberships = dataset.businesses.filter((business) => business.membersCount === 0);
  const businessesWithoutOwner = dataset.businesses.filter((business) => !business.ownerId);
  const usersWithoutBusiness = dataset.authUsers.filter((user) => !user.hasBusiness);
  const usersNeverSignedIn = dataset.authUsers.filter((user) => !user.hasSignIn);
  const usersUnconfirmed = dataset.authUsers.filter((user) => !user.emailConfirmedAt);

  return (
    <AdminShell
      activeHref="/admin/health"
      workspaceHref={workspaceHref}
      title="Контроль"
      description="Проблемные зоны, которые требуют ручного внимания: проблемы onboarding, владение бизнесами, неактивные бизнесы и старые приглашения."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Пользователи без бизнеса" value={formatNumber(usersWithoutBusiness.length)} hint="Нужно вернуть их в onboarding" href="/admin/users?business=none" />
        <AdminStatCard label="Без первого входа" value={formatNumber(usersNeverSignedIn.length)} hint="Регистрация без входа" href="/admin/users?signIn=never" />
        <AdminStatCard label="Неподтвержденная почта" value={formatNumber(usersUnconfirmed.length)} hint="Нужно проверить confirmation flow" href="/admin/users?status=unconfirmed" />
        <AdminStatCard label="Бизнесы без владельца" value={formatNumber(businessesWithoutOwner.length)} hint="Проблема владения" href="/admin/businesses?owner=missing" />
        <AdminStatCard label="Бизнесы без участников" value={formatNumber(businessesWithoutMemberships.length)} hint="Пустые рабочие пространства" href="/admin/businesses" />
        <AdminStatCard label="Бизнесы без заказов" value={formatNumber(dataset.businesses.filter((item) => item.ordersCount === 0).length)} hint="Не дошли до основного сценария" href="/admin/businesses?orders=zero_orders" />
        <AdminStatCard label="Неактивные бизнесы" value={formatNumber(staleBusinesses.length)} hint="Нет активности 30+ дней" href="/admin/businesses?activity=inactive" />
        <AdminStatCard label="Старые ожидающие приглашения" value={formatNumber(pendingInvitesOlderThan7Days.length)} hint="Приглашение старше 7 дней" href="/admin/invites?status=pending" />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <AdminSectionCard title="Проблемы по пользователям">
          <SectionList
            items={[
              ...usersWithoutBusiness.slice(0, 4).map((user) => ({
                title: `${user.fullName || user.email || user.id} • без бизнеса`,
                meta: `${user.email || "без email"} • ${formatDateTime(user.createdAt)}`,
                href: `/admin/users/${user.id}`,
              })),
              ...usersNeverSignedIn.slice(0, 4).map((user) => ({
                title: `${user.fullName || user.email || user.id} • без входа`,
                meta: `${user.email || "без email"} • ${formatDateTime(user.createdAt)}`,
                href: `/admin/users/${user.id}`,
              })),
            ]}
            emptyTitle="Проблемных пользователей не найдено"
            emptyDescription="В текущем срезе нет явных user-проблем."
          />
        </AdminSectionCard>

        <AdminSectionCard title="Проблемы по бизнесам">
          <SectionList
            items={[
              ...businessesWithoutOwner.slice(0, 4).map((business) => ({
                title: `${business.slug || business.name || business.id} • без владельца`,
                meta: `${formatDateTime(business.createdAt)} • участников: ${business.membersCount}`,
                href: `/admin/businesses/${business.id}`,
              })),
              ...staleBusinesses.slice(0, 4).map((business) => ({
                title: `${business.slug || business.name || business.id} • неактивен`,
                meta: `Последняя активность: ${formatDateTime(business.lastActivityAt)}`,
                href: `/admin/businesses/${business.id}`,
              })),
            ]}
            emptyTitle="Проблемных бизнесов не найдено"
            emptyDescription="Текущий health-check не показывает критичных проблем по бизнесам."
          />
        </AdminSectionCard>
      </div>

      <div className="mt-4">
        <AdminSectionCard title="Что считается приближенной оценкой">
          <div className="space-y-2 text-sm text-slate-600">
            <p>Активные и неактивные бизнесы считаются по доступным activity timestamps, а не по отдельной аналитической витрине.</p>
            <p>Сигналы по пользователям уже достаточно точны для контроля продуктовой воронки.</p>
            <p>Если понадобятся более строгие health-метрики, следующим шагом нужен materialized metrics слой или полноценный event pipeline.</p>
          </div>
        </AdminSectionCard>
      </div>
    </AdminShell>
  );
}
