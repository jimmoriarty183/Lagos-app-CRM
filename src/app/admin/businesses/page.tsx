import { AdminSectionCard, AdminStatCard } from "@/app/admin/_components/AdminCards";
import { AdminShell } from "@/app/admin/_components/AdminShell";
import { Button } from "@/components/ui/button";
import {
  AdminBadge,
  AdminCell,
  AdminHeadCell,
  AdminSearchParams,
  AdminTable,
  AdminTableHeaderRow,
  AdminTableRow,
  EmptyState,
  PaginationBar,
  RowPrimaryLink,
  formatDateTime,
  formatNumber,
  getEnumParam,
  getIntParam,
  getSingleParam,
  translateLabel,
} from "@/app/admin/_components/AdminShared";
import { requireAdminUser } from "@/lib/admin/access";
import { loadAdminDataset } from "@/lib/admin/queries";

const PER_PAGE_OPTIONS = [20, 50, 100] as const;
const WINDOW_OPTIONS = ["all", "24h", "7d", "30d"] as const;
const ORDERS_OPTIONS = ["all", "with_orders", "zero_orders"] as const;
const ACTIVITY_OPTIONS = ["all", "active", "inactive"] as const;
const OWNER_OPTIONS = ["all", "assigned", "missing"] as const;
const SORT_OPTIONS = ["created_desc", "orders_desc", "last_activity_desc"] as const;

function inWindow(createdAtMs: number, window: (typeof WINDOW_OPTIONS)[number]) {
  if (window === "all") return true;
  const diff = Date.now() - createdAtMs;
  if (window === "24h") return diff <= 1000 * 60 * 60 * 24;
  if (window === "7d") return diff <= 1000 * 60 * 60 * 24 * 7;
  return diff <= 1000 * 60 * 60 * 24 * 30;
}

export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams?: Promise<AdminSearchParams>;
}) {
  const { workspaceHref } = await requireAdminUser("/admin/businesses");
  const params = (await searchParams) ?? {};
  const dataset = await loadAdminDataset();

  const q = getSingleParam(params.q).trim().toLowerCase();
  const window = getEnumParam(params.window, "all", WINDOW_OPTIONS);
  const orders = getEnumParam(params.orders, "all", ORDERS_OPTIONS);
  const activity = getEnumParam(params.activity, "all", ACTIVITY_OPTIONS);
  const owner = getEnumParam(params.owner, "all", OWNER_OPTIONS);
  const sort = getEnumParam(params.sort, "created_desc", SORT_OPTIONS);
  const perPage = getIntParam(params.perPage, 20, PER_PAGE_OPTIONS);

  const filtered = dataset.businesses
    .filter((item) => {
      const blob = [item.slug, item.name, item.id, item.ownerLabel].join(" ").toLowerCase();
      if (q && !blob.includes(q)) return false;
      if (!inWindow(item.createdAtMs, window)) return false;
      if (orders === "with_orders" && item.ordersCount <= 0) return false;
      if (orders === "zero_orders" && item.ordersCount > 0) return false;
      if (activity === "active" && !item.active) return false;
      if (activity === "inactive" && item.active) return false;
      if (owner === "assigned" && !item.ownerId) return false;
      if (owner === "missing" && item.ownerId) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === "orders_desc") return b.ordersCount - a.ordersCount;
      if (sort === "last_activity_desc") return b.lastActivityAtMs - a.lastActivityAtMs;
      return b.createdAtMs - a.createdAtMs;
    });

  const page = Math.min(getIntParam(params.page, 1), Math.max(1, Math.ceil(filtered.length / perPage)));
  const start = (page - 1) * perPage;
  const rows = filtered.slice(start, start + perPage);
  const currentParams: AdminSearchParams = {
    q: q || undefined,
    window,
    orders,
    activity,
    owner,
    sort,
    perPage: String(perPage),
    page: String(page),
  };

  return (
    <AdminShell
      activeHref="/admin/businesses"
      workspaceHref={workspaceHref}
      title="Бизнесы"
      description="Список всех бизнесов в системе с акцентом на владельца, число участников, использование заказов и последнюю активность."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Всего бизнесов" value={formatNumber(dataset.businesses.length)} hint="Все рабочие пространства" />
        <AdminStatCard label="Активные" value={formatNumber(dataset.businesses.filter((item) => item.active).length)} hint="Была активность за 30 дней" />
        <AdminStatCard label="Без владельца" value={formatNumber(dataset.businesses.filter((item) => !item.ownerId).length)} hint="Нужна ручная проверка" />
        <AdminStatCard label="Без заказов" value={formatNumber(dataset.businesses.filter((item) => item.ordersCount === 0).length)} hint="Еще не дошли до основного сценария" />
      </div>

      <div className="mt-4">
        <AdminSectionCard title="Фильтры и поиск">
          <form action="/admin/businesses" className="grid gap-2.5 lg:grid-cols-[minmax(0,1.4fr)_130px_140px_130px_130px_180px_120px]">
            <input name="q" defaultValue={q} placeholder="Поиск по названию, slug, ID или владельцу" className="h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
            <select name="window" defaultValue={window} className="h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
              <option value="all">Весь период</option>
              <option value="24h">24 часа</option>
              <option value="7d">7 дней</option>
              <option value="30d">30 дней</option>
            </select>
            <select name="orders" defaultValue={orders} className="h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
              <option value="all">Любые заказы</option>
              <option value="with_orders">Есть заказы</option>
              <option value="zero_orders">Без заказов</option>
            </select>
            <select name="activity" defaultValue={activity} className="h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
              <option value="all">Любая активность</option>
              <option value="active">Активные</option>
              <option value="inactive">Неактивные</option>
            </select>
            <select name="owner" defaultValue={owner} className="h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
              <option value="all">Любой владелец</option>
              <option value="assigned">Владелец назначен</option>
              <option value="missing">Без владельца</option>
            </select>
            <select name="sort" defaultValue={sort} className="h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
              <option value="created_desc">Сначала новые</option>
              <option value="orders_desc">По числу заказов</option>
              <option value="last_activity_desc">По последней активности</option>
            </select>
            <div className="flex gap-3">
              <select name="perPage" defaultValue={String(perPage)} className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
                {PER_PAGE_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              <Button type="submit" className="h-10 px-5 text-sm font-semibold">
                Применить
              </Button>
            </div>
          </form>
        </AdminSectionCard>
      </div>

      <div className="mt-4">
        {rows.length ? (
          <AdminTable
            head={
              <AdminTableHeaderRow>
                <AdminHeadCell className="w-[25%]">Бизнес</AdminHeadCell>
                <AdminHeadCell className="w-[18%]">Владелец</AdminHeadCell>
                <AdminHeadCell className="w-[10%]">Участники</AdminHeadCell>
                <AdminHeadCell className="w-[10%]">Заказы</AdminHeadCell>
                <AdminHeadCell className="w-[14%]">Создан</AdminHeadCell>
                <AdminHeadCell className="w-[13%]">Активность</AdminHeadCell>
                <AdminHeadCell className="w-[10%]">Статус / план</AdminHeadCell>
              </AdminTableHeaderRow>
            }
          >
            {rows.map((item) => (
              <AdminTableRow key={item.id} href={`/admin/businesses/${item.id}`}>
                <AdminCell>
                  <RowPrimaryLink
                    href={`/admin/businesses/${item.id}`}
                    meta={
                      <>
                        <div>{item.name || "Без названия"}</div>
                        <div className="mt-1 font-mono text-[11px] text-slate-400">{item.id}</div>
                      </>
                    }
                  >
                    {item.slug || item.name || item.id}
                  </RowPrimaryLink>
                </AdminCell>
                <AdminCell>{item.ownerLabel || "Не назначен"}</AdminCell>
                <AdminCell>{formatNumber(item.membersCount)}</AdminCell>
                <AdminCell>{formatNumber(item.ordersCount)}</AdminCell>
                <AdminCell>{formatDateTime(item.createdAt)}</AdminCell>
                <AdminCell>{formatDateTime(item.lastActivityAt)}</AdminCell>
                <AdminCell>
                  <div className="flex flex-wrap gap-2">
                    {item.subscriptionStatus ? (
                      <AdminBadge label={translateLabel(item.subscriptionStatus.toUpperCase())} tone={item.subscriptionStatus === "active" ? undefined : item.subscriptionStatus === "trialing" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"} />
                    ) : (
                      <AdminBadge label={item.active ? "ACTIVE" : "INACTIVE"} />
                    )}
                    {item.billingPlanCode ? (
                      <AdminBadge label={translateLabel(item.billingPlanCode.toUpperCase())} tone="bg-slate-100 text-slate-700" />
                    ) : item.plan ? (
                      <AdminBadge label={translateLabel(item.plan.toUpperCase())} tone="bg-slate-100 text-slate-700" />
                    ) : null}
                  </div>
                </AdminCell>
              </AdminTableRow>
            ))}
          </AdminTable>
        ) : (
          <EmptyState title="Бизнесы не найдены" description="Снимите часть фильтров или измените запрос, чтобы увидеть больше рабочих пространств." />
        )}

        <PaginationBar pathname="/admin/businesses" currentParams={currentParams} currentPage={page} totalPages={Math.max(1, Math.ceil(filtered.length / perPage))} />
      </div>
    </AdminShell>
  );
}
