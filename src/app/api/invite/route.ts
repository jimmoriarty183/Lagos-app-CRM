import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: Request) {
  try {
    const { email, businessId } = await req.json();

    const inviteEmail = String(email || "").trim().toLowerCase();
    const bizId = String(businessId || "").trim();

    if (!inviteEmail) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }
    if (!bizId) {
      return NextResponse.json({ error: "businessId is required" }, { status: 400 });
    }

    // 1) текущий пользователь (owner) из cookies session
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name, options) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes?.user?.id) {
      return NextResponse.json({ error: "No active session" }, { status: 401 });
    }
    const ownerUserId = userRes.user.id;

    // 2) service role client
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // 3) security: проверяем, что отправитель OWNER этого бизнеса
    const { data: member, error: memErr } = await admin
      .from("memberships")
      .select("role")
      .eq("business_id", bizId)
      .eq("user_id", ownerUserId)
      .maybeSingle();

    if (memErr) return NextResponse.json({ error: memErr.message }, { status: 500 });
    if (!member || String(member.role).toUpperCase() !== "OWNER") {
      return NextResponse.json({ error: "Only OWNER can invite managers" }, { status: 403 });
    }

    // 4) создаём запись в manager_invites
    const { data: inv, error: invErr } = await admin
      .from("manager_invites")
      .insert({
        business_id: bizId,
        email: inviteEmail,
        status: "pending",
      })
      .select("id")
      .single();

    if (invErr) {
      return NextResponse.json({ error: invErr.message }, { status: 500 });
    }

    // 5) отправляем email invite, пробрасываем invite_id в redirect_to
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?invite_id=${inv.id}`;

    const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(inviteEmail, {
      redirectTo,
    });

    if (inviteErr) {
      // можно пометить failed, чтобы не висело pending
      await admin.from("manager_invites").update({ status: "failed" }).eq("id", inv.id);
      return NextResponse.json({ error: inviteErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, inviteId: inv.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}