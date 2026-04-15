import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ConfirmOrderRequest = {
  businessId: string;
  expectedVersion: number;
  reservationPolicy?: "FULL_ONLY" | "ALLOW_PARTIAL";
  warehouseId?: string | null;
  correlationId?: string | null;
};

const IDEMPOTENT_CONFIRMED_STATUSES = new Set([
  "CONFIRMED",
  "PARTIALLY_FULFILLED",
  "FULFILLED",
  "COMPLETED",
]);

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function upper(value: unknown) {
  return cleanText(value).toUpperCase();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getErrorMessage(error: unknown) {
  return cleanText((error as { message?: string } | null)?.message) || "Unknown error";
}

function isMissingConfirmRpc(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes("confirm_order_tx") && message.includes("does not exist");
}

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

async function requireBusinessMemberAccess(businessId: string, userId: string) {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("memberships")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Forbidden");
  }

  const role = upper(data.role);
  if (!["OWNER", "MANAGER", "GUEST"].includes(role)) {
    throw new Error("Forbidden");
  }

  return { admin };
}

async function syncStockReservationQuantities(input: {
  admin: ReturnType<typeof supabaseAdmin>;
  businessId: string;
  orderId: string;
  actorId: string;
}) {
  const { admin, businessId, orderId, actorId } = input;
  const { data: lines, error: linesError } = await admin
    .from("order_lines")
    .select("id, catalog_product_id, qty, reservation_required_qty, reserved_qty, line_type")
    .eq("order_id", orderId)
    .eq("line_type", "PRODUCT");

  if (linesError) {
    throw new Error(linesError.message);
  }

  const productIds = Array.from(
    new Set(
      (lines ?? [])
        .map((line) => cleanText((line as { catalog_product_id?: string | null }).catalog_product_id))
        .filter(Boolean),
    ),
  );

  const stockManagedByProductId = new Map<string, boolean>();
  if (productIds.length > 0) {
    const { data: products, error: productsError } = await admin
      .from("catalog_products")
      .select("id, is_stock_managed")
      .eq("business_id", businessId)
      .in("id", productIds);

    if (productsError) {
      throw new Error(productsError.message);
    }

    for (const product of products ?? []) {
      const id = cleanText((product as { id?: string | null }).id);
      if (!id) continue;
      stockManagedByProductId.set(
        id,
        Boolean((product as { is_stock_managed?: boolean | null }).is_stock_managed),
      );
    }
  }

  for (const line of lines ?? []) {
    const lineId = cleanText((line as { id?: string | null }).id);
    const productId = cleanText(
      (line as { catalog_product_id?: string | null }).catalog_product_id,
    );
    if (!lineId || !productId) continue;

    const qtyRaw = Number((line as { qty?: number | string | null }).qty ?? 0);
    const currentRequiredRaw = Number(
      (line as { reservation_required_qty?: number | string | null })
        .reservation_required_qty ?? 0,
    );
    const currentReservedRaw = Number(
      (line as { reserved_qty?: number | string | null }).reserved_qty ?? 0,
    );

    const qty = Number.isFinite(qtyRaw) ? Math.max(0, qtyRaw) : 0;
    const currentRequired = Number.isFinite(currentRequiredRaw)
      ? Math.max(0, currentRequiredRaw)
      : 0;
    const currentReserved = Number.isFinite(currentReservedRaw)
      ? Math.max(0, currentReservedRaw)
      : 0;

    const isStockManaged = stockManagedByProductId.get(productId) ?? false;
    const nextRequired = isStockManaged ? qty : 0;
    const nextReserved = Math.min(currentReserved, nextRequired);

    if (nextRequired === currentRequired && nextReserved === currentReserved) {
      continue;
    }

    const { error: updateError } = await admin
      .from("order_lines")
      .update({
        reservation_required_qty: nextRequired,
        reserved_qty: nextReserved,
        updated_by: actorId,
      })
      .eq("id", lineId);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;
    const orderIdNormalized = cleanText(orderId);
    if (!isUuid(orderIdNormalized)) {
      return badRequest("Invalid orderId");
    }

    const body = (await request.json()) as Partial<ConfirmOrderRequest>;
    const businessId = cleanText(body.businessId);
    if (!isUuid(businessId)) {
      return badRequest("Valid businessId is required");
    }

    const expectedVersion = Number(body.expectedVersion);
    if (!Number.isInteger(expectedVersion) || expectedVersion <= 0) {
      return badRequest("expectedVersion must be a positive integer");
    }

    const reservationPolicy = upper(body.reservationPolicy || "FULL_ONLY");
    if (reservationPolicy !== "FULL_ONLY" && reservationPolicy !== "ALLOW_PARTIAL") {
      return badRequest("reservationPolicy must be FULL_ONLY or ALLOW_PARTIAL");
    }

    const warehouseId = body.warehouseId == null ? null : cleanText(body.warehouseId);
    if (warehouseId && !isUuid(warehouseId)) {
      return badRequest("warehouseId must be a valid UUID when provided");
    }

    const correlationId = body.correlationId == null ? null : cleanText(body.correlationId);
    if (correlationId && !isUuid(correlationId)) {
      return badRequest("correlationId must be a valid UUID when provided");
    }

    const { admin } = await requireBusinessMemberAccess(businessId, user.id);

    const { data: existingOrder, error: existingOrderError } = await admin
      .from("orders")
      .select("id, business_id, status, confirmed_at, version")
      .eq("id", orderIdNormalized)
      .maybeSingle();

    if (existingOrderError) {
      throw new Error(existingOrderError.message);
    }

    if (!existingOrder) {
      return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
    }

    if (cleanText(existingOrder.business_id) !== businessId) {
      return NextResponse.json({ ok: false, error: "Order does not belong to this business" }, { status: 403 });
    }

    const currentStatus = upper(existingOrder.status);
    if (IDEMPOTENT_CONFIRMED_STATUSES.has(currentStatus) && existingOrder.confirmed_at) {
      return NextResponse.json({
        ok: true,
        idempotent: true,
        orderId: orderIdNormalized,
        status: currentStatus,
        confirmedAt: existingOrder.confirmed_at,
        version: existingOrder.version,
      });
    }

    // Keep reservation quantities in sync with stock policy before TX confirm.
    // Stock-managed products reserve qty from warehouse; non-stock products skip warehouse logic.
    await syncStockReservationQuantities({
      admin,
      businessId,
      orderId: orderIdNormalized,
      actorId: user.id,
    });

    // Transaction-safe path: delegate to DB transaction function.
    const { data: txResult, error: txError } = await admin.rpc("confirm_order_tx", {
      p_order_id: orderIdNormalized,
      p_actor_id: user.id,
      p_expected_version: expectedVersion,
      p_reservation_mode: reservationPolicy,
      p_default_warehouse_id: warehouseId,
      p_correlation_id: correlationId,
    });

    if (txError) {
      if (isMissingConfirmRpc(txError)) {
        return NextResponse.json(
          {
            ok: false,
            error: "confirm_order_tx is missing. Apply the database transaction function implementation before enabling this endpoint.",
          },
          { status: 501 },
        );
      }

      const message = getErrorMessage(txError);
      const status = message.toLowerCase().includes("not confirmable")
        || message.toLowerCase().includes("stale version")
        || message.toLowerCase().includes("insufficient stock")
        ? 409
        : 422;

      return NextResponse.json({ ok: false, error: message }, { status });
    }

    return NextResponse.json({
      ok: true,
      idempotent: false,
      orderId: orderIdNormalized,
      result: txResult ?? null,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
