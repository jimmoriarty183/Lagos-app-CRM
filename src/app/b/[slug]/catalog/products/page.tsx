import { redirect } from "next/navigation";
import { supabaseServerReadOnly } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminUsersPath, isAdminEmail } from "@/lib/admin-access";
import TeamAccessTopBar from "../../settings/team/TeamAccessTopBar";
import CatalogTabs from "../../settings/catalog/CatalogTabs";
import DesktopLeftRail from "@/app/b/[slug]/_components/Desktop/DesktopLeftRail";
import ProductCatalogManager from "../../settings/catalog/ProductCatalogManager";

type Role = "OWNER" | "MANAGER" | "GUEST";

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  uom_code: string;
  is_stock_managed: boolean;
  default_unit_price: number | string;
  default_tax_rate: number | string;
  currency_code: string;
  status: "ACTIVE" | "INACTIVE";
  updated_at: string;
};

function asProductRow(row: Record<string, unknown>): ProductRow {
  const statusRaw = String(row.status ?? "").toUpperCase();
  const status: "ACTIVE" | "INACTIVE" =
    statusRaw === "INACTIVE" ? "INACTIVE" : "ACTIVE";

  return {
    id: String(row.id ?? ""),
    sku: String(row.sku ?? ""),
    name: String(row.name ?? ""),
    description:
      row.description === null || row.description === undefined
        ? null
        : String(row.description),
    uom_code: String(row.uom_code ?? "EA"),
    is_stock_managed: Boolean(row.is_stock_managed ?? true),
    default_unit_price: Number(row.default_unit_price ?? 0),
    default_tax_rate: Number(row.default_tax_rate ?? 0),
    currency_code: String(row.currency_code ?? "USD"),
    status,
    updated_at: String(row.updated_at ?? ""),
  };
}

function upperRole(r: unknown): Role {
  const s = String(r ?? "").toUpperCase();
  if (s === "OWNER") return "OWNER";
  if (s === "MANAGER") return "MANAGER";
  return "GUEST";
}

function getCatalogSchemaWarning(message: string) {
  if (
    message.includes("Could not find the table") ||
    message.includes("schema cache")
  ) {
    return "Catalog is not available in the current Supabase API yet. The app is pointed at a project where public.catalog_products is missing from the schema cache. Apply the CRM/ERP migrations to that same project and refresh PostgREST.";
  }
  return null;
}

function isMissingBusinessIdColumnError(message: string) {
  const normalized = String(message).toLowerCase();
  return (
    normalized.includes("column catalog_products.business_id does not exist") ||
    normalized.includes("column business_id does not exist")
  );
}

export default async function CatalogProductsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await supabaseServerReadOnly();
  const admin = supabaseAdmin();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nextPath = `/b/${slug}/catalog/products`;
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const { data: business, error: bizErr } = await admin
    .from("businesses")
    .select("id,slug")
    .eq("slug", slug)
    .single();

  if (bizErr || !business) {
    redirect("/app/crm");
  }

  const { data: mem, error: memErr } = await admin
    .from("memberships")
    .select("role")
    .eq("business_id", business.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memErr) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const role: Role = upperRole(mem?.role);
  if (role === "GUEST") {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const baseProductsQuery = () =>
    admin
      .from("catalog_products")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(100);

  let productsResult = await baseProductsQuery().eq("business_id", business.id);
  if (
    productsResult.error &&
    isMissingBusinessIdColumnError(productsResult.error.message)
  ) {
    productsResult = await baseProductsQuery().eq("created_by", user.id);
  }
  const { data: productsData, error: productsError } = productsResult;

  const schemaWarning = productsError
    ? getCatalogSchemaWarning(productsError.message)
    : null;
  if (productsError && !schemaWarning) {
    throw new Error(productsError.message);
  }

  const adminHref = isAdminEmail(user.email) ? getAdminUsersPath() : undefined;
  const rows = ((productsData ?? []) as Record<string, unknown>[])
    .map(asProductRow)
    .filter((row) => row.id);

  return (
    <div className="min-h-[100svh] overflow-x-clip bg-transparent text-[#1F2937]">
      <TeamAccessTopBar
        ordersHref="/app/crm"
        userLabel={user.email || user.phone || "User"}
        roleLabel={role.toLowerCase()}
        adminHref={adminHref}
        userAvatarUrl={String(user.user_metadata?.avatar_url ?? "") || undefined}
        profileHref={
          user.phone
            ? `/m/${encodeURIComponent(user.phone)}`
            : `/b/${encodeURIComponent(business.slug)}`
        }
      />

      <div className="mx-auto max-w-[1220px] overflow-x-clip px-2 pb-[max(96px,env(safe-area-inset-bottom))] pt-[88px] sm:px-6 sm:pb-8 sm:pt-[88px]">
        <div className="hidden items-start lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-5">
          <DesktopLeftRail
            businessId={String(business.id)}
            phoneRaw=""
            q=""
            statuses={[]}
            statusMode="default"
            range="ALL"
            summaryRange="thisMonth"
            startDate={null}
            endDate={null}
            actor="ALL"
            actors={[]}
            currentUserId={user.id}
            hasActiveFilters={false}
            activeFiltersCount={0}
            clearHref={`/b/${business.slug}/catalog/products`}
            businessHref={`/b/${business.slug}`}
            clientsHref={`/b/${business.slug}/clients`}
            catalogHref={`/b/${business.slug}/catalog/products`}
            analyticsHref={`/b/${business.slug}/analytics`}
            supportHref={`/b/${business.slug}/support`}
            settingsHref={`/b/${business.slug}/settings`}
            adminHref={adminHref}
            canSeeAnalytics={role === "OWNER"}
            showFilters={false}
            activeSection="catalog"
          />

          <section className="w-full min-w-0 max-w-full rounded-[20px] border border-[#E5E7EB] bg-white p-3.5 pb-6 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:rounded-[26px] sm:p-5">
            <div className="mb-4">
              <div className="product-page-kicker">Catalog</div>
              <h1 className="product-page-title mt-1.5">Products</h1>
              <p className="product-page-subtitle mt-1.5">
                Create and manage product catalog entries from a separate sidebar section.
              </p>
            </div>

            <CatalogTabs slug={business.slug} active="products" />
            <ProductCatalogManager
              businessSlug={business.slug}
              rows={rows}
              schemaWarning={schemaWarning}
            />
          </section>
        </div>

        <div className="mx-auto w-full max-w-[920px] min-w-0 lg:hidden">
          <section className="w-full min-w-0 max-w-full rounded-[20px] border border-[#E5E7EB] bg-white p-3.5 pb-6 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:rounded-[26px] sm:p-5">
            <div className="mb-4">
              <div className="product-page-kicker">Catalog</div>
              <h1 className="product-page-title mt-1.5">Products</h1>
              <p className="product-page-subtitle mt-1.5">
                Create and manage product catalog entries from a separate sidebar section.
              </p>
            </div>

            <CatalogTabs slug={business.slug} active="products" />
            <ProductCatalogManager
              businessSlug={business.slug}
              rows={rows}
              schemaWarning={schemaWarning}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
