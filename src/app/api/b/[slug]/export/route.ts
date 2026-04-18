import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hasFeature } from "@/lib/billing/entitlements";
import { resolveOwnerAccountId } from "@/lib/businesses/business-limits-service";
import { buildCsv, filenameFor, type CsvCell, type CsvRow } from "@/lib/export/csv";
import { buildXlsx } from "@/lib/export/xlsx";

type ExportType = "clients" | "products" | "orders";
type Format = "csv" | "xlsx";

function isValidType(value: string): value is ExportType {
  return value === "clients" || value === "products" || value === "orders";
}

function parseFormat(value: string | null): Format {
  return String(value ?? "").trim().toLowerCase() === "xlsx" ? "xlsx" : "csv";
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

    const isTemplate = url.searchParams.get("template") === "1";
    const format = parseFormat(url.searchParams.get("format"));

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

    // OWNER-only: export and template (which reveals the data shape) are
    // both restricted to the business owner.
    const mem = await admin
      .from("memberships")
      .select("role")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (mem.error) {
      return NextResponse.json({ ok: false, error: mem.error.message }, { status: 500 });
    }
    const role = String((mem.data as { role?: string } | null)?.role ?? "").toUpperCase();
    if (role !== "OWNER") {
      return NextResponse.json(
        { ok: false, error: "Only the business owner can export data" },
        { status: 403 },
      );
    }

    // Entitlement gate (skipped for template downloads — those are free so
    // users can see the format before upgrading).
    if (!isTemplate) {
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
            error: "Exporting requires the Pro or Business plan.",
          },
          { status: 402 },
        );
      }
    }

    let headers: string[] = [];
    let rows: CsvRow[] = [];
    let baseName: string = type;

    if (type === "clients") {
      headers = [
        "client_type",
        "display_name",
        "email",
        "phone",
        "city",
        "country_code",
        "postcode",
      ];
      if (isTemplate) {
        rows = [
          ["individual", "John Doe", "john@example.com", "+44 7700 900000", "London", "GB", "EC1A 1BB"],
          ["company", "Acme Ltd", "hello@acme.co.uk", "+44 20 7946 0000", "Manchester", "GB", "M1 1AA"],
        ];
        baseName = "clients-template";
      } else {
        const res = await admin
          .from("clients")
          .select(
            "client_type, display_name, primary_email, primary_phone, city, country_code, postcode",
          )
          .eq("business_id", businessId)
          .order("created_at", { ascending: false });
        if (res.error) {
          return NextResponse.json({ ok: false, error: res.error.message }, { status: 500 });
        }
        rows = (res.data ?? []).map((row) => [
          row.client_type as CsvCell,
          row.display_name as CsvCell,
          row.primary_email as CsvCell,
          row.primary_phone as CsvCell,
          row.city as CsvCell,
          row.country_code as CsvCell,
          row.postcode as CsvCell,
        ]);
        baseName = "clients";
      }
    } else if (type === "products") {
      headers = [
        "kind",
        "sku_or_code",
        "name",
        "description",
        "uom_or_duration_min",
        "stock_managed",
        "unit_price",
        "tax_rate",
        "currency",
      ];
      if (isTemplate) {
        rows = [
          ["product", "SKU-001", "Sample Product", "Short description", "pcs", "true", "29.99", "20", "GBP"],
          ["service", "SVC-001", "Sample Service", "Short description", "60", "", "49.00", "20", "GBP"],
        ];
        baseName = "catalog-template";
      } else {
        const [productsRes, servicesRes] = await Promise.all([
          admin
            .from("catalog_products")
            .select("sku, name, description, uom_code, is_stock_managed, default_unit_price, default_tax_rate, currency_code")
            .eq("business_id", businessId)
            .eq("is_deleted", false)
            .order("created_at", { ascending: false }),
          admin
            .from("catalog_services")
            .select("service_code, name, description, default_duration_minutes, default_unit_price, default_tax_rate, currency_code")
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
        const productRows: CsvRow[] = (productsRes.data ?? []).map((row) => [
          "product",
          row.sku as CsvCell,
          row.name as CsvCell,
          row.description as CsvCell,
          row.uom_code as CsvCell,
          row.is_stock_managed as CsvCell,
          row.default_unit_price as CsvCell,
          row.default_tax_rate as CsvCell,
          row.currency_code as CsvCell,
        ]);
        const serviceRows: CsvRow[] = (servicesRes.data ?? []).map((row) => [
          "service",
          row.service_code as CsvCell,
          row.name as CsvCell,
          row.description as CsvCell,
          row.default_duration_minutes as CsvCell,
          null,
          row.default_unit_price as CsvCell,
          row.default_tax_rate as CsvCell,
          row.currency_code as CsvCell,
        ]);
        rows = [...productRows, ...serviceRows];
        baseName = "catalog";
      }
    } else {
      headers = [
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
        "description",
      ];
      if (isTemplate) {
        rows = [
          ["1001", "NEW", "false", "150.00", "John Doe", "+44 7700 900000", "John", "Doe", "John Doe", "2026-05-01", "Order description"],
        ];
        baseName = "orders-template";
      } else {
        const res = await admin
          .from("orders")
          .select(
            "order_number, status, paid, amount, client_name, client_phone, first_name, last_name, full_name, due_date, description",
          )
          .eq("business_id", businessId)
          .order("created_at", { ascending: false });
        if (res.error) {
          return NextResponse.json({ ok: false, error: res.error.message }, { status: 500 });
        }
        rows = (res.data ?? []).map((row) => [
          row.order_number as CsvCell,
          row.status as CsvCell,
          row.paid as CsvCell,
          row.amount as CsvCell,
          row.client_name as CsvCell,
          row.client_phone as CsvCell,
          row.first_name as CsvCell,
          row.last_name as CsvCell,
          row.full_name as CsvCell,
          row.due_date as CsvCell,
          row.description as CsvCell,
        ]);
        baseName = "orders";
      }
    }

    if (format === "xlsx") {
      const buf = buildXlsx(headers, rows, baseName);
      const filename = filenameFor(baseName, slug, "xlsx");
      return new NextResponse(buf as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const csv = buildCsv(headers, rows);
    const filename = filenameFor(baseName, slug, "csv");
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
