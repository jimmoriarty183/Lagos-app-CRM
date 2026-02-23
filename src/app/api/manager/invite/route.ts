import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function json(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const business_id: string = String(
      body?.business_id || body?.businessId || "",
    ).trim();

    const email: string = String(body?.email || "").trim().toLowerCase();

    if (!business_id) return json(400, { error: "business_id required" });
    if (!email) return json(400, { error: "email required" });

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl) {
      return json(500, {
        error: "Missing env: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)",
      });
    }
    if (!serviceKey) {
      return json(500, {
        error: "Missing env: SUPABASE_SERVICE_ROLE_KEY",
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // ✅ 1) если уже есть pending invite — НЕ создаём новый
    const { data: existing } = await supabase
      .from("business_invites")
      .select("id,status")
      .eq("business_id", business_id)
      .eq("email", email)
      .eq("status", "PENDING")
      .maybeSingle();

    let invite_id: string | null = existing?.id ?? null;

    // ✅ 2) если нет — создаём
    if (!invite_id) {
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

      if (createErr) {
        // race-safe: если параллельно вставили pending
        const { data: afterRace } = await supabase
          .from("business_invites")
          .select("id")
          .eq("business_id", business_id)
          .eq("email", email)
          .eq("status", "PENDING")
          .maybeSingle();

        if (!afterRace?.id) {
          return json(500, { error: createErr.message || "Insert failed" });
        }
        invite_id = afterRace.id;
      } else {
        invite_id = created.id;
      }
    }

    // ✅ 3) отправка email (не валим API если не отправилось)
    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const redirectTo = `${origin}/invite?invite_id=${encodeURIComponent(
      invite_id!,
    )}`;

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
      status: "pending",
      email_sent,
      email_error,
      redirectTo,
      already_pending: !!existing?.id,
    });
  } catch (e: any) {
    return json(500, { error: e?.message || "Unexpected error" });
  }
}