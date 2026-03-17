import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminSectionCard, AdminStatCard } from "@/app/admin/_components/AdminCards";
import { AdminShell } from "@/app/admin/_components/AdminShell";
import { AdminBadge, InlineKeyValue, SectionList, formatDateTime, formatNumber, translateLabel } from "@/app/admin/_components/AdminShared";
import { requireAdminUser } from "@/lib/admin/access";
import { loadAdminDataset } from "@/lib/admin/queries";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { workspaceHref } = await requireAdminUser();
  const { userId } = await params;
  const dataset = await loadAdminDataset();
  const user = dataset.authUsers.find((item) => item.id === userId);

  if (!user) notFound();

  const userInvites = dataset.invites.filter((invite) => invite.email.toLowerCase() === String(user.email ?? "").toLowerCase());
  const userActivities = dataset.activities
    .filter((item) => item.userId === user.id || String(item.meta ?? "").toLowerCase() === String(user.email ?? "").toLowerCase())
    .slice(0, 12);
  const createdOrders = dataset.orders.filter((order) => order.managerId === user.id);

  return (
    <AdminShell
      activeHref="/admin/users"
      workspaceHref={workspaceHref}
      title={user.fullName || user.email || user.id}
      description="Детальный профиль пользователя: основная информация, привязки к бизнесам, приглашения и последняя активность."
      actions={
        <Link href="/admin/users" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900">
          Назад к списку
        </Link>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard label="Бизнесы" value={formatNumber(user.businessesCount)} hint="Количество привязок к бизнесам" />
        <AdminStatCard label="Основная роль" value={translateLabel(user.primaryRole)} hint="Максимальная роль среди всех привязок" />
        <AdminStatCard label="Приглашения" value={formatNumber(userInvites.length)} hint="Найдено по email пользователя" />
        <AdminStatCard label="Заказы в управлении" value={formatNumber(createdOrders.length)} hint="По текущим данным manager_id" />
        <AdminStatCard label="Статус" value={user.emailConfirmedAt ? "Подтвержден" : "Не подтвержден"} hint={user.hasSignIn ? "Вход уже был" : "Входа еще не было"} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <AdminSectionCard title="Основная информация">
          <div className="grid gap-3 sm:grid-cols-2">
            <InlineKeyValue label="ID пользователя" value={<span className="font-mono text-xs">{user.id}</span>} />
            <InlineKeyValue label="Email" value={user.email || "Нет"} />
            <InlineKeyValue label="Имя" value={user.fullName || "Нет"} />
            <InlineKeyValue label="Телефон" value={user.phone || "Нет"} />
            <InlineKeyValue label="Дата регистрации" value={formatDateTime(user.createdAt)} />
            <InlineKeyValue label="Подтверждение почты" value={formatDateTime(user.emailConfirmedAt)} />
            <InlineKeyValue label="Последний вход" value={formatDateTime(user.lastSignInAt)} />
            <InlineKeyValue label="Число входов" value="Нет в текущей модели данных" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <AdminBadge label={user.emailConfirmedAt ? "CONFIRMED" : "UNCONFIRMED"} />
            <AdminBadge label={user.hasSignIn ? "HAS_SIGN_IN" : "NEVER_SIGNED_IN"} />
            <AdminBadge label={user.hasBusiness ? "HAS_BUSINESS" : "NO_BUSINESS"} />
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="Бизнесы и роли">
          <SectionList
            items={user.businesses.map((businessItem) => ({
              title: `${businessItem.slug || businessItem.name || businessItem.id} • ${translateLabel(businessItem.role)}`,
              meta: businessItem.id,
              href: `/admin/businesses/${businessItem.id}`,
            }))}
            emptyTitle="Привязки к бизнесам не найдены"
            emptyDescription="Пользователь пока не привязан ни к одному бизнесу."
          />
        </AdminSectionCard>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <AdminSectionCard title="Приглашения">
          <SectionList
            items={userInvites.map((invite) => ({
              title: `${invite.businessLabel} • ${translateLabel(invite.status)}`,
              meta: `${formatDateTime(invite.createdAt)} • ${translateLabel(invite.role)}`,
              href: `/admin/invites?status=${invite.status.toLowerCase()}`,
            }))}
            emptyTitle="Приглашения не найдены"
            emptyDescription="По email пользователя инвайты не найдены."
          />
        </AdminSectionCard>

        <AdminSectionCard title="Последняя активность">
          <SectionList
            items={userActivities.map((activity) => ({
              title: activity.title,
              meta: `${formatDateTime(activity.createdAt)}${activity.businessLabel ? ` • ${activity.businessLabel}` : ""}${activity.meta ? ` • ${activity.meta}` : ""}`,
            }))}
            emptyTitle="Активность не найдена"
            emptyDescription="По текущим данным событий для пользователя не найдено."
          />
        </AdminSectionCard>

        <AdminSectionCard title="Ограничения">
          <div className="space-y-3 text-sm text-slate-600">
            <p>Детали собраны из пользователей авторизации, профиля, привязок к бизнесам, приглашений и заказов.</p>
            <p>Полного audit trail по IP, device и числу входов пока нет.</p>
            <p>Безопасные admin actions лучше добавлять позже через отдельный ACL и audit log.</p>
          </div>
        </AdminSectionCard>
      </div>
    </AdminShell>
  );
}
