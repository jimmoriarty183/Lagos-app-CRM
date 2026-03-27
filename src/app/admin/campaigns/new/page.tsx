import { AdminShell } from "@/app/admin/_components/AdminShell";
import { AdminCampaignForm } from "@/components/campaigns/AdminCampaignForm";
import { requireAdminUser } from "@/lib/admin/access";
import { getAdminCampaignClient } from "@/lib/campaigns/server";
import { getAdminCampaigns, getSurveyByCampaignId } from "@/lib/campaigns/service";
import type { SurveyQuestionType } from "@/lib/campaigns/types";

export default async function NewAdminCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ copyFrom?: string }>;
}) {
  const { workspaceHref } = await requireAdminUser("/admin/campaigns/new");
  const { copyFrom } = await searchParams;
  const copyCampaignId = String(copyFrom ?? "").trim();
  const client = getAdminCampaignClient();
  const campaigns = await getAdminCampaigns(client);
  const sourceCampaign = copyCampaignId ? campaigns.find((item) => item.id === copyCampaignId) ?? null : null;
  const sourceSurvey =
    sourceCampaign && sourceCampaign.type === "survey"
      ? await getSurveyByCampaignId(client, sourceCampaign.id)
      : null;
  const templateCandidates = campaigns.slice(0, 20);
  const surveyTemplates = await Promise.all(
    templateCandidates.map(async (campaign) => {
      if (campaign.type !== "survey") {
        return { id: campaign.id, questions: [] as Array<{ title: string; questionType: SurveyQuestionType; options: string[] }> };
      }
      const survey = await getSurveyByCampaignId(client, campaign.id);
      return {
        id: campaign.id,
        questions:
          survey?.questions.map((question) => ({
            title: question.title,
            questionType: question.questionType,
            options: question.options.map((option) => option.label),
          })) ?? [],
      };
    }),
  );
  const questionsByCampaignId = new Map(surveyTemplates.map((item) => [item.id, item.questions]));
  const campaignTemplates = templateCandidates.map((campaign) => ({
    id: campaign.id,
    type: campaign.type,
    title: campaign.title,
    body: campaign.body ?? "",
    status: campaign.status,
    startsAt: campaign.startsAt ?? null,
    endsAt: campaign.endsAt ?? null,
    channels: campaign.channels,
    targetRoles: campaign.targetRoles,
    targetSegments: campaign.targetSegments,
    questions: questionsByCampaignId.get(campaign.id) ?? [],
  }));

  return (
    <AdminShell
      activeHref="/admin/campaigns"
      workspaceHref={workspaceHref}
      title="Новая кампания"
      description="Создайте уведомление или опрос."
    >
      <AdminCampaignForm
        mode="create"
        initialCampaign={sourceCampaign}
        initialSurvey={sourceSurvey}
        campaignTemplates={campaignTemplates}
      />
    </AdminShell>
  );
}
