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
const STATUS_OPTIONS = ["all", "confirmed", "unconfirmed"] as const;
const SIGN_IN_OPTIONS = ["all", "has", "never"] as const;
const BUSINESS_OPTIONS = ["all", "has", "none"] as const;
const WINDOW_OPTIONS = ["all", "24h", "7d", "30d"] as const;
const SORT_OPTIONS = ["created_desc", "last_sign_in_desc", "email_asc"] as const;

function filterByWindow(createdAtMs: number, window: (typeof WINDOW_OPTIONS)[number]) {
  if (window === "all") return true;
  const diff = Date.now() - createdAtMs;
  if (window === "24h") return diff <= 1000 * 60 * 60 * 24;
  if (window === "7d") return diff <= 1000 * 60 * 60 * 24 * 7;
  return diff <= 1000 * 60 * 60 * 24 * 30;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<AdminSearchParams>;
}) {
  const user = await requireAdminUser("/admin/users");
  const params = (await searchParams) ?? {};
  const dataset = await loadAdminDataset();

  const q = getSingleParam(params.q).trim().toLowerCase();
  const status = getEnumParam(params.status, "all", STATUS_OPTIONS);
  const signIn = getEnumParam(params.signIn, "all", SIGN_IN_OPTIONS);
  const business = getEnumParam(params.business, "all", BUSINESS_OPTIONS);
  const window = getEnumParam(params.window, "all", WINDOW_OPTIONS);
  const sort = getEnumParam(params.sort, "created_desc", SORT_OPTIONS);
  const perPage = getIntParam(params.perPage, 20, PER_PAGE_OPTIONS);

  const filtered = dataset.authUsers
    .filter((item) => {
      if (q && !item.searchBlob.includes(q)) return false;
      if (status === "confirmed" && !item.emailConfirmedAt) return false;
      if (status === "unconfirmed" && item.emailConfirmedAt) return false;
      if (signIn === "has" && !item.hasSignIn) return false;
      if (signIn === "never" && item.hasSignIn) return false;
      if (business === "has" && !item.hasBusiness) return false;
      if (business === "none" && item.hasBusiness) return false;
      if (!filterByWindow(item.createdAtMs, window)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === "last_sign_in_desc") return b.lastSignInAtMs - a.lastSignInAtMs;
      if (sort === "email_asc") return String(a.email ?? "").localeCompare(String(b.email ?? ""));
      return b.createdAtMs - a.createdAtMs;
    });

  const page = Math.min(getIntParam(params.page, 1), Math.max(1, Math.ceil(filtered.length / perPage)));
  const start = (page - 1) * perPage;
  const rows = filtered.slice(start, start + perPage);
  const currentParams: AdminSearchParams = {
    q: q || undefined,
    status,
    signIn,
    business,
    window,
    sort,
    perPage: String(perPage),
    page: String(page),
  };

  const cards = {
    total: dataset.authUsers.length,
    confirmed: dataset.authUsers.filter((item) => Boolean(item.emailConfirmedAt)).length,
    pending: dataset.authUsers.filter((item) => !item.emailConfirmedAt).length,
    withBusiness: dataset.authUsers.filter((item) => item.hasBusiness).length,
    withoutBusiness: dataset.authUsers.filter((item) => !item.hasBusiness).length,
    neverSignedIn: dataset.authUsers.filter((item) => !item.hasSignIn).length,
  };

  return (
    <AdminShell
      activeHref="/admin/users"
      title="Users"
      description="Глобальный список зарегистрированных пользователей с фильтрами по подтверждению email, sign in и наличию business."
      actions={
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
          Вход как <span className="font-semibold text-slate-900">{user.email}</span>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <AdminStatCard label="Total users" value={formatNumber(cards.total)} hint="Все auth users" />
        <AdminStatCard label="Confirmed" value={formatNumber(cards.confirmed)} hint="Email confirmed" />
        <AdminStatCard label="Pending" value={formatNumber(cards.pending)} hint="Ожидают подтверждения" />
        <AdminStatCard label="With business" value={formatNumber(cards.withBusiness)} hint="Есть membership" />
        <AdminStatCard label="Without business" value={formatNumber(cards.withoutBusiness)} hint="Нет business" />
        <AdminStatCard label="Never signed in" value={formatNumber(cards.neverSignedIn)} hint="Ни одного входа" />
      </div>

      <div className="mt-6 grid gap-4">
        <AdminSectionCard title="Фильтры">
          <form action="/admin/users" className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_160px_160px_160px_140px_180px_120px]">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Поиск по email, имени, ID, телефону, business..."
              className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />
            <select name="status" defaultValue={status} className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
              <option value="all">Все email</option>
              <option value="confirmed">Confirmed</option>
              <option value="unconfirmed">Unconfirmed</option>
            </select>
            <select name="signIn" defaultValue={signIn} className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
              <option value="all">Все sign in</option>
              <option value="has">Has sign in</option>
              <option value="never">Never signed in</option>
            </select>
            <select name="business" defaultValue={business} className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
              <option value="all">Все business</option>
              <option value="has">Has business</option>
              <option value="none">No business</option>
            </select>
            <select name="window" defaultValue={window} className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
              <option value="all">Весь период</option>
              <option value="24h">24h</option>
              <option value="7d">7d</option>
              <option value="30d">30d</option>
            </select>
            <select name="sort" defaultValue={sort} className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
              <option value="created_desc">created_at desc</option>
              <option value="last_sign_in_desc">last_sign_in_at desc</option>
              <option value="email_asc">email asc</option>
            </select>
            <div className="flex gap-3">
              <select name="perPage" defaultValue={String(perPage)} className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
                {PER_PAGE_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <button type="submit" className="inline-flex h-11 items-center justify-center rounded-xl bg-[#1d4ed8] px-5 text-sm font-semibold text-white transition hover:bg-[#1e40af]">
                Apply
              </button>
            </div>
          </form>

          <div className="mt-3 text-sm text-slate-500">
            Показано {rows.length ? start + 1 : 0}-{start + rows.length} из {formatNumber(filtered.length)} пользователей.
          </div>
        </AdminSectionCard>

        {rows.length ? (
          <AdminTable
            head={
              <>
                <AdminHeadCell>User</AdminHeadCell>
                <AdminHeadCell>Created</AdminHeadCell>
                <AdminHeadCell>Email confirmed</AdminHeadCell>
                <AdminHeadCell>Last sign in</AdminHeadCell>
                <AdminHeadCell>Businesses</AdminHeadCell>
                <AdminHeadCell>Role</AdminHeadCell>
                <AdminHeadCell>Status</AdminHeadCell>
              </>
            }
          >
            {rows.map((item) => (
              <TableRow key={item.id} className="border-slate-100 hover:bg-slate-50/60">
                <AdminCell>
                  <Link href={`/admin/users/${item.id}`} className="font-semibold text-slate-900 hover:text-blue-700">
                    {item.fullName || item.email || item.id}
                  </Link>
                  <div className="mt-1 text-slate-600">{item.email || "Без email"}</div>
                  <div className="mt-1 font-mono text-[11px] text-slate-400">{item.id}</div>
                  {item.phone ? <div className="mt-1 text-xs text-slate-500">{item.phone}</div> : null}
                </AdminCell>
                <AdminCell>{formatDateTime(item.createdAt)}</AdminCell>
                <AdminCell>{formatDateTime(item.emailConfirmedAt)}</AdminCell>
                <AdminCell>
                  <div>{formatDateTime(item.lastSignInAt)}</div>
                  <div className="mt-1 text-xs text-slate-500">sign in count: —</div>
                </AdminCell>
                <AdminCell>
                  <div className="font-medium text-slate-900">{item.businessesCount}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.businesses.slice(0, 2).map((businessItem) => (
                      <Link
                        key={`${item.id}-${businessItem.id}`}
                        href={`/admin/businesses/${businessItem.id}`}
                        className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                      >
                        {businessItem.slug || businessItem.name || businessItem.id}
                      </Link>
                    ))}
                    {item.businessesCount > 2 ? (
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                        +{item.businessesCount - 2}
                      </span>
                    ) : null}
                  </div>
                </AdminCell>
                <AdminCell>{item.primaryRole}</AdminCell>
                <AdminCell>
                  <div className="flex flex-col gap-2">
                    <AdminBadge label={item.emailConfirmedAt ? "CONFIRMED" : "UNCONFIRMED"} />
                    {item.hasSignIn ? <AdminBadge label="HAS_SIGN_IN" /> : <AdminBadge label="NEVER_SIGNED_IN" />}
                  </div>
                </AdminCell>
              </TableRow>
            ))}
          </AdminTable>
        ) : (
          <EmptyState title="Ничего не найдено" description="Измените поисковый запрос или снимите часть фильтров." />
        )}

        <PaginationBar pathname="/admin/users" currentParams={currentParams} currentPage={page} totalPages={Math.max(1, Math.ceil(filtered.length / perPage))} />
      </div>
    </AdminShell>
  );
}
