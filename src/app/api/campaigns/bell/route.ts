import { NextResponse } from "next/server";
import { getBellItems } from "@/lib/campaigns/service";
import { getUserCampaignReadClient } from "@/lib/campaigns/server";

export async function GET() {
  try {
    const client = await getUserCampaignReadClient();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user?.id) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const items = await getBellItems(client, data.user.id);
    return NextResponse.json({ ok: true, items });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load bell items" },
      { status: 500 },
    );
  }
}

