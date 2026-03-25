import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function upperRole(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

export async function requireOwnerDashboardAccess(req: Request) {
  const url = new URL(req.url);
  const businessId = String(url.searchParams.get("business_id") ?? "").trim();
  if (!businessId) {
    return { ok: false as const, status: 400, error: "business_id required" };
  }
  if (!isUuid(businessId)) {
    return { ok: false as const, status: 400, error: "business_id must be a UUID" };
  }

  const supabase = await supabaseServer();
  const admin = supabaseAdmin();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id ?? null;
  if (!userId) {
    return { ok: false as const, status: 401, error: "Not authenticated" };
  }

  const { data: membership, error: membershipError } = await admin
    .from("memberships")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membershipError && upperRole(membership?.role) === "OWNER") {
    return { ok: true as const, businessId, admin };
  }

  const { data: workspaceMembership, error: workspaceError } = await admin
    .from("workspace_members")
    .select("role, status")
    .eq("workspace_id", businessId)
    .eq("user_id", userId)
    .maybeSingle();

  if (
    !workspaceError &&
    upperRole(workspaceMembership?.role) === "OWNER" &&
    String(workspaceMembership?.status ?? "active").toLowerCase() !== "inactive"
  ) {
    return { ok: true as const, businessId, admin };
  }

  return { ok: false as const, status: 403, error: "Only owner can access owner dashboard analytics" };
}

export function parseDashboardDates(url: URL) {
  const now = new Date();
  const asOf = String(url.searchParams.get("as_of") ?? "").trim() || undefined;
  const to = String(url.searchParams.get("to") ?? "").trim() || undefined;
  const from = String(url.searchParams.get("from") ?? "").trim() || undefined;
  const capacityRaw = Number(url.searchParams.get("capacity_points_per_day") ?? "");
  const capacityPointsPerDay = Number.isFinite(capacityRaw) ? capacityRaw : 8;
  const limitRaw = Number(url.searchParams.get("limit") ?? "");
  const limit = Number.isFinite(limitRaw) ? limitRaw : 100;

  return {
    asOfDate: asOf ?? now.toISOString().slice(0, 10),
    fromDate: from,
    toDate: to,
    capacityPointsPerDay,
    limitAlerts: limit,
  };
}
