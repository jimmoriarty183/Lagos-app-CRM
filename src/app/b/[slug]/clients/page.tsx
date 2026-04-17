import type { BusinessOption } from "@/app/b/[slug]/_components/topbar/BusinessSwitcher";
import TopBar from "@/app/b/[slug]/_components/topbar/TopBar";
import DesktopLeftRail from "@/app/b/[slug]/_components/Desktop/DesktopLeftRail";
import { ClientDirectoryList } from "@/app/b/[slug]/clients/ClientDirectoryList";
import { Button } from "@/components/ui/button";
import { getAdminUsersPath, isAdminEmail } from "@/lib/admin-access";
import { getBusinessClientsContext } from "@/lib/clients/context";
import { isTurnoverEligibleStatus } from "@/lib/orders/display";
import { supabaseServerReadOnly } from "@/lib/supabase/server";

type ClientsPageSearchParams = {
  q?: string;
  manager?: string;
  type?: string;
  u?: string;
  page?: string;
  perPage?: string;
};

type ClientRow = {
  id: string;
  business_id: string;
  client_type: "individual" | "company";
  display_name: string;
  primary_email: string | null;
  primary_phone: string | null;
  postcode: string | null;
  city: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

type IndividualProfileRow = {
  client_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  postcode: string | null;
};

type CompanyProfileRow = {
  client_id: string;
  company_name: string | null;
  registration_number: string | null;
  vat_number: string | null;
  email: string | null;
  phone: string | null;
  postcode: string | null;
};

type CurrentAssignmentRow = {
  client_id: string;
  manager_id: string | null;
  assigned_at: string;
};

type MembershipRow = {
  user_id: string | null;
  role: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

type ContactRow = {
  id: string;
  client_id: string;
  is_active: boolean;
};

type OrderLinkRow = {
  client_id: string | null;
  created_at: string | null;
  amount: number | string | null;
  status: string | null;
};

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function upperRole(value: unknown): "OWNER" | "MANAGER" | "GUEST" {
  const normalized = cleanText(value).toUpperCase();
  if (normalized === "OWNER") return "OWNER";
  if (normalized === "MANAGER") return "MANAGER";
  return "GUEST";
}

function normalizeManagerFilter(value: string | undefined) {
  const trimmed = cleanText(value).toLowerCase();
  if (!trimmed) return "all";
  if (trimmed === "all") return trimmed;
  if (trimmed.startsWith("user:")) return trimmed;
  return "all";
}

function normalizeTypeFilter(value: string | undefined) {
  const trimmed = cleanText(value).toLowerCase();
  if (trimmed === "individual" || trimmed === "company") return trimmed;
  return "all";
}

const PAGE_SIZE_OPTIONS = [20, 50, 100, 500] as const;

function normalizePageSize(value: string | undefined) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return PAGE_SIZE_OPTIONS.includes(
    parsed as (typeof PAGE_SIZE_OPTIONS)[number],
  )
    ? parsed
    : 20;
}

function normalizePageNumber(value: string | undefined) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function logClientsQueryError(scope: string, error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: string }).message ?? "")
      : String(error ?? "");
  console.error(`[clients-page] ${scope} query failed`, { message });
}

export default async function ClientsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<ClientsPageSearchParams>;
}) {
  const [{ slug }, sp] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({} as ClientsPageSearchParams),
  ]);
  const query = cleanText(sp?.q).toLowerCase();
  const managerFilter = normalizeManagerFilter(sp?.manager);
  const typeFilter = normalizeTypeFilter(sp?.type);
  const perPage = normalizePageSize(sp?.perPage);
  const requestedPage = normalizePageNumber(sp?.page);
  const phoneRaw = cleanText(sp?.u);

  const context = await getBusinessClientsContext(slug, `/b/${slug}/clients`);
  const supabase = await supabaseServerReadOnly();

  const businessOptions: BusinessOption[] = context.businesses
    .filter((entry) => cleanText(entry.slug))
    .map((entry) => ({
      id: entry.id,
      slug: entry.slug,
      name: cleanText(entry.name) || entry.slug,
      role: entry.id === context.business.id ? context.role : "MANAGER",
      isAdmin: isAdminEmail(context.user.email),
    }));

  const businessHref = "/app/crm";
  const clientsHref = `/b/${slug}/clients`;
  const todayHref = `/b/${slug}/today`;
  const settingsHref = `/b/${slug}/settings`;
  const supportHref = `/b/${slug}/support`;
  const adminHref = isAdminEmail(context.user.email)
    ? getAdminUsersPath()
    : undefined;

  const { data: clientsData, error: clientsError } = await supabase
    .from("clients")
    .select(
      "id, business_id, client_type, display_name, primary_email, primary_phone, postcode, city, is_archived, created_at, updated_at",
    )
    .eq("business_id", context.business.id)
    .eq("is_archived", false)
    .order("updated_at", { ascending: false });

  if (clientsError) {
    logClientsQueryError("clients", clientsError);
  }

  const clients = (clientsData ?? []) as ClientRow[];
  const clientIds = clients.map((row) => row.id);

  const [
    individualProfilesRes,
    companyProfilesRes,
    assignmentsRes,
    membershipsRes,
  ] = await Promise.all([
    clientIds.length > 0
      ? supabase
          .from("client_individual_profiles")
          .select("client_id, full_name, email, phone, postcode")
          .in("client_id", clientIds)
      : Promise.resolve({ data: [], error: null }),
    clientIds.length > 0
      ? supabase
          .from("client_company_profiles")
          .select(
            "client_id, company_name, registration_number, vat_number, email, phone, postcode",
          )
          .in("client_id", clientIds)
      : Promise.resolve({ data: [], error: null }),
    clientIds.length > 0
      ? supabase
          .from("client_manager_assignments")
          .select("client_id, manager_id, assigned_at")
          .is("unassigned_at", null)
          .in("client_id", clientIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("memberships")
      .select("user_id, role")
      .eq("business_id", context.business.id),
  ]);

  if (individualProfilesRes.error)
    logClientsQueryError("client_individual_profiles", individualProfilesRes.error);
  if (companyProfilesRes.error)
    logClientsQueryError("client_company_profiles", companyProfilesRes.error);
  if (assignmentsRes.error)
    logClientsQueryError("client_manager_assignments", assignmentsRes.error);
  if (membershipsRes.error) logClientsQueryError("memberships", membershipsRes.error);

  const individualByClientId = new Map(
    ((individualProfilesRes.data ?? []) as IndividualProfileRow[]).map(
      (row) => [row.client_id, row],
    ),
  );
  const companyByClientId = new Map(
    ((companyProfilesRes.data ?? []) as CompanyProfileRow[]).map((row) => [
      row.client_id,
      row,
    ]),
  );
  const currentAssignmentByClientId = new Map(
    ((assignmentsRes.data ?? []) as CurrentAssignmentRow[]).map((row) => [
      row.client_id,
      row,
    ]),
  );

  const memberRows = (membershipsRes.data ?? []) as MembershipRow[];
  const managerIds = Array.from(
    new Set(
      memberRows
        .filter((row) => {
          const role = upperRole(row.role);
          return role === "OWNER" || role === "MANAGER";
        })
        .map((row) => cleanText(row.user_id))
        .filter(Boolean),
    ),
  );
  const { data: managerProfilesData, error: managerProfilesError } =
    managerIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name, first_name, last_name, email")
          .in("id", managerIds)
      : { data: [], error: null };
  if (managerProfilesError) logClientsQueryError("profiles", managerProfilesError);

  const managerNameById = new Map(
    ((managerProfilesData ?? []) as ProfileRow[]).map((row) => {
      const fullName = cleanText(row.full_name);
      const composed =
        `${cleanText(row.first_name)} ${cleanText(row.last_name)}`.trim();
      const fallback = cleanText(row.email) || row.id;
      return [row.id, fullName || composed || fallback];
    }),
  );

  const [contactsRes, orderLinksRes] = await Promise.all([
    clientIds.length > 0
      ? supabase
          .from("client_contacts")
          .select("id, client_id, is_active")
          .in("client_id", clientIds)
      : Promise.resolve({ data: [], error: null }),
    clientIds.length > 0
      ? supabase
          .from("orders")
          .select("client_id, created_at, amount, status")
          .eq("business_id", context.business.id)
          .not("client_id", "is", null)
          .in("client_id", clientIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (contactsRes.error) logClientsQueryError("client_contacts", contactsRes.error);
  if (orderLinksRes.error) logClientsQueryError("orders", orderLinksRes.error);

  const contactCountByClientId = new Map<string, number>();
  for (const contact of (contactsRes.data ?? []) as ContactRow[]) {
    if (!contact.is_active) continue;
    contactCountByClientId.set(
      contact.client_id,
      (contactCountByClientId.get(contact.client_id) ?? 0) + 1,
    );
  }

  const ordersCountByClientId = new Map<string, number>();
  const turnoverByClientId = new Map<string, number>();
  const lastOrderAtByClientId = new Map<string, string>();
  for (const row of (orderLinksRes.data ?? []) as OrderLinkRow[]) {
    const clientId = cleanText(row.client_id);
    if (!clientId) continue;
    if (!isTurnoverEligibleStatus(cleanText(row.status))) continue;
    ordersCountByClientId.set(
      clientId,
      (ordersCountByClientId.get(clientId) ?? 0) + 1,
    );
    turnoverByClientId.set(
      clientId,
      (turnoverByClientId.get(clientId) ?? 0) + Number(row.amount ?? 0),
    );

    const createdAt = cleanText(row.created_at);
    if (!createdAt) continue;
    const currentLast = lastOrderAtByClientId.get(clientId);
    if (!currentLast || createdAt > currentLast) {
      lastOrderAtByClientId.set(clientId, createdAt);
    }
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

  const allRows = clients.map((client) => {
    const individual = individualByClientId.get(client.id) ?? null;
    const company = companyByClientId.get(client.id) ?? null;
    const assignment = currentAssignmentByClientId.get(client.id) ?? null;
    const currentManagerId = cleanText(assignment?.manager_id) || null;
    const currentManagerName = currentManagerId
      ? (managerNameById.get(currentManagerId) ?? currentManagerId)
      : null;

    const resolvedName =
      (client.client_type === "company"
        ? cleanText(company?.company_name)
        : cleanText(individual?.full_name)) || cleanText(client.display_name);

    const resolvedEmail =
      cleanText(individual?.email) ||
      cleanText(company?.email) ||
      cleanText(client.primary_email) ||
      null;
    const resolvedPhone =
      cleanText(individual?.phone) ||
      cleanText(company?.phone) ||
      cleanText(client.primary_phone) ||
      null;
    const resolvedPostcode =
      cleanText(individual?.postcode) ||
      cleanText(company?.postcode) ||
      cleanText(client.postcode) ||
      null;
    const searchBlob = [
      resolvedName,
      resolvedEmail,
      resolvedPhone,
      resolvedPostcode,
      cleanText(company?.registration_number),
      cleanText(company?.vat_number),
      currentManagerName ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return {
      ...client,
      resolved_name: resolvedName || "Unnamed client",
      resolved_email: resolvedEmail,
      resolved_phone: resolvedPhone,
      resolved_postcode: resolvedPostcode,
      current_manager_id: currentManagerId,
      current_manager_name: currentManagerName,
      contacts_count:
        (contactCountByClientId.get(client.id) ?? 0) +
        (client.client_type === "individual" && (resolvedPhone || resolvedEmail)
          ? 1
          : 0),
      orders_count: ordersCountByClientId.get(client.id) ?? 0,
      turnover_total: turnoverByClientId.get(client.id) ?? 0,
      last_order_at: lastOrderAtByClientId.get(client.id) ?? null,
      created_recently: cleanText(client.created_at) >= thirtyDaysAgoIso,
      search_blob: searchBlob,
    };
  });

  const scopedRows =
    context.role === "MANAGER"
      ? allRows.filter((row) => row.current_manager_id === context.user.id)
      : allRows;

  const filteredRows = scopedRows.filter((row) => {
    if (typeFilter !== "all" && row.client_type !== typeFilter) return false;
    if (managerFilter.startsWith("user:")) {
      const targetManagerId = managerFilter.slice(5);
      if (row.current_manager_id !== targetManagerId) return false;
    }
    if (query && !row.search_blob.includes(query)) return false;
    return true;
  });

  const totalClients = filteredRows.length;
  const clientsWithOrders = filteredRows.filter(
    (row) => row.orders_count > 0,
  ).length;
  const newLast30d = filteredRows.filter((row) => row.created_recently).length;
  const totalTurnover = filteredRows.reduce(
    (sum, row) => sum + Number(row.turnover_total ?? 0),
    0,
  );
  const totalPages = Math.max(1, Math.ceil(totalClients / perPage));
  const currentPage = Math.min(requestedPage, totalPages);
  const pageStart = (currentPage - 1) * perPage;
  const rows = filteredRows.slice(pageStart, pageStart + perPage);

  const managerOptions = managerIds
    .map((id) => ({
      id,
      label: managerNameById.get(id) ?? id,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const scopedManagerOptions =
    context.role === "MANAGER"
      ? managerOptions.filter((entry) => entry.id === context.user.id)
      : managerOptions;

  return (
    <div className="min-h-screen overflow-x-hidden bg-transparent text-slate-900">
      <TopBar
        businessSlug={slug}
        role={context.role}
        currentUserName={
          cleanText(context.profile?.full_name) ||
          cleanText(context.profile?.email) ||
          context.user.email ||
          "User"
        }
        currentUserAvatarUrl={context.profile?.avatar_url || undefined}
        currentPlan={context.business.plan}
        businesses={businessOptions}
        businessId={context.business.id}
        businessHref={businessHref}
        clientsHref={clientsHref}
        todayHref={todayHref}
        settingsHref={settingsHref}
        supportHref={supportHref}
        adminHref={adminHref}
        clearHref={clientsHref}
        hasActiveFilters={
          Boolean(query) || managerFilter !== "all" || typeFilter !== "all"
        }
      />

      <main className="mx-auto max-w-[1220px] overflow-x-hidden px-4 pb-8 pt-16 sm:px-6">
        <div className="hidden items-start gap-5 lg:grid lg:grid-cols-[auto_minmax(0,1fr)]">
          <div className="relative shrink-0">
            <DesktopLeftRail
              businessId={context.business.id}
              phoneRaw={phoneRaw}
              q=""
              statuses={[]}
              statusMode="default"
              range="ALL"
              summaryRange="thisMonth"
              startDate={null}
              endDate={null}
              actor="ALL"
              sort="default"
              actors={[]}
              currentUserId={context.user.id}
              hasActiveFilters={false}
              activeFiltersCount={0}
              clearHref={clientsHref}
              businessHref={businessHref}
              clientsHref={clientsHref}
              catalogHref={`/b/${slug}/catalog/products`}
              analyticsHref={`/b/${slug}/analytics`}
              todayHref={todayHref}
              supportHref={supportHref}
              settingsHref={settingsHref}
              adminHref={adminHref}
              canSeeAnalytics={context.role === "OWNER"}
              showFilters={false}
              activeSection="clients"
            />
          </div>

          <section className="min-w-0 space-y-3">
            <div className="rounded-[16px] border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="product-page-kicker">CRM Clients</div>
                  <h1 className="product-page-title mt-1.5">
                    Client Directory
                  </h1>
                  <p className="product-page-subtitle mt-1.5">
                    Normalized clients with manager ownership and turnover
                    visibility.
                  </p>
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Clients" value={String(totalClients)} />
                <MetricCard
                  label="With orders"
                  value={String(clientsWithOrders)}
                />
                <MetricCard label="New (30d)" value={String(newLast30d)} />
                <MetricCard
                  label="Total turnover"
                  value={new Intl.NumberFormat("en-GB", {
                    style: "currency",
                    currency: "GBP",
                    maximumFractionDigits: 0,
                  }).format(totalTurnover)}
                />
              </div>

              <form
                action={clientsHref}
                className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_220px_180px_auto]"
              >
                {phoneRaw ? (
                  <input type="hidden" name="u" value={phoneRaw} />
                ) : null}
                <input type="hidden" name="page" value="1" />
                <input type="hidden" name="perPage" value={String(perPage)} />
                <input
                  type="text"
                  name="q"
                  defaultValue={query}
                  placeholder="Search name, email, phone, postcode, company numbers"
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
                <select
                  name="manager"
                  defaultValue={managerFilter}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="all">
                    {context.role === "OWNER" ? "All managers" : "My clients"}
                  </option>
                  {context.role === "OWNER"
                    ? scopedManagerOptions.map((manager) => (
                        <option key={manager.id} value={`user:${manager.id}`}>
                          {manager.label}
                        </option>
                      ))
                    : null}
                </select>
                <select
                  name="type"
                  defaultValue={typeFilter}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="all">All types</option>
                  <option value="individual">Individuals</option>
                  <option value="company">Companies</option>
                </select>
                <Button
                  type="submit"
                  className="h-10 rounded-xl px-4 text-sm font-semibold"
                >
                  Apply
                </Button>
              </form>
            </div>

            <ClientDirectoryList
              rows={rows}
              slug={slug}
              businessId={context.business.id}
              currentPage={currentPage}
              totalPages={totalPages}
              perPage={perPage}
              q={query}
              manager={managerFilter}
              type={typeFilter}
              phoneRaw={phoneRaw}
            />
          </section>
        </div>

        <div className="space-y-3 lg:hidden">
          <section className="rounded-[16px] border border-[#E5E7EB] bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="product-page-kicker">CRM Clients</div>
            <h1 className="product-page-title mt-1.5">Client Directory</h1>
            <p className="product-page-subtitle mt-1.5">
              {totalClients} clients in current scope.
            </p>
          </section>
          <ClientDirectoryList
            rows={rows}
            slug={slug}
            businessId={context.business.id}
            mobileOnly
            currentPage={currentPage}
            totalPages={totalPages}
            perPage={perPage}
            q={query}
            manager={managerFilter}
            type={typeFilter}
            phoneRaw={phoneRaw}
          />
        </div>
      </main>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-2.5">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-0.5 text-base font-semibold text-slate-900">{value}</div>
    </div>
  );
}
