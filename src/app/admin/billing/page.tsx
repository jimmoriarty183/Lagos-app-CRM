import {
  AdminCell,
  AdminHeadCell,
  AdminTable,
  AdminTableHeaderRow,
  AdminTableRow,
  EmptyState,
  RowPrimaryLink,
  formatDateTime,
} from "@/app/admin/_components/AdminShared";
import { AdminShell } from "@/app/admin/_components/AdminShell";
import { requireAdminUser } from "@/lib/admin/access";
import { supabaseAdmin } from "@/lib/supabase/admin";

type AccountRow = {
  id: string;
  name: string | null;
  created_at: string | null;
};

export default async function AdminBillingPage() {
  const { workspaceHref } = await requireAdminUser("/admin/billing");
  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from("accounts")
    .select("id, name, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  const rows = (data ?? []) as AccountRow[];

  return (
    <AdminShell
      activeHref="/admin/billing"
      workspaceHref={workspaceHref}
      title="Billing"
      description="Select account to view subscription, entitlements, and manual overrides."
    >
      {rows.length ? (
        <AdminTable
          head={
            <AdminTableHeaderRow>
              <AdminHeadCell className="w-[45%]">Account</AdminHeadCell>
              <AdminHeadCell className="w-[35%]">Account ID</AdminHeadCell>
              <AdminHeadCell className="w-[20%]">Created</AdminHeadCell>
            </AdminTableHeaderRow>
          }
        >
          {rows.map((row) => (
            <AdminTableRow key={row.id}>
              <AdminCell>
                <RowPrimaryLink
                  href={`/admin/billing/accounts/${row.id}`}
                  meta={row.name ? row.id : undefined}
                >
                  {row.name ?? "Untitled account"}
                </RowPrimaryLink>
              </AdminCell>
              <AdminCell className="font-mono text-xs text-slate-500">{row.id}</AdminCell>
              <AdminCell>{formatDateTime(row.created_at)}</AdminCell>
            </AdminTableRow>
          ))}
        </AdminTable>
      ) : (
        <EmptyState
          title="No accounts found"
          description="Create an account first, then billing details will be available here."
        />
      )}
    </AdminShell>
  );
}
