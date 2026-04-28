import type { SupabaseClient } from "@supabase/supabase-js";

// Demo account guard. The demo account is a shared read-only-ish sandbox
// seeded via manual entitlement overrides (no real Paddle subscription).
// Paddle-bound actions (checkout, change-plan, cancel) must be refused for
// this account so we never create a real transaction on a demo email.

export function normalizeEmail(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

export function getDemoAccountEmail(): string {
  return normalizeEmail(process.env.DEMO_ACCOUNT_EMAIL);
}

export function isDemoEmail(email: string | null | undefined): boolean {
  const demo = getDemoAccountEmail();
  if (!demo) return false;
  return normalizeEmail(email) === demo;
}

// True if the account belongs to DEMO_ACCOUNT_EMAIL (checked via the
// account's primary owner profile). Safe to call with any accountId;
// returns false on lookup errors so callers degrade gracefully.
export async function isDemoAccount(
  admin: SupabaseClient,
  accountId: string | null | undefined,
): Promise<boolean> {
  const demo = getDemoAccountEmail();
  const id = String(accountId ?? "").trim();
  if (!demo || !id) return false;
  try {
    const { data: account } = await admin
      .from("accounts")
      .select("primary_owner_user_id")
      .eq("id", id)
      .maybeSingle();
    const ownerId = String(
      (account as { primary_owner_user_id?: string | null } | null)
        ?.primary_owner_user_id ?? "",
    ).trim();
    if (!ownerId) return false;
    const { data: profile } = await admin
      .from("profiles")
      .select("email")
      .eq("id", ownerId)
      .maybeSingle();
    return normalizeEmail((profile as { email?: string | null } | null)?.email) === demo;
  } catch {
    return false;
  }
}

export const DEMO_BLOCKED_ERROR = {
  code: "DEMO_ACCOUNT_BILLING_DISABLED" as const,
  message:
    "Billing actions are disabled for the demo account. Sign in with a real account to upgrade or cancel.",
};
