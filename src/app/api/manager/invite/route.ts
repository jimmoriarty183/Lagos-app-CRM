import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type JsonPayload = Record<string, unknown>;
type SupabaseErrorLike = {
  message: string;
  status?: number;
  code?: string;
};

function json(status: number, payload: JsonPayload) {
  return NextResponse.json(payload, { status });
}

function getErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
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

function errorPayload(error: string, hint: string, extra?: JsonPayload): JsonPayload {
  return { ok: false, error, hint, ...(extra ?? {}) };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const business_id = String(body.business_id || body.businessId || "").trim();
    const email = String(body.email || "").trim().toLowerCase();

    if (!business_id) {
      return json(400, errorPayload("business_id required", "Pass business_id in request body."));
    }
    if (!email) {
      return json(400, errorPayload("email required", "Pass a valid manager email in request body."));
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl) {
      return json(
        500,
        errorPayload(
          "Missing SUPABASE_URL",
          "Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) in Vercel project env.",
        ),
      );
    }
    if (!serviceKey) {
      return json(
        500,
        errorPayload(
          "Missing SUPABASE_SERVICE_ROLE_KEY",
          "Set SUPABASE_SERVICE_ROLE_KEY in Vercel project env for server routes.",
        ),
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: existing, error: selErr } = await supabase
      .from("business_invites")
      .select("id,status")
      .eq("business_id", business_id)
      .eq("email", email)
      .maybeSingle();

    if (selErr) {
      const dbErr = asSupabaseError(selErr);
      console.error("invite error", { message: dbErr.message, code: dbErr.code });
      return json(500, errorPayload(dbErr.message, "Failed to read business_invites row."));
    }

    let invite_id: string;

    if (existing?.id) {
      if (existing.status === "PENDING") {
        invite_id = existing.id;
      } else {
        const { error: updErr } = await supabase
          .from("business_invites")
          .update({
            status: "PENDING",
            accepted_at: null,
            accepted_by: null,
            revoked_at: null,
            revoked_by: null,
          })
          .eq("id", existing.id);

        if (updErr) {
          const dbErr = asSupabaseError(updErr);
          console.error("invite error", { message: dbErr.message, code: dbErr.code });
          return json(500, errorPayload(dbErr.message, "Failed to reset existing invite to PENDING."));
        }
        invite_id = existing.id;
      }
    } else {
      const { data: created, error: createErr } = await supabase
        .from("business_invites")
        .insert({
          business_id,
          email,
          role: "MANAGER",
          status: "PENDING",
        })
        .select("id")
        .limit(1)
        .maybeSingle();

      if (createErr || !created?.id) {
        const dbErr = asSupabaseError(createErr);
        console.error("invite error", { message: dbErr.message, code: dbErr.code });
        return json(500, errorPayload(dbErr.message, "Failed to insert into business_invites."));
      }
      invite_id = created.id;
    }

    const baseUrl = getBaseUrl(req);
    const redirectTo = `${baseUrl}/invite?invite_id=${encodeURIComponent(invite_id)}`;

    const { error: authErr } = await supabase.auth.admin.inviteUserByEmail(email, { redirectTo });

    if (authErr) {
      const authError = asSupabaseError(authErr);
      console.error("invite error", {
        message: authError.message,
        status: authError.status,
        code: authError.code,
      });
      return json(400, {
        ok: false,
        error: `Supabase invite email failed: ${authError.message}`,
        hint: "Check Supabase Auth email provider/SMTP and URL allow list for redirectTo domain.",
        invite_id,
        redirectTo,
      });
    }

    return json(200, {
      ok: true,
      invite_id,
      email,
      status: "PENDING",
      email_sent: true,
      redirectTo,
    });
  } catch (err: unknown) {
    const message = getErrorMessage(err, "Unexpected error");
    console.error("invite error", { message });
    return json(500, errorPayload(message, "Unexpected server error during invite flow."));
  }
}
