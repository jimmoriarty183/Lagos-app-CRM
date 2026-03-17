import Link from "next/link";
import { TableRow } from "@/components/ui/table";
import { AdminSectionCard, AdminStatCard } from "@/app/admin/_components/AdminCards";
import { AdminShell } from "@/app/admin/_components/AdminShell";
import {
  AdminBadge,
  AdminCell,
  AdminHeadCell,
  AdminSearchParams,
  AdminTable,
  EmptyState,
  PaginationBar,
  formatDateTime,
  formatNumber,
  getEnumParam,
  getIntParam,
  getSingleParam,
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
  await requireAdminUser("/admin/businesses");
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
      title="Businesses"
      description="Все business entities в системе с ownership, orders summary и best-effort last activity."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Total businesses" value={formatNumber(dataset.businesses.length)} hint="Все workspace" />
        <AdminStatCard label="Active" value={formatNumber(dataset.businesses.filter((item) => item.active).length)} hint="Была активность за 30 дней" />
        <AdminStatCard label="No owner" value={formatNumber(dataset.businesses.filter((item) => !item.ownerId).length)} hint="Требуют ручной проверки" />
        <AdminStatCard label="Zero orders" value={formatNumber(dataset.businesses.filter((item) => item.ordersCount === 0).length)} hint="Ни одного заказа" />
      </div>

      <div className="mt-6">
        <AdminSectionCard title="Фильтры">
          <form action="/admin/businesses" className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_130px_140px_130px_130px_180px_120px]">
            <input name="q" defaultValue={q} placeholder="Поиск по slug, имени, ID, owner..." className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
            <select name="window" defaultValue={window} className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
              <option value="all">Весь период</option>
              <option value="24h">24h</option>
              <option value="7d">7d</option>
              <option value="30d">30d</option>
            </select>
            <select name="orders" defaultValue={orders} className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
              <option value="all">Все orders</option>
              <option value="with_orders">With orders</option>
              <option value="zero_orders">Zero orders</option>
            </select>
            <select name="activity" defaultValue={activity} className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
              <option value="all">Вся activity</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select name="owner" defaultValue={owner} className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
              <option value="all">Любой owner</option>
              <option value="assigned">Owner assigned</option>
              <option value="missing">No owner</option>
            </select>
            <select name="sort" defaultValue={sort} className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
              <option value="created_desc">created_at desc</option>
              <option value="orders_desc">orders desc</option>
              <option value="last_activity_desc">last_activity desc</option>
            </select>
            <div className="flex gap-3">
              <select name="perPage" defaultValue={String(perPage)} className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
                {PER_PAGE_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              <button type="submit" className="inline-flex h-11 items-center justify-center rounded-xl bg-[#1d4ed8] px-5 text-sm font-semibold text-white transition hover:bg-[#1e40af]">
                Apply
              </button>
            </div>
          </form>
        </AdminSectionCard>
      </div>

      <div className="mt-6">
        {rows.length ? (
          <AdminTable
            head={
              <>
                <AdminHeadCell>Business</AdminHeadCell>
                <AdminHeadCell>Owner</AdminHeadCell>
                <AdminHeadCell>Managers</AdminHeadCell>
                <AdminHeadCell>Orders</AdminHeadCell>
                <AdminHeadCell>Created</AdminHeadCell>
                <AdminHeadCell>Last activity</AdminHeadCell>
                <AdminHeadCell>Status</AdminHeadCell>
              </>
            }
          >
            {rows.map((item) => (
              <TableRow key={item.id} className="border-slate-100 hover:bg-slate-50/60">
                <AdminCell>
                  <Link href={`/admin/businesses/${item.id}`} className="font-semibold text-slate-900 hover:text-blue-700">
                    {item.slug || item.name || item.id}
                  </Link>
                  <div className="mt-1 text-slate-600">{item.name || "Без названия"}</div>
                  <div className="mt-1 font-mono text-[11px] text-slate-400">{item.id}</div>
                </AdminCell>
                <AdminCell>{item.ownerLabel || "Не назначен"}</AdminCell>
                <AdminCell>{formatNumber(item.managersCount)}</AdminCell>
                <AdminCell>{formatNumber(item.ordersCount)}</AdminCell>
                <AdminCell>{formatDateTime(item.createdAt)}</AdminCell>
                <AdminCell>{formatDateTime(item.lastActivityAt)}</AdminCell>
                <AdminCell>
                  <div className="flex flex-col gap-2">
                    <AdminBadge label={item.active ? "ACTIVE" : "INACTIVE"} />
                    {item.plan ? <AdminBadge label={item.plan.toUpperCase()} /> : null}
                  </div>
                </AdminCell>
              </TableRow>
            ))}
          </AdminTable>
        ) : (
          <EmptyState title="Нет бизнесов по фильтрам" description="Попробуйте снять часть ограничений или изменить запрос." />
        )}

        <PaginationBar pathname="/admin/businesses" currentParams={currentParams} currentPage={page} totalPages={Math.max(1, Math.ceil(filtered.length / perPage))} />
      </div>
    </AdminShell>
  );
}
