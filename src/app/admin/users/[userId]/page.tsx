import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminSectionCard, AdminStatCard } from "@/app/admin/_components/AdminCards";
import { AdminShell } from "@/app/admin/_components/AdminShell";
import { AdminBadge, InlineKeyValue, SectionList, formatDateTime, formatNumber } from "@/app/admin/_components/AdminShared";
import { requireAdminUser } from "@/lib/admin/access";
import { loadAdminDataset } from "@/lib/admin/queries";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await requireAdminUser();
  const { userId } = await params;
  const dataset = await loadAdminDataset();
  const user = dataset.authUsers.find((item) => item.id === userId);

  if (!user) notFound();

  const userInvites = dataset.invites.filter((invite) => invite.email.toLowerCase() === String(user.email ?? "").toLowerCase());
  const userActivities = dataset.activities
    .filter((item) => item.userId === user.id || String(item.meta ?? "").toLowerCase() === String(user.email ?? "").toLowerCase())
    .slice(0, 12);
  const createdOrders = dataset.orders.filter((order) => order.managerId === user.id);

  return (
    <AdminShell
      activeHref="/admin/users"
      title={user.fullName || user.email || user.id}
      description="Детальный admin view по пользователю: auth, memberships, businesses, invites и recent activity."
      actions={
        <Link href="/admin/users" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900">
          Назад к users
        </Link>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard label="Businesses" value={formatNumber(user.businessesCount)} hint="Количество memberships" />
        <AdminStatCard label="Primary role" value={user.primaryRole} hint="Максимальная роль по memberships" />
        <AdminStatCard label="Invites" value={formatNumber(userInvites.length)} hint="Инвайты по email пользователя" />
        <AdminStatCard label="Managed orders" value={formatNumber(createdOrders.length)} hint="Best effort по manager_id" />
        <AdminStatCard label="Status" value={user.emailConfirmedAt ? "CONFIRMED" : "UNCONFIRMED"} hint={user.hasSignIn ? "Есть sign in" : "Never signed in"} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <AdminSectionCard title="Основная информация">
          <div className="grid gap-3 sm:grid-cols-2">
            <InlineKeyValue label="User ID" value={<span className="font-mono text-xs">{user.id}</span>} />
            <InlineKeyValue label="Email" value={user.email || "Нет"} />
            <InlineKeyValue label="Имя" value={user.fullName || "Нет"} />
            <InlineKeyValue label="Телефон" value={user.phone || "Нет"} />
            <InlineKeyValue label="Created at" value={formatDateTime(user.createdAt)} />
            <InlineKeyValue label="Email confirmed at" value={formatDateTime(user.emailConfirmedAt)} />
            <InlineKeyValue label="Last sign in" value={formatDateTime(user.lastSignInAt)} />
            <InlineKeyValue label="Sign in count" value="—" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <AdminBadge label={user.emailConfirmedAt ? "CONFIRMED" : "UNCONFIRMED"} />
            <AdminBadge label={user.hasSignIn ? "HAS_SIGN_IN" : "NEVER_SIGNED_IN"} />
            <AdminBadge label={user.hasBusiness ? "HAS_BUSINESS" : "NO_BUSINESS"} />
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="Memberships / businesses">
          <SectionList
            items={user.businesses.map((businessItem) => ({
              title: `${businessItem.slug || businessItem.name || businessItem.id} • ${businessItem.role}`,
              meta: businessItem.id,
              href: `/admin/businesses/${businessItem.id}`,
            }))}
            emptyTitle="Нет memberships"
            emptyDescription="Пользователь пока не привязан ни к одному business."
          />
        </AdminSectionCard>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <AdminSectionCard title="Invites">
          <SectionList
            items={userInvites.map((invite) => ({
              title: `${invite.businessLabel} • ${invite.status}`,
              meta: `${formatDateTime(invite.createdAt)} • ${invite.role}`,
              href: `/admin/invites?status=${invite.status.toLowerCase()}`,
            }))}
            emptyTitle="Нет инвайтов"
            emptyDescription="По email пользователя инвайты не найдены."
          />
        </AdminSectionCard>

        <AdminSectionCard title="Recent activity">
          <SectionList
            items={userActivities.map((activity) => ({
              title: activity.title,
              meta: `${formatDateTime(activity.createdAt)}${activity.businessLabel ? ` • ${activity.businessLabel}` : ""}${activity.meta ? ` • ${activity.meta}` : ""}`,
            }))}
            emptyTitle="Нет activity"
            emptyDescription="По текущим данным активность не найдена."
          />
        </AdminSectionCard>

        <AdminSectionCard title="Admin notes">
          <div className="space-y-3 text-sm text-slate-600">
            <p>Пользовательский detail page собран из auth users, profiles, memberships, invites и orders.</p>
            <p>TECH DEBT: отдельного audit log по sign in count, IP, device и actor history сейчас нет.</p>
            <p>Если понадобится safe admin action layer, лучше делать его через отдельные server actions с ACL и audit trail.</p>
          </div>
        </AdminSectionCard>
      </div>
    </AdminShell>
  );
}
