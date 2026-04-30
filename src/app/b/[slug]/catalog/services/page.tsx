import { redirect } from "next/navigation";
import { supabaseServerReadOnly } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminUsersPath, isAdminEmail } from "@/lib/admin-access";
import { isCleaningSegment } from "@/lib/business-segments";
import TeamAccessTopBar from "../../settings/team/TeamAccessTopBar";
import CatalogTabs from "../../settings/catalog/CatalogTabs";
import CleaningTemplatesButton from "../../settings/catalog/CleaningTemplatesButton";
import DesktopLeftRail from "@/app/b/[slug]/_components/Desktop/DesktopLeftRail";
import ServiceCatalogManager from "../../settings/catalog/ServiceCatalogManager";
import { loadUserProfileSafe } from "@/lib/profile";
import { resolveUserDisplay } from "@/lib/user-display";

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

function asServiceRow(row: Record<string, unknown>): ServiceRow {
  const statusRaw = String(row.status ?? "").toUpperCase();
  const status: "ACTIVE" | "INACTIVE" =
    statusRaw === "INACTIVE" ? "INACTIVE" : "ACTIVE";

  return {
    id: String(row.id ?? ""),
    service_code: String(row.service_code ?? ""),
    name: String(row.name ?? ""),
    description:
      row.description === null || row.description === undefined
        ? null
        : String(row.description),
    default_unit_price: Number(row.default_unit_price ?? 0),
    default_tax_rate: Number(row.default_tax_rate ?? 0),
    currency_code: String(row.currency_code ?? "USD"),
    default_sla_minutes:
      row.default_sla_minutes === null || row.default_sla_minutes === undefined
        ? null
        : Number(row.default_sla_minutes),
    default_duration_minutes:
      row.default_duration_minutes === null ||
      row.default_duration_minutes === undefined
        ? null
        : Number(row.default_duration_minutes),
    requires_assignee: Boolean(row.requires_assignee ?? false),
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
    return "Catalog is not available in the current Supabase API yet. The app is pointed at a project where public.catalog_services is missing from the schema cache. Apply the CRM/ERP migrations to that same project and refresh PostgREST.";
  }
  return null;
}

function isMissingBusinessIdColumnError(message: string) {
  const normalized = String(message).toLowerCase();
  return (
    normalized.includes("column catalog_services.business_id does not exist") ||
    normalized.includes("column business_id does not exist")
  );
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
    .select("id,slug,plan,business_segment")
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

  const baseServicesQuery = () =>
    admin
      .from("catalog_services")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(100);

  let servicesResult = await baseServicesQuery().eq("business_id", business.id);
  if (
    servicesResult.error &&
    isMissingBusinessIdColumnError(servicesResult.error.message)
  ) {
    servicesResult = await baseServicesQuery().eq("created_by", user.id);
  }
  const { data: servicesData, error: servicesError } = servicesResult;

  const schemaWarning = servicesError
    ? getCatalogSchemaWarning(servicesError.message)
    : null;
  if (servicesError && !schemaWarning) {
    throw new Error(servicesError.message);
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
  const rows = ((servicesData ?? []) as Record<string, unknown>[])
    .map(asServiceRow)
    .filter((row) => row.id);

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
    <div className="min-h-[100svh] overflow-x-clip bg-transparent text-[#1F2937] dark:text-white/90">
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

          <section className="w-full min-w-0 max-w-full rounded-[14px] border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] p-3 pb-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:rounded-[18px] sm:p-4">
            <div className="mb-3">
              <div className="product-page-kicker">Catalog</div>
              <h1 className="product-page-title mt-1.5">Services</h1>
              <p className="product-page-subtitle mt-1.5">
                Create and manage service catalog entries from a separate sidebar section.
              </p>
            </div>

            <CatalogTabs slug={business.slug} active="services" />
            {isCleaningSegment(business.business_segment) ? (
              <CleaningTemplatesButton businessSlug={business.slug} />
            ) : null}
            <ServiceCatalogManager
              businessSlug={business.slug}
              rows={rows}
              schemaWarning={schemaWarning}
            />
          </section>
        </div>

        <div className="mx-auto w-full max-w-[920px] min-w-0 lg:hidden">
          <section className="w-full min-w-0 max-w-full rounded-[14px] border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] p-3 pb-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:rounded-[18px] sm:p-4">
            <div className="mb-3">
              <div className="product-page-kicker">Catalog</div>
              <h1 className="product-page-title mt-1.5">Services</h1>
              <p className="product-page-subtitle mt-1.5">
                Create and manage service catalog entries from a separate sidebar section.
              </p>
            </div>

            <CatalogTabs slug={business.slug} active="services" />
            {isCleaningSegment(business.business_segment) ? (
              <CleaningTemplatesButton businessSlug={business.slug} />
            ) : null}
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
