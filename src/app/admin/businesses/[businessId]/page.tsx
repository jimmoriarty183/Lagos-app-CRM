import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminSectionCard, AdminStatCard } from "@/app/admin/_components/AdminCards";
import { AdminShell } from "@/app/admin/_components/AdminShell";
import { InlineKeyValue, SectionList, formatDateTime, formatNumber, translateLabel } from "@/app/admin/_components/AdminShared";
import { requireAdminUser } from "@/lib/admin/access";
import { loadAdminDataset } from "@/lib/admin/queries";

export default async function AdminBusinessDetailPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { workspaceHref } = await requireAdminUser();
  const { businessId } = await params;
  const dataset = await loadAdminDataset();
  const business = dataset.businesses.find((item) => item.id === businessId);

  if (!business) notFound();

  const businessInvites = dataset.invites.filter((item) => item.businessId === business.id);
  const businessOrders = dataset.orders.filter((item) => item.businessId === business.id);
  const businessActivity = dataset.activities.filter((item) => item.businessId === business.id).slice(0, 15);

  return (
    <AdminShell
      activeHref="/admin/businesses"
      workspaceHref={workspaceHref}
      title={business.slug || business.name || business.id}
      description="Детальный профиль бизнеса: владелец, участники, приглашения, заказы и недавняя активность."
      actions={
        <Link href="/admin/businesses" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900">
          Назад к списку
        </Link>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard label="Участники" value={formatNumber(business.membersCount)} hint="Все участники бизнеса" />
        <AdminStatCard label="Менеджеры" value={formatNumber(business.managersCount)} hint="Роль менеджера" />
        <AdminStatCard label="Заказы" value={formatNumber(businessOrders.length)} hint="Все заказы бизнеса" />
        <AdminStatCard label="Приглашения" value={formatNumber(businessInvites.length)} hint="Инвайты бизнеса" />
        <AdminStatCard label="Статус" value={business.active ? "Активен" : "Неактивен"} hint={business.plan ? `План: ${translateLabel(business.plan.toUpperCase())}` : "План не указан"} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <AdminSectionCard title="Основная информация">
          <div className="grid gap-3 sm:grid-cols-2">
            <InlineKeyValue label="ID бизнеса" value={<span className="font-mono text-xs">{business.id}</span>} />
            <InlineKeyValue label="Адрес бизнеса" value={business.slug || "Нет"} />
            <InlineKeyValue label="Название" value={business.name || "Нет"} />
            <InlineKeyValue label="Владелец" value={business.ownerLabel || "Не назначен"} />
            <InlineKeyValue label="Дата создания" value={formatDateTime(business.createdAt)} />
            <InlineKeyValue label="Обновлен" value={formatDateTime(business.updatedAt)} />
            <InlineKeyValue label="Последняя активность" value={formatDateTime(business.lastActivityAt)} />
            <InlineKeyValue label="План" value={business.plan ? translateLabel(business.plan.toUpperCase()) : "Нет"} />
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="Участники и роли">
          <SectionList
            items={business.memberships.map((membership) => ({
              title: `${membership.userLabel} • ${translateLabel(membership.role)}`,
              meta: membership.email || membership.userId,
              href: `/admin/users/${membership.userId}`,
            }))}
            emptyTitle="Участники не найдены"
            emptyDescription="У бизнеса пока нет привязанных пользователей."
          />
        </AdminSectionCard>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <AdminSectionCard title="Приглашения">
          <SectionList
            items={businessInvites.map((invite) => ({
              title: `${invite.email} • ${translateLabel(invite.status)}`,
              meta: `${formatDateTime(invite.createdAt)} • ${translateLabel(invite.role)}`,
              href: `/admin/invites?status=${invite.status.toLowerCase()}`,
            }))}
            emptyTitle="Приглашения не найдены"
            emptyDescription="У бизнеса сейчас нет активных инвайтов."
          />
        </AdminSectionCard>

        <AdminSectionCard title="Заказы">
          <SectionList
            items={businessOrders.slice(0, 10).map((order) => ({
              title: `#${order.orderNumber ?? order.id} • ${order.status || "Не указан"}`,
              meta: `${formatDateTime(order.createdAt)} • ${order.clientName || "без клиента"} • ${order.amount ?? 0}`,
            }))}
            emptyTitle="Заказы не найдены"
            emptyDescription="По этому бизнесу пока нет заказов."
          />
        </AdminSectionCard>

        <AdminSectionCard title="Последняя активность">
          <SectionList
            items={businessActivity.map((activity) => ({
              title: activity.title,
              meta: `${formatDateTime(activity.createdAt)}${activity.userLabel ? ` • ${activity.userLabel}` : ""}${activity.meta ? ` • ${activity.meta}` : ""}`,
            }))}
            emptyTitle="Активность не найдена"
            emptyDescription="По текущим данным по этому бизнесу нет событий."
          />
        </AdminSectionCard>
      </div>
    </AdminShell>
  );
}
