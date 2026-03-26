import Link from "next/link";
import { AdminShell } from "@/app/admin/_components/AdminShell";
import { AdminCampaignList } from "@/components/campaigns/AdminCampaignList";
import { requireAdminUser } from "@/lib/admin/access";
import { getAdminCampaignClient } from "@/lib/campaigns/server";
import { getAdminCampaigns } from "@/lib/campaigns/service";

export default async function AdminCampaignsPage() {
  const { workspaceHref } = await requireAdminUser("/admin/campaigns");
  const client = getAdminCampaignClient();
  const campaigns = await getAdminCampaigns(client);

  return (
    <AdminShell
      activeHref="/admin/campaigns"
      workspaceHref={workspaceHref}
      title="Рассылки и опросы"
      description="Уведомления и опросы для колокольчика и правого popup."
      actions={
        <Link
          href="/admin/campaigns/new"
          className="inline-flex h-10 items-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          Новая кампания
        </Link>
      }
    >
      <AdminCampaignList initialItems={campaigns} />
    </AdminShell>
  );
}
