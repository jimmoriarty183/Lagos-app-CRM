import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function json(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

function getBaseUrl(req: Request) {
  // 1) продовый стабильный домен
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) return site.replace(/\/$/, "");

  // 2) если нет - пробуем origin
  const origin = req.headers.get("origin")?.trim();
  if (origin) return origin.replace(/\/$/, "");

  // 3) fallback: локалка
  const app = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (app) return app.replace(/\/$/, "");

  return "http://localhost:3000";
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const business_id = String(body?.business_id || body?.businessId || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();

    if (!business_id) return json(400, { error: "business_id required" });
    if (!email) return json(400, { error: "email required" });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl) return json(500, { error: "Missing SUPABASE_URL" });
    if (!serviceKey) return json(500, { error: "Missing SUPABASE_SERVICE_ROLE_KEY" });

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 🔎 Ищем invite по business + email (любой статус)
    const { data: existing, error: selErr } = await supabase
      .from("business_invites")
      .select("id,status")
      .eq("business_id", business_id)
      .eq("email", email)
      .maybeSingle();

    if (selErr) return json(500, { error: selErr.message });

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

        if (updErr) return json(500, { error: updErr.message });
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
        .limit(1).maybeSingle();

      if (createErr || !created?.id) {
        return json(500, { error: createErr?.message || "Insert failed" });
      }
      invite_id = created.id;
    }

    // ✅ ВАЖНО: redirectTo всегда строим от правильного base url
    const baseUrl = getBaseUrl(req);
    const redirectTo = `${baseUrl}/invite?invite_id=${encodeURIComponent(invite_id)}`;

    const { error: authErr } = await supabase.auth.admin.inviteUserByEmail(email, { redirectTo });

    if (authErr) {
      return json(400, {
        error: `Supabase invite email failed: ${authErr.message}`,
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
  } catch (e: any) {
    return json(500, { error: e?.message || "Unexpected error" });
  }
}