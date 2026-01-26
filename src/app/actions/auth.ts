"use server";

import { supabaseServer } from "@/lib/supabase/server";

type State = { ok: boolean; error: string; next: string };
const initial: State = { ok: false, error: "", next: "" };

function msg(e: any) {
  return e?.message || e?.error_description || "Unknown error";
}

function safeRole(r: any) {
  const s = String(r || "").toUpperCase();
  if (s === "OWNER") return "OWNER";
  if (s === "MANAGER") return "MANAGER";
  return "GUEST";
}

/** ✅ LOGIN (под useActionState: (prevState, formData)) */
export async function loginAction(
  _prev: State = initial,
  formData: FormData
): Promise<State> {
  try {
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    const supabase = await supabaseServer();

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInErr) return { ok: false, error: signInErr.message, next: "" };

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) return { ok: false, error: userErr.message, next: "" };
    const user = userData.user;
    if (!user) return { ok: false, error: "No user after login", next: "" };

    // найти любой business пользователя
    const { data: mem, error: memErr } = await supabase
      .from("memberships")
      .select("business_id, role, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1);

    if (memErr) return { ok: false, error: memErr.message, next: "" };
    const businessId = mem?.[0]?.business_id;
    if (!businessId) return { ok: true, error: "", next: "/login?no_business=1" };

    const { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .select("slug")
      .eq("id", businessId)
      .single();

    if (bizErr) return { ok: false, error: bizErr.message, next: "" };
    if (!biz?.slug) return { ok: true, error: "", next: "/login?no_business=1" };

    return { ok: true, error: "", next: `/b/${biz.slug}` };
  } catch (e) {
    return { ok: false, error: msg(e), next: "" };
  }
}

/** ✅ REGISTER OWNER (под useActionState: (prevState, formData)) */
export async function registerOwnerAction(
  _prev: State = initial,
  formData: FormData
): Promise<State> {
  try {
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const slug = String(formData.get("slug") || "").trim();
    const ownerPhone = String(formData.get("owner_phone") || "").trim();

    const supabase = await supabaseServer();


    // 1) создать auth юзера
    const { error: signUpErr } = await supabase.auth.signUp({ email, password });
    if (signUpErr) return { ok: false, error: signUpErr.message, next: "" };

    // 2) залогиниться сразу (чтобы установились cookies)
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInErr) return { ok: false, error: signInErr.message, next: "" };

    // 3) создать business + membership owner через RPC
    const { error: rpcErr } = await supabase.rpc("create_business_with_owner", {
      p_slug: slug,
      p_owner_phone: ownerPhone || null,
      p_manager_phone: null,
    });

    if (rpcErr) return { ok: false, error: rpcErr.message, next: "" };

    return { ok: true, error: "", next: `/b/${slug}` };
  } catch (e) {
    return { ok: false, error: msg(e), next: "" };
  }
}
