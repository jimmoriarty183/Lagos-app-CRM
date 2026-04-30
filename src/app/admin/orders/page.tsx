import Link from "next/link";
import { AdminSectionCard, AdminStatCard } from "@/app/admin/_components/AdminCards";
import { AdminShell } from "@/app/admin/_components/AdminShell";
import { SectionList, formatDateTime, formatNumber } from "@/app/admin/_components/AdminShared";
import { requireAdminUser } from "@/lib/admin/access";
import { loadAdminDataset } from "@/lib/admin/queries";

export default async function AdminOrdersPage() {
  const { workspaceHref } = await requireAdminUser("/admin/orders");
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
      workspaceHref={workspaceHref}
      title="Заказы"
      description="Агрегированный обзор заказов по продукту. Это не CRM, а панель понимания реального использования."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard label="Всего заказов" value={formatNumber(dataset.orders.length)} hint="Все доступные заказы" />
        <AdminStatCard label="Создано сегодня" value={formatNumber(ordersToday)} hint="Новые заказы за 24 часа" />
        <AdminStatCard label="Создано за 7 дней" value={formatNumber(orders7d)} hint="Новые заказы за неделю" />
        <AdminStatCard label="Создано за 30 дней" value={formatNumber(orders30d)} hint="Новые заказы за месяц" />
        <AdminStatCard label="Бизнесов с заказами" value={formatNumber(businessesWithOrders)} hint="Уже дошли до основного сценария" />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <AdminSectionCard title="Лидеры по числу заказов">
          <SectionList
            items={topBusinesses.map((business) => ({
              title: `${business.slug || business.name || business.id} • ${business.ordersCount} заказов`,
              meta: `${business.ownerLabel || "владелец не назначен"} • последняя активность: ${formatDateTime(business.lastActivityAt)}`,
              href: `/admin/businesses/${business.id}`,
            }))}
            emptyTitle="Данных по заказам пока нет"
            emptyDescription="Когда заказы появятся, здесь будут самые активные бизнесы."
          />
        </AdminSectionCard>

        <AdminSectionCard title="Последние заказы">
          <SectionList
            items={recentOrders.map((order) => ({
              title: `#${order.orderNumber ?? order.id} • ${order.status || "Не указан"}`,
              meta: `${formatDateTime(order.createdAt)} • ${order.businessLabel} • ${order.clientName || "без клиента"} • ${order.amount ?? 0}`,
            }))}
            emptyTitle="Заказов пока нет"
            emptyDescription="Когда заказы появятся, здесь будет виден свежий поток использования."
          />
        </AdminSectionCard>
      </div>

      <div className="mt-4">
        <AdminSectionCard title="Продуктовые сигналы">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-white/55">Бизнесы без заказов</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{formatNumber(businessesZeroOrders)}</div>
              <Link href="/admin/businesses?orders=zero_orders" className="mt-2 inline-block text-sm text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white">
                Открыть список
              </Link>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-white/55">Текущее покрытие раздела</div>
              <div className="mt-2 text-sm text-slate-600 dark:text-white/70">
                Раздел работает от реальных orders в базе и уже показывает общую картину adoption без лишней CRM-сложности.
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-white/55">Ограничение</div>
              <div className="mt-2 text-sm text-slate-600 dark:text-white/70">
                Для revenue-аналитики и более сложной воронки позже понадобится отдельный metrics слой.
              </div>
            </div>
          </div>
        </AdminSectionCard>
      </div>
    </AdminShell>
  );
}
