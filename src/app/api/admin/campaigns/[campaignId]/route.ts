import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/campaigns/admin-auth";
import { getAdminCampaignClient } from "@/lib/campaigns/server";
import { getAdminCampaigns, updateCampaign } from "@/lib/campaigns/service";
import { campaignPayloadSchema } from "@/lib/campaigns/validation";

export async function GET(_request: Request, context: { params: Promise<{ campaignId: string }> }) {
  try {
    await requireApiAdmin();
    const { campaignId } = await context.params;
    const client = getAdminCampaignClient();
    const campaigns = await getAdminCampaigns(client);
    const campaign = campaigns.find((item) => item.id === campaignId);
    if (!campaign) {
      return NextResponse.json({ ok: false, error: "Campaign not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, campaign });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load campaign";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ campaignId: string }> }) {
  try {
    const adminUser = await requireApiAdmin();
    const { campaignId } = await context.params;
    const body = await request.json();
    const parsed = campaignPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 },
      );
    }
    const client = getAdminCampaignClient();
    const campaign = await updateCampaign(client, { id: campaignId, ...parsed.data }, adminUser.id);
    return NextResponse.json({ ok: true, campaign });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update campaign";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
