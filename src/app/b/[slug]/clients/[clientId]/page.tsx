import Link from "next/link";
import type { BusinessOption } from "@/app/b/[slug]/_components/topbar/BusinessSwitcher";
import TopBar from "@/app/b/[slug]/_components/topbar/TopBar";
import DesktopLeftRail from "@/app/b/[slug]/_components/Desktop/DesktopLeftRail";
import { ClientTypeEditor } from "@/app/b/[slug]/clients/[clientId]/ClientTypeEditor";
import { RelatedOrdersPreview } from "@/app/b/[slug]/clients/[clientId]/RelatedOrdersPreview";
import { Button } from "@/components/ui/button";
import {
  deactivateClientContact,
  saveClientContact,
  setClientCurrentManager,
} from "@/app/b/[slug]/clients/actions";
import { getAdminUsersPath, isAdminEmail } from "@/lib/admin-access";
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
  created_at: string;
  updated_at: string;
};

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
  is_active: boolean;
  created_at: string;
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

  const businessHref = "/app/crm";
  const clientsHref = `/b/${slug}/clients`;
  const todayHref = `/b/${slug}/today`;
  const settingsHref = `/b/${slug}/settings`;
  const supportHref = `/b/${slug}/support`;
  const adminHref = isAdminEmail(context.user.email) ? getAdminUsersPath() : undefined;

  const { data: clientData, error: clientError } = await supabase
    .from("clients")
    .select("id, business_id, client_type, display_name, primary_email, primary_phone, postcode, city, country_code, created_at, updated_at")
    .eq("id", clientId)
    .eq("business_id", context.business.id)
    .maybeSingle();
  if (clientError) throw new Error(clientError.message);
  if (!clientData) notFound();
  const client = clientData as ClientRow;

  const [individualRes, companyRes, contactsRes, assignmentsRes, ordersRes, membershipsRes] =
    await Promise.all([
      supabase
        .from("client_individual_profiles")
        .select("client_id, full_name, first_name, last_name, email, phone, address_line1, address_line2, city, county, postcode")
        .eq("client_id", client.id)
        .maybeSingle(),
      supabase
        .from("client_company_profiles")
        .select("client_id, company_name, registration_number, vat_number, email, phone, website, address_line1, address_line2, city, county, postcode")
        .eq("client_id", client.id)
        .maybeSingle(),
      supabase
        .from("client_contacts")
        .select("id, first_name, last_name, full_name, job_title, email, phone, is_primary, is_active, created_at")
        .eq("client_id", client.id)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("client_manager_assignments")
        .select("id, manager_id, assigned_by, assigned_at, unassigned_at, note")
        .eq("client_id", client.id)
        .order("assigned_at", { ascending: false }),
      supabase
        .from("orders")
        .select("id, order_number, amount, status, due_date, created_at, updated_at, contact_id")
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
  if (contactsRes.error) throw new Error(contactsRes.error.message);
  if (assignmentsRes.error) throw new Error(assignmentsRes.error.message);
  if (ordersRes.error) throw new Error(ordersRes.error.message);
  if (membershipsRes.error) throw new Error(membershipsRes.error.message);

  const { data: activityEventsData, error: activityEventsError } = await supabase
    .from("activity_events")
    .select("id, event_type, actor_id, payload, created_at")
    .eq("business_id", context.business.id)
    .eq("entity_type", "client")
    .eq("entity_id", client.id)
    .order("created_at", { ascending: false })
    .limit(30);
  if (activityEventsError) throw new Error(activityEventsError.message);

  const individual = (individualRes.data as IndividualProfileRow | null) ?? null;
  const company = (companyRes.data as CompanyProfileRow | null) ?? null;
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
      const composed = `${cleanText(row.first_name)} ${cleanText(row.last_name)}`.trim();
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

  const activeOrders = orders.filter((order) => isTurnoverEligibleStatus(cleanText(order.status)));
  const totalTurnover = activeOrders.reduce((sum, order) => sum + Number(order.amount ?? 0), 0);
  const orderCount = activeOrders.length;
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

  if (context.role === "MANAGER") {
    const managerOwnsClient = cleanText(currentAssignment?.manager_id) === context.user.id;
    if (!managerOwnsClient) notFound();
  }
  const visibleActivityEvents = activityEvents.filter((entry) => {
    const type = cleanText(entry.event_type);
    return type.startsWith("client.") || type.startsWith("order.");
  });

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

      <main className="mx-auto max-w-[1220px] overflow-x-hidden px-4 pb-8 pt-20 sm:px-6">
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

          <section className="min-w-0 space-y-4">
            <div className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="product-page-kicker">Client Detail</div>
                  <h1 className="product-page-title mt-1.5">{resolvedName || "Unnamed client"}</h1>
                  <p className="product-page-subtitle mt-1.5">
                    {client.client_type.toUpperCase()} • {resolvedEmail} • {resolvedPhone}
                  </p>
                  <div className="mt-2">
                    <ClientTypeEditor
                      clientId={client.id}
                      businessSlug={slug}
                      currentType={client.client_type}
                      companyNameHint={cleanText(company?.company_name) || cleanText(client.display_name)}
                      hasPrimaryContact={contacts.some((contact) => contact.is_active && contact.is_primary)}
                      compact
                    />
                  </div>
                </div>
                <Link
                  href={clientsHref}
                  className="inline-flex h-10 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Back to clients
                </Link>
              </div>

              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
                <InfoRow label="Postcode" value={resolvedPostcode} />
                <InfoRow label="City" value={cleanText(client.city) || "—"} />
                <InfoRow label="Country" value={cleanText(client.country_code) || "GB"} />
                <InfoRow label="Updated" value={formatDateTime(client.updated_at)} />
              </dl>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                <h2 className="text-sm font-semibold text-slate-900">Current manager</h2>
                <p className="mt-1 text-xs text-slate-500">
                  One active owner/manager per client, with history below.
                </p>

                <form
                  action={async (formData) => {
                    "use server";
                    const managerIdRaw = cleanText(formData.get("manager_id"));
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
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
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
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />
                  <Button type="submit" className="h-10 rounded-xl px-4 text-sm font-semibold">
                    Save manager
                  </Button>
                </form>

                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <div className="text-xs text-slate-500">Current assignee</div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {cleanText(currentAssignment?.manager_id)
                      ? profileNameById.get(cleanText(currentAssignment?.manager_id)) ||
                        cleanText(currentAssignment?.manager_id)
                      : "Unassigned"}
                  </div>
                </div>

              </section>

              <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                <h2 className="text-sm font-semibold text-slate-900">Profile data</h2>
                {client.client_type === "company" ? (
                  <dl className="mt-3 grid gap-2 text-sm">
                    <InfoRow label="Company name" value={cleanText(company?.company_name) || cleanText(client.display_name) || "—"} />
                    <InfoRow label="Registration number" value={cleanText(company?.registration_number) || "—"} />
                    <InfoRow label="VAT number" value={cleanText(company?.vat_number) || "—"} />
                    <InfoRow label="Website" value={cleanText(company?.website) || "—"} />
                    <InfoRow label="Address" value={[cleanText(company?.address_line1), cleanText(company?.address_line2), cleanText(company?.city), cleanText(company?.county), cleanText(company?.postcode)].filter(Boolean).join(", ") || "—"} />
                  </dl>
                ) : (
                  <dl className="mt-3 grid gap-2 text-sm">
                    <InfoRow label="Full name" value={cleanText(individual?.full_name) || cleanText(client.display_name) || "—"} />
                    <InfoRow label="First name" value={cleanText(individual?.first_name) || "—"} />
                    <InfoRow label="Last name" value={cleanText(individual?.last_name) || "—"} />
                    <InfoRow label="Address" value={[cleanText(individual?.address_line1), cleanText(individual?.address_line2), cleanText(individual?.city), cleanText(individual?.county), cleanText(individual?.postcode)].filter(Boolean).join(", ") || "—"} />
                  </dl>
                )}
              </section>
            </div>

            {client.client_type === "company" ? (
            <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-900">Company contacts</h2>
                <span className="text-xs text-slate-500">{contacts.filter((c) => c.is_active).length} active</span>
              </div>

              {contacts.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No contacts yet.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {contacts.map((contact) => (
                    <div key={contact.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {cleanText(contact.full_name) ||
                              `${cleanText(contact.first_name)} ${cleanText(contact.last_name)}`.trim() ||
                              "Unnamed contact"}
                            {contact.is_primary ? (
                              <span className="ml-2 inline-flex items-center rounded-full border border-[var(--brand-200)] bg-[var(--brand-50)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--brand-700)]">
                                Primary
                              </span>
                            ) : null}
                            {!contact.is_active ? (
                              <span className="ml-2 inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-rose-700">
                                Inactive
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {[cleanText(contact.job_title), cleanText(contact.email), cleanText(contact.phone)]
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

              <form
                action={async (formData) => {
                  "use server";
                  await saveClientContact({
                    clientId: client.id,
                    businessSlug: slug,
                    firstName: cleanText(formData.get("first_name")) || null,
                    lastName: cleanText(formData.get("last_name")) || null,
                    fullName: cleanText(formData.get("full_name")) || null,
                    email: cleanText(formData.get("email")) || null,
                    phone: cleanText(formData.get("phone")) || null,
                    jobTitle: cleanText(formData.get("job_title")) || null,
                    isPrimary: cleanText(formData.get("is_primary")) === "on",
                    isActive: true,
                  });
                }}
                className="mt-4 grid gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 md:grid-cols-2"
              >
                <input name="first_name" placeholder="First name" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none" />
                <input name="last_name" placeholder="Last name" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none" />
                <input name="full_name" placeholder="Full name (optional)" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none md:col-span-2" />
                <input name="email" placeholder="Email" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none" />
                <input name="phone" placeholder="Phone" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none" />
                <input name="job_title" placeholder="Job title" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none md:col-span-2" />
                <label className="inline-flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
                  <input type="checkbox" name="is_primary" className="h-4 w-4 rounded border-slate-300" />
                  Set as primary contact
                </label>
                <Button type="submit" className="h-10 rounded-lg px-4 text-sm font-semibold md:col-span-2">
                  Add contact
                </Button>
              </form>
            </section>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-2">
              <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                <h2 className="text-sm font-semibold text-slate-900">Revenue summary</h2>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                  <InfoRow label="Total turnover" value={new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(totalTurnover)} />
                  <InfoRow label="Order count" value={String(orderCount)} />
                  <InfoRow label="Last order date" value={formatDateTime(lastOrderDate)} />
                </dl>
              </section>

              <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                <h2 className="text-sm font-semibold text-slate-900">Assignment history</h2>
                {assignments.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">No assignment history yet.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {assignments.map((row) => (
                      <li key={row.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                        <div className="font-semibold text-slate-900">
                          {cleanText(row.manager_id)
                            ? profileNameById.get(cleanText(row.manager_id)) || cleanText(row.manager_id)
                            : "Unassigned"}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {formatDateTime(row.assigned_at)}
                          {row.unassigned_at ? ` → ${formatDateTime(row.unassigned_at)}` : " → active"}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          by {cleanText(row.assigned_by) ? profileNameById.get(cleanText(row.assigned_by)) || cleanText(row.assigned_by) : "system"}
                        </div>
                        {cleanText(row.note) ? (
                          <div className="mt-1 text-xs text-slate-600">{cleanText(row.note)}</div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                <h2 className="text-sm font-semibold text-slate-900">Related orders</h2>
                <RelatedOrdersPreview orders={orders} slug={slug} businessId={context.business.id} />
              </section>
            </div>

            {visibleActivityEvents.length > 0 ? (
            <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <h2 className="text-sm font-semibold text-slate-900">Client activity</h2>
                <ul className="mt-3 space-y-2">
                  {visibleActivityEvents.map((event) => {
                    const payload = (event.payload ?? {}) as Record<string, unknown>;
                    const previousType = cleanText(payload.previous_type);
                    const newType = cleanText(payload.new_type);
                    const actorName = cleanText(event.actor_id)
                      ? profileNameById.get(cleanText(event.actor_id)) || cleanText(event.actor_id)
                      : "system";
                    const message =
                      event.event_type === "client.type_changed"
                        ? `Client type changed from ${previousType || "unknown"} to ${newType || "unknown"}`
                        : event.event_type;

                    return (
                      <li key={event.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                        <div className="font-semibold text-slate-900">{message}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          by {actorName} • {formatDateTime(event.created_at)}
                        </div>
                      </li>
                    );
                  })}
                </ul>
            </section>
            ) : null}
          </section>
        </div>

        <div className="space-y-4 lg:hidden">
          <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="text-sm font-semibold text-slate-900">{resolvedName}</div>
            <div className="mt-1 text-xs text-slate-500">
              {client.client_type.toUpperCase()} • {resolvedEmail} • {resolvedPhone}
            </div>
            <Link
              href={clientsHref}
              className="mt-3 inline-flex h-9 items-center rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700"
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
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <dt className="text-[11px] font-medium text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  );
}


