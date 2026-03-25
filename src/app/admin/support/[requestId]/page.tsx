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

function cleanText(value: unknown) {
  return String(value ?? "").trim();
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

  let loadError: string | null = null;
  let attachments: Awaited<ReturnType<typeof fetchSupportAttachments>> = [];
  let history: Awaited<ReturnType<typeof fetchSupportStatusHistory>> = [];
  let notes: Awaited<ReturnType<typeof fetchSupportInternalNotes>> = [];
  let assignments: Awaited<ReturnType<typeof fetchSupportAssignments>> = [];

  try {
    [attachments, history, notes, assignments] = await Promise.all([
      fetchSupportAttachments(supabase, requestId),
      fetchSupportStatusHistory(supabase, requestId),
      fetchSupportInternalNotes(supabase, requestId),
      fetchSupportAssignments(supabase, requestId),
    ]);
  } catch (error) {
    loadError = cleanText((error as { message?: string } | null)?.message) || "Failed to load request details.";
  }

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
          {loadError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {loadError}
            </div>
          ) : null}
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
          />
        </div>
      </div>
    </AdminShell>
  );
}
