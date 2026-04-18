import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hasFeature } from "@/lib/billing/entitlements";
import { resolveOwnerAccountId } from "@/lib/businesses/business-limits-service";
import { buildCsv, filenameFor } from "@/lib/export/csv";

type ExportType = "clients" | "products" | "orders";

function isValidType(value: string): value is ExportType {
  return value === "clients" || value === "products" || value === "orders";
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const url = new URL(req.url);
    const type = String(url.searchParams.get("type") ?? "").trim().toLowerCase();

    if (!slug) {
      return NextResponse.json({ ok: false, error: "business slug is required" }, { status: 400 });
    }
    if (!isValidType(type)) {
      return NextResponse.json(
        { ok: false, error: "type must be one of: clients, products, orders" },
        { status: 400 },
      );
    }

    const supabase = await supabaseServer();
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const user = userData?.user;
    if (userErr || !user) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const admin = supabaseAdmin();

    // Resolve business + verify user has membership.
    const biz = await admin
      .from("businesses")
      .select("id, slug, account_id")
      .eq("slug", slug)
      .maybeSingle();
    if (biz.error) {
      return NextResponse.json({ ok: false, error: biz.error.message }, { status: 500 });
    }
    if (!biz.data) {
      return NextResponse.json({ ok: false, error: "business not found" }, { status: 404 });
    }
    const businessId = String((biz.data as { id: string }).id);
    const accountId = String((biz.data as { account_id?: string | null }).account_id ?? "").trim()
      || (await resolveOwnerAccountId(admin, user.id));

    const mem = await admin
      .from("memberships")
      .select("role")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (mem.error) {
      return NextResponse.json({ ok: false, error: mem.error.message }, { status: 500 });
    }
    if (!mem.data) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // Entitlement gate.
    if (!accountId) {
      return NextResponse.json(
        { ok: false, error: "billing account not found for business" },
        { status: 402 },
      );
    }
    const allowed = await hasFeature(admin, accountId, "export_csv");
    if (!allowed) {
      return NextResponse.json(
        {
          ok: false,
          code: "FEATURE_NOT_ENTITLED",
          error: "Exporting to CSV requires the Pro or Business plan.",
        },
        { status: 402 },
      );
    }

    let csv = "";
    let filename = filenameFor(type, slug);

    if (type === "clients") {
      const res = await admin
        .from("clients")
        .select(
          "id, client_type, display_name, primary_email, primary_phone, city, country_code, postcode, is_archived, created_at",
        )
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });
      if (res.error) {
        return NextResponse.json({ ok: false, error: res.error.message }, { status: 500 });
      }
      const headers = [
        "id",
        "type",
        "display_name",
        "email",
        "phone",
        "city",
        "country",
        "postcode",
        "archived",
        "created_at",
      ];
      const rows = (res.data ?? []).map((row) => [
        row.id,
        row.client_type,
        row.display_name,
        row.primary_email,
        row.primary_phone,
        row.city,
        row.country_code,
        row.postcode,
        row.is_archived,
        row.created_at,
      ]);
      csv = buildCsv(headers, rows);
      filename = filenameFor("clients", slug);
    } else if (type === "products") {
      const [productsRes, servicesRes] = await Promise.all([
        admin
          .from("catalog_products")
          .select(
            "id, sku, name, description, uom_code, is_stock_managed, default_unit_price, default_tax_rate, currency_code, status, created_at",
          )
          .eq("business_id", businessId)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false }),
        admin
          .from("catalog_services")
          .select(
            "id, service_code, name, description, default_unit_price, default_tax_rate, currency_code, default_duration_minutes, status, created_at",
          )
          .eq("business_id", businessId)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false }),
      ]);
      if (productsRes.error) {
        return NextResponse.json({ ok: false, error: productsRes.error.message }, { status: 500 });
      }
      if (servicesRes.error) {
        return NextResponse.json({ ok: false, error: servicesRes.error.message }, { status: 500 });
      }
      const headers = [
        "id",
        "kind",
        "sku_or_code",
        "name",
        "description",
        "uom_or_duration_min",
        "stock_managed",
        "unit_price",
        "tax_rate",
        "currency",
        "status",
        "created_at",
      ];
      const productRows = (productsRes.data ?? []).map((row) => [
        row.id,
        "product",
        row.sku,
        row.name,
        row.description,
        row.uom_code,
        row.is_stock_managed,
        row.default_unit_price,
        row.default_tax_rate,
        row.currency_code,
        row.status,
        row.created_at,
      ]);
      const serviceRows = (servicesRes.data ?? []).map((row) => [
        row.id,
        "service",
        row.service_code,
        row.name,
        row.description,
        row.default_duration_minutes,
        null, // stock_managed not applicable
        row.default_unit_price,
        row.default_tax_rate,
        row.currency_code,
        row.status,
        row.created_at,
      ]);
      csv = buildCsv(headers, [...productRows, ...serviceRows]);
      filename = filenameFor("catalog", slug);
    } else {
      const res = await admin
        .from("orders")
        .select(
          "order_no, order_number, status, paid, amount, client_name, client_phone, full_name, first_name, last_name, due_date, closed_at, created_at, description",
        )
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });
      if (res.error) {
        return NextResponse.json({ ok: false, error: res.error.message }, { status: 500 });
      }
      const headers = [
        "order_no",
        "order_number",
        "status",
        "paid",
        "amount",
        "client_name",
        "client_phone",
        "first_name",
        "last_name",
        "full_name",
        "due_date",
        "created_at",
        "closed_at",
        "description",
      ];
      const rows = (res.data ?? []).map((row) => [
        row.order_no,
        row.order_number,
        row.status,
        row.paid,
        row.amount,
        row.client_name,
        row.client_phone,
        row.first_name,
        row.last_name,
        row.full_name,
        row.due_date,
        row.created_at,
        row.closed_at,
        row.description,
      ]);
      csv = buildCsv(headers, rows);
      filename = filenameFor("orders", slug);
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
