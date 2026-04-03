import type { SupabaseClient } from "@supabase/supabase-js";

export type ClientType = "individual" | "company";

export type IndividualMatchInput = {
  inn?: string | null;
  phone?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export type CompanyMatchInput = {
  registrationNumber?: string | null;
  vatNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  companyName?: string | null;
};

export type MatchState = "exact_match" | "possible_duplicate" | "no_match";

export type MatchCandidate = {
  clientId: string;
  clientType: ClientType;
  displayName: string;
  email: string | null;
  phone: string | null;
  reason: string;
  score: number;
};

export type MatchResult = {
  state: MatchState;
  exact: MatchCandidate[];
  possible: MatchCandidate[];
};

type ClientRow = {
  id: string;
  client_type: ClientType;
  display_name: string;
  primary_email: string | null;
  primary_phone: string | null;
  metadata?: Record<string, unknown> | null;
};

type IndividualProfileRow = {
  client_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
};

type CompanyProfileRow = {
  client_id: string;
  company_name: string | null;
  registration_number: string | null;
  vat_number: string | null;
  email: string | null;
  phone: string | null;
};

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

export function normalizePhone(value: unknown) {
  return cleanText(value).replace(/\D+/g, "");
}

function normalizeEmail(value: unknown) {
  return cleanText(value).toLowerCase();
}

function normalizeAlnum(value: unknown) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeName(value: unknown) {
  return cleanText(value).toLowerCase().replace(/\s+/g, " ");
}

function safeDisplayName(
  client: ClientRow,
  profileName: string | null | undefined,
  fallback: string,
) {
  const byProfile = cleanText(profileName);
  if (byProfile) return byProfile;
  const byClient = cleanText(client.display_name);
  return byClient || fallback;
}

export async function findIndividualMatches(
  admin: SupabaseClient,
  businessId: string,
  input: IndividualMatchInput,
): Promise<MatchResult> {
  const targetInn = normalizeAlnum(input.inn);
  const targetPhone = normalizePhone(input.phone);
  const targetEmail = normalizeEmail(input.email);
  const targetFullName = normalizeName(
    [cleanText(input.firstName), cleanText(input.lastName)].filter(Boolean).join(" "),
  );

  const { data: clientsData, error: clientsError } = await admin
    .from("clients")
    .select("id, client_type, display_name, primary_email, primary_phone, metadata")
    .eq("business_id", businessId)
    .eq("client_type", "individual")
    .eq("is_archived", false)
    .limit(300);
  if (clientsError) throw new Error(clientsError.message);

  const clients = (clientsData ?? []) as ClientRow[];
  const clientIds = clients.map((row) => row.id);
  if (clientIds.length === 0) {
    return { state: "no_match", exact: [], possible: [] };
  }

  const { data: profilesData, error: profilesError } = await admin
    .from("client_individual_profiles")
    .select("client_id, first_name, last_name, email, phone")
    .in("client_id", clientIds);
  if (profilesError) throw new Error(profilesError.message);

  const profileByClientId = new Map(
    ((profilesData ?? []) as IndividualProfileRow[]).map((row) => [row.client_id, row]),
  );

  const exact: MatchCandidate[] = [];
  const possible: MatchCandidate[] = [];

  for (const client of clients) {
    const profile = profileByClientId.get(client.id);
    const profilePhone = normalizePhone(profile?.phone ?? client.primary_phone);
    const profileEmail = normalizeEmail(profile?.email ?? client.primary_email);
    const profileInn = normalizeAlnum(
      (client.metadata as Record<string, unknown> | null)?.inn_normalized ??
        (client.metadata as Record<string, unknown> | null)?.inn ??
        "",
    );
    const profileFullName = [cleanText(profile?.first_name), cleanText(profile?.last_name)]
      .filter(Boolean)
      .join(" ");
    const profileName = normalizeName(
      [cleanText(profile?.first_name), cleanText(profile?.last_name)].filter(Boolean).join(" "),
    );

    if (
      (targetInn && profileInn && targetInn === profileInn) ||
      (targetPhone && profilePhone && targetPhone === profilePhone) ||
      (targetEmail && profileEmail && targetEmail === profileEmail)
    ) {
      let reason = "Strong identifier matched";
      if (targetInn && profileInn && targetInn === profileInn) reason = "INN matched";
      else if (targetPhone && profilePhone && targetPhone === profilePhone) reason = "Phone matched";
      else if (targetEmail && profileEmail && targetEmail === profileEmail) reason = "Email matched";

      exact.push({
        clientId: client.id,
        clientType: "individual",
        displayName: safeDisplayName(client, profileFullName, "Individual client"),
        email: cleanText(profile?.email ?? client.primary_email) || null,
        phone: cleanText(profile?.phone ?? client.primary_phone) || null,
        reason,
        score: 100,
      });
      continue;
    }

    const nameMatches = Boolean(targetFullName && profileName && targetFullName === profileName);
    const weakSignals =
      Number(Boolean(targetPhone && profilePhone && targetPhone.slice(-7) === profilePhone.slice(-7))) +
      Number(Boolean(targetEmail && profileEmail && targetEmail.split("@")[0] === profileEmail.split("@")[0]));

    if (nameMatches && weakSignals > 0) {
      possible.push({
        clientId: client.id,
        clientType: "individual",
        displayName: safeDisplayName(client, profileFullName, "Individual client"),
        email: cleanText(profile?.email ?? client.primary_email) || null,
        phone: cleanText(profile?.phone ?? client.primary_phone) || null,
        reason: "Name plus weak signal matched",
        score: 60 + weakSignals * 10,
      });
    }
  }

  exact.sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName));
  possible.sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName));

  return {
    state: exact.length > 0 ? "exact_match" : possible.length > 0 ? "possible_duplicate" : "no_match",
    exact,
    possible,
  };
}

export async function findCompanyMatches(
  admin: SupabaseClient,
  businessId: string,
  input: CompanyMatchInput,
): Promise<MatchResult> {
  const targetReg = normalizeAlnum(input.registrationNumber);
  const targetVat = normalizeAlnum(input.vatNumber);
  const targetPhone = normalizePhone(input.phone);
  const targetEmail = normalizeEmail(input.email);
  const targetCompany = normalizeName(input.companyName);

  const { data: clientsData, error: clientsError } = await admin
    .from("clients")
    .select("id, client_type, display_name, primary_email, primary_phone")
    .eq("business_id", businessId)
    .eq("client_type", "company")
    .eq("is_archived", false)
    .limit(300);
  if (clientsError) throw new Error(clientsError.message);

  const clients = (clientsData ?? []) as ClientRow[];
  const clientIds = clients.map((row) => row.id);
  if (clientIds.length === 0) {
    return { state: "no_match", exact: [], possible: [] };
  }

  const { data: profilesData, error: profilesError } = await admin
    .from("client_company_profiles")
    .select("client_id, company_name, registration_number, vat_number, email, phone")
    .in("client_id", clientIds);
  if (profilesError) throw new Error(profilesError.message);

  const profileByClientId = new Map(
    ((profilesData ?? []) as CompanyProfileRow[]).map((row) => [row.client_id, row]),
  );

  const exact: MatchCandidate[] = [];
  const possible: MatchCandidate[] = [];

  for (const client of clients) {
    const profile = profileByClientId.get(client.id);
    const companyName = normalizeName(profile?.company_name ?? client.display_name);
    const reg = normalizeAlnum(profile?.registration_number);
    const vat = normalizeAlnum(profile?.vat_number);
    const phone = normalizePhone(profile?.phone ?? client.primary_phone);
    const email = normalizeEmail(profile?.email ?? client.primary_email);

    if ((targetReg && reg && targetReg === reg) || (targetVat && vat && targetVat === vat)) {
      const reason =
        targetReg && reg && targetReg === reg ? "Registration number matched" : "VAT/tax number matched";
      exact.push({
        clientId: client.id,
        clientType: "company",
        displayName: safeDisplayName(client, profile?.company_name, "Company client"),
        email: cleanText(profile?.email ?? client.primary_email) || null,
        phone: cleanText(profile?.phone ?? client.primary_phone) || null,
        reason,
        score: 100,
      });
      continue;
    }

    const nameMatches = Boolean(targetCompany && companyName && targetCompany === companyName);
    const weakSignals =
      Number(Boolean(targetPhone && phone && targetPhone.slice(-7) === phone.slice(-7))) +
      Number(Boolean(targetEmail && email && targetEmail.split("@")[0] === email.split("@")[0]));

    if (nameMatches && weakSignals > 0) {
      possible.push({
        clientId: client.id,
        clientType: "company",
        displayName: safeDisplayName(client, profile?.company_name, "Company client"),
        email: cleanText(profile?.email ?? client.primary_email) || null,
        phone: cleanText(profile?.phone ?? client.primary_phone) || null,
        reason: "Company name plus weak signal matched",
        score: 60 + weakSignals * 10,
      });
    }
  }

  exact.sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName));
  possible.sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName));

  return {
    state: exact.length > 0 ? "exact_match" : possible.length > 0 ? "possible_duplicate" : "no_match",
    exact,
    possible,
  };
}
