"use server";

import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";

type State = { ok: boolean; error: string; next: string };
const initial: State = { ok: false, error: "", next: "" };

function msg(e: any) {
  return e?.message || e?.error_description || "Unknown error";
}

// ✅ генерация slug из названия
function slugify(input: string) {
  const base = String(input || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return base || `biz-${Date.now()}`;
}

/** ✅ LOGIN (multi-business):
 *  - 0 businesses -> /login?no_business=1
 *  - 1 business  -> /b/[slug]
 *  - 2+          -> /select-business
 */
export async function loginAction(
  _prev: State = initial,
  formData: FormData,
): Promise<State> {
  try {
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    const supabase = await supabaseServer();

    // 1) sign in
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInErr) return { ok: false, error: signInErr.message, next: "" };

    // 2) get user
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) return { ok: false, error: userErr.message, next: "" };
    const user = userData.user;
    if (!user) return { ok: false, error: "No user after login", next: "" };

    // 3) load memberships
    const { data: mems, error: memErr } = await supabase
      .from("memberships")
      .select("business_id, role, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (memErr) return { ok: false, error: memErr.message, next: "" };

    if (!mems || mems.length === 0) {
      return { ok: true, error: "", next: "/login?no_business=1" };
    }

    if (mems.length > 1) {
      return { ok: true, error: "", next: "/select-business" };
    }

    const businessId = mems[0]?.business_id;
    if (!businessId)
      return { ok: true, error: "", next: "/login?no_business=1" };

    const { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .select("slug")
      .eq("id", businessId)
      .limit(1).maybeSingle();

    if (bizErr) return { ok: false, error: bizErr.message, next: "" };
    if (!biz?.slug)
      return { ok: true, error: "", next: "/login?no_business=1" };

    return { ok: true, error: "", next: `/b/${biz.slug}` };
  } catch (e) {
    return { ok: false, error: msg(e), next: "" };
  }
}

/** ✅ REGISTER OWNER:
 * UI отправляет business_name, а slug генерим сами
 */
export async function registerOwnerAction(
  _prev: State = initial,
  formData: FormData,
): Promise<State> {
  try {
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const businessName = String(formData.get("business_name") || "").trim();
    const ownerPhone = String(formData.get("owner_phone") || "").trim();

    if (!businessName) {
      return { ok: false, error: "Введите название бизнеса", next: "" };
    }

    const slug = slugify(businessName);

    const supabase = await supabaseServer();

    // 1) создать auth юзера
    const { error: signUpErr } = await supabase.auth.signUp({ email, password });
    if (signUpErr) return { ok: false, error: signUpErr.message, next: "" };

    // 2) залогиниться сразу (cookies)
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

/** ✅ FORGOT PASSWORD:
 * Отправляем email со ссылкой на /reset-password
 * ВАЖНО: в Supabase должны быть разрешены Redirect URLs:
 *  - http://localhost:3000/reset-password
 *  - https://your-domain/reset-password
 */
export async function forgotPasswordAction(
  _prev: State = initial,
  formData: FormData,
): Promise<State> {
  try {
    const email = String(formData.get("email") || "").trim().toLowerCase();
    if (!email) return { ok: false, error: "Введите email", next: "" };

    const supabase = await supabaseServer();

    const h = await headers();
    const origin = h.get("origin") || "";

    if (!origin) {
      return { ok: false, error: "Не удалось определить origin", next: "" };
    }

    const redirectTo = `${origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) return { ok: false, error: error.message, next: "" };

    // не раскрываем, существует ли email (privacy)
    return { ok: true, error: "", next: "" };
  } catch (e) {
    return { ok: false, error: msg(e), next: "" };
  }
}

/** ✅ UPDATE PASSWORD (после перехода по ссылке из письма)
 * После смены пароля — делаем signOut(), чтобы старая сессия не создавала иллюзию,
 * что “старый пароль” всё ещё подходит.
 */
export async function updatePasswordAction(
  _prev: State = initial,
  formData: FormData,
): Promise<State> {
  try {
    const password = String(formData.get("password") || "");
    const confirm = String(formData.get("password_confirm") || "");

    if (!password || password.length < 6) {
      return { ok: false, error: "Пароль минимум 6 символов", next: "" };
    }
    if (password !== confirm) {
      return { ok: false, error: "Пароли не совпадают", next: "" };
    }

    const supabase = await supabaseServer();

    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { ok: false, error: error.message, next: "" };

    // ✅ важно: сбросить текущую сессию
    await supabase.auth.signOut();

    return { ok: true, error: "", next: "/login?pw=updated" };
  } catch (e) {
    return { ok: false, error: msg(e), next: "" };
  }
}