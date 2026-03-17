import { AdminSectionCard, AdminStatCard } from "@/app/admin/_components/AdminCards";
import { AdminShell } from "@/app/admin/_components/AdminShell";
import { SectionList, formatDateTime, formatNumber } from "@/app/admin/_components/AdminShared";
import { requireAdminUser } from "@/lib/admin/access";
import { loadAdminDataset } from "@/lib/admin/queries";

export default async function AdminHealthPage() {
  await requireAdminUser("/admin/health");
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
      title="Health"
      description="Actionable admin view по проблемным зонам: onboarding gaps, ownership issues, stale businesses и зависшие invites."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Users without business" value={formatNumber(usersWithoutBusiness.length)} hint="Нужен follow-up по onboarding" href="/admin/users?business=none" />
        <AdminStatCard label="Never signed in" value={formatNumber(usersNeverSignedIn.length)} hint="Регистрация без первого входа" href="/admin/users?signIn=never" />
        <AdminStatCard label="Unconfirmed email" value={formatNumber(usersUnconfirmed.length)} hint="Нужно проверить confirmation flow" href="/admin/users?status=unconfirmed" />
        <AdminStatCard label="Businesses without owner" value={formatNumber(businessesWithoutOwner.length)} hint="Ownership issue" href="/admin/businesses?owner=missing" />
        <AdminStatCard label="Businesses without memberships" value={formatNumber(businessesWithoutMemberships.length)} hint="Пустые workspace" href="/admin/businesses" />
        <AdminStatCard label="Businesses with zero orders" value={formatNumber(dataset.businesses.filter((item) => item.ordersCount === 0).length)} hint="Не дошли до core use case" href="/admin/businesses?orders=zero_orders" />
        <AdminStatCard label="Stale businesses" value={formatNumber(staleBusinesses.length)} hint="Нет activity 30+ дней" href="/admin/businesses?activity=inactive" />
        <AdminStatCard label="Old pending invites" value={formatNumber(pendingInvitesOlderThan7Days.length)} hint="Pending invite старше 7 дней" href="/admin/invites?status=pending" />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <AdminSectionCard title="Проблемы по пользователям">
          <SectionList
            items={[
              ...usersWithoutBusiness.slice(0, 4).map((user) => ({
                title: `${user.fullName || user.email || user.id} • no business`,
                meta: `${user.email || "без email"} • ${formatDateTime(user.createdAt)}`,
                href: `/admin/users/${user.id}`,
              })),
              ...usersNeverSignedIn.slice(0, 4).map((user) => ({
                title: `${user.fullName || user.email || user.id} • never signed in`,
                meta: `${user.email || "без email"} • ${formatDateTime(user.createdAt)}`,
                href: `/admin/users/${user.id}`,
              })),
            ]}
            emptyTitle="Нет user alerts"
            emptyDescription="Проблемных user кейсов сейчас не найдено."
          />
        </AdminSectionCard>

        <AdminSectionCard title="Проблемы по бизнесам">
          <SectionList
            items={[
              ...businessesWithoutOwner.slice(0, 4).map((business) => ({
                title: `${business.slug || business.name || business.id} • no owner`,
                meta: `${formatDateTime(business.createdAt)} • members: ${business.membersCount}`,
                href: `/admin/businesses/${business.id}`,
              })),
              ...staleBusinesses.slice(0, 4).map((business) => ({
                title: `${business.slug || business.name || business.id} • stale`,
                meta: `last activity: ${formatDateTime(business.lastActivityAt)}`,
                href: `/admin/businesses/${business.id}`,
              })),
            ]}
            emptyTitle="Нет business alerts"
            emptyDescription="Сейчас явных business проблем не найдено."
          />
        </AdminSectionCard>
      </div>

      <div className="mt-6">
        <AdminSectionCard title="Что здесь best effort">
          <div className="space-y-3 text-sm text-slate-600">
            <p>Active / stale businesses считаются без отдельной аналитической таблицы: по order activity, invite activity, activity_events и updated_at.</p>
            <p>Users without business и never signed in уже достаточно точны для продуктовой воронки.</p>
            <p>Если понадобится надёжный health-monitoring, следующим шагом нужна materialized admin metrics view или event log pipeline.</p>
          </div>
        </AdminSectionCard>
      </div>
    </AdminShell>
  );
}
