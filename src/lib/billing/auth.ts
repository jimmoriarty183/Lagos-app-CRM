import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin-access";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export type AccountAccess = {
  admin: SupabaseClient;
  user: User;
  accountId: string;
};

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
    .select("id, owner_user_id")
    .eq("id", normalizedAccountId)
    .maybeSingle();

  if (accountError) {
    return { ok: false, status: 500, error: accountError.message };
  }
  if (!account) {
    return { ok: false, status: 404, error: "Account not found" };
  }

  const isOwner = String(account.owner_user_id ?? "") === user.id;
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

