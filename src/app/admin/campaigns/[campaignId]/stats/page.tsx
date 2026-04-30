import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/app/admin/_components/AdminShell";
import { SurveyStats } from "@/components/campaigns/SurveyStats";
import { requireAdminUser } from "@/lib/admin/access";
import { getAdminCampaignClient } from "@/lib/campaigns/server";
import { getSurveyStats } from "@/lib/campaigns/service";

export default async function SurveyStatsPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const { workspaceHref } = await requireAdminUser(`/admin/campaigns/${campaignId}/stats`);
  const client = getAdminCampaignClient();
  const stats = await getSurveyStats(client, campaignId);
  if (!stats) notFound();

  return (
    <AdminShell
      activeHref="/admin/campaigns"
      workspaceHref={workspaceHref}
      title="Статистика опроса"
      description={`Агрегация ответов по "${stats.title}"`}
      actions={
        <Link
          href={`/admin/campaigns/${campaignId}`}
          className="inline-flex h-10 items-center rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-4 text-sm font-semibold text-slate-700 dark:text-white/80 transition hover:border-slate-300 dark:hover:border-white/20"
        >
          Назад к кампании
        </Link>
      }
    >
      <SurveyStats stats={stats} />
    </AdminShell>
  );
}
