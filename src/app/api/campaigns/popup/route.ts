import { NextResponse } from "next/server";
import { getPopupItem, getSurveyByCampaignId } from "@/lib/campaigns/service";
import { getUserCampaignReadClient } from "@/lib/campaigns/server";

export async function GET() {
  try {
    const client = await getUserCampaignReadClient();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user?.id) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const item = await getPopupItem(client, data.user.id);
    const survey = item?.type === "survey" ? await getSurveyByCampaignId(client, item.id) : null;
    return NextResponse.json({ ok: true, item, survey });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load popup item" },
      { status: 500 },
    );
  }
}
