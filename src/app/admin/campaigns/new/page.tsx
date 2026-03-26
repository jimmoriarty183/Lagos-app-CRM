import { AdminShell } from "@/app/admin/_components/AdminShell";
import { AdminCampaignForm } from "@/components/campaigns/AdminCampaignForm";
import { requireAdminUser } from "@/lib/admin/access";
import { getAdminCampaignClient } from "@/lib/campaigns/server";
import { getAdminCampaigns, getSurveyByCampaignId } from "@/lib/campaigns/service";

export default async function NewAdminCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ copyFrom?: string }>;
}) {
  const { workspaceHref } = await requireAdminUser("/admin/campaigns/new");
  const { copyFrom } = await searchParams;
  const copyCampaignId = String(copyFrom ?? "").trim();
  const client = getAdminCampaignClient();
  const campaigns = copyCampaignId ? await getAdminCampaigns(client) : [];
  const sourceCampaign = copyCampaignId ? campaigns.find((item) => item.id === copyCampaignId) ?? null : null;
  const sourceSurvey =
    sourceCampaign && sourceCampaign.type === "survey"
      ? await getSurveyByCampaignId(client, sourceCampaign.id)
      : null;

  return (
    <AdminShell
      activeHref="/admin/campaigns"
      workspaceHref={workspaceHref}
      title="Новая кампания"
      description="Создайте уведомление или опрос."
    >
      <AdminCampaignForm mode="create" initialCampaign={sourceCampaign} initialSurvey={sourceSurvey} />
    </AdminShell>
  );
}
