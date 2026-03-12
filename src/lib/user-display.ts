export type UserNameParts = {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
};

function cleanText(value?: string | null) {
  const text = String(value ?? "").trim();
  if (!text) return "";

  const lowered = text.toLowerCase();
  if (lowered === "null" || lowered === "undefined") return "";

  return text;
}

export function buildNameFromParts(firstName?: string | null, lastName?: string | null) {
  const first = cleanText(firstName);
  const last = cleanText(lastName);
  return [first, last].filter(Boolean).join(" ").trim();
}

export function resolveUserDisplay(input: UserNameParts) {
  const fullName = cleanText(input.full_name);
  const fromParts = buildNameFromParts(input.first_name, input.last_name);
  const email = cleanText(input.email);
  const phone = cleanText(input.phone);

  const primary = fullName || fromParts || email || phone || "No name";
  const secondary = email || null;

  return {
    fullName,
    fromParts,
    email,
    phone,
    primary,
    secondary,
  };
}

export function buildSafeUserFallback(userId?: string | null) {
  const id = cleanText(userId);
  if (!id) return "No name";

  return `User ${id.slice(0, 8)}`;
}
