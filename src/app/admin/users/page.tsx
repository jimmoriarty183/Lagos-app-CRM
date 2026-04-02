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
  const { user, workspaceHref } = await requireAdminUser("/admin/users");
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
      workspaceHref={workspaceHref}
      title="Пользователи"
      description="Список зарегистрированных пользователей с акцентом на onboarding, подтверждение почты, первый вход и наличие бизнеса."
      actions={
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
          Вход как <span className="font-semibold text-slate-900">{user.email}</span>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <AdminStatCard label="Всего" value={formatNumber(cards.total)} hint="Все пользователи авторизации" />
        <AdminStatCard label="Подтверждены" value={formatNumber(cards.confirmed)} hint="Почта подтверждена" />
        <AdminStatCard label="Ожидают подтверждения" value={formatNumber(cards.pending)} hint="Почта не подтверждена" />
        <AdminStatCard label="С бизнесом" value={formatNumber(cards.withBusiness)} hint="Есть привязка к бизнесу" />
        <AdminStatCard label="Без бизнеса" value={formatNumber(cards.withoutBusiness)} hint="Нет рабочего пространства" />
        <AdminStatCard label="Без входа" value={formatNumber(cards.neverSignedIn)} hint="Еще не заходили в продукт" />
      </div>

      <div className="mt-6 grid gap-4">
        <AdminSectionCard title="Фильтры и поиск">
          <form action="/admin/users" className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_150px_150px_150px_140px_170px_minmax(260px,1fr)]">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Поиск по имени, email, ID, телефону или бизнесу"
              className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />
            <select name="status" defaultValue={status} className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
              <option value="all">Любая почта</option>
              <option value="confirmed">Подтверждена</option>
              <option value="unconfirmed">Не подтверждена</option>
            </select>
            <select name="signIn" defaultValue={signIn} className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
              <option value="all">Любой вход</option>
              <option value="has">Был вход</option>
              <option value="never">Без входа</option>
            </select>
            <select name="business" defaultValue={business} className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
              <option value="all">Любой бизнес</option>
              <option value="has">Есть бизнес</option>
              <option value="none">Нет бизнеса</option>
            </select>
            <select name="window" defaultValue={window} className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
              <option value="all">Весь период</option>
              <option value="24h">24 часа</option>
              <option value="7d">7 дней</option>
              <option value="30d">30 дней</option>
            </select>
            <select name="sort" defaultValue={sort} className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
              <option value="created_desc">Сначала новые</option>
              <option value="last_sign_in_desc">Последний вход</option>
              <option value="email_asc">Email А-Я</option>
            </select>
            <div className="flex gap-3">
              <select name="perPage" defaultValue={String(perPage)} className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
                {PER_PAGE_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <Button type="submit" className="h-11 min-w-[128px] shrink-0 whitespace-nowrap px-5 text-sm font-semibold !text-white">
                Применить
              </Button>
            </div>
          </form>

          <div className="mt-3 text-sm text-slate-500">
            Показано {rows.length ? start + 1 : 0}-{start + rows.length} из {formatNumber(filtered.length)} пользователей.
          </div>
        </AdminSectionCard>

        {rows.length ? (
          <AdminTable
            head={
              <AdminTableHeaderRow>
                <AdminHeadCell className="w-[32%]">Пользователь</AdminHeadCell>
                <AdminHeadCell className="w-[18%]">Статус</AdminHeadCell>
                <AdminHeadCell className="w-[12%]">Бизнес</AdminHeadCell>
                <AdminHeadCell className="w-[14%]">Дата регистрации</AdminHeadCell>
                <AdminHeadCell className="w-[14%]">Последний вход</AdminHeadCell>
                <AdminHeadCell className="w-[10%]">Роль</AdminHeadCell>
              </AdminTableHeaderRow>
            }
          >
            {rows.map((item) => (
              <AdminTableRow key={item.id} href={`/admin/users/${item.id}`}>
                <AdminCell>
                  <RowPrimaryLink
                    href={`/admin/users/${item.id}`}
                    meta={
                      <>
                        <div>{item.email || "Без email"}</div>
                        <div className="mt-1 font-mono text-[11px] text-slate-400">{item.id}</div>
                      </>
                    }
                  >
                    {item.fullName || item.email || item.id}
                  </RowPrimaryLink>
                </AdminCell>
                <AdminCell>
                  <div className="flex flex-wrap gap-2">
                    <AdminBadge label={item.emailConfirmedAt ? "CONFIRMED" : "UNCONFIRMED"} />
                    <AdminBadge label={item.hasSignIn ? "HAS_SIGN_IN" : "NEVER_SIGNED_IN"} />
                  </div>
                </AdminCell>
                <AdminCell>
                  <div className="font-semibold text-slate-900">{item.businessesCount}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {item.businessesCount > 0
                      ? item.businesses
                          .slice(0, 2)
                          .map((businessItem) => businessItem.slug || businessItem.name || businessItem.id)
                          .join(", ")
                      : "Без бизнеса"}
                  </div>
                </AdminCell>
                <AdminCell>{formatDateTime(item.createdAt)}</AdminCell>
                <AdminCell>{formatDateTime(item.lastSignInAt)}</AdminCell>
                <AdminCell>{translateLabel(item.primaryRole)}</AdminCell>
              </AdminTableRow>
            ))}
          </AdminTable>
        ) : (
          <EmptyState title="Пользователи не найдены" description="Измените запрос или снимите часть фильтров, чтобы расширить выборку." />
        )}

        <PaginationBar pathname="/admin/users" currentParams={currentParams} currentPage={page} totalPages={Math.max(1, Math.ceil(filtered.length / perPage))} />
      </div>
    </AdminShell>
  );
}

