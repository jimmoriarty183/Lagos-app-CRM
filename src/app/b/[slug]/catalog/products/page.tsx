import { redirect } from "next/navigation";
import { supabaseServerReadOnly } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminUsersPath, isAdminEmail } from "@/lib/admin-access";
import TeamAccessTopBar from "../../settings/team/TeamAccessTopBar";
import CatalogTabs from "../../settings/catalog/CatalogTabs";
import DesktopLeftRail from "@/app/b/[slug]/_components/Desktop/DesktopLeftRail";
import ProductCatalogManager from "../../settings/catalog/ProductCatalogManager";
import { loadUserProfileSafe } from "@/lib/profile";
import { resolveUserDisplay } from "@/lib/user-display";

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
    .select("id,slug,plan")
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
  const profile = await loadUserProfileSafe(supabase, user.id);
  const currentUserName = resolveUserDisplay({
    full_name: profile?.full_name ?? String(user.user_metadata?.full_name ?? ""),
    first_name: profile?.first_name ?? String(user.user_metadata?.first_name ?? ""),
    last_name: profile?.last_name ?? String(user.user_metadata?.last_name ?? ""),
    email: profile?.email ?? user.email ?? null,
    phone: user.phone ?? null,
  }).primary;
  const currentUserAvatarUrl =
    String(profile?.avatar_url ?? user.user_metadata?.avatar_url ?? "").trim() || undefined;
  const rawRows = ((productsData ?? []) as Record<string, unknown>[])
    .map(asProductRow)
    .filter((row) => row.id);

  // Load stock quantities
  const stockProductIds = rawRows.filter((r) => r.is_stock_managed).map((r) => r.id);
  let stockMap = new Map<string, number>();
  if (stockProductIds.length > 0) {
    const { data: balances } = await admin
      .from("inventory_balances")
      .select("product_id, on_hand_qty")
      .in("product_id", stockProductIds);
    if (balances) {
      for (const b of balances as { product_id: string; on_hand_qty: number }[]) {
        stockMap.set(b.product_id, Number(b.on_hand_qty ?? 0));
      }
    }
  }
  const rows = rawRows.map((r) => ({
    ...r,
    stock_qty: r.is_stock_managed ? (stockMap.get(r.id) ?? 0) : null,
  }));

  // Load businesses for switcher
  const { data: userMemberships } = await admin
    .from("memberships")
    .select("business_id, role")
    .eq("user_id", user.id);
  const bizIds = (userMemberships ?? []).map((m: any) => m.business_id);
  const { data: allBusinesses } = bizIds.length > 0
    ? await admin.from("businesses").select("id, slug, name").in("id", bizIds)
    : { data: [] };
  const businessOptions = (allBusinesses ?? []).map((b: any) => ({
    id: String(b.id),
    slug: String(b.slug),
    name: String(b.name ?? b.slug),
    role: ((userMemberships ?? []).find((m: any) => m.business_id === b.id)?.role ?? "GUEST").toUpperCase(),
  }));

  return (
    <div className="min-h-[100svh] overflow-x-clip bg-transparent text-[#1F2937]">
      <TeamAccessTopBar
        ordersHref={`/b/${slug}`}
        userLabel={currentUserName}
        currentPlan={business.plan}
        businessId={String(business.id)}
        roleLabel={role.toLowerCase()}
        adminHref={adminHref}
        userAvatarUrl={currentUserAvatarUrl}
        businesses={businessOptions}
        currentBusinessSlug={slug}
        profileHref={
          user.phone
            ? `/m/${encodeURIComponent(user.phone)}`
            : `/b/${encodeURIComponent(business.slug)}`
        }
      />

      <div className="mx-auto max-w-[1220px] px-2 pb-[max(96px,env(safe-area-inset-bottom))] pt-[64px] sm:px-6 sm:pb-8 sm:pt-[64px]">
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

          <section className="w-full min-w-0 max-w-full rounded-[14px] border border-[#E5E7EB] bg-white p-3 pb-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:rounded-[18px] sm:p-4">
            <div className="mb-3">
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
          <section className="w-full min-w-0 max-w-full rounded-[14px] border border-[#E5E7EB] bg-white p-3 pb-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:rounded-[18px] sm:p-4">
            <div className="mb-3">
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
