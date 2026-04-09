import { redirect } from "next/navigation";
import { supabaseServerReadOnly } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminUsersPath, isAdminEmail } from "@/lib/admin-access";
import TeamAccessTopBar from "../../settings/team/TeamAccessTopBar";
import CatalogTabs from "../../settings/catalog/CatalogTabs";
import DesktopLeftRail from "@/app/b/[slug]/_components/Desktop/DesktopLeftRail";
import ServiceCatalogManager from "../../settings/catalog/ServiceCatalogManager";

type Role = "OWNER" | "MANAGER" | "GUEST";

type ServiceRow = {
  id: string;
  service_code: string;
  name: string;
  description: string | null;
  default_unit_price: number | string;
  default_tax_rate: number | string;
  currency_code: string;
  default_sla_minutes: number | null;
  default_duration_minutes: number | null;
  requires_assignee: boolean;
  status: "ACTIVE" | "INACTIVE";
  updated_at: string;
};

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
    return "Catalog is not available in the current Supabase API yet. The app is pointed at a project where public.catalog_services is missing from the schema cache. Apply the CRM/ERP migrations to that same project and refresh PostgREST.";
  }
  return null;
}

export default async function CatalogServicesPage({
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

  const nextPath = `/b/${slug}/catalog/services`;
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

  const { data: servicesData, error: servicesError } = await admin
    .from("catalog_services")
    .select(
      "id, service_code, name, description, default_unit_price, default_tax_rate, currency_code, default_sla_minutes, default_duration_minutes, requires_assignee, status, updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(100);

  const schemaWarning = servicesError
    ? getCatalogSchemaWarning(servicesError.message)
    : null;
  if (servicesError && !schemaWarning) {
    throw new Error(servicesError.message);
  }

  const adminHref = isAdminEmail(user.email) ? getAdminUsersPath() : undefined;
  const rows = (servicesData ?? []) as ServiceRow[];

  return (
    <div className="min-h-[100svh] overflow-x-clip bg-transparent text-[#1F2937]">
      <TeamAccessTopBar
        ordersHref="/app/crm"
        userLabel={user.email || user.phone || "User"}
        adminHref={adminHref}
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
            clearHref={`/b/${business.slug}/catalog/services`}
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
              <h1 className="product-page-title mt-1.5">Services</h1>
              <p className="product-page-subtitle mt-1.5">
                Create and manage service catalog entries from a separate sidebar section.
              </p>
            </div>

            <CatalogTabs slug={business.slug} active="services" />
            <ServiceCatalogManager
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
              <h1 className="product-page-title mt-1.5">Services</h1>
              <p className="product-page-subtitle mt-1.5">
                Create and manage service catalog entries from a separate sidebar section.
              </p>
            </div>

            <CatalogTabs slug={business.slug} active="services" />
            <ServiceCatalogManager
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
