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
const STATUS_OPTIONS = ["all", "pending", "accepted", "revoked", "expired"] as const;

export default async function AdminInvitesPage({
  searchParams,
}: {
  searchParams?: Promise<AdminSearchParams>;
}) {
  const { workspaceHref } = await requireAdminUser("/admin/invites");
  const params = (await searchParams) ?? {};
  const dataset = await loadAdminDataset();

  const q = getSingleParam(params.q).trim().toLowerCase();
  const status = getEnumParam(params.status, "all", STATUS_OPTIONS);
  const perPage = getIntParam(params.perPage, 20, PER_PAGE_OPTIONS);

  const filtered = dataset.invites
    .filter((item) => {
      const blob = [item.email, item.businessLabel, item.id, item.role, item.status, item.invitedByLabel].join(" ").toLowerCase();
      if (q && !blob.includes(q)) return false;
      if (status === "pending" && item.status !== "PENDING") return false;
      if (status === "accepted" && item.status !== "ACCEPTED") return false;
      if (status === "revoked" && item.status !== "REVOKED") return false;
      if (status === "expired") {
        const expired = Boolean(item.expiresAt) && new Date(String(item.expiresAt)).getTime() < Date.now() && item.status === "PENDING";
        if (!expired) return false;
      }
      return true;
    })
    .sort((a, b) => b.createdAtMs - a.createdAtMs);

  const page = Math.min(getIntParam(params.page, 1), Math.max(1, Math.ceil(filtered.length / perPage)));
  const rows = filtered.slice((page - 1) * perPage, page * perPage);
  const currentParams: AdminSearchParams = {
    q: q || undefined,
    status,
    perPage: String(perPage),
    page: String(page),
  };

  return (
    <AdminShell
      activeHref="/admin/invites"
      workspaceHref={workspaceHref}
      title="Приглашения"
      description="Приглашения в бизнесы с акцентом на статус, автора приглашения и зависшие pending-инвайты."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Всего приглашений" value={formatNumber(dataset.invites.length)} hint="Все приглашения в системе" />
        <AdminStatCard label="Ожидают" value={formatNumber(dataset.invites.filter((item) => item.status === "PENDING").length)} hint="Еще не приняты" />
        <AdminStatCard label="Приняты" value={formatNumber(dataset.invites.filter((item) => item.status === "ACCEPTED").length)} hint="Уже использованы" />
        <AdminStatCard label="Отозваны" value={formatNumber(dataset.invites.filter((item) => item.status === "REVOKED").length)} hint="Отменены вручную" />
      </div>

      <div className="mt-4">
        <AdminSectionCard title="Фильтры и поиск">
          <form action="/admin/invites" className="grid gap-2.5 lg:grid-cols-[minmax(0,1.4fr)_180px_120px_120px]">
            <input name="q" defaultValue={q} placeholder="Поиск по email, бизнесу или автору приглашения" className="h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3.5 text-sm text-slate-900 dark:text-white outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
            <select name="status" defaultValue={status} className="h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3.5 text-sm text-slate-900 dark:text-white outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
              <option value="all">Все статусы</option>
              <option value="pending">Ожидают</option>
              <option value="accepted">Приняты</option>
              <option value="revoked">Отозваны</option>
              <option value="expired">Истекли</option>
            </select>
            <select name="perPage" defaultValue={String(perPage)} className="h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3.5 text-sm text-slate-900 dark:text-white outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
              {PER_PAGE_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <Button type="submit" className="h-10 px-5 text-sm font-semibold">
              Применить
            </Button>
          </form>
        </AdminSectionCard>
      </div>

      <div className="mt-4">
        {rows.length ? (
          <AdminTable
            head={
              <AdminTableHeaderRow>
                <AdminHeadCell className="w-[26%]">Email</AdminHeadCell>
                <AdminHeadCell className="w-[24%]">Бизнес</AdminHeadCell>
                <AdminHeadCell className="w-[20%]">Кто пригласил</AdminHeadCell>
                <AdminHeadCell className="w-[14%]">Статус</AdminHeadCell>
                <AdminHeadCell className="w-[16%]">Создано</AdminHeadCell>
              </AdminTableHeaderRow>
            }
          >
            {rows.map((item) => (
              <AdminTableRow key={item.id}>
                <AdminCell>
                  <div className="font-semibold text-slate-900 dark:text-white">{item.email}</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-white/55">{translateLabel(item.role)}</div>
                </AdminCell>
                <AdminCell>{item.businessLabel}</AdminCell>
                <AdminCell>{item.invitedByLabel || "Неизвестно"}</AdminCell>
                <AdminCell><AdminBadge label={item.status} /></AdminCell>
                <AdminCell>{formatDateTime(item.createdAt)}</AdminCell>
              </AdminTableRow>
            ))}
          </AdminTable>
        ) : (
          <EmptyState title="Приглашения не найдены" description="По текущим фильтрам совпадений не найдено." />
        )}
        <PaginationBar pathname="/admin/invites" currentParams={currentParams} currentPage={page} totalPages={Math.max(1, Math.ceil(filtered.length / perPage))} />
      </div>
    </AdminShell>
  );
}
