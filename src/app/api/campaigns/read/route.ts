import { NextResponse } from "next/server";
import { getRequiredUserId, getUserCampaignClient } from "@/lib/campaigns/server";
import { markCampaignRead } from "@/lib/campaigns/service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const campaignId = String(body?.campaignId ?? "").trim();
    if (!campaignId) {
      return NextResponse.json({ ok: false, error: "campaignId is required" }, { status: 400 });
    }

    const [userId, client] = await Promise.all([getRequiredUserId(), getUserCampaignClient()]);
    await markCampaignRead(client, userId, campaignId);

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to mark as read" },
      { status: 500 },
    );
  }
}
