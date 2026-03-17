import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { supabaseServerReadOnly } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminUsersPath, isAdminEmail } from "@/lib/admin-access";

type SearchParams = Record<string, string | string[] | undefined>;

type AuthUserRow = {
  id: string;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

type MembershipRow = {
  user_id: string | null;
  business_id: string | null;
  role: string | null;
};

type BusinessRow = {
  id: string;
  slug: string | null;
  name: string | null;
};

type CurrentUserMembershipRow = {
  business_id: string | null;
  created_at: string | null;
};

type AdminUserRow = {
  id: string;
  email: string | null;
  name: string;
  createdAt: string | null;
  createdAtMs: number;
  lastSignInAt: string | null;
  lastSignInAtMs: number;
  emailConfirmedAt: string | null;
  businessLabels: string[];
  membershipsCount: number;
  searchBlob: string;
};

type SortOption =
  | "newest"
  | "oldest"
  | "lastSignInDesc"
  | "lastSignInAsc"
  | "nameAsc"
  | "nameDesc";

type StatusFilter = "all" | "confirmed" | "pending" | "withBusiness" | "withoutBusiness";

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
const SORT_OPTIONS: readonly SortOption[] = [
  "newest",
  "oldest",
  "lastSignInDesc",
  "lastSignInAsc",
  "nameAsc",
  "nameDesc",
] as const;
const STATUS_FILTERS: readonly StatusFilter[] = [
  "all",
  "confirmed",
  "pending",
  "withBusiness",
  "withoutBusiness",
] as const;

function normalizeSingle(value: string | string[] | undefined) {
  if (Array.isArray(value)) return String(value[0] ?? "");
  return String(value ?? "");
}

function normalizePageSize(value: string | string[] | undefined) {
  const parsed = Number.parseInt(normalizeSingle(value), 10);
  return PAGE_SIZE_OPTIONS.includes(parsed as (typeof PAGE_SIZE_OPTIONS)[number]) ? parsed : 20;
}

function normalizePageNumber(value: string | string[] | undefined) {
  const parsed = Number.parseInt(normalizeSingle(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function normalizeSort(value: string | string[] | undefined): SortOption {
  const normalized = normalizeSingle(value) as SortOption;
  return SORT_OPTIONS.includes(normalized) ? normalized : "newest";
}

function normalizeStatusFilter(value: string | string[] | undefined): StatusFilter {
  const normalized = normalizeSingle(value) as StatusFilter;
  return STATUS_FILTERS.includes(normalized) ? normalized : "all";
}

function formatDate(value: string | null) {
  if (!value) return "Never";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatRelativeDays(value: string | null) {
  if (!value) return null;

  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;

  const diffMs = Date.now() - target.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

function buildDisplayName(profile: ProfileRow | null, fallbackEmail: string | null) {
  const fullName = String(profile?.full_name ?? "").trim();
  if (fullName) return fullName;

  const firstName = String(profile?.first_name ?? "").trim();
  const lastName = String(profile?.last_name ?? "").trim();
  const fromParts = `${firstName} ${lastName}`.trim();
  if (fromParts) return fromParts;

  return fallbackEmail || "Unnamed user";
}

function getPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 1) return [1];

  const pages = new Set<number>([
    1,
    totalPages,
    currentPage,
    currentPage - 1,
    currentPage + 1,
  ]);

  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
}

function compareNullableNumber(a: number, b: number, direction: "asc" | "desc") {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return direction === "asc" ? a - b : b - a;
}

function sortRows(rows: AdminUserRow[], sort: SortOption) {
  const next = [...rows];

  next.sort((a, b) => {
    switch (sort) {
      case "oldest":
        return a.createdAtMs - b.createdAtMs;
      case "lastSignInDesc":
        return compareNullableNumber(a.lastSignInAtMs, b.lastSignInAtMs, "desc");
      case "lastSignInAsc":
        return compareNullableNumber(a.lastSignInAtMs, b.lastSignInAtMs, "asc");
      case "nameAsc":
        return a.name.localeCompare(b.name);
      case "nameDesc":
        return b.name.localeCompare(a.name);
      case "newest":
      default:
        return b.createdAtMs - a.createdAtMs;
    }
  });

  return next;
}

async function loadUsers() {
  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (error) {
    throw new Error(error.message);
  }

  const authUsers: AuthUserRow[] = (data?.users ?? []).map((user) => ({
    id: String(user.id),
    email: user.email ?? null,
    created_at: user.created_at ?? null,
    last_sign_in_at: user.last_sign_in_at ?? null,
    email_confirmed_at: user.email_confirmed_at ?? null,
  }));

  const userIds = authUsers.map((user) => user.id);
  if (!userIds.length) {
    return {
      rows: [] as AdminUserRow[],
      totalUsers: 0,
      last24Hours: 0,
      last7Days: 0,
    };
  }

  const [{ data: profiles }, { data: memberships }, { data: businesses }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, first_name, last_name, email")
      .in("id", userIds),
    admin
      .from("memberships")
      .select("user_id, business_id, role")
      .in("user_id", userIds),
    admin.from("businesses").select("id, slug, name"),
  ]);

  const profilesById = new Map<string, ProfileRow>();
  for (const profile of (profiles ?? []) as ProfileRow[]) {
    profilesById.set(String(profile.id), profile);
  }

  const businessesById = new Map<string, BusinessRow>();
  for (const business of (businesses ?? []) as BusinessRow[]) {
    businessesById.set(String(business.id), business);
  }

  const membershipsByUserId = new Map<string, MembershipRow[]>();
  for (const membership of (memberships ?? []) as MembershipRow[]) {
    const userId = String(membership.user_id ?? "").trim();
    if (!userId) continue;

    const list = membershipsByUserId.get(userId) ?? [];
    list.push(membership);
    membershipsByUserId.set(userId, list);
  }

  const now = Date.now();
  const dayMs = 1000 * 60 * 60 * 24;

  const rows = authUsers.map((user) => {
    const profile = profilesById.get(user.id) ?? null;
    const userMemberships = membershipsByUserId.get(user.id) ?? [];
    const businessLabels = userMemberships
      .map((membership) => {
        const business = businessesById.get(String(membership.business_id ?? ""));
        const role = String(membership.role ?? "").trim().toUpperCase() || "USER";
        const label = business?.slug || business?.name || String(membership.business_id ?? "").trim();
        return label ? `${label} (${role})` : role;
      })
      .filter(Boolean);

    const name = buildDisplayName(profile, user.email || profile?.email || null);
    const createdAtMs = user.created_at ? new Date(user.created_at).getTime() : 0;
    const lastSignInAtMs = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;

    return {
      id: user.id,
      email: user.email || profile?.email || null,
      name,
      createdAt: user.created_at,
      createdAtMs,
      lastSignInAt: user.last_sign_in_at,
      lastSignInAtMs,
      emailConfirmedAt: user.email_confirmed_at,
      businessLabels,
      membershipsCount: userMemberships.length,
      searchBlob: [
        name,
        user.email || profile?.email || "",
        user.id,
        businessLabels.join(" "),
      ]
        .join(" ")
        .toLowerCase(),
    } satisfies AdminUserRow;
  });

  const last24Hours = rows.filter(
    (row) => row.createdAtMs > 0 && now - row.createdAtMs <= dayMs,
  ).length;
  const last7Days = rows.filter(
    (row) => row.createdAtMs > 0 && now - row.createdAtMs <= dayMs * 7,
  ).length;

  return {
    rows,
    totalUsers: rows.length,
    last24Hours,
    last7Days,
  };
}

async function loadBackHref(userId: string) {
  const admin = supabaseAdmin();

  const { data: memberships, error } = await admin
    .from("memberships")
    .select("business_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error || !memberships?.length) {
    return "/";
  }

  if (memberships.length > 1) {
    return "/select-business";
  }

  const firstMembership = (memberships[0] ?? null) as CurrentUserMembershipRow | null;
  const businessId = String(firstMembership?.business_id ?? "").trim();
  if (!businessId) return "/";

  const { data: business } = await admin
    .from("businesses")
    .select("slug")
    .eq("id", businessId)
    .maybeSingle();

  return business?.slug ? `/b/${business.slug}` : "/";
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{hint}</div>
    </div>
  );
}

function buildQueryString(base: SearchParams, updates: Record<string, string | number | null | undefined>) {
  const params = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(base)) {
    const value = normalizeSingle(rawValue);
    if (value) params.set(key, value);
  }

  for (const [key, rawValue] of Object.entries(updates)) {
    if (rawValue === null || rawValue === undefined || rawValue === "") {
      params.delete(key);
    } else {
      params.set(key, String(rawValue));
    }
  }

  const query = params.toString();
  return query ? `${getAdminUsersPath()}?${query}` : getAdminUsersPath();
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = (await searchParams) ?? {};

  const supabase = await supabaseServerReadOnly();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(getAdminUsersPath())}`);
  }

  if (!isAdminEmail(user.email)) {
    notFound();
  }

  const query = normalizeSingle(sp.q).trim().toLowerCase();
  const sort = normalizeSort(sp.sort);
  const statusFilter = normalizeStatusFilter(sp.status);
  const perPage = normalizePageSize(sp.perPage);
  const requestedPage = normalizePageNumber(sp.page);

  const { rows, totalUsers, last24Hours, last7Days } = await loadUsers();
  const backHref = await loadBackHref(user.id);

  const filteredRows = sortRows(
    rows.filter((row) => {
      if (query && !row.searchBlob.includes(query)) return false;

      if (statusFilter === "confirmed" && !row.emailConfirmedAt) return false;
      if (statusFilter === "pending" && row.emailConfirmedAt) return false;
      if (statusFilter === "withBusiness" && row.membershipsCount <= 0) return false;
      if (statusFilter === "withoutBusiness" && row.membershipsCount > 0) return false;

      return true;
    }),
    sort,
  );

  const totalFiltered = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / perPage));
  const currentPage = Math.min(requestedPage, totalPages);
  const pageStart = (currentPage - 1) * perPage;
  const visibleRows = filteredRows.slice(pageStart, pageStart + perPage);
  const pageItems = getPaginationItems(currentPage, totalPages);

  const currentQueryState: SearchParams = {
    q: query || undefined,
    sort,
    status: statusFilter,
    perPage: String(perPage),
    page: String(currentPage),
  };

  const refreshHref = buildQueryString(currentQueryState, {});

  return (
    <div className="min-h-[100svh] bg-[#f6f8fb] text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[28px] border border-white/70 bg-white/70 p-5 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur-md sm:p-7">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href={backHref}
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                Back to workspace
              </Link>
              <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Admin
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                Registered users
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Supabase Auth users loaded into this screen. You can search by name, email, ID, or business.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
                Signed in as <span className="font-semibold text-slate-900">{user.email}</span>
              </div>
              <Link
                href={refreshHref}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
              >
                Refresh
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <StatCard label="Loaded users" value={totalUsers} hint="First 200 users returned by Supabase Auth" />
            <StatCard label="Last 24 hours" value={last24Hours} hint="Users registered in the last 24 hours" />
            <StatCard label="Last 7 days" value={last7Days} hint="Users registered in the last 7 days" />
          </div>

          <div className="mt-4 rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_180px_200px_130px]">
              <form action={getAdminUsersPath()} className="lg:col-span-4 grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_180px_200px_130px]">
                <input
                  type="text"
                  name="q"
                  defaultValue={query}
                  placeholder="Search by email, name, ID, or business..."
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
                <select
                  name="status"
                  defaultValue={statusFilter}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="all">All statuses</option>
                  <option value="confirmed">Confirmed only</option>
                  <option value="pending">Pending only</option>
                  <option value="withBusiness">With business</option>
                  <option value="withoutBusiness">No business</option>
                </select>
                <select
                  name="sort"
                  defaultValue={sort}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="lastSignInDesc">Last sign-in: newest</option>
                  <option value="lastSignInAsc">Last sign-in: oldest</option>
                  <option value="nameAsc">Name A-Z</option>
                  <option value="nameDesc">Name Z-A</option>
                </select>
                <div className="flex gap-2">
                  <select
                    name="perPage"
                    defaultValue={String(perPage)}
                    className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  >
                    {PAGE_SIZE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option} / page
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Apply
                  </button>
                </div>
              </form>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
              <div>
                Showing {visibleRows.length === 0 ? 0 : pageStart + 1}-{pageStart + visibleRows.length} of{" "}
                {totalFiltered} matched users
              </div>
              <div>
                Loaded dataset is capped at 200 auth users for now.
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Loaded users</div>
                <div className="mt-1 text-sm text-slate-600">How many auth users the page loaded from Supabase before filtering.</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Registered</div>
                <div className="mt-1 text-sm text-slate-600">When the account was created in Supabase Auth.</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Last sign in</div>
                <div className="mt-1 text-sm text-slate-600">Last successful login time. "Never" means the user has not signed in yet.</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Businesses / Status</div>
                <div className="mt-1 text-sm text-slate-600">Business memberships plus whether the email has been confirmed.</div>
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50/80">
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Registered</th>
                    <th className="px-4 py-3">Last sign in</th>
                    <th className="px-4 py-3">Businesses</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleRows.map((row) => (
                    <tr key={row.id} className="align-top">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-900">{row.name}</div>
                        <div className="mt-1 text-slate-600">{row.email || "No email"}</div>
                        <div className="mt-1 font-mono text-[11px] text-slate-400">{row.id}</div>
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        <div>{formatDate(row.createdAt)}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {formatRelativeDays(row.createdAt) || "Unknown"}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-700">{formatDate(row.lastSignInAt)}</td>
                      <td className="px-4 py-4">
                        {row.businessLabels.length ? (
                          <div className="flex flex-col gap-1">
                            {row.businessLabels.slice(0, 4).map((label) => (
                              <span
                                key={`${row.id}-${label}`}
                                className="inline-flex w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                              >
                                {label}
                              </span>
                            ))}
                            {row.businessLabels.length > 4 ? (
                              <span className="text-xs text-slate-500">
                                +{row.businessLabels.length - 4} more
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-slate-400">No memberships yet</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            row.emailConfirmedAt
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {row.emailConfirmedAt ? "Confirmed" : "Pending confirmation"}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {visibleRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                        No users matched the current search and filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-slate-500">
                Page {currentPage} of {totalPages}
              </div>

              <Pagination className="mx-0 w-auto justify-start">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href={buildQueryString(currentQueryState, {
                        page: Math.max(1, currentPage - 1),
                      })}
                      aria-disabled={currentPage === 1}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>

                  {pageItems.map((page, index) => {
                    const prevPage = pageItems[index - 1];
                    const needsEllipsis = prevPage && page - prevPage > 1;

                    return (
                      <div key={page} className="flex items-center">
                        {needsEllipsis ? (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        ) : null}
                        <PaginationItem>
                          <PaginationLink
                            href={buildQueryString(currentQueryState, { page })}
                            isActive={page === currentPage}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      </div>
                    );
                  })}

                  <PaginationItem>
                    <PaginationNext
                      href={buildQueryString(currentQueryState, {
                        page: Math.min(totalPages, currentPage + 1),
                      })}
                      aria-disabled={currentPage === totalPages}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
