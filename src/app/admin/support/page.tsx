import { AdminShell } from "@/app/admin/_components/AdminShell";
import { AdminStatCard } from "@/app/admin/_components/AdminCards";
import { requireAdminUser } from "@/lib/admin/access";
import { supabaseServerReadOnly } from "@/lib/supabase/server";
import {
  fetchAdminSupportList,
  fetchAdminSupportSummary,
} from "@/lib/support/server";
import { SupportRequestsListView } from "@/components/support/SupportRequestsListView";
import { SupportAdminFilters } from "@/components/support/SupportAdminFilters";

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams?: Promise<{
    business?: string;
    type?: string;
    status?: string;
    priority?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
  }>;
}) {
  const { workspaceHref } = await requireAdminUser("/admin/support");
  const params = (await searchParams) ?? {};
  const supabase = await supabaseServerReadOnly();

  const filters = {
    business: cleanText(params.business),
    type: cleanText(params.type),
    status: cleanText(params.status),
    priority: cleanText(params.priority),
    search: cleanText(params.search),
    fromDate: cleanText(params.fromDate),
    toDate: cleanText(params.toDate),
  };

  const requests = await fetchAdminSupportList(supabase, {
    business: filters.business || undefined,
    type: filters.type || undefined,
    status: filters.status || undefined,
    priority: filters.priority || undefined,
    search: filters.search || undefined,
    fromDate: filters.fromDate || undefined,
    toDate: filters.toDate || undefined,
  });
  const summary = await fetchAdminSupportSummary(supabase, requests);

  return (
    <AdminShell
      activeHref="/admin/support"
      workspaceHref={workspaceHref}
      title="Support"
      description="Support requests across businesses with admin-only actions and full timeline visibility."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard label="Total" value={summary.total} hint="All support requests" />
        <AdminStatCard label="New" value={summary.new} hint="Awaiting first admin action" />
        <AdminStatCard label="In progress" value={summary.inProgress} hint="Active handling" />
        <AdminStatCard label="Waiting for customer" value={summary.waitingForCustomer} hint="Need customer response" />
        <AdminStatCard label="Resolved" value={summary.resolved} hint="Issue solved" />
      </div>

      <div className="mt-4">
        <SupportAdminFilters pathname="/admin/support" value={filters} />
      </div>

      <div className="mt-4">
        <SupportRequestsListView
          items={requests}
          hrefBuilder={(requestId) => `/admin/support/${requestId}`}
          showBusiness
          showSubmitter
          emptyTitle="No support requests found"
          emptyDescription="Adjust filters or search to broaden results."
        />
      </div>
    </AdminShell>
  );
}

