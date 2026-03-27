import { NextResponse } from "next/server";
import { getRequiredUserId } from "@/lib/campaigns/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const campaignId = String(body?.campaignId ?? "").trim();
    if (!campaignId) {
      return NextResponse.json({ ok: false, error: "campaignId is required" }, { status: 400 });
    }

    await getRequiredUserId();
    const parsedCampaignId = Number.parseInt(campaignId, 10);
    if (!Number.isFinite(parsedCampaignId)) {
      return NextResponse.json({ ok: false, error: "campaignId must be numeric" }, { status: 400 });
    }

    const client = supabaseAdmin();
    const rpcResult = await client.rpc("mark_campaign_read", { p_campaign_id: parsedCampaignId });
    if (rpcResult.error) {
      return NextResponse.json({ ok: false, error: rpcResult.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to mark as read" },
      { status: 500 },
    );
  }
}
