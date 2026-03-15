import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  isRequiredWorkflowStatus,
  normalizeStatusDefinition,
  REQUIRED_WORKFLOW_STATUS_VALUES,
  type BusinessStatusDefinition,
  sanitizeStatusValue,
} from "@/lib/business-statuses";
import { loadBusinessStatuses } from "@/lib/business-statuses.server";

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function upperRole(value: unknown) {
  return cleanText(value).toUpperCase();
}

function assertRequiredWorkflowStatuses(statuses: readonly BusinessStatusDefinition[]) {
  const byValue = new Map(statuses.map((status) => [status.value, status]));

  for (const value of REQUIRED_WORKFLOW_STATUS_VALUES) {
    const status = byValue.get(value);
    if (!status) {
      throw new Error(`Required workflow status "${value}" is missing.`);
    }
    if (status.active === false) {
      throw new Error(`Required workflow status "${status.label}" must stay active.`);
    }
  }
}

async function getMembershipRole(
  businessId: string,
  userId: string,
) {
  const admin = supabaseAdmin();

  const { data: primary } = await admin
    .from("memberships")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .maybeSingle();

  if (primary?.role) return upperRole(primary.role);

  const { data: fallback } = await admin
    .from("business_memberships")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .maybeSingle();

  return upperRole(fallback?.role);
}

async function rewriteStatusOrder(
  businessId: string,
  userId: string,
  statuses: readonly BusinessStatusDefinition[],
) {
  assertRequiredWorkflowStatuses(statuses);

  const admin = supabaseAdmin();
  const { error: deleteError } = await admin
    .from("business_statuses")
    .delete()
    .eq("business_id", businessId);

  if (deleteError) throw deleteError;
  if (statuses.length === 0) return;

  const payload = statuses.map((status, index) => ({
    business_id: businessId,
    value: status.value,
    label: status.label,
    color: status.color,
    sort_order: status.active === false ? 1000 + index : index,
    created_by: userId,
  }));

  const { error } = await admin.from("business_statuses").upsert(payload, {
    onConflict: "business_id,value",
  });

  if (error) throw error;
}

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();
  const { searchParams } = new URL(req.url);
  const businessId = cleanText(searchParams.get("businessId"));

  if (!businessId || !isUuid(businessId)) {
    return NextResponse.json({ error: "Valid businessId is required" }, { status: 400 });
  }

  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const role = await getMembershipRole(businessId, authData.user.id);
  if (role !== "OWNER" && role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const statuses = await loadBusinessStatuses(admin, businessId);
    return NextResponse.json({ statuses });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load statuses";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();
  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  const businessId = cleanText(body.businessId);
  const label = cleanText(body.label);
  const value = sanitizeStatusValue(cleanText(body.value) || label);
  const insertIndexRaw = Number(body.insertIndex);

  if (!businessId || !isUuid(businessId)) {
    return NextResponse.json({ error: "Valid businessId is required" }, { status: 400 });
  }

  const normalized = normalizeStatusDefinition({ value, label, color: body.color });
  if (!normalized) {
    return NextResponse.json({ error: "Valid status payload is required" }, { status: 400 });
  }

  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const role = await getMembershipRole(businessId, authData.user.id);
  if (role !== "OWNER") {
    return NextResponse.json({ error: "Only owner can manage custom statuses" }, { status: 403 });
  }

  try {
    const existing = await loadBusinessStatuses(admin, businessId);
    const withoutCurrent = existing.filter((status) => status.value !== normalized.value);
    const insertIndex = Number.isFinite(insertIndexRaw)
      ? Math.max(0, Math.min(withoutCurrent.length, insertIndexRaw))
      : withoutCurrent.length;
    const nextStatuses = [...withoutCurrent];
    nextStatuses.splice(insertIndex, 0, normalized);
    await rewriteStatusOrder(businessId, authData.user.id, nextStatuses);

    const statuses = await loadBusinessStatuses(admin, businessId);
    return NextResponse.json({ ok: true, statuses });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();
  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  const businessId = cleanText(body.businessId);
  const value = sanitizeStatusValue(cleanText(body.value));

  if (!businessId || !isUuid(businessId)) {
    return NextResponse.json({ error: "Valid businessId is required" }, { status: 400 });
  }
  if (!value) {
    return NextResponse.json({ error: "Status value is required" }, { status: 400 });
  }

  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const role = await getMembershipRole(businessId, authData.user.id);
  if (role !== "OWNER") {
    return NextResponse.json({ error: "Only owner can manage custom statuses" }, { status: 403 });
  }

  try {
    const existing = await loadBusinessStatuses(admin, businessId);
    const target = existing.find((status) => status.value === value);

    if (!target) {
      return NextResponse.json({ error: "Status not found" }, { status: 404 });
    }

    if (isRequiredWorkflowStatus(value)) {
      return NextResponse.json(
        { error: "Core workflow statuses cannot be removed." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Statuses cannot be deleted. Rename them or remove them from the active workflow." },
      { status: 400 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to validate status removal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();
  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  const businessId = cleanText(body.businessId);
  const rawItems = Array.isArray(body.items) ? body.items : [];
  const rawValues = Array.isArray(body.values) ? body.values : [];
  const values: string[] = rawValues
    .map((value: unknown) => sanitizeStatusValue(cleanText(value)))
    .filter((value: string) => Boolean(value));

  if (!businessId || !isUuid(businessId)) {
    return NextResponse.json({ error: "Valid businessId is required" }, { status: 400 });
  }

  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const role = await getMembershipRole(businessId, authData.user.id);
  if (role !== "OWNER") {
    return NextResponse.json({ error: "Only owner can manage custom statuses" }, { status: 403 });
  }

  try {
    if (rawItems.length > 0) {
      const nextStatuses = rawItems
        .map((item: unknown, index: number) => {
          const record = item as Record<string, unknown>;
          const normalized = normalizeStatusDefinition({
            value: record.value,
            label: record.label,
            color: record.color,
            sort_order: record.active === false ? 1000 + index : index,
          });
          if (!normalized) return null;
          return {
            ...normalized,
            active: record.active !== false,
            builtIn: Boolean(record.builtIn),
          } as BusinessStatusDefinition;
        })
        .filter((status: BusinessStatusDefinition | null): status is BusinessStatusDefinition => Boolean(status));

      assertRequiredWorkflowStatuses(nextStatuses);
      await rewriteStatusOrder(businessId, authData.user.id, nextStatuses);
      const statuses = await loadBusinessStatuses(admin, businessId);
      return NextResponse.json({ ok: true, statuses });
    }

    const existing = await loadBusinessStatuses(admin, businessId);
    const currentByValue = new Map(existing.map((status) => [status.value, status]));
    const nextStatuses = values
      .map((value: string) => currentByValue.get(value))
      .filter((status: BusinessStatusDefinition | undefined): status is BusinessStatusDefinition =>
        Boolean(status),
      );

    if (nextStatuses.length !== existing.length) {
      return NextResponse.json({ error: "Status order payload is incomplete" }, { status: 400 });
    }

    await rewriteStatusOrder(businessId, authData.user.id, nextStatuses);
    const statuses = await loadBusinessStatuses(admin, businessId);
    return NextResponse.json({ ok: true, statuses });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reorder statuses";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
