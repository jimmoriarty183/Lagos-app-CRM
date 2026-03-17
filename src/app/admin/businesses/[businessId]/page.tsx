import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminSectionCard, AdminStatCard } from "@/app/admin/_components/AdminCards";
import { AdminShell } from "@/app/admin/_components/AdminShell";
import { InlineKeyValue, SectionList, formatDateTime, formatNumber } from "@/app/admin/_components/AdminShared";
import { requireAdminUser } from "@/lib/admin/access";
import { loadAdminDataset } from "@/lib/admin/queries";

export default async function AdminBusinessDetailPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  await requireAdminUser();
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
      title={business.slug || business.name || business.id}
      description="Детальный admin view по business: ownership, memberships, invites, orders и recent activity."
      actions={
        <Link href="/admin/businesses" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900">
          Назад к businesses
        </Link>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard label="Members" value={formatNumber(business.membersCount)} hint="Все memberships" />
        <AdminStatCard label="Managers" value={formatNumber(business.managersCount)} hint="MANAGER role" />
        <AdminStatCard label="Orders" value={formatNumber(businessOrders.length)} hint="Все заказы бизнеса" />
        <AdminStatCard label="Invites" value={formatNumber(businessInvites.length)} hint="Инвайты бизнеса" />
        <AdminStatCard label="Status" value={business.active ? "ACTIVE" : "INACTIVE"} hint={business.plan || "Без plan"} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <AdminSectionCard title="Основная информация">
          <div className="grid gap-3 sm:grid-cols-2">
            <InlineKeyValue label="Business ID" value={<span className="font-mono text-xs">{business.id}</span>} />
            <InlineKeyValue label="Slug" value={business.slug || "Нет"} />
            <InlineKeyValue label="Name" value={business.name || "Нет"} />
            <InlineKeyValue label="Owner" value={business.ownerLabel || "Не назначен"} />
            <InlineKeyValue label="Created at" value={formatDateTime(business.createdAt)} />
            <InlineKeyValue label="Updated at" value={formatDateTime(business.updatedAt)} />
            <InlineKeyValue label="Last activity" value={formatDateTime(business.lastActivityAt)} />
            <InlineKeyValue label="Plan" value={business.plan || "Нет"} />
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="Memberships">
          <SectionList
            items={business.memberships.map((membership) => ({
              title: `${membership.userLabel} • ${membership.role}`,
              meta: membership.email || membership.userId,
              href: `/admin/users/${membership.userId}`,
            }))}
            emptyTitle="Нет memberships"
            emptyDescription="У бизнеса пока нет привязанных пользователей."
          />
        </AdminSectionCard>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <AdminSectionCard title="Invites">
          <SectionList
            items={businessInvites.map((invite) => ({
              title: `${invite.email} • ${invite.status}`,
              meta: `${formatDateTime(invite.createdAt)} • ${invite.role}`,
              href: `/admin/invites?status=${invite.status.toLowerCase()}`,
            }))}
            emptyTitle="Нет инвайтов"
            emptyDescription="У бизнеса сейчас нет приглашений."
          />
        </AdminSectionCard>

        <AdminSectionCard title="Orders summary">
          <SectionList
            items={businessOrders.slice(0, 10).map((order) => ({
              title: `#${order.orderNumber ?? order.id} • ${order.status || "UNKNOWN"}`,
              meta: `${formatDateTime(order.createdAt)} • ${order.clientName || "без клиента"} • ${order.amount ?? 0}`,
            }))}
            emptyTitle="Нет заказов"
            emptyDescription="По этому business пока нет заказов."
          />
        </AdminSectionCard>

        <AdminSectionCard title="Recent activity">
          <SectionList
            items={businessActivity.map((activity) => ({
              title: activity.title,
              meta: `${formatDateTime(activity.createdAt)}${activity.userLabel ? ` • ${activity.userLabel}` : ""}${activity.meta ? ` • ${activity.meta}` : ""}`,
            }))}
            emptyTitle="Нет activity"
            emptyDescription="Для этого business активность пока не найдена."
          />
        </AdminSectionCard>
      </div>
    </AdminShell>
  );
}
