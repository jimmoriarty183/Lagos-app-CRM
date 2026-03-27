import { NextResponse } from "next/server";
import { getRequiredUserId } from "@/lib/campaigns/server";
import { supabaseServer } from "@/lib/supabase/server";

function parseCampaignId(value: unknown) {
  const campaignId = String(value ?? "").trim();
  if (!campaignId) return null;

  const parsedCampaignId = Number.parseInt(campaignId, 10);
  if (!Number.isFinite(parsedCampaignId)) return null;

  return parsedCampaignId;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsedCampaignId = parseCampaignId(body?.campaignId);
    if (parsedCampaignId === null) {
      return NextResponse.json({ ok: false, error: "campaignId must be numeric" }, { status: 400 });
    }

    await getRequiredUserId();

    // IMPORTANT: use request-scoped client (user JWT) so RPC auth.uid() targets
    // the current user row in user_campaign_states. Do not use service-role here.
    const supabase = await supabaseServer();
    const rpcResult = await supabase.rpc("mark_campaign_read", { p_campaign_id: parsedCampaignId });
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
