import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/app/admin/_components/AdminShell";
import { requireAdminUser } from "@/lib/admin/access";
import { supabaseServerReadOnly } from "@/lib/supabase/server";
import {
  fetchBusinessSupportRequestById,
  fetchSupportAssignments,
  fetchSupportAttachments,
  fetchSupportInternalNotes,
  fetchSupportStatusHistory,
} from "@/lib/support/server";
import { SupportAttachmentsPanel } from "@/components/support/SupportAttachmentsPanel";
import { SupportRequestDetailsCard } from "@/components/support/SupportRequestDetailsCard";
import { SupportTimeline } from "@/components/support/SupportTimeline";
import { SupportNotesPanel } from "@/components/support/SupportNotesPanel";
import { SupportAssignmentsPanel } from "@/components/support/SupportAssignmentsPanel";
import { SupportAdminActionsPanel } from "@/components/support/SupportAdminActionsPanel";

type JoinedProfile = {
  id?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
} | null;

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function toRoleLabel(value: string) {
  const normalized = cleanText(value).toUpperCase();
  if (normalized === "OWNER") return "Owner";
  if (normalized === "MANAGER") return "Manager";
  return "Member";
}

export default async function AdminSupportRequestDetailsPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { workspaceHref } = await requireAdminUser("/admin/support");
  const { requestId } = await params;
  const supabase = await supabaseServerReadOnly();

  const request = await fetchBusinessSupportRequestById(supabase, requestId);
  if (!request) notFound();

  const [attachments, history, notes, assignments] = await Promise.all([
    fetchSupportAttachments(supabase, requestId),
    fetchSupportStatusHistory(supabase, requestId),
    fetchSupportInternalNotes(supabase, requestId),
    fetchSupportAssignments(supabase, requestId),
  ]);

  const { data: assigneeRows } = await supabase
    .from("memberships")
    .select("user_id, role, profiles:profiles(id, full_name, first_name, last_name, email)")
    .eq("business_id", request.businessId ?? "")
    .order("created_at", { ascending: true });

  const assignees = ((assigneeRows ?? []) as Array<{
    user_id?: string | null;
    role?: string | null;
    profiles?: JoinedProfile | JoinedProfile[];
  }>)
    .map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      const id = cleanText(row.user_id ?? profile?.id);
      if (!id) return null;
      const name =
        cleanText(profile?.full_name) ||
        `${cleanText(profile?.first_name)} ${cleanText(profile?.last_name)}`.trim() ||
        cleanText(profile?.email) ||
        id;
      return {
        id,
        label: `${name} (${toRoleLabel(cleanText(row.role))})`,
      };
    })
    .filter((entry): entry is { id: string; label: string } => Boolean(entry));

  return (
    <AdminShell
      activeHref="/admin/support"
      workspaceHref={workspaceHref}
      title={`Support request #${request.id.slice(0, 8)}`}
      description="Full support request details with status/priority actions, assignment and internal notes."
      actions={
        <Link
          href="/admin/support"
          className="inline-flex h-9 items-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
        >
          Back to requests
        </Link>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <SupportRequestDetailsCard request={request} showBusiness showSubmitter />
          <div className="grid gap-4 xl:grid-cols-2">
            <SupportTimeline items={history} />
            <SupportAttachmentsPanel
              items={attachments}
              downloadHrefBuilder={(attachmentId) => `/api/support/attachments/${attachmentId}?download=1`}
            />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <SupportNotesPanel items={notes} />
            <SupportAssignmentsPanel items={assignments} />
          </div>
        </div>

        <div className="space-y-4">
          <SupportAdminActionsPanel
            requestId={request.id}
            initialStatus={request.status || ""}
            initialPriority={request.priority || ""}
            initialAssignedUserId={request.assignedUserId || ""}
            assignees={assignees}
            requesterEmail={request.contactEmail}
            requesterUserId={request.submitterUserId}
          />
        </div>
      </div>
    </AdminShell>
  );
}
