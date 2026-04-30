import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/app/admin/_components/AdminShell";
import { CampaignDeliveryBadge, CampaignStatusBadge, CampaignTypeBadge } from "@/components/campaigns/CampaignBadges";
import { AdminCampaignForm } from "@/components/campaigns/AdminCampaignForm";
import { requireAdminUser } from "@/lib/admin/access";
import { getAdminCampaignClient } from "@/lib/campaigns/server";
import { getAdminCampaigns, getCampaignPreviewDetails, getSurveyByCampaignId } from "@/lib/campaigns/service";

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default async function AdminCampaignEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ campaignId: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { campaignId } = await params;
  const { view } = await searchParams;
  const { workspaceHref } = await requireAdminUser(`/admin/campaigns/${campaignId}`);
  const client = getAdminCampaignClient();
  const campaigns = await getAdminCampaigns(client);
  const campaign = campaigns.find((item) => String(item.id) === String(campaignId));

  if (!campaign) notFound();

  const survey = campaign.type === "survey" ? await getSurveyByCampaignId(client, campaign.id) : null;
  const preview = await getCampaignPreviewDetails(client, campaign.id);
  const isReadOnly = campaign.status === "active" || campaign.status === "archived";
  const showPreview = view === "details" || isReadOnly;

  return (
    <AdminShell
      activeHref="/admin/campaigns"
      workspaceHref={workspaceHref}
      title="Campaign details"
      description="Campaign data, recipients, and delivery status."
      actions={
        <div className="flex items-center gap-2">
          {campaign.type === "survey" ? (
            <Link
              href={`/admin/campaigns/${campaign.id}/stats`}
              className="inline-flex h-10 items-center rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-4 text-sm font-semibold text-slate-700 dark:text-white/80 transition hover:border-slate-300 dark:hover:border-white/20"
            >
              Survey stats
            </Link>
          ) : null}
          <Link
            href={`/admin/campaigns/new?copyFrom=${campaign.id}`}
            className="inline-flex h-10 items-center rounded-lg border border-indigo-200 bg-indigo-50 px-4 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            Duplicate
          </Link>
          <Link
            href={`/admin/campaigns/${campaign.id}?view=details`}
            className="inline-flex h-10 items-center rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-4 text-sm font-semibold text-slate-700 dark:text-white/80 transition hover:border-slate-300 dark:hover:border-white/20"
          >
            View / Preview
          </Link>
        </div>
      }
    >
      {showPreview && preview ? (
        <div className="mb-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-3">
          <div className="grid gap-1.5 text-sm text-slate-700 dark:text-white/80 md:grid-cols-2">
            <div className="flex items-center gap-2"><span className="font-semibold text-slate-900 dark:text-white">Status:</span> <CampaignStatusBadge status={preview.status} /></div>
            <div className="flex items-center gap-2"><span className="font-semibold text-slate-900 dark:text-white">Type:</span> <CampaignTypeBadge type={preview.campaign.type} /></div>
            <div><span className="font-semibold text-slate-900 dark:text-white">Sent by:</span> {preview.sentByLabel ?? "-"}</div>
            <div><span className="font-semibold text-slate-900 dark:text-white">Sent at:</span> {formatDateTime(preview.sentAt)}</div>
            <div><span className="font-semibold text-slate-900 dark:text-white">Audience roles:</span> {preview.targetRoles.length ? preview.targetRoles.join(", ") : "All roles"}</div>
            <div><span className="font-semibold text-slate-900 dark:text-white">Audience segments:</span> {preview.targetSegments.length ? preview.targetSegments.join(", ") : "All segments"}</div>
            <div className="md:col-span-2 flex items-center gap-2"><span className="font-semibold text-slate-900 dark:text-white">Channels:</span> <CampaignDeliveryBadge channels={preview.campaign.channels} /></div>
            <div className="md:col-span-2"><span className="font-semibold text-slate-900 dark:text-white">Recipients count:</span> {preview.sentRecipientCount}</div>
            <div className="md:col-span-2 mt-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-white/55">Analytics</div>
              <div className="grid gap-2 text-xs text-slate-700 dark:text-white/80 md:grid-cols-4">
                <div><span className="font-semibold text-slate-900 dark:text-white">Delivered:</span> {preview.analytics.deliveredCount}</div>
                <div><span className="font-semibold text-slate-900 dark:text-white">Shown:</span> {preview.analytics.shownCount}</div>
                <div><span className="font-semibold text-slate-900 dark:text-white">Opened:</span> {preview.analytics.openedCount}</div>
                <div><span className="font-semibold text-slate-900 dark:text-white">Clicked:</span> {preview.analytics.clickedCount}</div>
                <div><span className="font-semibold text-slate-900 dark:text-white">Read:</span> {preview.analytics.readCount}</div>
                <div><span className="font-semibold text-slate-900 dark:text-white">Unread:</span> {preview.analytics.unreadCount}</div>
                <div><span className="font-semibold text-slate-900 dark:text-white">Dismissed:</span> {preview.analytics.dismissedCount}</div>
                <div><span className="font-semibold text-slate-900 dark:text-white">Failed delivery:</span> {preview.analytics.failedDeliveryCount}</div>
                <div><span className="font-semibold text-slate-900 dark:text-white">Bell shown:</span> {preview.analytics.bellShownCount}</div>
                <div><span className="font-semibold text-slate-900 dark:text-white">Popup shown:</span> {preview.analytics.popupShownCount}</div>
                <div><span className="font-semibold text-slate-900 dark:text-white">Bell opened:</span> {preview.analytics.bellOpenedCount}</div>
                <div><span className="font-semibold text-slate-900 dark:text-white">Popup opened:</span> {preview.analytics.popupOpenedCount}</div>
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="font-semibold text-slate-900 dark:text-white">Recipients preview:</div>
              {preview.recipientsPreview.length === 0 ? (
                <div className="text-slate-500 dark:text-white/55">No recipients snapshot yet.</div>
              ) : (
                <ul className="mt-1 max-h-44 overflow-auto rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] p-2 text-xs">
                  {preview.recipientsPreview.map((recipient) => (
                    <li key={recipient.userId} className="py-1 text-slate-700 dark:text-white/80">
                      {recipient.label}
                      {recipient.email ? ` (${recipient.email})` : ""}
                      {recipient.role ? ` | ${recipient.role}` : ""}
                      {recipient.segment ? ` | ${recipient.segment}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <AdminCampaignForm
        mode="edit"
        initialCampaign={campaign}
        initialSurvey={survey}
        readOnly={isReadOnly}
      />
    </AdminShell>
  );
}
