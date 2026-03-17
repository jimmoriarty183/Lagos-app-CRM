import { TableRow } from "@/components/ui/table";
import { AdminSectionCard } from "@/app/admin/_components/AdminCards";
import { AdminShell } from "@/app/admin/_components/AdminShell";
import {
  AdminCell,
  AdminHeadCell,
  AdminSearchParams,
  AdminTable,
  EmptyState,
  PaginationBar,
  formatDateTime,
  getIntParam,
  getSingleParam,
} from "@/app/admin/_components/AdminShared";
import { requireAdminUser } from "@/lib/admin/access";
import { loadAdminDataset } from "@/lib/admin/queries";

const PER_PAGE_OPTIONS = [20, 50, 100] as const;

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams?: Promise<AdminSearchParams>;
}) {
  await requireAdminUser("/admin/activity");
  const params = (await searchParams) ?? {};
  const dataset = await loadAdminDataset();
  const q = getSingleParam(params.q).trim().toLowerCase();
  const type = getSingleParam(params.type).trim().toLowerCase();
  const perPage = getIntParam(params.perPage, 20, PER_PAGE_OPTIONS);

  const eventTypes = Array.from(new Set(dataset.activities.map((item) => item.kind))).sort();

  const filtered = dataset.activities.filter((item) => {
    const blob = [item.kind, item.title, item.userLabel, item.businessLabel, item.meta].join(" ").toLowerCase();
    if (q && !blob.includes(q)) return false;
    if (type && item.kind.toLowerCase() !== type) return false;
    return true;
  });

  const page = Math.min(getIntParam(params.page, 1), Math.max(1, Math.ceil(filtered.length / perPage)));
  const rows = filtered.slice((page - 1) * perPage, page * perPage);
  const currentParams: AdminSearchParams = {
    q: q || undefined,
    type: type || undefined,
    perPage: String(perPage),
    page: String(page),
  };

  return (
    <AdminShell
      activeHref="/admin/activity"
      title="Activity"
      description="Глобальная лента системных событий. Часть событий синтезируется best effort из существующих сущностей, пока нет полноценного event log."
    >
      <AdminSectionCard title="Фильтры">
        <form action="/admin/activity" className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_220px_120px_120px]">
          <input name="q" defaultValue={q} placeholder="Поиск по type, user, business, meta..." className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
          <select name="type" defaultValue={type} className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
            <option value="">Все события</option>
            {eventTypes.map((eventType) => (
              <option key={eventType} value={eventType}>
                {eventType}
              </option>
            ))}
          </select>
          <select name="perPage" defaultValue={String(perPage)} className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
            {PER_PAGE_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <button type="submit" className="inline-flex h-11 items-center justify-center rounded-xl bg-[#1d4ed8] px-5 text-sm font-semibold text-white transition hover:bg-[#1e40af]">
            Apply
          </button>
        </form>
      </AdminSectionCard>

      <div className="mt-6">
        {rows.length ? (
          <AdminTable
            head={
              <>
                <AdminHeadCell>Time</AdminHeadCell>
                <AdminHeadCell>Event</AdminHeadCell>
                <AdminHeadCell>User</AdminHeadCell>
                <AdminHeadCell>Business</AdminHeadCell>
                <AdminHeadCell>Meta</AdminHeadCell>
              </>
            }
          >
            {rows.map((item) => (
              <TableRow key={item.id} className="border-slate-100 hover:bg-slate-50/60">
                <AdminCell>{formatDateTime(item.createdAt)}</AdminCell>
                <AdminCell>
                  <div className="font-semibold text-slate-900">{item.title}</div>
                  <div className="mt-1 text-xs text-slate-500">{item.kind}</div>
                </AdminCell>
                <AdminCell>{item.userLabel || "—"}</AdminCell>
                <AdminCell>{item.businessLabel || "—"}</AdminCell>
                <AdminCell>{item.meta || "—"}</AdminCell>
              </TableRow>
            ))}
          </AdminTable>
        ) : (
          <EmptyState title="Нет activity" description="По текущему фильтру событий не найдено." />
        )}

        <PaginationBar pathname="/admin/activity" currentParams={currentParams} currentPage={page} totalPages={Math.max(1, Math.ceil(filtered.length / perPage))} />
      </div>
    </AdminShell>
  );
}
