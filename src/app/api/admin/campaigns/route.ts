import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/campaigns/admin-auth";
import { getAdminCampaignClient } from "@/lib/campaigns/server";
import { createCampaign, getAdminCampaigns } from "@/lib/campaigns/service";
import type { CampaignStatus, CampaignType } from "@/lib/campaigns/types";
import { campaignPayloadSchema } from "@/lib/campaigns/validation";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message || fallback;
  if (error && typeof error === "object") {
    const message = String((error as { message?: unknown }).message ?? "").trim();
    const code = String((error as { code?: unknown }).code ?? "").trim();
    const details = String((error as { details?: unknown }).details ?? "").trim();
    const hint = String((error as { hint?: unknown }).hint ?? "").trim();
    const pieces = [message, code ? `(code: ${code})` : "", details, hint].filter(Boolean);
    if (pieces.length > 0) return pieces.join(" ");
  }
  return fallback;
}

export async function GET(request: Request) {
  try {
    await requireApiAdmin();
    const { searchParams } = new URL(request.url);
    const typeRaw = searchParams.get("type") ?? "all";
    const statusRaw = searchParams.get("status") ?? "all";
    const type: CampaignType | "all" =
      typeRaw === "announcement" || typeRaw === "survey" ? typeRaw : "all";
    const status: CampaignStatus | "all" =
      statusRaw === "draft" || statusRaw === "active" || statusRaw === "archived" ? statusRaw : "all";
    const client = getAdminCampaignClient();
    const items = await getAdminCampaigns(client, { type, status });
    return NextResponse.json({ ok: true, items });
  } catch (error: unknown) {
    const message = getErrorMessage(error, "Failed to load campaigns");
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const adminUser = await requireApiAdmin();
    const body = await request.json();
    const parsed = campaignPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 },
      );
    }

    const client = getAdminCampaignClient();
    const campaign = await createCampaign(client, parsed.data, adminUser.id);
    return NextResponse.json({ ok: true, campaign });
  } catch (error: unknown) {
    const message = getErrorMessage(error, "Failed to create campaign");
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
