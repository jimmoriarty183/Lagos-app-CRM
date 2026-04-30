import Link from "next/link";
import type { BusinessOption } from "@/app/b/[slug]/_components/topbar/BusinessSwitcher";
import TopBar from "@/app/b/[slug]/_components/topbar/TopBar";
import DesktopLeftRail from "@/app/b/[slug]/_components/Desktop/DesktopLeftRail";
import { ClientBillingPaymentEditor } from "@/app/b/[slug]/clients/[clientId]/ClientBillingPaymentEditor";
import { ClientStickyContextBar } from "@/app/b/[slug]/clients/[clientId]/ClientStickyContextBar";
import { ClientTypeEditor } from "@/app/b/[slug]/clients/[clientId]/ClientTypeEditor";
import { RelatedOrdersPreview } from "@/app/b/[slug]/clients/[clientId]/RelatedOrdersPreview";
import { Button } from "@/components/ui/button";
import {
  deactivateClientContact,
  saveClientAccessNotes,
  saveClientLocation,
  saveClientProfileData,
  saveClientContact,
  setClientCurrentManager,
} from "@/app/b/[slug]/clients/actions";
import { getAdminUsersPath, isAdminEmail } from "@/lib/admin-access";
import { isCleaningSegment } from "@/lib/business-segments";
import { getBusinessClientsContext } from "@/lib/clients/context";
import { isTurnoverEligibleStatus } from "@/lib/orders/display";
import { supabaseServerReadOnly } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type ProfileRow = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
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
  country_code: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type AccessNotes = {
  gate_code: string | null;
  key_location: string | null;
  pets: string | null;
  parking: string | null;
  alarm_code: string | null;
  instructions: string | null;
};

function readAccessNotes(metadata: Record<string, unknown> | null): AccessNotes {
  const raw =
    (metadata?.access_notes as Record<string, unknown> | null | undefined) ??
    null;
  const pick = (key: string) => {
    const value = raw?.[key];
    return typeof value === "string" && value.trim().length > 0
      ? value.trim()
      : null;
  };
  return {
    gate_code: pick("gate_code"),
    key_location: pick("key_location"),
    pets: pick("pets"),
    parking: pick("parking"),
    alarm_code: pick("alarm_code"),
    instructions: pick("instructions"),
  };
}

type IndividualProfileRow = {
  client_id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
};

type CompanyProfileRow = {
  client_id: string;
  company_name: string;
  registration_number: string | null;
  vat_number: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
};

type ClientContactRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
  is_billing_contact: boolean;
  is_decision_maker: boolean;
  is_active: boolean;
  created_at: string;
};

type ClientBillingProfileRow = {
  id: string;
  legal_entity_name: string | null;
  registration_number: string | null;
  vat_number: string | null;
  tax_id: string | null;
  legal_address: string | null;
  postcode: string | null;
  same_as_company_profile: boolean;
  bank_name: string | null;
  account_number: string | null;
  swift_bic: string | null;
  currency_code: string | null;
  payment_method: string | null;
  payment_terms: string | null;
  payment_terms_custom: string | null;
  primary_email: string | null;
  primary_email_source: string | null;
  invoice_email: string | null;
  invoice_email_source: string | null;
};

type ClientAssignmentRow = {
  id: string;
  manager_id: string | null;
  assigned_by: string | null;
  assigned_at: string;
  unassigned_at: string | null;
  note: string | null;
};

type OrderRow = {
  id: string;
  order_number: number | null;
  amount: number | string | null;
  status: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string | null;
  contact_id: string | null;
};

type ActivityEventRow = {
  id: string;
  event_type: string;
  actor_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

type MembershipRow = {
  user_id: string | null;
  role: string | null;
};

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function isMissingRelationError(
  error: { message?: string } | null | undefined,
  relationName: string,
) {
  const message = cleanText(error?.message).toLowerCase();
  if (!message) return false;
  return (
    message.includes(`could not find the table 'public.${relationName}'`) ||
    message.includes(`relation \"public.${relationName}\" does not exist`) ||
    message.includes(`relation \"${relationName}\" does not exist`)
  );
}

function isMissingColumnError(
  error: { message?: string } | null | undefined,
  columnName: string,
) {
  const message = cleanText(error?.message).toLowerCase();
  if (!message) return false;
  return (
    message.includes(`column \"${columnName.toLowerCase()}\"`) &&
    message.includes("does not exist")
  );
}

function upperRole(value: unknown): "OWNER" | "MANAGER" | "GUEST" {
  const normalized = cleanText(value).toUpperCase();
  if (normalized === "OWNER") return "OWNER";
  if (normalized === "MANAGER") return "MANAGER";
  return "GUEST";
}

function formatDateTime(value: string | null | undefined) {
  const text = cleanText(value);
  if (!text) return "—";
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;
  return parsed.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; clientId: string }>;
  searchParams?: Promise<{ u?: string }>;
}) {
  const [{ slug, clientId }, sp] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({}),
  ]);
  const phoneRaw = cleanText(sp?.u);
  const context = await getBusinessClientsContext(
    slug,
    `/b/${slug}/clients/${clientId}`,
  );
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

  const businessHref = `/b/${slug}`;
  const clientsHref = `/b/${slug}/clients`;
  const todayHref = `/b/${slug}/today`;
  const settingsHref = `/b/${slug}/settings`;
  const supportHref = `/b/${slug}/support`;
  const adminHref = isAdminEmail(context.user.email)
    ? getAdminUsersPath()
    : undefined;

  const { data: clientData, error: clientError } = await supabase
    .from("clients")
    .select(
      "id, business_id, client_type, display_name, primary_email, primary_phone, postcode, city, country_code, metadata, created_at, updated_at",
    )
    .eq("id", clientId)
    .eq("business_id", context.business.id)
    .maybeSingle();
  if (clientError) throw new Error(clientError.message);
  if (!clientData) notFound();
  const client = clientData as ClientRow;

  const [
    individualRes,
    companyRes,
    billingProfileRes,
    contactsRes,
    assignmentsRes,
    ordersRes,
    membershipsRes,
  ] = await Promise.all([
    supabase
      .from("client_individual_profiles")
      .select(
        "client_id, full_name, first_name, last_name, email, phone, address_line1, address_line2, city, county, postcode",
      )
      .eq("client_id", client.id)
      .maybeSingle(),
    supabase
      .from("client_company_profiles")
      .select(
        "client_id, company_name, registration_number, vat_number, email, phone, website, address_line1, address_line2, city, county, postcode",
      )
      .eq("client_id", client.id)
      .maybeSingle(),
    (async () => {
      const response = await supabase
        .from("client_billing_profiles")
        .select(
          "id, legal_entity_name, registration_number, vat_number, tax_id, legal_address, postcode, same_as_company_profile, bank_name, account_number, swift_bic, currency_code, payment_method, payment_terms, payment_terms_custom, primary_email, primary_email_source, invoice_email, invoice_email_source",
        )
        .eq("client_id", client.id)
        .eq("is_default", true)
        .maybeSingle();

      if (
        response.error &&
        isMissingRelationError(response.error, "client_billing_profiles")
      ) {
        return { data: null, error: null };
      }
      return response;
    })(),
    (async () => {
      const response = await supabase
        .from("client_contacts")
        .select(
          "id, first_name, last_name, full_name, job_title, email, phone, is_primary, is_billing_contact, is_decision_maker, is_active, created_at",
        )
        .eq("client_id", client.id)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: false });

      if (
        response.error &&
        (isMissingColumnError(response.error, "is_billing_contact") ||
          isMissingColumnError(response.error, "is_decision_maker"))
      ) {
        const fallback = await supabase
          .from("client_contacts")
          .select(
            "id, first_name, last_name, full_name, job_title, email, phone, is_primary, is_active, created_at",
          )
          .eq("client_id", client.id)
          .order("is_primary", { ascending: false })
          .order("created_at", { ascending: false });

        if (fallback.error) return fallback;

        return {
          data: (fallback.data ?? []).map((row) => ({
            ...row,
            is_billing_contact: false,
            is_decision_maker: false,
          })),
          error: null,
        };
      }

      return response;
    })(),
    supabase
      .from("client_manager_assignments")
      .select("id, manager_id, assigned_by, assigned_at, unassigned_at, note")
      .eq("client_id", client.id)
      .order("assigned_at", { ascending: false }),
    supabase
      .from("orders")
      .select(
        "id, order_number, amount, status, due_date, created_at, updated_at, contact_id",
      )
      .eq("business_id", context.business.id)
      .eq("client_id", client.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("memberships")
      .select("user_id, role")
      .eq("business_id", context.business.id),
  ]);

  if (individualRes.error) throw new Error(individualRes.error.message);
  if (companyRes.error) throw new Error(companyRes.error.message);
  if (billingProfileRes.error) throw new Error(billingProfileRes.error.message);
  if (contactsRes.error) throw new Error(contactsRes.error.message);
  if (assignmentsRes.error) throw new Error(assignmentsRes.error.message);
  if (ordersRes.error) throw new Error(ordersRes.error.message);
  if (membershipsRes.error) throw new Error(membershipsRes.error.message);

  const { data: activityEventsData, error: activityEventsError } =
    await supabase
      .from("activity_events")
      .select("id, event_type, actor_id, payload, created_at")
      .eq("business_id", context.business.id)
      .eq("entity_type", "client")
      .eq("entity_id", client.id)
      .order("created_at", { ascending: false })
      .limit(30);
  if (activityEventsError) throw new Error(activityEventsError.message);

  const individual =
    (individualRes.data as IndividualProfileRow | null) ?? null;
  const company = (companyRes.data as CompanyProfileRow | null) ?? null;
  const billingProfile =
    (billingProfileRes.data as ClientBillingProfileRow | null) ?? null;
  const contacts = (contactsRes.data ?? []) as ClientContactRow[];
  const assignments = (assignmentsRes.data ?? []) as ClientAssignmentRow[];
  const orders = (ordersRes.data ?? []) as OrderRow[];
  const activityEvents = (activityEventsData ?? []) as ActivityEventRow[];
  const currentAssignment =
    assignments.find((assignment) => !assignment.unassigned_at) ?? null;

  const managerIds = Array.from(
    new Set(
      ((membershipsRes.data ?? []) as MembershipRow[])
        .filter((row) => {
          const role = upperRole(row.role);
          return role === "OWNER" || role === "MANAGER";
        })
        .map((row) => cleanText(row.user_id))
        .filter(Boolean),
    ),
  );
  const profileIds = Array.from(
    new Set(
      [
        ...managerIds,
        ...assignments.map((row) => cleanText(row.assigned_by)),
        ...assignments.map((row) => cleanText(row.manager_id)),
      ].filter(Boolean),
    ),
  );
  const { data: profileRowsData, error: profileRowsError } =
    profileIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name, first_name, last_name, email")
          .in("id", profileIds)
      : { data: [], error: null };
  if (profileRowsError) throw new Error(profileRowsError.message);

  const profileRows = (profileRowsData ?? []) as ProfileRow[];
  const profileNameById = new Map(
    profileRows.map((row) => {
      const fullName = cleanText(row.full_name);
      const composed =
        `${cleanText(row.first_name)} ${cleanText(row.last_name)}`.trim();
      const fallback = cleanText(row.email) || row.id;
      return [row.id, fullName || composed || fallback];
    }),
  );

  const managerOptions = managerIds
    .map((id) => ({
      id,
      label: profileNameById.get(id) ?? id,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const activeOrders = orders.filter((order) =>
    isTurnoverEligibleStatus(cleanText(order.status)),
  );
  const totalTurnover = activeOrders.reduce(
    (sum, order) => sum + Number(order.amount ?? 0),
    0,
  );
  const orderCount = activeOrders.length;
  const averageOrderValue = orderCount > 0 ? totalTurnover / orderCount : 0;
  const lastOrderDate =
    activeOrders.length > 0
      ? activeOrders
          .map((row) => cleanText(row.created_at))
          .sort((a, b) => (a > b ? -1 : 1))[0]
      : null;

  const resolvedName =
    (client.client_type === "company"
      ? cleanText(company?.company_name)
      : cleanText(individual?.full_name)) || cleanText(client.display_name);
  const resolvedEmail =
    cleanText(individual?.email) ||
    cleanText(company?.email) ||
    cleanText(client.primary_email) ||
    "—";
  const resolvedPhone =
    cleanText(individual?.phone) ||
    cleanText(company?.phone) ||
    cleanText(client.primary_phone) ||
    "—";
  const resolvedPostcode =
    cleanText(individual?.postcode) ||
    cleanText(company?.postcode) ||
    cleanText(client.postcode) ||
    "—";
  const primaryContact =
    contacts.find((contact) => contact.is_active && contact.is_primary) ?? null;
  const primaryContactEmail = cleanText(primaryContact?.email);
  const communicationEmailSource =
    cleanText(billingProfile?.primary_email_source) === "primary_contact"
      ? "primary_contact"
      : "custom";
  const invoiceEmailSource =
    cleanText(billingProfile?.invoice_email_source) === "primary_contact"
      ? "primary_contact"
      : "custom";
  const currentManagerName = cleanText(currentAssignment?.manager_id)
    ? profileNameById.get(cleanText(currentAssignment?.manager_id)) ||
      cleanText(currentAssignment?.manager_id)
    : "Unassigned";
  const primaryContactName = primaryContact
    ? cleanText(primaryContact.full_name) ||
      `${cleanText(primaryContact.first_name)} ${cleanText(primaryContact.last_name)}`.trim() ||
      "Unnamed contact"
    : "Not set";
  const revenueFormatted = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(totalTurnover);
  const averageOrderFormatted = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(averageOrderValue);
  const lastOrderFormatted = formatDateTime(lastOrderDate);
  const profileData =
    client.client_type === "company"
      ? [
          {
            label: "Company name",
            value:
              cleanText(company?.company_name) ||
              cleanText(client.display_name) ||
              "—",
          },
          {
            label: "Registration number",
            value: cleanText(company?.registration_number) || "—",
          },
          { label: "VAT number", value: cleanText(company?.vat_number) || "—" },
          { label: "Website", value: cleanText(company?.website) || "—" },
          {
            label: "Phone",
            value:
              cleanText(company?.phone) ||
              cleanText(client.primary_phone) ||
              "—",
          },
          {
            label: "Email",
            value:
              cleanText(company?.email) ||
              cleanText(client.primary_email) ||
              "—",
          },
          {
            label: "Address line 1",
            value: cleanText(company?.address_line1) || "—",
          },
          {
            label: "Address line 2",
            value: cleanText(company?.address_line2) || "—",
          },
          {
            label: "County / Region",
            value: cleanText(company?.county) || "—",
          },
          {
            label: "City",
            value: cleanText(client.city) || cleanText(company?.city) || "—",
          },
          {
            label: "Postcode",
            value:
              cleanText(client.postcode) || cleanText(company?.postcode) || "—",
          },
          {
            label: "Country code",
            value: cleanText(client.country_code) || "GB",
          },
        ]
      : [
          {
            label: "Full name",
            value:
              cleanText(individual?.full_name) ||
              cleanText(client.display_name) ||
              "—",
          },
          {
            label: "First name",
            value: cleanText(individual?.first_name) || "—",
          },
          {
            label: "Last name",
            value: cleanText(individual?.last_name) || "—",
          },
          {
            label: "Phone",
            value:
              cleanText(individual?.phone) ||
              cleanText(client.primary_phone) ||
              "—",
          },
          {
            label: "Email",
            value:
              cleanText(individual?.email) ||
              cleanText(client.primary_email) ||
              "—",
          },
          {
            label: "Address line 1",
            value: cleanText(individual?.address_line1) || "—",
          },
          {
            label: "Address line 2",
            value: cleanText(individual?.address_line2) || "—",
          },
          {
            label: "County / Region",
            value: cleanText(individual?.county) || "—",
          },
          {
            label: "City",
            value: cleanText(client.city) || cleanText(individual?.city) || "—",
          },
          {
            label: "Postcode",
            value:
              cleanText(client.postcode) ||
              cleanText(individual?.postcode) ||
              "—",
          },
          {
            label: "Country code",
            value: cleanText(client.country_code) || "GB",
          },
        ];

  if (context.role === "MANAGER") {
    const managerOwnsClient =
      cleanText(currentAssignment?.manager_id) === context.user.id;
    if (!managerOwnsClient) notFound();
  }
  const visibleActivityEvents = activityEvents.filter((entry) => {
    const type = cleanText(entry.event_type);
    return type.startsWith("client.") || type.startsWith("order.");
  });

  const isCleaning = isCleaningSegment(context.business.business_segment);
  const accessNotes = readAccessNotes(client.metadata);
  const hasAccessNotes = Object.values(accessNotes).some((value) => value);

  return (
    <div className="min-h-screen overflow-x-hidden bg-transparent text-slate-900 dark:text-white">
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

          <section id="client-main-content" className="min-w-0 space-y-3">
            <div
              id="client-hero-card"
              className="rounded-[16px] border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="product-page-kicker">Client Detail</div>
                  <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-tight text-slate-900 dark:text-white">
                    {resolvedName || "Unnamed client"}
                  </h1>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full border border-[var(--brand-200)] bg-[var(--brand-50)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--brand-700)]">
                      {client.client_type}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-white/80">
                      Manager: {currentManagerName}
                    </span>
                    {client.client_type === "company" ? (
                      <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-white/80">
                        Primary contact: {primaryContactName}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-slate-500 dark:text-white/55">
                    {resolvedEmail} • {resolvedPhone}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href="#profile-data"
                    className="inline-flex h-9 items-center rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-white/[0.03] px-3 text-sm font-semibold text-slate-700 dark:text-white/80 transition hover:border-slate-400"
                  >
                    Edit
                  </Link>
                  <ClientTypeEditor
                    clientId={client.id}
                    businessSlug={slug}
                    currentType={client.client_type}
                    companyNameHint={
                      cleanText(company?.company_name) ||
                      cleanText(client.display_name)
                    }
                    hasPrimaryContact={contacts.some(
                      (contact) => contact.is_active && contact.is_primary,
                    )}
                    compact
                    showTypeBadge={false}
                    compactLabel="Change client type"
                  />
                  <Link
                    href={clientsHref}
                    className="inline-flex h-9 items-center rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-white/[0.03] px-3 text-sm font-semibold text-slate-700 dark:text-white/80 transition hover:border-slate-400"
                  >
                    Back
                  </Link>
                </div>
              </div>

              <dl className="mt-2.5 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
                <InfoRow label="Postcode" value={resolvedPostcode} />
                <InfoRow label="City" value={cleanText(client.city) || "—"} />
                <InfoRow
                  label="Country"
                  value={cleanText(client.country_code) || "GB"}
                />
                <InfoRow
                  label="Updated"
                  value={formatDateTime(client.updated_at)}
                />
              </dl>
            </div>

            <ClientStickyContextBar
              targetId="client-hero-card"
              containerId="client-main-content"
              minContainerWidth={1080}
              clientName={resolvedName || "Unnamed client"}
              clientType={client.client_type}
              managerName={currentManagerName}
              revenueValue={revenueFormatted}
              ordersValue={String(orderCount)}
              averageValue={averageOrderFormatted}
              lastOrderValue={lastOrderFormatted}
            />

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]">
              <div className="space-y-3">
                <section className="rounded-[16px] border border-[var(--brand-200)] bg-[var(--brand-50)]/70 p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Revenue
                  </h2>
                  <dl className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricStat
                      label="Total revenue"
                      value={revenueFormatted}
                    />
                    <MetricStat
                      label="Orders count"
                      value={String(orderCount)}
                    />
                    <MetricStat
                      label="Average order"
                      value={averageOrderFormatted}
                    />
                    <MetricStat label="Last order" value={lastOrderFormatted} />
                  </dl>
                </section>

                <section
                  id="profile-data"
                  className="rounded-[16px] bg-white dark:bg-white/[0.03] p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                >
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Profile data
                  </h2>
                  <dl className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {profileData.map((item) => (
                      <InfoRow
                        key={item.label}
                        label={item.label}
                        value={item.value}
                      />
                    ))}
                  </dl>
                  <details className="mt-2.5 rounded-lg border border-dashed border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-white/[0.04] p-2.5">
                    <summary className="cursor-pointer list-none text-sm font-semibold text-slate-800 dark:text-white/90">
                      Edit profile data
                    </summary>

                    <form
                      action={async (formData) => {
                        "use server";
                        await saveClientProfileData({
                          clientId: client.id,
                          businessSlug: slug,
                          clientType: client.client_type,
                          companyName:
                            cleanText(formData.get("company_name")) || null,
                          registrationNumber:
                            cleanText(formData.get("registration_number")) ||
                            null,
                          vatNumber:
                            cleanText(formData.get("vat_number")) || null,
                          website: cleanText(formData.get("website")) || null,
                          addressLine1:
                            cleanText(formData.get("address_line1")) || null,
                          addressLine2:
                            cleanText(formData.get("address_line2")) || null,
                          county: cleanText(formData.get("county")) || null,
                          firstName:
                            cleanText(formData.get("first_name")) || null,
                          lastName:
                            cleanText(formData.get("last_name")) || null,
                          fullName:
                            cleanText(formData.get("full_name")) || null,
                          phone: cleanText(formData.get("phone")) || null,
                          email: cleanText(formData.get("email")) || null,
                        });

                        await saveClientLocation({
                          clientId: client.id,
                          businessSlug: slug,
                          clientType: client.client_type,
                          city: cleanText(formData.get("city")) || null,
                          postcode: cleanText(formData.get("postcode")) || null,
                          countryCode:
                            cleanText(formData.get("country_code")) || null,
                        });
                      }}
                      className="mt-3 grid gap-2 md:grid-cols-2"
                    >
                      {client.client_type === "company" ? (
                        <>
                          <input
                            name="company_name"
                            defaultValue={
                              cleanText(company?.company_name) ||
                              cleanText(client.display_name)
                            }
                            placeholder="Company name"
                            className="h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none"
                          />
                          <input
                            name="registration_number"
                            defaultValue={cleanText(
                              company?.registration_number,
                            )}
                            placeholder="Registration number"
                            className="h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none"
                          />
                          <input
                            name="vat_number"
                            defaultValue={cleanText(company?.vat_number)}
                            placeholder="VAT number"
                            className="h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none"
                          />
                          <input
                            name="website"
                            defaultValue={cleanText(company?.website)}
                            placeholder="Website"
                            className="h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none"
                          />
                        </>
                      ) : (
                        <>
                          <input
                            name="full_name"
                            defaultValue={
                              cleanText(individual?.full_name) ||
                              cleanText(client.display_name)
                            }
                            placeholder="Full name"
                            className="h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none md:col-span-2"
                          />
                          <input
                            name="first_name"
                            defaultValue={cleanText(individual?.first_name)}
                            placeholder="First name"
                            className="h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none"
                          />
                          <input
                            name="last_name"
                            defaultValue={cleanText(individual?.last_name)}
                            placeholder="Last name"
                            className="h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none"
                          />
                          <input
                            name="phone"
                            type="tel"
                            defaultValue={
                              cleanText(individual?.phone) ||
                              cleanText(client.primary_phone)
                            }
                            placeholder="Phone"
                            className="h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none"
                          />
                          <input
                            name="email"
                            type="email"
                            defaultValue={
                              cleanText(individual?.email) ||
                              cleanText(client.primary_email)
                            }
                            placeholder="Email"
                            className="h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none"
                          />
                        </>
                      )}

                      <input
                        name="address_line1"
                        defaultValue={
                          client.client_type === "company"
                            ? cleanText(company?.address_line1)
                            : cleanText(individual?.address_line1)
                        }
                        placeholder="Address line 1"
                        className="h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none md:col-span-2"
                      />
                      <input
                        name="address_line2"
                        defaultValue={
                          client.client_type === "company"
                            ? cleanText(company?.address_line2)
                            : cleanText(individual?.address_line2)
                        }
                        placeholder="Address line 2"
                        className="h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none"
                      />
                      <input
                        name="county"
                        defaultValue={
                          client.client_type === "company"
                            ? cleanText(company?.county)
                            : cleanText(individual?.county)
                        }
                        placeholder="County / Region"
                        className="h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none"
                      />
                      <input
                        name="city"
                        defaultValue={
                          cleanText(client.city) ||
                          (client.client_type === "company"
                            ? cleanText(company?.city)
                            : cleanText(individual?.city))
                        }
                        placeholder="City"
                        className="h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none"
                      />
                      <input
                        name="postcode"
                        defaultValue={
                          cleanText(client.postcode) ||
                          (client.client_type === "company"
                            ? cleanText(company?.postcode)
                            : cleanText(individual?.postcode))
                        }
                        placeholder="Postcode"
                        className="h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none"
                      />
                      <div className="md:col-span-2">
                        <input
                          name="country_code"
                          defaultValue={cleanText(client.country_code) || "GB"}
                          placeholder="Country code (ISO), e.g. GB"
                          className="h-10 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm uppercase outline-none"
                        />
                        <p className="mt-1 text-xs text-slate-500 dark:text-white/55">
                          Country code is not currency. Currency is configured
                          in Billing &amp; Payment.
                        </p>
                      </div>

                      <Button
                        type="submit"
                        className="h-10 rounded-lg px-4 text-sm font-semibold md:col-span-2"
                      >
                        Save profile data
                      </Button>
                    </form>
                  </details>
                </section>

                {isCleaning ? (
                  <section
                    id="access-notes"
                    className="rounded-[16px] border border-[var(--brand-200)] bg-[var(--brand-50)]/60 dark:border-white/10 dark:bg-white/[0.04] p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                          Access notes
                        </h2>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-white/55">
                          Gate codes, where the key is, pets, parking — every cleaner sees this on the job.
                        </p>
                      </div>
                      {hasAccessNotes ? (
                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                          On file
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:border-white/15 dark:bg-white/[0.06] dark:text-white/55">
                          Not set
                        </span>
                      )}
                    </div>

                    {hasAccessNotes ? (
                      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                        <InfoRow label="Gate code" value={accessNotes.gate_code || "—"} />
                        <InfoRow label="Key location" value={accessNotes.key_location || "—"} />
                        <InfoRow label="Pets" value={accessNotes.pets || "—"} />
                        <InfoRow label="Parking" value={accessNotes.parking || "—"} />
                        <InfoRow label="Alarm code" value={accessNotes.alarm_code || "—"} />
                        <InfoRow label="Instructions" value={accessNotes.instructions || "—"} />
                      </dl>
                    ) : null}

                    <details className="mt-2.5 rounded-lg border border-dashed border-slate-300 dark:border-white/15 bg-white dark:bg-white/[0.04] p-2.5">
                      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-800 dark:text-white/90">
                        {hasAccessNotes ? "Edit access notes" : "Add access notes"}
                      </summary>

                      <form
                        action={async (formData) => {
                          "use server";
                          await saveClientAccessNotes({
                            clientId: client.id,
                            businessSlug: slug,
                            gateCode: cleanText(formData.get("gate_code")) || null,
                            keyLocation:
                              cleanText(formData.get("key_location")) || null,
                            pets: cleanText(formData.get("pets")) || null,
                            parking: cleanText(formData.get("parking")) || null,
                            alarmCode:
                              cleanText(formData.get("alarm_code")) || null,
                            instructions:
                              cleanText(formData.get("instructions")) || null,
                          });
                        }}
                        className="mt-3 grid gap-2 md:grid-cols-2"
                      >
                        <input
                          name="gate_code"
                          defaultValue={accessNotes.gate_code ?? ""}
                          placeholder="Gate / building code"
                          className="h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none"
                        />
                        <input
                          name="key_location"
                          defaultValue={accessNotes.key_location ?? ""}
                          placeholder="Where is the key? (e.g. lockbox, neighbour)"
                          className="h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none"
                        />
                        <input
                          name="pets"
                          defaultValue={accessNotes.pets ?? ""}
                          placeholder="Pets (e.g. dog in kitchen)"
                          className="h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none"
                        />
                        <input
                          name="parking"
                          defaultValue={accessNotes.parking ?? ""}
                          placeholder="Parking instructions"
                          className="h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none"
                        />
                        <input
                          name="alarm_code"
                          defaultValue={accessNotes.alarm_code ?? ""}
                          placeholder="Alarm code"
                          className="h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none"
                        />
                        <textarea
                          name="instructions"
                          defaultValue={accessNotes.instructions ?? ""}
                          placeholder="Other instructions (ladder, fragile items, etc.)"
                          rows={2}
                          className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 py-2 text-sm outline-none md:col-span-2"
                        />
                        <Button
                          type="submit"
                          className="h-10 rounded-lg px-4 text-sm font-semibold md:col-span-2"
                        >
                          Save access notes
                        </Button>
                      </form>
                    </details>
                  </section>
                ) : null}

                {client.client_type === "company" ? (
                  <ClientBillingPaymentEditor
                    clientId={client.id}
                    businessSlug={slug}
                    companyProfile={{
                      companyName: cleanText(company?.company_name),
                      registrationNumber: cleanText(
                        company?.registration_number,
                      ),
                      vatNumber: cleanText(company?.vat_number),
                      address: [
                        cleanText(company?.address_line1),
                        cleanText(company?.address_line2),
                        cleanText(company?.city),
                        cleanText(company?.county),
                      ]
                        .filter(Boolean)
                        .join(", "),
                      postcode: cleanText(company?.postcode),
                    }}
                    billingProfile={{
                      legalEntityName: cleanText(
                        billingProfile?.legal_entity_name,
                      ),
                      registrationNumber: cleanText(
                        billingProfile?.registration_number,
                      ),
                      vatNumber: cleanText(billingProfile?.vat_number),
                      taxId: cleanText(billingProfile?.tax_id),
                      legalAddress: cleanText(billingProfile?.legal_address),
                      postcode: cleanText(billingProfile?.postcode),
                      sameAsCompanyProfile: Boolean(
                        billingProfile?.same_as_company_profile,
                      ),
                      bankName: cleanText(billingProfile?.bank_name),
                      accountNumber: cleanText(billingProfile?.account_number),
                      swiftBic: cleanText(billingProfile?.swift_bic),
                      currencyCode:
                        cleanText(billingProfile?.currency_code) === "GBP"
                          ? "GBP"
                          : cleanText(billingProfile?.currency_code) === "EUR"
                            ? "EUR"
                            : cleanText(billingProfile?.currency_code) === "USD"
                              ? "USD"
                              : "GBP",
                      paymentMethod:
                        cleanText(billingProfile?.payment_method) === "cash"
                          ? "cash"
                          : cleanText(billingProfile?.payment_method) === "card"
                            ? "card"
                            : "bank_transfer",
                      paymentTerms:
                        cleanText(billingProfile?.payment_terms) === "net_7"
                          ? "net_7"
                          : cleanText(billingProfile?.payment_terms) ===
                              "net_14"
                            ? "net_14"
                            : cleanText(billingProfile?.payment_terms) ===
                                "net_30"
                              ? "net_30"
                              : cleanText(billingProfile?.payment_terms) ===
                                  "custom"
                                ? "custom"
                                : "prepaid",
                      paymentTermsCustom: cleanText(
                        billingProfile?.payment_terms_custom,
                      ),
                      primaryEmailSource: communicationEmailSource,
                      primaryEmail: cleanText(billingProfile?.primary_email),
                      invoiceEmailSource,
                      invoiceEmail: cleanText(billingProfile?.invoice_email),
                    }}
                    primaryContactEmail={primaryContactEmail}
                  />
                ) : null}

                {client.client_type === "company" ? (
                  <section className="rounded-[16px] bg-white dark:bg-white/[0.03] p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                        Company contacts
                      </h2>
                      <span className="text-xs text-slate-500 dark:text-white/55">
                        {contacts.filter((c) => c.is_active).length} active
                      </span>
                    </div>

                    {contacts.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-500 dark:text-white/55">
                        No contacts yet.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {contacts.map((contact) => (
                          <div
                            key={contact.id}
                            className="rounded-lg bg-slate-50 dark:bg-white/[0.04] p-2.5"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                  {cleanText(contact.full_name) ||
                                    `${cleanText(contact.first_name)} ${cleanText(contact.last_name)}`.trim() ||
                                    "Unnamed contact"}
                                  {contact.is_primary ? (
                                    <span className="ml-2 inline-flex items-center rounded-full border border-[var(--brand-200)] bg-[var(--brand-50)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--brand-700)]">
                                      Primary
                                    </span>
                                  ) : null}
                                  {contact.is_billing_contact ? (
                                    <span className="ml-2 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                                      Billing
                                    </span>
                                  ) : null}
                                </div>
                                <div className="mt-1 text-xs text-slate-500 dark:text-white/55">
                                  {[
                                    cleanText(contact.job_title),
                                    cleanText(contact.email),
                                    cleanText(contact.phone),
                                  ]
                                    .filter(Boolean)
                                    .join(" • ") || "No contact details"}
                                </div>
                              </div>
                              {contact.is_active ? (
                                <form
                                  action={async () => {
                                    "use server";
                                    await deactivateClientContact({
                                      contactId: contact.id,
                                      businessSlug: slug,
                                    });
                                  }}
                                >
                                  <Button
                                    type="submit"
                                    variant="destructive-outline"
                                    className="h-8 rounded-lg px-3 text-xs font-semibold"
                                  >
                                    Deactivate
                                  </Button>
                                </form>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <details className="mt-2.5 rounded-lg border border-dashed border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-white/[0.04] p-2.5">
                      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-800 dark:text-white/90">
                        + Add contact
                      </summary>
                      <form
                        action={async (formData) => {
                          "use server";
                          await saveClientContact({
                            clientId: client.id,
                            businessSlug: slug,
                            firstName:
                              cleanText(formData.get("first_name")) || null,
                            lastName:
                              cleanText(formData.get("last_name")) || null,
                            fullName:
                              cleanText(formData.get("full_name")) || null,
                            email: cleanText(formData.get("email")) || null,
                            phone: cleanText(formData.get("phone")) || null,
                            jobTitle:
                              cleanText(formData.get("job_title")) || null,
                            isPrimary:
                              cleanText(formData.get("is_primary")) === "on",
                            isBillingContact:
                              cleanText(formData.get("is_billing_contact")) ===
                              "on",
                            isDecisionMaker:
                              cleanText(formData.get("is_decision_maker")) ===
                              "on",
                            isActive: true,
                          });
                        }}
                        className="mt-3 grid gap-2 md:grid-cols-2"
                      >
                        <input
                          name="first_name"
                          placeholder="First name"
                          className="h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none"
                        />
                        <input
                          name="last_name"
                          placeholder="Last name"
                          className="h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none"
                        />
                        <input
                          name="full_name"
                          placeholder="Full name (optional)"
                          className="h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none md:col-span-2"
                        />
                        <input
                          name="email"
                          placeholder="Email"
                          className="h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none"
                        />
                        <input
                          name="phone"
                          placeholder="Phone"
                          className="h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none"
                        />
                        <input
                          name="job_title"
                          placeholder="Job title"
                          className="h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none md:col-span-2"
                        />
                        <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-white/80 md:col-span-2">
                          <input
                            type="checkbox"
                            name="is_primary"
                            className="h-4 w-4 rounded border-slate-300 dark:border-white/15"
                          />
                          Set as primary contact
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-white/80 md:col-span-2">
                          <input
                            type="checkbox"
                            name="is_billing_contact"
                            className="h-4 w-4 rounded border-slate-300 dark:border-white/15"
                          />
                          Mark as billing contact
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-white/80 md:col-span-2">
                          <input
                            type="checkbox"
                            name="is_decision_maker"
                            className="h-4 w-4 rounded border-slate-300 dark:border-white/15"
                          />
                          Mark as decision maker
                        </label>
                        <Button
                          type="submit"
                          className="h-10 rounded-lg px-4 text-sm font-semibold md:col-span-2"
                        >
                          Add contact
                        </Button>
                      </form>
                    </details>
                  </section>
                ) : null}

                <section className="rounded-[16px] bg-white dark:bg-white/[0.03] p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Related orders
                  </h2>
                  <RelatedOrdersPreview
                    orders={orders}
                    slug={slug}
                    businessId={context.business.id}
                  />
                </section>
              </div>

              <aside className="space-y-3 xl:sticky xl:top-[88px] xl:self-start">
                <section className="rounded-[16px] bg-white dark:bg-white/[0.03] p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Manager
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-white/55">
                    One active owner/manager per client.
                  </p>
                  <form
                    action={async (formData) => {
                      "use server";
                      const managerIdRaw = cleanText(
                        formData.get("manager_id"),
                      );
                      await setClientCurrentManager({
                        clientId: client.id,
                        businessSlug: slug,
                        managerId: managerIdRaw || null,
                        note: cleanText(formData.get("note")) || null,
                      });
                    }}
                    className="mt-3 grid gap-2"
                  >
                    <select
                      name="manager_id"
                      defaultValue={cleanText(currentAssignment?.manager_id)}
                      className="h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                    >
                      {!cleanText(currentAssignment?.manager_id) ? (
                        <option value="" disabled>
                          Select manager
                        </option>
                      ) : null}
                      {managerOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <input
                      name="note"
                      placeholder="Optional note"
                      className="h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                    />
                    <Button
                      type="submit"
                      className="h-10 rounded-xl px-4 text-sm font-semibold"
                    >
                      Save manager
                    </Button>
                  </form>
                </section>

                <section className="rounded-[16px] bg-white dark:bg-white/[0.03] p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Assignment history
                  </h2>
                  {assignments.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500 dark:text-white/55">
                      No assignment history yet.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {assignments.map((row) => (
                        <li
                          key={row.id}
                          className="rounded-lg bg-slate-50 dark:bg-white/[0.04] p-2.5 text-sm"
                        >
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {cleanText(row.manager_id)
                              ? profileNameById.get(
                                  cleanText(row.manager_id),
                                ) || cleanText(row.manager_id)
                              : "Unassigned"}
                          </div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-white/55">
                            {formatDateTime(row.assigned_at)}
                            {row.unassigned_at
                              ? ` → ${formatDateTime(row.unassigned_at)}`
                              : " → active"}
                          </div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-white/55">
                            by{" "}
                            {cleanText(row.assigned_by)
                              ? profileNameById.get(
                                  cleanText(row.assigned_by),
                                ) || cleanText(row.assigned_by)
                              : "system"}
                          </div>
                          {cleanText(row.note) ? (
                            <div className="mt-1 text-xs text-slate-600 dark:text-white/70">
                              {cleanText(row.note)}
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {visibleActivityEvents.length > 0 ? (
                  <section className="rounded-[16px] bg-white dark:bg-white/[0.03] p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Client activity
                    </h2>
                    <ul className="mt-3 space-y-2">
                      {visibleActivityEvents.map((event) => {
                        const payload = (event.payload ?? {}) as Record<
                          string,
                          unknown
                        >;
                        const previousType = cleanText(payload.previous_type);
                        const newType = cleanText(payload.new_type);
                        const actorName = cleanText(event.actor_id)
                          ? profileNameById.get(cleanText(event.actor_id)) ||
                            cleanText(event.actor_id)
                          : "system";
                        const message =
                          event.event_type === "client.type_changed"
                            ? `Client type changed from ${previousType || "unknown"} to ${newType || "unknown"}`
                            : event.event_type;

                        return (
                          <li
                            key={event.id}
                            className="rounded-lg bg-slate-50 dark:bg-white/[0.04] p-2.5 text-sm"
                          >
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {message}
                            </div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-white/55">
                              by {actorName} •{" "}
                              {formatDateTime(event.created_at)}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ) : null}
              </aside>
            </div>
          </section>
        </div>

        <div className="space-y-3 lg:hidden">
          <section className="rounded-[16px] border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {resolvedName}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-white/55">
              {client.client_type.toUpperCase()} • {resolvedEmail} •{" "}
              {resolvedPhone}
            </div>
            <Link
              href={clientsHref}
              className="mt-3 inline-flex h-9 items-center rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-white/[0.03] px-3 text-xs font-semibold text-slate-700 dark:text-white/80"
            >
              Back to clients
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] p-2.5">
      <dt className="text-[11px] font-medium text-slate-500 dark:text-white/55">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">{value}</dd>
    </div>
  );
}

function MetricStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/90 dark:bg-white/[0.05] p-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-white/55">
        {label}
      </div>
      <div className="mt-0.5 text-base font-semibold tracking-tight text-slate-900 dark:text-white">
        {value}
      </div>
    </div>
  );
}
