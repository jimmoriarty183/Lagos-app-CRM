import Link from "next/link";
import { AdminSectionCard, AdminStatCard } from "@/app/admin/_components/AdminCards";
import { AdminShell } from "@/app/admin/_components/AdminShell";
import { SectionList, formatDateTime, formatNumber } from "@/app/admin/_components/AdminShared";
import { requireAdminUser } from "@/lib/admin/access";
import { loadAdminDataset } from "@/lib/admin/queries";

export default async function AdminOrdersPage() {
  await requireAdminUser("/admin/orders");
  const dataset = await loadAdminDataset();

  const dayMs = 1000 * 60 * 60 * 24;
  const now = Date.now();
  const ordersToday = dataset.orders.filter((item) => now - item.createdAtMs <= dayMs).length;
  const orders7d = dataset.orders.filter((item) => now - item.createdAtMs <= dayMs * 7).length;
  const orders30d = dataset.orders.filter((item) => now - item.createdAtMs <= dayMs * 30).length;
  const businessesWithOrders = dataset.businesses.filter((item) => item.ordersCount > 0).length;
  const businessesZeroOrders = dataset.businesses.filter((item) => item.ordersCount === 0).length;
  const topBusinesses = [...dataset.businesses].sort((a, b) => b.ordersCount - a.ordersCount).slice(0, 8);
  const recentOrders = [...dataset.orders].sort((a, b) => b.createdAtMs - a.createdAtMs).slice(0, 12);

  return (
    <AdminShell
      activeHref="/admin/orders"
      title="Orders overview"
      description="Агрегированный обзор заказов по продукту. Это не CRM-интерфейс, а product-owner summary по order adoption."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard label="Total orders" value={formatNumber(dataset.orders.length)} hint="Все orders из БД" />
        <AdminStatCard label="Created today" value={formatNumber(ordersToday)} hint="Новые заказы за 24 часа" />
        <AdminStatCard label="Created 7d" value={formatNumber(orders7d)} hint="Новые заказы за 7 дней" />
        <AdminStatCard label="Created 30d" value={formatNumber(orders30d)} hint="Новые заказы за 30 дней" />
        <AdminStatCard label="Businesses with orders" value={formatNumber(businessesWithOrders)} hint="Уже используют core workflow" />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <AdminSectionCard title="Top businesses by orders count">
          <SectionList
            items={topBusinesses.map((business) => ({
              title: `${business.slug || business.name || business.id} • ${business.ordersCount} orders`,
              meta: `${business.ownerLabel || "owner not assigned"} • last activity: ${formatDateTime(business.lastActivityAt)}`,
              href: `/admin/businesses/${business.id}`,
            }))}
            emptyTitle="Нет order data"
            emptyDescription="По текущей БД заказы пока не найдены."
          />
        </AdminSectionCard>

        <AdminSectionCard title="Recent orders">
          <SectionList
            items={recentOrders.map((order) => ({
              title: `#${order.orderNumber ?? order.id} • ${order.status || "UNKNOWN"}`,
              meta: `${formatDateTime(order.createdAt)} • ${order.businessLabel} • ${order.clientName || "без клиента"} • ${order.amount ?? 0}`,
            }))}
            emptyTitle="Нет recent orders"
            emptyDescription="Orders сейчас отсутствуют."
          />
        </AdminSectionCard>
      </div>

      <div className="mt-6">
        <AdminSectionCard title="Product signals">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Businesses with zero orders</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{formatNumber(businessesZeroOrders)}</div>
              <Link href="/admin/businesses?orders=zero_orders" className="mt-2 inline-block text-sm text-slate-600 hover:text-slate-900">
                Открыть список
              </Link>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Orders overview scope</div>
              <div className="mt-2 text-sm text-slate-600">
                Раздел работает от текущих orders. Если появятся новые order сущности или billing планы, сюда можно будет безопасно расширить агрегации.
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">TECH DEBT</div>
              <div className="mt-2 text-sm text-slate-600">
                Для revenue-grade аналитики понадобится отдельный metrics слой, а не прямые admin queries по OLTP таблицам.
              </div>
            </div>
          </div>
        </AdminSectionCard>
      </div>
    </AdminShell>
  );
}
