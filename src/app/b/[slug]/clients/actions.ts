"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { ensureWorkspaceForBusiness } from "@/lib/workspaces";

function cleanText(value: unknown) {
  return String(value ?? "").trim();
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
    is_active: input.isActive === false ? false : true,
    created_by: userId,
  };

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
        is_active: payload.is_active,
      })
      .eq("id", normalizedContactId)
      .eq("client_id", clientId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await admin.from("client_contacts").insert(payload);
    if (error) throw new Error(error.message);
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
    .update({ is_active: false, is_primary: false })
    .eq("id", normalizedContactId);
  if (error) throw new Error(error.message);

  const baseClientsPath = `/b/${input.businessSlug}/clients`;
  revalidatePath(baseClientsPath);
  revalidatePath(`${baseClientsPath}/${access.clientId}`);
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
