import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type JsonPayload = Record<string, unknown>;
type SupabaseErrorLike = {
  message: string;
  status?: number;
  code?: string;
};

function clean(v: unknown) {
  return String(v ?? "").trim();
}

function normEmail(v: unknown) {
  return clean(v).toLowerCase();
}

function errorPayload(error: string, hint: string, extra?: JsonPayload): JsonPayload {
  return { ok: false, error, hint, ...(extra ?? {}) };
}

function asSupabaseError(err: unknown): SupabaseErrorLike {
  const e = (err ?? {}) as Partial<SupabaseErrorLike>;
  return {
    message: e.message || "Unknown error",
    status: typeof e.status === "number" ? e.status : undefined,
    code: typeof e.code === "string" ? e.code : undefined,
  };
}

function getBaseUrl(req: Request) {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) return site.replace(/\/$/, "");

  const origin = req.headers.get("origin")?.trim();
  if (origin) return origin.replace(/\/$/, "");

  const app = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (app) return app.replace(/\/$/, "");

  return "http://localhost:3000";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const business_id = clean(body.business_id || body.businessId);
    const email = normEmail(body.email);
    const role = clean(body.role || "MANAGER").toUpperCase();

    if (!business_id) {
      return NextResponse.json(
        errorPayload("business_id required", "Pass business_id in request body."),
        { status: 400 },
      );
    }
    if (!email || !email.includes("@")) {
      return NextResponse.json(
        errorPayload("valid email required", "Pass a valid email in request body."),
        { status: 400 },
      );
    }

    const supabase = await supabaseServer();
    const admin = supabaseAdmin();

    const { data: u, error: userErr } = await supabase.auth.getUser();
    const user = u?.user;
    if (userErr || !user) {
      return NextResponse.json(errorPayload("Not authenticated", "Sign in as owner and retry."), {
        status: 401,
      });
    }

    const { data: mem, error: memErr } = await admin
      .from("memberships")
      .select("role")
      .eq("business_id", business_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memErr) {
      return NextResponse.json(errorPayload(memErr.message, "Failed to verify membership."), {
        status: 403,
      });
    }
    if (!mem || String(mem.role).toLowerCase() !== "owner") {
      return NextResponse.json(errorPayload("Only owner can invite", "Owner role is required."), {
        status: 403,
      });
    }

    const { data: existing, error: exErr } = await admin
      .from("business_invites")
      .select("id,email,status,created_at")
      .eq("business_id", business_id)
      .ilike("email", email)
      .eq("role", role)
      .eq("status", "PENDING")
      .order("created_at", { ascending: false })
      .maybeSingle();

    if (exErr) {
      const dbErr = asSupabaseError(exErr);
      console.error("invite error", { message: dbErr.message, code: dbErr.code });
      return NextResponse.json(errorPayload(dbErr.message, "Failed to query existing invite."), {
        status: 500,
      });
    }

    let inviteId = existing?.id || "";

    if (!inviteId) {
      const { data: created, error: crErr } = await admin
        .from("business_invites")
        .insert({ business_id, email, role, status: "PENDING" })
        .select("id")
        .single();

      if (crErr || !created?.id) {
        const dbErr = asSupabaseError(crErr);
        console.error("invite error", { message: dbErr.message, code: dbErr.code });
        return NextResponse.json(errorPayload(dbErr.message, "Failed to create invite row."), {
          status: 500,
        });
      }

      inviteId = created.id;
    }

    const redirectTo = `${getBaseUrl(req)}/invite?invite_id=${encodeURIComponent(inviteId)}`;
    const { error: authErr } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });

    if (authErr) {
      const authError = asSupabaseError(authErr);
      console.error("invite error", {
        message: authError.message,
        status: authError.status,
        code: authError.code,
      });
      return NextResponse.json(
        errorPayload(
          `Supabase invite email failed: ${authError.message}`,
          "Check Supabase Auth provider/SMTP and redirect URL allow list.",
          { invite_id: inviteId, redirectTo },
        ),
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      invite_id: inviteId,
      already_pending: Boolean(existing?.id),
      email_sent: true,
      redirectTo,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("invite error", { message });
    return NextResponse.json(errorPayload(message, "Unexpected invite API error."), { status: 500 });
  }
}
