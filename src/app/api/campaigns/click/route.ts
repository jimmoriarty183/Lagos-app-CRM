import { NextResponse } from "next/server";
import { markCampaignClicked } from "@/lib/campaigns/service";
import { getRequiredUserId } from "@/lib/campaigns/server";
import type { CampaignChannel } from "@/lib/campaigns/types";
import { supabaseAdmin } from "@/lib/supabase/admin";

function parseChannel(value: unknown): CampaignChannel | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "bell") return "bell";
  if (normalized === "popup_right") return "popup_right";
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const campaignId = String(body?.campaignId ?? "").trim();
    const channel = parseChannel(body?.channel);
    if (!campaignId) {
      return NextResponse.json({ ok: false, error: "campaignId is required" }, { status: 400 });
    }
    if (!channel) {
      return NextResponse.json({ ok: false, error: "channel must be bell or popup_right" }, { status: 400 });
    }

    const client = supabaseAdmin();
    const userId = await getRequiredUserId();
    await markCampaignClicked(client, userId, campaignId, channel);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to track campaign click" },
      { status: 500 },
    );
  }
}
