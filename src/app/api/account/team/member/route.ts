import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function clean(v: unknown) {
  return String(v ?? "").trim();
}

async function authorize(req: Request) {
  const supabase = await supabaseServer();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) {
    return { ok: false as const, status: 401, error: "Not authenticated" };
  }
  const admin = supabaseAdmin();
  return { ok: true as const, user, admin };
}

async function assertCanManage(admin: ReturnType<typeof supabaseAdmin>, userId: string, accountId: string) {
  const { data, error } = await admin.rpc("user_can_manage_team", {
    p_user_id: userId,
    p_account_id: accountId,
  });
  if (error) return { ok: false as const, status: 500, error: error.message };
  if (!data) return { ok: false as const, status: 403, error: "Forbidden" };
  return { ok: true as const };
}

async function assertBusinessInAccount(
  admin: ReturnType<typeof supabaseAdmin>,
  businessId: string,
  accountId: string,
) {
  const { data, error } = await admin
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("account_id", accountId)
    .maybeSingle();
  if (error) return { ok: false as const, status: 500, error: error.message };
  if (!data) return { ok: false as const, status: 400, error: "business does not belong to this account" };
  return { ok: true as const };
}

export async function PATCH(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      accountId?: string;
      userId?: string;
      businessId?: string;
      action?: "add" | "remove" | "set_can_manage_team";
      canManageTeam?: boolean;
    };
    const accountId = clean(body.accountId);
    const targetUserId = clean(body.userId);
    const action = clean(body.action);

    if (!accountId || !targetUserId || !action) {
      return NextResponse.json({ ok: false, error: "accountId, userId, action are required" }, { status: 400 });
    }

    const auth = await authorize(req);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    const perm = await assertCanManage(auth.admin, auth.user.id, accountId);
    if (!perm.ok) return NextResponse.json({ ok: false, error: perm.error }, { status: perm.status });

    if (action === "add" || action === "remove") {
      const businessId = clean(body.businessId);
      if (!businessId) {
        return NextResponse.json({ ok: false, error: "businessId is required" }, { status: 400 });
      }
      const bizCheck = await assertBusinessInAccount(auth.admin, businessId, accountId);
      if (!bizCheck.ok) return NextResponse.json({ ok: false, error: bizCheck.error }, { status: bizCheck.status });

      // Don't allow mutating OWNER membership through this endpoint.
      const mem = await auth.admin
        .from("memberships")
        .select("role")
        .eq("business_id", businessId)
        .eq("user_id", targetUserId)
        .maybeSingle();
      const isOwner = String((mem.data as { role?: string } | null)?.role ?? "").toUpperCase() === "OWNER";
      if (isOwner) {
        return NextResponse.json({ ok: false, error: "Cannot change OWNER membership from this endpoint" }, { status: 400 });
      }

      if (action === "add") {
        const { error } = await auth.admin
          .from("memberships")
          .upsert({ business_id: businessId, user_id: targetUserId, role: "MANAGER" }, { onConflict: "business_id,user_id" });
        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      } else {
        const { error } = await auth.admin
          .from("memberships")
          .delete()
          .eq("business_id", businessId)
          .eq("user_id", targetUserId);
        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    if (action === "set_can_manage_team") {
      const next = Boolean(body.canManageTeam);
      const bizRes = await auth.admin
        .from("businesses")
        .select("id")
        .eq("account_id", accountId);
      if (bizRes.error) return NextResponse.json({ ok: false, error: bizRes.error.message }, { status: 500 });
      const businessIds = (bizRes.data ?? []).map((b: { id: string }) => b.id);
      if (businessIds.length === 0) return NextResponse.json({ ok: true });

      const { error } = await auth.admin
        .from("memberships")
        .update({ can_manage_team: next })
        .eq("user_id", targetUserId)
        .in("business_id", businessIds);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: `unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { accountId?: string; userId?: string };
    const accountId = clean(body.accountId);
    const targetUserId = clean(body.userId);

    if (!accountId || !targetUserId) {
      return NextResponse.json({ ok: false, error: "accountId and userId are required" }, { status: 400 });
    }

    const auth = await authorize(req);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    const perm = await assertCanManage(auth.admin, auth.user.id, accountId);
    if (!perm.ok) return NextResponse.json({ ok: false, error: perm.error }, { status: perm.status });

    // Refuse to remove the account owner.
    const { data: acc } = await auth.admin
      .from("accounts")
      .select("primary_owner_user_id")
      .eq("id", accountId)
      .maybeSingle();
    if (String((acc as { primary_owner_user_id?: string } | null)?.primary_owner_user_id ?? "") === targetUserId) {
      return NextResponse.json({ ok: false, error: "Cannot remove the account owner" }, { status: 400 });
    }

    const { data: bizIds } = await auth.admin
      .from("businesses")
      .select("id")
      .eq("account_id", accountId);
    const ids = (bizIds ?? []).map((b: { id: string }) => b.id);
    if (ids.length === 0) return NextResponse.json({ ok: true });

    const { error } = await auth.admin
      .from("memberships")
      .delete()
      .eq("user_id", targetUserId)
      .in("business_id", ids);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
