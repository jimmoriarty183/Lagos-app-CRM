import { AdminSectionCard } from "@/app/admin/_components/AdminCards";
import { AdminShell } from "@/app/admin/_components/AdminShell";
import { Button } from "@/components/ui/button";
import {
  AdminCell,
  AdminHeadCell,
  AdminSearchParams,
  AdminTable,
  AdminTableHeaderRow,
  AdminTableRow,
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
  const { workspaceHref } = await requireAdminUser("/admin/activity");
  const params = (await searchParams) ?? {};
  const dataset = await loadAdminDataset();
  const q = getSingleParam(params.q).trim().toLowerCase();
  const type = getSingleParam(params.type).trim().toLowerCase();
  const perPage = getIntParam(params.perPage, 20, PER_PAGE_OPTIONS);

  const eventTypes = Array.from(new Set(dataset.activities.map((item) => item.kind))).sort();
  const eventLabels = new Map(dataset.activities.map((item) => [item.kind, item.title]));
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
      workspaceHref={workspaceHref}
      title="Активность"
      description="Глобальная лента системных событий. Часть событий пока собирается по доступным данным из существующих сущностей."
    >
      <AdminSectionCard title="Фильтры и поиск">
        <form action="/admin/activity" className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_220px_120px_120px]">
          <input name="q" defaultValue={q} placeholder="Поиск по типу события, пользователю или бизнесу" className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
          <select name="type" defaultValue={type} className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
            <option value="">Все события</option>
            {eventTypes.map((eventType) => (
              <option key={eventType} value={eventType}>
                {eventLabels.get(eventType) || eventType}
              </option>
            ))}
          </select>
          <select name="perPage" defaultValue={String(perPage)} className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
            {PER_PAGE_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <Button type="submit" className="h-11 px-5 text-sm font-semibold">
            Применить
          </Button>
        </form>
      </AdminSectionCard>

      <div className="mt-6">
        {rows.length ? (
          <AdminTable
            head={
              <AdminTableHeaderRow>
                <AdminHeadCell className="w-[16%]">Время</AdminHeadCell>
                <AdminHeadCell className="w-[26%]">Событие</AdminHeadCell>
                <AdminHeadCell className="w-[20%]">Пользователь</AdminHeadCell>
                <AdminHeadCell className="w-[20%]">Бизнес</AdminHeadCell>
                <AdminHeadCell className="w-[18%]">Детали</AdminHeadCell>
              </AdminTableHeaderRow>
            }
          >
            {rows.map((item) => (
              <AdminTableRow key={item.id}>
                <AdminCell>{formatDateTime(item.createdAt)}</AdminCell>
                <AdminCell>
                  <div className="font-semibold text-slate-900">{item.title}</div>
                  <div className="mt-1 text-xs text-slate-500">Тип события в журнале активности</div>
                </AdminCell>
                <AdminCell>{item.userLabel || "—"}</AdminCell>
                <AdminCell>{item.businessLabel || "—"}</AdminCell>
                <AdminCell>{item.meta || "—"}</AdminCell>
              </AdminTableRow>
            ))}
          </AdminTable>
        ) : (
          <EmptyState title="События не найдены" description="По текущему фильтру нет совпадений." />
        )}

        <PaginationBar pathname="/admin/activity" currentParams={currentParams} currentPage={page} totalPages={Math.max(1, Math.ceil(filtered.length / perPage))} />
      </div>
    </AdminShell>
  );
}
