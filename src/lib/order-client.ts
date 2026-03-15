export type OrderClientFields = {
  client_name?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

export function buildClientFullName(firstName?: string | null, lastName?: string | null, fallback?: string | null) {
  const first = clean(firstName);
  const last = clean(lastName);
  const joined = [first, last].filter(Boolean).join(" ").trim();
  return joined || clean(fallback);
}

export function normalizeOrderClient(fields: OrderClientFields) {
  const fallbackName = clean(fields.full_name) || clean(fields.client_name);
  const firstName = clean(fields.first_name) || fallbackName;
  const lastName = clean(fields.first_name) ? clean(fields.last_name) : "";
  const fullName = buildClientFullName(clean(fields.first_name), clean(fields.last_name), fallbackName);

  return {
    firstName,
    lastName,
    fullName: fullName || "Unknown client",
  };
}

export function splitLegacyClientName(value: string | null | undefined) {
  const normalized = clean(value);
  return {
    firstName: normalized,
    lastName: "",
  };
}
