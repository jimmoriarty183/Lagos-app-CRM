import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin-access";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export type AccountAccess = {
  admin: SupabaseClient;
  user: User;
  accountId: string;
};

async function isAccountOwnedByUser(
  admin: SupabaseClient,
  accountId: string,
  userId: string,
  userEmail: string | null,
): Promise<boolean> {
  const account = await admin
    .from("accounts")
    .select("slug")
    .eq("id", accountId)
    .limit(1);
  if (account.error) throw account.error;
  const slug = String(
    ((account.data ?? [])[0] as { slug?: string } | undefined)?.slug ?? "",
  ).trim();

  if (slug) {
    const business = await admin
      .from("businesses")
      .select("id")
      .eq("slug", slug)
      .limit(1);
    if (business.error) throw business.error;
    const businessId = String(
      ((business.data ?? [])[0] as { id?: string } | undefined)?.id ?? "",
    ).trim();
    if (businessId) {
      const membership = await admin
        .from("memberships")
        .select("id")
        .eq("business_id", businessId)
        .eq("user_id", userId)
        .in("role", ["owner", "OWNER"])
        .limit(1);
      if (membership.error) throw membership.error;
      if ((membership.data ?? []).length > 0) return true;
    }
  }

  if (userEmail) {
    const customer = await admin
      .from("paddle_customers")
      .select("id")
      .eq("account_id", accountId)
      .ilike("email", userEmail)
      .limit(1);
    if (customer.error) throw customer.error;
    if ((customer.data ?? []).length > 0) return true;
  }

  return false;
}

export async function requireAccountAccess(
  accountId: string,
): Promise<
  | { ok: true; value: AccountAccess }
  | { ok: false; status: number; error: string }
> {
  const normalizedAccountId = String(accountId ?? "").trim();
  if (!normalizedAccountId) {
    return { ok: false, status: 400, error: "account_id is required" };
  }

  const supabase = await supabaseServer();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData?.user ?? null;
  if (userError || !user) {
    return { ok: false, status: 401, error: "Not authenticated" };
  }

  const admin = supabaseAdmin();
  const { data: account, error: accountError } = await admin
    .from("accounts")
    .select("id")
    .eq("id", normalizedAccountId)
    .maybeSingle();

  if (accountError) {
    return { ok: false, status: 500, error: accountError.message };
  }
  if (!account) {
    return { ok: false, status: 404, error: "Account not found" };
  }

  let isOwner = false;
  try {
    isOwner = await isAccountOwnedByUser(
      admin,
      normalizedAccountId,
      user.id,
      user.email ?? null,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as { message?: unknown }).message ?? "")
          : "";
    return {
      ok: false,
      status: 500,
      error: message || "Failed to verify account owner",
    };
  }

  const isAdmin = isAdminEmail(user.email ?? "");
  if (!isOwner && !isAdmin) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return {
    ok: true,
    value: {
      admin,
      user,
      accountId: normalizedAccountId,
    },
  };
}

export function requireJobSecret(request: Request) {
  const expected = process.env.BILLING_JOB_SECRET || "";
  if (!expected) {
    return { ok: false as const, status: 500, error: "Missing BILLING_JOB_SECRET" };
  }
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || token !== expected) {
    return { ok: false as const, status: 401, error: "Unauthorized job token" };
  }
  return { ok: true as const };
}

