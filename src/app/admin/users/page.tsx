import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { supabaseServerReadOnly } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminUsersPath, isAdminEmail } from "@/lib/admin-access";

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
      rows: [],
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

  const rows = authUsers
    .map((user) => {
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

      const createdAt = user.created_at ? new Date(user.created_at).getTime() : 0;

      return {
        id: user.id,
        email: user.email || profile?.email || null,
        name: buildDisplayName(profile, user.email || profile?.email || null),
        createdAt: user.created_at,
        createdAtMs: createdAt,
        lastSignInAt: user.last_sign_in_at,
        emailConfirmedAt: user.email_confirmed_at,
        businessLabels,
        membershipsCount: userMemberships.length,
      };
    })
    .sort((a, b) => b.createdAtMs - a.createdAtMs);

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
  if (!businessId) {
    return "/";
  }

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

export default async function AdminUsersPage() {
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

  const { rows, totalUsers, last24Hours, last7Days } = await loadUsers();
  const backHref = await loadBackHref(user.id);

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
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Admin
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                Registered users
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Global list of users from Supabase Auth. New registrations are shown first.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
                Signed in as <span className="font-semibold text-slate-900">{user.email}</span>
              </div>
              <Link
                href={getAdminUsersPath()}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
              >
                Refresh
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <StatCard label="Loaded users" value={totalUsers} hint="First 200 auth users" />
            <StatCard label="Last 24 hours" value={last24Hours} hint="New registrations" />
            <StatCard label="Last 7 days" value={last7Days} hint="Recent signups" />
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
                  {rows.map((row) => (
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
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
