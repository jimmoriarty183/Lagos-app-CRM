import { NextResponse } from "next/server";
import { requireOwnerDashboardAccess, parseDashboardDates } from "@/lib/owner-dashboard-auth";
import { loadOwnerDashboardData } from "@/lib/owner-dashboard";

export async function GET(req: Request) {
  try {
    const access = await requireOwnerDashboardAccess(req);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const url = new URL(req.url);
    const params = parseDashboardDates(url);
    const data = await loadOwnerDashboardData(access.admin, {
      businessId: access.businessId,
      ...params,
    });

    return NextResponse.json(data.deadline_control);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load owner dashboard deadline control";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
