const ADMIN_USERS_PATH = "/admin";

function parseAdminEmails(value: string | undefined) {
  return String(value ?? "")
    .split(/[,\s;]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function getAdminEmailAllowlist() {
  return new Set([
    ...parseAdminEmails(process.env.ADMIN_EMAILS),
    ...parseAdminEmails(process.env.ADMIN_EMAIL),
  ]);
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  return getAdminEmailAllowlist().has(String(email).trim().toLowerCase());
}

export function getAdminUsersPath() {
  return ADMIN_USERS_PATH;
}
