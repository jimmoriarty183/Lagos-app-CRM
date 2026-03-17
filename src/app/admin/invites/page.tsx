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
const STATUS_OPTIONS = ["all", "pending", "accepted", "revoked", "expired"] as const;

export default async function AdminInvitesPage({
  searchParams,
}: {
  searchParams?: Promise<AdminSearchParams>;
}) {
  await requireAdminUser("/admin/invites");
  const params = (await searchParams) ?? {};
  const dataset = await loadAdminDataset();

  const q = getSingleParam(params.q).trim().toLowerCase();
  const status = getEnumParam(params.status, "all", STATUS_OPTIONS);
  const perPage = getIntParam(params.perPage, 20, PER_PAGE_OPTIONS);

  const filtered = dataset.invites
    .filter((item) => {
      const blob = [item.email, item.businessLabel, item.id, item.role, item.status].join(" ").toLowerCase();
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
      title="Invites"
      description="Все приглашения по системе с фильтрацией по статусам и срокам."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Total invites" value={formatNumber(dataset.invites.length)} hint="Все приглашения" />
        <AdminStatCard label="Pending" value={formatNumber(dataset.invites.filter((item) => item.status === "PENDING").length)} hint="Ожидают принятия" />
        <AdminStatCard label="Accepted" value={formatNumber(dataset.invites.filter((item) => item.status === "ACCEPTED").length)} hint="Приняты" />
        <AdminStatCard label="Revoked" value={formatNumber(dataset.invites.filter((item) => item.status === "REVOKED").length)} hint="Отозваны" />
      </div>

      <div className="mt-6">
        <AdminSectionCard title="Фильтры">
          <form action="/admin/invites" className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_180px_120px_120px]">
            <input name="q" defaultValue={q} placeholder="Поиск по email, business, роли, ID..." className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
            <select name="status" defaultValue={status} className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
              <option value="all">Все статусы</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="revoked">Revoked</option>
              <option value="expired">Expired</option>
            </select>
            <select name="perPage" defaultValue={String(perPage)} className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
              {PER_PAGE_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <button type="submit" className="inline-flex h-11 items-center justify-center rounded-xl bg-[#1d4ed8] px-5 text-sm font-semibold text-white transition hover:bg-[#1e40af]">
              Apply
            </button>
          </form>
        </AdminSectionCard>
      </div>

      <div className="mt-6">
        {rows.length ? (
          <AdminTable
            head={
              <>
                <AdminHeadCell>Invite ID</AdminHeadCell>
                <AdminHeadCell>Email</AdminHeadCell>
                <AdminHeadCell>Business</AdminHeadCell>
                <AdminHeadCell>Role</AdminHeadCell>
                <AdminHeadCell>Status</AdminHeadCell>
                <AdminHeadCell>Created</AdminHeadCell>
                <AdminHeadCell>Accepted</AdminHeadCell>
                <AdminHeadCell>Expires</AdminHeadCell>
              </>
            }
          >
            {rows.map((item) => (
              <TableRow key={item.id} className="border-slate-100 hover:bg-slate-50/60">
                <AdminCell><span className="font-mono text-xs">{item.id}</span></AdminCell>
                <AdminCell>{item.email}</AdminCell>
                <AdminCell>{item.businessLabel}</AdminCell>
                <AdminCell>{item.role}</AdminCell>
                <AdminCell><AdminBadge label={item.status} /></AdminCell>
                <AdminCell>{formatDateTime(item.createdAt)}</AdminCell>
                <AdminCell>{formatDateTime(item.acceptedAt)}</AdminCell>
                <AdminCell>{formatDateTime(item.expiresAt)}</AdminCell>
              </TableRow>
            ))}
          </AdminTable>
        ) : (
          <EmptyState title="Нет приглашений" description="По текущим фильтрам совпадений не найдено." />
        )}
        <PaginationBar pathname="/admin/invites" currentParams={currentParams} currentPage={page} totalPages={Math.max(1, Math.ceil(filtered.length / perPage))} />
      </div>
    </AdminShell>
  );
}
