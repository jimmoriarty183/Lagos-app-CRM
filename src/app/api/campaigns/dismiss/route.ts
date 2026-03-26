import { NextResponse } from "next/server";
import { dismissCampaign } from "@/lib/campaigns/service";
import { getRequiredUserId, getUserCampaignClient } from "@/lib/campaigns/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const campaignId = String(body?.campaignId ?? "").trim();
    if (!campaignId) {
      return NextResponse.json({ ok: false, error: "campaignId is required" }, { status: 400 });
    }

    const client = await getUserCampaignClient();
    const userId = await getRequiredUserId();
    await dismissCampaign(client, userId, campaignId);

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to dismiss campaign" },
      { status: 500 },
    );
  }
}

