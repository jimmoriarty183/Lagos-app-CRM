import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hasFeature } from "@/lib/billing/entitlements";
import { resolveOwnerAccountId } from "@/lib/businesses/business-limits-service";
import { parseCsv } from "@/lib/export/csv-parse";
import { parseXlsx } from "@/lib/export/xlsx";

type ImportType = "clients" | "products";

function isValidType(value: string): value is ImportType {
  return value === "clients" || value === "products";
}

function clean(v: unknown) {
  return String(v ?? "").trim();
}

function bool(v: unknown) {
  const s = clean(v).toLowerCase();
  if (!s) return null;
  return s === "true" || s === "1" || s === "yes" || s === "y";
}

function num(v: unknown) {
  const s = clean(v);
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export async function POST(
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
        { ok: false, error: "type must be one of: clients, products" },
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
    const accountId =
      String((biz.data as { account_id?: string | null }).account_id ?? "").trim() ||
      (await resolveOwnerAccountId(admin, user.id));

    // Only OWNER can import (writes a lot of data, may overwrite).
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
      return NextResponse.json({ ok: false, error: "Only the business owner can import data" }, { status: 403 });
    }

    if (!accountId) {
      return NextResponse.json(
        { ok: false, code: "ACCOUNT_NOT_FOUND", error: "billing account not found" },
        { status: 402 },
      );
    }
    const allowed = await hasFeature(admin, accountId, "import_csv");
    if (!allowed) {
      return NextResponse.json(
        {
          ok: false,
          code: "FEATURE_NOT_ENTITLED",
          error: "Importing from CSV requires the Business plan.",
        },
        { status: 402 },
      );
    }

    const contentType = (req.headers.get("content-type") ?? "").toLowerCase();
    const isXlsx =
      contentType.includes("spreadsheetml") ||
      contentType.includes("application/vnd.ms-excel") ||
      contentType.includes("application/octet-stream");

    let parsed: { headers: string[]; rows: Record<string, string>[] };
    if (isXlsx) {
      const buf = await req.arrayBuffer();
      if (!buf || buf.byteLength === 0) {
        return NextResponse.json({ ok: false, error: "Excel body is empty" }, { status: 400 });
      }
      parsed = parseXlsx(buf);
    } else {
      const csvText = await req.text();
      if (!csvText.trim()) {
        return NextResponse.json({ ok: false, error: "CSV body is empty" }, { status: 400 });
      }
      parsed = parseCsv(csvText);
    }
    if (parsed.headers.length === 0 || parsed.rows.length === 0) {
      return NextResponse.json({ ok: false, error: "File has no data rows" }, { status: 400 });
    }

    if (parsed.rows.length > 5000) {
      return NextResponse.json(
        { ok: false, error: "CSV has more than 5000 rows. Split it into smaller files." },
        { status: 400 },
      );
    }

    const errors: Array<{ row: number; message: string }> = [];
    let inserted = 0;
    let skipped = 0;

    if (type === "clients") {
      const required = ["display_name"];
      const missing = required.filter((h) => !parsed.headers.includes(h));
      if (missing.length > 0) {
        return NextResponse.json(
          { ok: false, error: `Missing required columns: ${missing.join(", ")}. Download the template first.` },
          { status: 400 },
        );
      }

      type ClientRow = {
        business_id: string;
        client_type: "individual" | "company";
        display_name: string;
        primary_email: string | null;
        primary_phone: string | null;
        city: string | null;
        country_code: string | null;
        postcode: string | null;
        created_by: string;
      };
      const toInsert: ClientRow[] = [];
      parsed.rows.forEach((row, idx) => {
        const lineNo = idx + 2; // header is line 1
        const displayName = clean(row.display_name);
        if (!displayName) {
          errors.push({ row: lineNo, message: "display_name is required" });
          skipped += 1;
          return;
        }
        const rawType = clean(row.client_type).toLowerCase();
        const clientType: "individual" | "company" =
          rawType === "company" ? "company" : "individual";
        toInsert.push({
          business_id: businessId,
          client_type: clientType,
          display_name: displayName,
          primary_email: clean(row.email) || null,
          primary_phone: clean(row.phone) || null,
          city: clean(row.city) || null,
          country_code: clean(row.country_code) || null,
          postcode: clean(row.postcode) || null,
          created_by: user.id,
        });
      });

      if (toInsert.length > 0) {
        // Insert in chunks of 500 to keep payload sizes safe.
        for (let i = 0; i < toInsert.length; i += 500) {
          const chunk = toInsert.slice(i, i + 500);
          const ins = await admin.from("clients").insert(chunk).select("id");
          if (ins.error) {
            return NextResponse.json(
              {
                ok: false,
                error: ins.error.message,
                inserted,
                errors,
              },
              { status: 500 },
            );
          }
          inserted += ins.data?.length ?? 0;
        }
      }
    } else if (type === "products") {
      const required = ["kind", "name"];
      const missing = required.filter((h) => !parsed.headers.includes(h));
      if (missing.length > 0) {
        return NextResponse.json(
          { ok: false, error: `Missing required columns: ${missing.join(", ")}. Download the template first.` },
          { status: 400 },
        );
      }

      type ProductRow = {
        business_id: string;
        sku: string | null;
        name: string;
        description: string | null;
        uom_code: string | null;
        is_stock_managed: boolean | null;
        default_unit_price: number | null;
        default_tax_rate: number | null;
        currency_code: string | null;
        created_by: string;
      };
      type ServiceRow = {
        business_id: string;
        service_code: string | null;
        name: string;
        description: string | null;
        default_duration_minutes: number | null;
        default_unit_price: number | null;
        default_tax_rate: number | null;
        currency_code: string | null;
        created_by: string;
      };

      const products: ProductRow[] = [];
      const services: ServiceRow[] = [];
      parsed.rows.forEach((row, idx) => {
        const lineNo = idx + 2;
        const name = clean(row.name);
        if (!name) {
          errors.push({ row: lineNo, message: "name is required" });
          skipped += 1;
          return;
        }
        const kind = clean(row.kind).toLowerCase();
        const code = clean(row.sku_or_code) || null;
        const description = clean(row.description) || null;
        const taxRate = num(row.tax_rate);
        const price = num(row.unit_price);
        const currency = (clean(row.currency) || "GBP").toUpperCase();
        if (kind === "service") {
          services.push({
            business_id: businessId,
            service_code: code,
            name,
            description,
            default_duration_minutes: num(row.uom_or_duration_min),
            default_unit_price: price,
            default_tax_rate: taxRate,
            currency_code: currency,
            created_by: user.id,
          });
        } else if (kind === "product" || kind === "") {
          products.push({
            business_id: businessId,
            sku: code,
            name,
            description,
            uom_code: clean(row.uom_or_duration_min) || null,
            is_stock_managed: bool(row.stock_managed),
            default_unit_price: price,
            default_tax_rate: taxRate,
            currency_code: currency,
            created_by: user.id,
          });
        } else {
          errors.push({ row: lineNo, message: `unknown kind "${kind}" — must be "product" or "service"` });
          skipped += 1;
        }
      });

      for (let i = 0; i < products.length; i += 500) {
        const chunk = products.slice(i, i + 500);
        const ins = await admin.from("catalog_products").insert(chunk).select("id");
        if (ins.error) {
          return NextResponse.json(
            { ok: false, error: ins.error.message, inserted, errors },
            { status: 500 },
          );
        }
        inserted += ins.data?.length ?? 0;
      }
      for (let i = 0; i < services.length; i += 500) {
        const chunk = services.slice(i, i + 500);
        const ins = await admin.from("catalog_services").insert(chunk).select("id");
        if (ins.error) {
          return NextResponse.json(
            { ok: false, error: ins.error.message, inserted, errors },
            { status: 500 },
          );
        }
        inserted += ins.data?.length ?? 0;
      }
    }

    return NextResponse.json({
      ok: true,
      inserted,
      skipped,
      errors,
      total: parsed.rows.length,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
