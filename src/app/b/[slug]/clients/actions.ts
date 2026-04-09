"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { ensureWorkspaceForBusiness } from "@/lib/workspaces";

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function isMissingRelationError(error: { message?: string } | null | undefined, relationName: string) {
  const message = cleanText(error?.message).toLowerCase();
  if (!message) return false;
  return (
    message.includes(`could not find the table 'public.${relationName}'`) ||
    message.includes(`relation \"public.${relationName}\" does not exist`) ||
    message.includes(`relation \"${relationName}\" does not exist`)
  );
}

function isMissingColumnError(error: { message?: string } | null | undefined, columnName: string) {
  const message = cleanText(error?.message).toLowerCase();
  if (!message) return false;
  return (
    message.includes(`column \"${columnName.toLowerCase()}\"`) &&
    message.includes("does not exist")
  );
}

function upperRole(value: unknown) {
  return cleanText(value).toUpperCase();
}

async function requireBusinessManagerAccess(businessId: string) {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;

  if (!userId) throw new Error("Not authenticated");

  const { data: membership, error } = await admin
    .from("memberships")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const role = upperRole(membership?.role);
  if (role !== "OWNER" && role !== "MANAGER") {
    throw new Error("Forbidden");
  }

  return { admin, userId };
}

async function requireClientManagerAccess(clientId: string) {
  const admin = supabaseAdmin();
  const { data: client, error: clientError } = await admin
    .from("clients")
    .select("id, business_id")
    .eq("id", clientId)
    .maybeSingle();

  if (clientError) throw new Error(clientError.message);
  if (!client?.business_id) throw new Error("Client not found");

  const access = await requireBusinessManagerAccess(String(client.business_id));
  return { ...access, clientId: String(client.id), businessId: String(client.business_id) };
}

async function requireContactManagerAccess(contactId: string) {
  const admin = supabaseAdmin();
  const { data: contact, error: contactError } = await admin
    .from("client_contacts")
    .select("id, client_id")
    .eq("id", contactId)
    .maybeSingle();

  if (contactError) throw new Error(contactError.message);
  if (!contact?.client_id) throw new Error("Contact not found");

  return requireClientManagerAccess(String(contact.client_id));
}

function buildContactFullName(firstName: string, lastName: string, fallback?: string | null) {
  const composed = [firstName, lastName].filter(Boolean).join(" ").trim();
  return composed || cleanText(fallback) || null;
}

async function insertClientAuditEvent(input: {
  businessId: string;
  clientId: string;
  actorId: string;
  eventType: string;
  payload?: Record<string, unknown>;
}) {
  const admin = supabaseAdmin();
  const workspaceId = await ensureWorkspaceForBusiness(admin, input.businessId);
  const { error } = await admin.from("activity_events").insert({
    business_id: input.businessId,
    workspace_id: workspaceId,
    entity_type: "client",
    entity_id: input.clientId,
    actor_id: input.actorId,
    actor_type: "user",
    event_type: input.eventType,
    payload: input.payload ?? {},
    visibility: "internal",
    source: "server_action",
    created_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function setClientCurrentManager(input: {
  clientId: string;
  businessSlug: string;
  managerId: string | null;
  note?: string | null;
}) {
  const { admin, userId, clientId } = await requireClientManagerAccess(input.clientId);
  const nextManagerId = cleanText(input.managerId) || null;

  const { data: currentAssignment, error: currentError } = await admin
    .from("client_manager_assignments")
    .select("id, manager_id")
    .eq("client_id", clientId)
    .is("unassigned_at", null)
    .maybeSingle();

  if (currentError) throw new Error(currentError.message);

  const currentManagerId = cleanText(currentAssignment?.manager_id) || null;
  if (currentManagerId === nextManagerId) return;

  if (currentAssignment?.id) {
    const { error: closeError } = await admin
      .from("client_manager_assignments")
      .update({ unassigned_at: new Date().toISOString() })
      .eq("id", currentAssignment.id);

    if (closeError) throw new Error(closeError.message);
  }

  if (nextManagerId) {
    const { error: insertError } = await admin
      .from("client_manager_assignments")
      .insert({
        client_id: clientId,
        manager_id: nextManagerId,
        assigned_by: userId,
        note: cleanText(input.note) || null,
      });

    if (insertError) throw new Error(insertError.message);
  }

  const baseClientsPath = `/b/${input.businessSlug}/clients`;
  revalidatePath(baseClientsPath);
  revalidatePath(`${baseClientsPath}/${clientId}`);
  revalidatePath(`/b/${input.businessSlug}`);
  revalidatePath(`/b/${input.businessSlug}/today`);
  revalidatePath(`/b/${input.businessSlug}/analytics`);
}

export async function saveClientLocation(input: {
  clientId: string;
  businessSlug: string;
  clientType: "individual" | "company";
  city?: string | null;
  postcode?: string | null;
  countryCode?: string | null;
}) {
  const access = await requireClientManagerAccess(input.clientId);
  const city = cleanText(input.city) || null;
  const postcode = cleanText(input.postcode) || null;
  const countryCode = cleanText(input.countryCode).toUpperCase() || "GB";

  const { error: clientError } = await access.admin
    .from("clients")
    .update({
      city,
      postcode,
      country_code: countryCode,
    })
    .eq("id", access.clientId);
  if (clientError) throw new Error(clientError.message);

  if (input.clientType === "company") {
    const { error: profileError } = await access.admin
      .from("client_company_profiles")
      .update({ city, postcode, country_code: countryCode })
      .eq("client_id", access.clientId);
    if (profileError) throw new Error(profileError.message);
  } else {
    const { error: profileError } = await access.admin
      .from("client_individual_profiles")
      .update({ city, postcode, country_code: countryCode })
      .eq("client_id", access.clientId);
    if (profileError) throw new Error(profileError.message);
  }

  const baseClientsPath = `/b/${input.businessSlug}/clients`;
  revalidatePath(baseClientsPath);
  revalidatePath(`${baseClientsPath}/${access.clientId}`);
}

export async function saveClientProfileData(input: {
  clientId: string;
  businessSlug: string;
  clientType: "individual" | "company";
  companyName?: string | null;
  registrationNumber?: string | null;
  vatNumber?: string | null;
  website?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  county?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  phone?: string | null;
  email?: string | null;
}) {
  const access = await requireClientManagerAccess(input.clientId);

  if (input.clientType === "company") {
    const companyName = cleanText(input.companyName) || "Company client";
    const { error: profileError } = await access.admin
      .from("client_company_profiles")
      .update({
        company_name: companyName,
        registration_number: cleanText(input.registrationNumber) || null,
        vat_number: cleanText(input.vatNumber) || null,
        website: cleanText(input.website) || null,
        address_line1: cleanText(input.addressLine1) || null,
        address_line2: cleanText(input.addressLine2) || null,
        county: cleanText(input.county) || null,
      })
      .eq("client_id", access.clientId);
    if (profileError) throw new Error(profileError.message);

    const { error: clientError } = await access.admin
      .from("clients")
      .update({ display_name: companyName })
      .eq("id", access.clientId);
    if (clientError) throw new Error(clientError.message);
  } else {
    const firstName = cleanText(input.firstName) || null;
    const lastName = cleanText(input.lastName) || null;
    const fullName =
      cleanText(input.fullName) ||
      [firstName, lastName].filter(Boolean).join(" ").trim() ||
      "Individual client";

    const { error: profileError } = await access.admin
      .from("client_individual_profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        phone: cleanText(input.phone) || null,
        email: cleanText(input.email) || null,
        address_line1: cleanText(input.addressLine1) || null,
        address_line2: cleanText(input.addressLine2) || null,
        county: cleanText(input.county) || null,
      })
      .eq("client_id", access.clientId);
    if (profileError) throw new Error(profileError.message);

    const phone = cleanText(input.phone) || null;
    const email = cleanText(input.email) || null;
    const { error: clientError } = await access.admin
      .from("clients")
      .update({
        display_name: fullName,
        ...(phone ? { primary_phone: phone } : {}),
        ...(email ? { primary_email: email } : {}),
      })
      .eq("id", access.clientId);
    if (clientError) throw new Error(clientError.message);
  }

  const baseClientsPath = `/b/${input.businessSlug}/clients`;
  revalidatePath(baseClientsPath);
  revalidatePath(`${baseClientsPath}/${access.clientId}`);
}

export async function saveClientContact(input: {
  clientId: string;
  businessSlug: string;
  contactId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  isPrimary?: boolean;
  isBillingContact?: boolean;
  isDecisionMaker?: boolean;
  isActive?: boolean;
}) {
  const { admin, userId, clientId } = await requireClientManagerAccess(input.clientId);

  const firstName = cleanText(input.firstName) || null;
  const lastName = cleanText(input.lastName) || null;
  const fullName = buildContactFullName(
    firstName ?? "",
    lastName ?? "",
    cleanText(input.fullName) || null,
  );

  const payload = {
    client_id: clientId,
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    email: cleanText(input.email) || null,
    phone: cleanText(input.phone) || null,
    job_title: cleanText(input.jobTitle) || null,
    is_primary: Boolean(input.isPrimary),
    is_billing_contact: Boolean(input.isBillingContact),
    is_decision_maker: Boolean(input.isDecisionMaker),
    is_active: input.isActive === false ? false : true,
    created_by: userId,
  };

  if (payload.is_primary && payload.is_active) {
    const { error: clearPrimaryError } = await admin
      .from("client_contacts")
      .update({ is_primary: false })
      .eq("client_id", clientId)
      .eq("is_active", true)
      .eq("is_primary", true);
    if (clearPrimaryError) throw new Error(clearPrimaryError.message);
  }

  const normalizedContactId = cleanText(input.contactId);
  if (normalizedContactId) {
    const { error } = await admin
      .from("client_contacts")
      .update({
        first_name: payload.first_name,
        last_name: payload.last_name,
        full_name: payload.full_name,
        email: payload.email,
        phone: payload.phone,
        job_title: payload.job_title,
        is_primary: payload.is_primary,
        is_billing_contact: payload.is_billing_contact,
        is_decision_maker: payload.is_decision_maker,
        is_active: payload.is_active,
      })
      .eq("id", normalizedContactId)
      .eq("client_id", clientId);
    if (error) {
      if (
        isMissingColumnError(error, "is_billing_contact") ||
        isMissingColumnError(error, "is_decision_maker")
      ) {
        const { error: fallbackError } = await admin
          .from("client_contacts")
          .update({
            first_name: payload.first_name,
            last_name: payload.last_name,
            full_name: payload.full_name,
            email: payload.email,
            phone: payload.phone,
            job_title: payload.job_title,
            is_primary: payload.is_primary,
            is_active: payload.is_active,
          })
          .eq("id", normalizedContactId)
          .eq("client_id", clientId);
        if (fallbackError) throw new Error(fallbackError.message);
      } else {
        throw new Error(error.message);
      }
    }
  } else {
    const { error } = await admin.from("client_contacts").insert(payload);
    if (error) {
      if (
        isMissingColumnError(error, "is_billing_contact") ||
        isMissingColumnError(error, "is_decision_maker")
      ) {
        const { error: fallbackError } = await admin.from("client_contacts").insert({
          client_id: payload.client_id,
          first_name: payload.first_name,
          last_name: payload.last_name,
          full_name: payload.full_name,
          email: payload.email,
          phone: payload.phone,
          job_title: payload.job_title,
          is_primary: payload.is_primary,
          is_active: payload.is_active,
          created_by: payload.created_by,
        });
        if (fallbackError) throw new Error(fallbackError.message);
      } else {
        throw new Error(error.message);
      }
    }
  }

  const baseClientsPath = `/b/${input.businessSlug}/clients`;
  revalidatePath(baseClientsPath);
  revalidatePath(`${baseClientsPath}/${clientId}`);
}

export async function deactivateClientContact(input: {
  contactId: string;
  businessSlug: string;
}) {
  const access = await requireContactManagerAccess(input.contactId);
  const normalizedContactId = cleanText(input.contactId);
  if (!normalizedContactId) throw new Error("Contact id is required");

  const { error } = await access.admin
    .from("client_contacts")
    .update({ is_active: false, is_primary: false, is_billing_contact: false })
    .eq("id", normalizedContactId);
  if (error) {
    if (isMissingColumnError(error, "is_billing_contact")) {
      const { error: fallbackError } = await access.admin
        .from("client_contacts")
        .update({ is_active: false, is_primary: false })
        .eq("id", normalizedContactId);
      if (fallbackError) throw new Error(fallbackError.message);
    } else {
      throw new Error(error.message);
    }
  }

  const baseClientsPath = `/b/${input.businessSlug}/clients`;
  revalidatePath(baseClientsPath);
  revalidatePath(`${baseClientsPath}/${access.clientId}`);
}

export async function saveClientBillingProfile(input: {
  clientId: string;
  businessSlug: string;
  legalEntityName?: string | null;
  registrationNumber?: string | null;
  vatNumber?: string | null;
  taxId?: string | null;
  legalAddress?: string | null;
  postcode?: string | null;
  sameAsCompanyProfile?: boolean;
  bankName?: string | null;
  accountNumber?: string | null;
  swiftBic?: string | null;
  currencyCode?: string | null;
  paymentMethod?: string | null;
  paymentTerms?: string | null;
  paymentTermsCustom?: string | null;
  primaryEmailSource?: "primary_contact" | "custom";
  primaryEmail?: string | null;
  invoiceEmailSource?: "primary_contact" | "custom";
  invoiceEmail?: string | null;
}) {
  const access = await requireClientManagerAccess(input.clientId);

  const [{ data: clientRow, error: clientError }, { data: companyRow, error: companyError }, { data: primaryContactRow, error: primaryContactError }] = await Promise.all([
    access.admin
      .from("clients")
      .select("id, client_type")
      .eq("id", access.clientId)
      .maybeSingle(),
    access.admin
      .from("client_company_profiles")
      .select("company_name, registration_number, vat_number, address_line1, address_line2, city, county, postcode")
      .eq("client_id", access.clientId)
      .maybeSingle(),
    access.admin
      .from("client_contacts")
      .select("email")
      .eq("client_id", access.clientId)
      .eq("is_active", true)
      .eq("is_primary", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (clientError) throw new Error(clientError.message);
  if (companyError) throw new Error(companyError.message);
  if (primaryContactError) throw new Error(primaryContactError.message);
  if (!clientRow?.id) throw new Error("Client not found");
  if (String(clientRow.client_type) !== "company") {
    throw new Error("Billing profile is available only for company clients");
  }

  const sameAsCompanyProfile = Boolean(input.sameAsCompanyProfile);
  const companyAddress = [
    cleanText(companyRow?.address_line1),
    cleanText(companyRow?.address_line2),
    cleanText(companyRow?.city),
    cleanText(companyRow?.county),
  ]
    .filter(Boolean)
    .join(", ");

  const legalEntityName = sameAsCompanyProfile
    ? cleanText(companyRow?.company_name) || null
    : cleanText(input.legalEntityName) || null;
  const registrationNumber = sameAsCompanyProfile
    ? cleanText(companyRow?.registration_number) || null
    : cleanText(input.registrationNumber) || null;
  const vatNumber = sameAsCompanyProfile
    ? cleanText(companyRow?.vat_number) || null
    : cleanText(input.vatNumber) || null;
  const legalAddress = sameAsCompanyProfile
    ? companyAddress || null
    : cleanText(input.legalAddress) || null;
  const postcode = sameAsCompanyProfile
    ? cleanText(companyRow?.postcode) || null
    : cleanText(input.postcode) || null;

  const normalizedCurrency = cleanText(input.currencyCode).toUpperCase();
  const currencyCode = ["GBP", "UAH", "EUR", "USD"].includes(normalizedCurrency)
    ? normalizedCurrency
    : "GBP";

  const normalizedPaymentMethod = cleanText(input.paymentMethod).toLowerCase();
  const paymentMethod = ["bank_transfer", "cash", "card"].includes(normalizedPaymentMethod)
    ? normalizedPaymentMethod
    : "bank_transfer";

  const normalizedPaymentTerms = cleanText(input.paymentTerms).toLowerCase();
  const paymentTerms = ["prepaid", "net_7", "net_14", "net_30", "custom"].includes(
    normalizedPaymentTerms,
  )
    ? normalizedPaymentTerms
    : "prepaid";

  const primaryContactEmail = cleanText(primaryContactRow?.email) || null;
  const primaryEmailSource = input.primaryEmailSource === "primary_contact" ? "primary_contact" : "custom";
  const invoiceEmailSource = input.invoiceEmailSource === "primary_contact" ? "primary_contact" : "custom";

  const resolvedPrimaryEmail =
    primaryEmailSource === "primary_contact"
      ? primaryContactEmail || cleanText(input.primaryEmail) || null
      : cleanText(input.primaryEmail) || null;
  const resolvedInvoiceEmail =
    invoiceEmailSource === "primary_contact"
      ? primaryContactEmail || cleanText(input.invoiceEmail) || null
      : cleanText(input.invoiceEmail) || null;

  const payload = {
    client_id: access.clientId,
    profile_name: "Default",
    is_default: true,
    legal_entity_name: legalEntityName,
    registration_number: registrationNumber,
    vat_number: vatNumber,
    tax_id: cleanText(input.taxId) || null,
    legal_address: legalAddress,
    postcode,
    same_as_company_profile: sameAsCompanyProfile,
    bank_name: cleanText(input.bankName) || null,
    account_number: cleanText(input.accountNumber) || null,
    swift_bic: cleanText(input.swiftBic) || null,
    currency_code: currencyCode,
    payment_method: paymentMethod,
    payment_terms: paymentTerms,
    payment_terms_custom: paymentTerms === "custom" ? cleanText(input.paymentTermsCustom) || null : null,
    primary_email: resolvedPrimaryEmail,
    primary_email_source: primaryEmailSource,
    invoice_email: resolvedInvoiceEmail,
    invoice_email_source: invoiceEmailSource,
  };

  const { data: existingDefault, error: existingError } = await access.admin
    .from("client_billing_profiles")
    .select("id")
    .eq("client_id", access.clientId)
    .eq("is_default", true)
    .maybeSingle();
  if (existingError) {
    if (isMissingRelationError(existingError, "client_billing_profiles")) {
      throw new Error(
        "Billing profiles are not available yet in this environment. Apply the latest Supabase migrations and try again.",
      );
    }
    throw new Error(existingError.message);
  }

  if (existingDefault?.id) {
    const { error: updateError } = await access.admin
      .from("client_billing_profiles")
      .update(payload)
      .eq("id", existingDefault.id)
      .eq("client_id", access.clientId);
    if (updateError) throw new Error(updateError.message);
  } else {
    const { error: insertError } = await access.admin
      .from("client_billing_profiles")
      .insert(payload);
    if (insertError) throw new Error(insertError.message);
  }

  const { error: updateClientError } = await access.admin
    .from("clients")
    .update({ primary_email: resolvedPrimaryEmail })
    .eq("id", access.clientId);
  if (updateClientError) throw new Error(updateClientError.message);

  const baseClientsPath = `/b/${input.businessSlug}/clients`;
  revalidatePath(baseClientsPath);
  revalidatePath(`${baseClientsPath}/${access.clientId}`);
  revalidatePath(`/b/${input.businessSlug}`);
}

export async function convertClientType(input: {
  clientId: string;
  businessSlug: string;
  nextType: "individual" | "company";
  companyName?: string | null;
  useIndividualAsPrimaryContact?: boolean;
  usePrimaryCompanyContactAsIndividual?: boolean;
}) {
  const access = await requireClientManagerAccess(input.clientId);
  const nextType = input.nextType;
  if (nextType !== "individual" && nextType !== "company") {
    throw new Error("Target client type is required");
  }

  const { data: clientRow, error: clientError } = await access.admin
    .from("clients")
    .select("id, business_id, client_type, display_name, primary_email, primary_phone, metadata")
    .eq("id", access.clientId)
    .maybeSingle();
  if (clientError) throw new Error(clientError.message);
  if (!clientRow?.id) throw new Error("Client not found");

  const previousType = String(clientRow.client_type) as "individual" | "company";
  if (previousType === nextType) return;

  const [individualRes, companyRes, primaryContactRes] = await Promise.all([
    access.admin
      .from("client_individual_profiles")
      .select("client_id, first_name, last_name, full_name, email, phone, address_line1, postcode")
      .eq("client_id", access.clientId)
      .maybeSingle(),
    access.admin
      .from("client_company_profiles")
      .select("client_id, company_name, registration_number, vat_number, email, phone, address_line1, postcode")
      .eq("client_id", access.clientId)
      .maybeSingle(),
    access.admin
      .from("client_contacts")
      .select("id, first_name, last_name, full_name, email, phone, job_title")
      .eq("client_id", access.clientId)
      .eq("is_active", true)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (individualRes.error) throw new Error(individualRes.error.message);
  if (companyRes.error) throw new Error(companyRes.error.message);
  if (primaryContactRes.error) throw new Error(primaryContactRes.error.message);

  const individual = individualRes.data as
    | {
        first_name: string | null;
        last_name: string | null;
        full_name: string | null;
        email: string | null;
        phone: string | null;
        address_line1: string | null;
        postcode: string | null;
      }
    | null;
  const company = companyRes.data as
    | {
        company_name: string | null;
        registration_number: string | null;
        vat_number: string | null;
        email: string | null;
        phone: string | null;
        address_line1: string | null;
        postcode: string | null;
      }
    | null;
  const primaryContact = primaryContactRes.data as
    | {
        id: string;
        first_name: string | null;
        last_name: string | null;
        full_name: string | null;
        email: string | null;
        phone: string | null;
        job_title: string | null;
      }
    | null;

  if (nextType === "company") {
    const companyName =
      cleanText(input.companyName) ||
      cleanText(company?.company_name) ||
      cleanText(clientRow.display_name);
    if (!companyName) throw new Error("Company name is required for conversion");

    const { error: updateClientError } = await access.admin
      .from("clients")
      .update({
        client_type: "company",
        display_name: companyName,
        primary_email: cleanText(company?.email) || cleanText(individual?.email) || cleanText(clientRow.primary_email) || null,
        primary_phone: cleanText(company?.phone) || cleanText(individual?.phone) || cleanText(clientRow.primary_phone) || null,
        postcode: cleanText(company?.postcode) || cleanText(individual?.postcode) || null,
      })
      .eq("id", access.clientId);
    if (updateClientError) throw new Error(updateClientError.message);

    const { error: upsertCompanyError } = await access.admin
      .from("client_company_profiles")
      .upsert(
        {
          client_id: access.clientId,
          company_name: companyName,
          registration_number: company?.registration_number ?? null,
          vat_number: company?.vat_number ?? null,
          email: cleanText(company?.email) || cleanText(individual?.email) || null,
          phone: cleanText(company?.phone) || cleanText(individual?.phone) || null,
          address_line1: cleanText(company?.address_line1) || cleanText(individual?.address_line1) || null,
          postcode: cleanText(company?.postcode) || cleanText(individual?.postcode) || null,
        },
        { onConflict: "client_id" },
      );
    if (upsertCompanyError) throw new Error(upsertCompanyError.message);

    if (input.useIndividualAsPrimaryContact) {
      const firstName = cleanText(individual?.first_name);
      const lastName = cleanText(individual?.last_name);
      const fullName =
        [firstName, lastName].filter(Boolean).join(" ").trim() ||
        cleanText(individual?.full_name) ||
        null;
      const hasContactData = Boolean(fullName || cleanText(individual?.email) || cleanText(individual?.phone));
      if (hasContactData) {
        const { error: clearPrimaryError } = await access.admin
          .from("client_contacts")
          .update({ is_primary: false })
          .eq("client_id", access.clientId)
          .eq("is_active", true)
          .eq("is_primary", true);
        if (clearPrimaryError) throw new Error(clearPrimaryError.message);

        const { error: insertContactError } = await access.admin
          .from("client_contacts")
          .insert({
            client_id: access.clientId,
            first_name: firstName || null,
            last_name: lastName || null,
            full_name: fullName,
            email: cleanText(individual?.email) || null,
            phone: cleanText(individual?.phone) || null,
            job_title: "Primary contact",
            is_primary: true,
            is_active: true,
            created_by: access.userId,
          });
        if (insertContactError) throw new Error(insertContactError.message);
      }
    }
  } else {
    const sourceFirstName = input.usePrimaryCompanyContactAsIndividual ? cleanText(primaryContact?.first_name) : "";
    const sourceLastName = input.usePrimaryCompanyContactAsIndividual ? cleanText(primaryContact?.last_name) : "";
    const sourceFullName = input.usePrimaryCompanyContactAsIndividual
      ? cleanText(primaryContact?.full_name)
      : "";
    const individualName =
      [sourceFirstName, sourceLastName].filter(Boolean).join(" ").trim() ||
      sourceFullName ||
      cleanText(individual?.full_name) ||
      cleanText(clientRow.display_name);

    const { error: updateClientError } = await access.admin
      .from("clients")
      .update({
        client_type: "individual",
        display_name: individualName || cleanText(clientRow.display_name) || "Individual client",
        primary_email:
          (input.usePrimaryCompanyContactAsIndividual
            ? cleanText(primaryContact?.email)
            : "") ||
          cleanText(individual?.email) ||
          cleanText(company?.email) ||
          cleanText(clientRow.primary_email) ||
          null,
        primary_phone:
          (input.usePrimaryCompanyContactAsIndividual
            ? cleanText(primaryContact?.phone)
            : "") ||
          cleanText(individual?.phone) ||
          cleanText(company?.phone) ||
          cleanText(clientRow.primary_phone) ||
          null,
        postcode: cleanText(individual?.postcode) || cleanText(company?.postcode) || null,
      })
      .eq("id", access.clientId);
    if (updateClientError) throw new Error(updateClientError.message);

    const { error: upsertIndividualError } = await access.admin
      .from("client_individual_profiles")
      .upsert(
        {
          client_id: access.clientId,
          first_name: sourceFirstName || cleanText(individual?.first_name) || null,
          last_name: sourceLastName || cleanText(individual?.last_name) || null,
          full_name: individualName || null,
          email:
            (input.usePrimaryCompanyContactAsIndividual ? cleanText(primaryContact?.email) : "") ||
            cleanText(individual?.email) ||
            cleanText(company?.email) ||
            null,
          phone:
            (input.usePrimaryCompanyContactAsIndividual ? cleanText(primaryContact?.phone) : "") ||
            cleanText(individual?.phone) ||
            cleanText(company?.phone) ||
            null,
          address_line1: cleanText(individual?.address_line1) || cleanText(company?.address_line1) || null,
          postcode: cleanText(individual?.postcode) || cleanText(company?.postcode) || null,
        },
        { onConflict: "client_id" },
      );
    if (upsertIndividualError) throw new Error(upsertIndividualError.message);
  }

  await insertClientAuditEvent({
    businessId: access.businessId,
    clientId: access.clientId,
    actorId: access.userId,
    eventType: "client.type_changed",
    payload: {
      previous_type: previousType,
      new_type: nextType,
      use_individual_as_primary_contact: Boolean(input.useIndividualAsPrimaryContact),
      use_primary_contact_as_individual: Boolean(input.usePrimaryCompanyContactAsIndividual),
      changed_at: new Date().toISOString(),
    },
  });

  const baseClientsPath = `/b/${input.businessSlug}/clients`;
  revalidatePath(baseClientsPath);
  revalidatePath(`${baseClientsPath}/${access.clientId}`);
  revalidatePath(`/b/${input.businessSlug}`);
  revalidatePath(`/b/${input.businessSlug}/analytics`);
}
