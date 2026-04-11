"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function upperRole(value: unknown) {
  return cleanText(value).toUpperCase();
}

function parseFiniteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseRequiredNumber(value: unknown) {
  const text = cleanText(value);
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCatalogError(error: unknown) {
  const message = error instanceof Error ? error.message : "Catalog operation failed";
  if (
    message.includes("Could not find the table") ||
    message.includes("schema cache")
  ) {
    return "Catalog tables are missing in the current Supabase API schema cache. Apply the CRM/ERP migrations to the same project used by the app and refresh PostgREST.";
  }
  if (message.toLowerCase().includes("permission denied for schema app")) {
    return "Database permissions for schema `app` are missing. Product was created, but stock initialization could not be completed. Grant USAGE on schema app and EXECUTE on app functions for your API roles.";
  }
  return message;
}

function buildWarehouseCodeForBusiness(businessId: string) {
  const normalized = cleanText(businessId).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const suffix = normalized.slice(0, 12) || "DEFAULT";
  return `MAIN-${suffix}`.slice(0, 50);
}

async function requireCatalogManagerAccess(businessSlug: string) {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data: business, error: businessError } = await admin
    .from("businesses")
    .select("id, slug")
    .eq("slug", businessSlug)
    .maybeSingle();

  if (businessError) throw new Error(businessError.message);
  if (!business?.id) throw new Error("Business not found");

  const { data: membership, error: membershipError } = await admin
    .from("memberships")
    .select("role")
    .eq("business_id", business.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) throw new Error(membershipError.message);

  const role = upperRole(membership?.role);
  if (role !== "OWNER" && role !== "MANAGER") {
    throw new Error("Forbidden");
  }

  return { admin, businessId: String(business.id), userId: user.id };
}

export async function createCatalogProduct(input: {
  businessSlug: string;
  sku: string;
  name: string;
  description?: string | null;
  uomCode: string;
  isStockManaged: boolean;
  initialStockQty?: number | string | null;
  defaultUnitPrice: number | string;
  defaultTaxRate: number | string;
  currencyCode: string;
}) {
  try {
    const { admin, userId, businessId } = await requireCatalogManagerAccess(input.businessSlug);
    const defaultUnitPrice = parseRequiredNumber(input.defaultUnitPrice);
    const defaultTaxRate = parseRequiredNumber(input.defaultTaxRate);
    const initialStockQty = Math.max(0, parseFiniteNumber(input.initialStockQty) ?? 0);

    const payload = {
      sku: cleanText(input.sku),
      name: cleanText(input.name),
      description: cleanText(input.description) || null,
      uom_code: cleanText(input.uomCode).toUpperCase(),
      is_stock_managed: Boolean(input.isStockManaged),
      default_unit_price: defaultUnitPrice,
      default_tax_rate: defaultTaxRate,
      currency_code: cleanText(input.currencyCode).toUpperCase(),
      status: "ACTIVE",
      created_by: userId,
      updated_by: userId,
    };

    if (!payload.sku || !payload.name || !payload.uom_code || !payload.currency_code) {
      throw new Error("SKU, name, UOM and currency are required");
    }
    if (payload.default_unit_price === null || payload.default_tax_rate === null) {
      throw new Error("Unit price and tax rate are required");
    }

    const { data: createdProduct, error } = await admin
      .from("catalog_products")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (payload.is_stock_managed) {
      const warehouseCode = buildWarehouseCodeForBusiness(businessId);
      const { data: warehouseCandidate, error: warehouseError } = await admin
        .from("warehouses")
        .select("id")
        .eq("warehouse_code", warehouseCode)
        .eq("is_deleted", false)
        .limit(1)
        .maybeSingle();
      let warehouse = warehouseCandidate;

      if (warehouseError) throw new Error(warehouseError.message);
      if (!warehouse?.id) {
        const { data: createdWarehouse, error: createWarehouseError } = await admin
          .from("warehouses")
          .insert({
            warehouse_code: warehouseCode,
            name: "Main Warehouse",
            status: "ACTIVE",
            created_by: userId,
            updated_by: userId,
          })
          .select("id")
          .single();

        if (createWarehouseError) {
          // If MAIN already exists (race/legacy), resolve it instead of creating another warehouse.
          const { data: existingMain, error: existingMainError } = await admin
            .from("warehouses")
            .select("id")
            .eq("warehouse_code", warehouseCode)
            .eq("is_deleted", false)
            .limit(1)
            .maybeSingle();
          if (existingMainError) throw new Error(existingMainError.message);
          if (!existingMain?.id) throw new Error(createWarehouseError.message);
          warehouse = existingMain;
        } else {
          warehouse = createdWarehouse;
        }
      }

      const { error: inventoryError } = await admin
        .from("inventory_balances")
        .insert({
          warehouse_id: warehouse.id,
          product_id: createdProduct.id,
          on_hand_qty: initialStockQty,
          reserved_qty: 0,
          available_qty: initialStockQty,
          created_by: userId,
          updated_by: userId,
        });

      if (inventoryError) {
        const message = String(inventoryError.message ?? "");
        if (!message.toLowerCase().includes("permission denied for schema app")) {
          throw new Error(message);
        }
      }
    }

    revalidatePath(`/b/${input.businessSlug}/catalog/products`);
    revalidatePath(`/b/${input.businessSlug}/settings/catalog/products`);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: normalizeCatalogError(error) };
  }
}

export async function setCatalogProductStatus(input: {
  businessSlug: string;
  productId: string;
  status: "ACTIVE" | "INACTIVE";
}) {
  try {
    const { admin, userId } = await requireCatalogManagerAccess(input.businessSlug);
    const { error } = await admin
      .from("catalog_products")
      .update({ status: input.status, updated_by: userId })
      .eq("id", input.productId);
    if (error) throw new Error(error.message);
    revalidatePath(`/b/${input.businessSlug}/catalog/products`);
    revalidatePath(`/b/${input.businessSlug}/settings/catalog/products`);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: normalizeCatalogError(error) };
  }
}

export async function createCatalogService(input: {
  businessSlug: string;
  serviceCode: string;
  name: string;
  description?: string | null;
  defaultUnitPrice: number | string;
  defaultTaxRate: number | string;
  currencyCode: string;
  defaultSlaMinutes?: number | null;
  defaultDurationMinutes?: number | null;
  requiresAssignee: boolean;
}) {
  try {
    const { admin, userId } = await requireCatalogManagerAccess(input.businessSlug);
    const defaultUnitPrice = parseRequiredNumber(input.defaultUnitPrice);
    const defaultTaxRate = parseRequiredNumber(input.defaultTaxRate);

    const payload = {
      service_code: cleanText(input.serviceCode),
      name: cleanText(input.name),
      description: cleanText(input.description) || null,
      default_unit_price: defaultUnitPrice,
      default_tax_rate: defaultTaxRate,
      currency_code: cleanText(input.currencyCode).toUpperCase(),
      default_sla_minutes: input.defaultSlaMinutes == null || Number.isNaN(Number(input.defaultSlaMinutes)) ? null : Number(input.defaultSlaMinutes),
      default_duration_minutes: input.defaultDurationMinutes == null || Number.isNaN(Number(input.defaultDurationMinutes)) ? null : Number(input.defaultDurationMinutes),
      requires_assignee: Boolean(input.requiresAssignee),
      status: "ACTIVE",
      created_by: userId,
      updated_by: userId,
    };

    if (!payload.service_code || !payload.name || !payload.currency_code) {
      throw new Error("Service code, name and currency are required");
    }
    if (payload.default_unit_price === null || payload.default_tax_rate === null) {
      throw new Error("Unit price and tax rate are required");
    }

    const { error } = await admin.from("catalog_services").insert(payload);
    if (error) throw new Error(error.message);

    revalidatePath(`/b/${input.businessSlug}/catalog/services`);
    revalidatePath(`/b/${input.businessSlug}/settings/catalog/services`);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: normalizeCatalogError(error) };
  }
}

export async function setCatalogServiceStatus(input: {
  businessSlug: string;
  serviceId: string;
  status: "ACTIVE" | "INACTIVE";
}) {
  try {
    const { admin, userId } = await requireCatalogManagerAccess(input.businessSlug);
    const { error } = await admin
      .from("catalog_services")
      .update({ status: input.status, updated_by: userId })
      .eq("id", input.serviceId);
    if (error) throw new Error(error.message);
    revalidatePath(`/b/${input.businessSlug}/catalog/services`);
    revalidatePath(`/b/${input.businessSlug}/settings/catalog/services`);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: normalizeCatalogError(error) };
  }
}
