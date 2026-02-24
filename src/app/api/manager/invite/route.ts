import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function json(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const business_id = String(body?.business_id || body?.businessId || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();

    if (!business_id) return json(400, { error: "business_id required" });
    if (!email) return json(400, { error: "email required" });

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl) {
      return json(500, { error: "Missing SUPABASE_URL" });
    }

    if (!serviceKey) {
      return json(500, { error: "Missing SUPABASE_SERVICE_ROLE_KEY" });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // 🔎 Ищем любой invite (не только pending)
    const { data: existing } = await supabase
      .from("business_invites")
      .select("id,status")
      .eq("business_id", business_id)
      .eq("email", email)
      .maybeSingle();

    let invite_id: string;

    if (existing) {
      // ✅ Если уже PENDING — просто используем его
      if (existing.status === "PENDING") {
        invite_id = existing.id;
      }

      // ✅ Если REVOKED или ACCEPTED — переводим обратно в PENDING
      else {
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
          return json(500, { error: updErr.message });
        }

        invite_id = existing.id;
      }
    } else {
      // 🆕 Создаём новый
      const { data: created, error: createErr } = await supabase
        .from("business_invites")
        .insert({
          business_id,
          email,
          role: "MANAGER",
          status: "PENDING",
        })
        .select("id")
        .single();

      if (createErr || !created) {
        return json(500, { error: createErr?.message || "Insert failed" });
      }

      invite_id = created.id;
    }

    // 📧 Отправляем email
    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const redirectTo = `${origin}/invite?invite_id=${encodeURIComponent(invite_id)}`;

    let email_sent = false;
    let email_error: string | null = null;

    try {
      const { error: authErr } = await supabase.auth.admin.inviteUserByEmail(
        email,
        { redirectTo },
      );

      if (authErr) email_error = authErr.message;
      else email_sent = true;
    } catch (e: any) {
      email_error = e?.message || "Failed to send invite email";
    }

    return json(200, {
      ok: true,
      invite_id,
      email,
      status: "PENDING",
      email_sent,
      email_error,
      redirectTo,
    });
  } catch (e: any) {
    return json(500, { error: e?.message || "Unexpected error" });
  }
}