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
): Promise<boolean> {
  const ownerColumns = ["owner_user_id", "owner_id", "created_by"] as const;

  for (const ownerColumn of ownerColumns) {
    const result = await admin
      .from("accounts")
      .select("id")
      .eq("id", accountId)
      .eq(ownerColumn, userId)
      .maybeSingle();

    if (!result.error) {
      return Boolean(result.data);
    }

    if (String((result.error as { code?: string } | null)?.code ?? "") === "42703") {
      continue;
    }

    throw result.error;
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
    isOwner = await isAccountOwnedByUser(admin, normalizedAccountId, user.id);
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : "Failed to verify account owner",
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

