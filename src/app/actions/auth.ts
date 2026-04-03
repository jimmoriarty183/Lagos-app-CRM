"use server";

import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isBusinessSegment } from "@/lib/business-segments";

type State = { ok: boolean; error: string; next: string };
const initial: State = { ok: false, error: "", next: "" };

function msg(e: unknown) {
  if (e && typeof e === "object") {
    const maybeError = e as { message?: string; error_description?: string };
    return maybeError.message || maybeError.error_description || "Unknown error";
  }
  return "Unknown error";
}

function isMissingColumnError(message: string) {
  const lowered = message.toLowerCase();
  return lowered.includes("column") && (lowered.includes("does not exist") || lowered.includes("schema cache"));
}

function isDuplicateValueError(message: string) {
  const lowered = message.toLowerCase();
  return (
    lowered.includes("duplicate key") ||
    lowered.includes("already exists") ||
    lowered.includes("unique constraint") ||
    lowered.includes("violates unique")
  );
}

function isBrokenRpcTriggerError(message: string) {
  const lowered = message.toLowerCase();
  return lowered.includes("record \"new\" has no field \"business_id\"");
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

type BusinessCreateResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

async function updateBusinessMetadata(
  admin: ReturnType<typeof supabaseAdmin>,
  slug: string,
  input: { businessName?: string; businessSegment?: string },
) {
  const name = String(input.businessName ?? "").trim();
  const segment = String(input.businessSegment ?? "").trim();

  if (name) {
    const { error } = await admin
      .from("businesses")
      .update({ name })
      .eq("slug", slug);
    if (error && !isMissingColumnError(error.message)) {
      return { ok: false as const, error: error.message };
    }
  }

  if (segment) {
    const { error } = await admin
      .from("businesses")
      .update({ business_segment: segment })
      .eq("slug", slug);
    if (error && !isMissingColumnError(error.message)) {
      return { ok: false as const, error: error.message };
    }
  }

  return { ok: true as const };
}

async function createBusinessWithFallback(params: {
  supabase: Awaited<ReturnType<typeof supabaseServer>>;
  admin: ReturnType<typeof supabaseAdmin>;
  userId: string;
  businessName: string;
  businessSegment?: string;
}): Promise<BusinessCreateResult> {
  const { supabase, admin, userId, businessName, businessSegment } = params;
  const baseSlug = slugify(businessName);

  for (let attempt = 0; attempt < 7; attempt += 1) {
    const slugCandidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 2}`;
    const { error: rpcErr } = await supabase.rpc("create_business_with_owner", {
      p_slug: slugCandidate,
      p_owner_phone: null,
      p_manager_phone: null,
    });

    if (!rpcErr) {
      const updateResult = await updateBusinessMetadata(admin, slugCandidate, {
        businessName,
        businessSegment,
      });
      if (!updateResult.ok) return { ok: false, error: updateResult.error };
      return { ok: true, slug: slugCandidate };
    }

    if (rpcErr.code === "23505" || isDuplicateValueError(rpcErr.message)) {
      continue;
    }

    if (!isBrokenRpcTriggerError(rpcErr.message)) {
      return { ok: false, error: rpcErr.message };
    }

    // Fallback for broken DB RPC/trigger: create business and membership directly.
    const { data: createdBusiness, error: createBusinessErr } = await admin
      .from("businesses")
      .insert({ slug: slugCandidate, name: businessName })
      .select("id, slug")
      .single();

    if (createBusinessErr) {
      if (createBusinessErr.code === "23505" || isDuplicateValueError(createBusinessErr.message)) {
        continue;
      }
      if (isMissingColumnError(createBusinessErr.message)) {
        const { data: fallbackBusiness, error: fallbackErr } = await admin
          .from("businesses")
          .insert({ slug: slugCandidate })
          .select("id, slug")
          .single();
        if (fallbackErr) return { ok: false, error: fallbackErr.message };

        const businessId = String(fallbackBusiness?.id ?? "").trim();
        if (!businessId) return { ok: false, error: "Business created without id" };

        const { error: membershipErr } = await admin.from("memberships").upsert(
          { business_id: businessId, user_id: userId, role: "OWNER" },
          { onConflict: "business_id,user_id" },
        );
        if (membershipErr) return { ok: false, error: membershipErr.message };

        const updateResult = await updateBusinessMetadata(admin, slugCandidate, {
          businessName,
          businessSegment,
        });
        if (!updateResult.ok) return { ok: false, error: updateResult.error };
        return { ok: true, slug: slugCandidate };
      }
      return { ok: false, error: createBusinessErr.message };
    }

    const businessId = String(createdBusiness?.id ?? "").trim();
    if (!businessId) return { ok: false, error: "Business created without id" };

    const { error: membershipErr } = await admin.from("memberships").upsert(
      { business_id: businessId, user_id: userId, role: "OWNER" },
      { onConflict: "business_id,user_id" },
    );
    if (membershipErr) return { ok: false, error: membershipErr.message };

    const updateResult = await updateBusinessMetadata(admin, slugCandidate, {
      businessName,
      businessSegment,
    });
    if (!updateResult.ok) return { ok: false, error: updateResult.error };

    return { ok: true, slug: slugCandidate };
  }

  return {
    ok: false,
    error: "Could not create business. Try a slightly different name.",
  };
}

/** ✅ LOGIN (multi-business):
 *  - 0 businesses -> /onboarding/business
 *  - 1 business  -> /app/crm
 *  - 2+          -> /select-business
 */
export async function loginAction(
  _prev: State = initial,
  formData: FormData,
): Promise<State> {
  try {
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const inviteId = String(formData.get("invite_id") || "").trim();

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

    if (inviteId) {
      return {
        ok: true,
        error: "",
        next: `/invite?invite_id=${encodeURIComponent(inviteId)}`,
      };
    }

    // 3) load memberships
    const { data: mems, error: memErr } = await supabase
      .from("memberships")
      .select("business_id, role, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (memErr) return { ok: false, error: memErr.message, next: "" };

    if (!mems || mems.length === 0) {
      return { ok: true, error: "", next: "/onboarding/business" };
    }

    if (mems.length > 1) {
      return { ok: true, error: "", next: "/select-business" };
    }

    const businessId = mems[0]?.business_id;
    if (!businessId)
      return { ok: true, error: "", next: "/onboarding/business" };

    const { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .select("slug")
      .eq("id", businessId)
      .limit(1).maybeSingle();

    if (bizErr) return { ok: false, error: bizErr.message, next: "" };
    if (!biz?.slug)
      return { ok: true, error: "", next: "/onboarding/business" };

    return { ok: true, error: "", next: "/app/crm" };
  } catch (e) {
    return { ok: false, error: msg(e), next: "" };
  }
}

export async function registerOwnerAction(
  _prev: State = initial,
  formData: FormData,
): Promise<State> {
  try {
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");
    const passwordConfirm = String(formData.get("password_confirm") || "");
    const businessName = String(formData.get("business_name") || "").trim();
    const businessSegment = String(formData.get("business_segment") || "").trim();

    const firstName = String(formData.get("first_name") || "").trim();
    const lastName = String(formData.get("last_name") || "").trim();

    const agree = String(formData.get("agree") || ""); // expected: "on"
    const inviteId = String(formData.get("invite_id") || "").trim();

    // ✅ validations
    if (!email) return { ok: false, error: "Email is required", next: "" };
    if (!password || password.length < 6)
      return { ok: false, error: "Password must be at least 6 characters", next: "" };
    if (password !== passwordConfirm)
      return { ok: false, error: "Passwords do not match", next: "" };
    if (!firstName) return { ok: false, error: "First name is required", next: "" };
    if (!lastName) return { ok: false, error: "Last name is required", next: "" };
    if (agree !== "on")
      return { ok: false, error: "Please accept Terms & Privacy Policy", next: "" };

    if (businessSegment && !isBusinessSegment(businessSegment)) {
      return { ok: false, error: "Select a valid business segment", next: "" };
    }

    const fullName = `${firstName} ${lastName}`.trim();

    const supabase = await supabaseServer();
    const admin = supabaseAdmin();

    // 1) sign up
    const { error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName, full_name: fullName },
      },
    });
    if (signUpErr) return { ok: false, error: signUpErr.message, next: "" };

    // 2) sign in (sets cookies)
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInErr) return { ok: false, error: signInErr.message, next: "" };

    // 3) ✅ ensure profiles row exists (NO trigger needed)
    const { data: u, error: uErr } = await supabase.auth.getUser();
    if (uErr) return { ok: false, error: uErr.message, next: "" };

    const user = u?.user;
    if (!user) return { ok: false, error: "No user after sign in", next: "" };

    const { error: profErr } = await admin.from("profiles").upsert(
      {
        id: user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
      },
      { onConflict: "id" },
    );
    if (profErr) return { ok: false, error: profErr.message, next: "" };

    // 4) invite flow
    if (inviteId) {
      return {
        ok: true,
        error: "",
        next: `/invite?invite_id=${encodeURIComponent(inviteId)}`,
      };
    }

    if (!businessName) {
      return { ok: true, error: "", next: "/onboarding/business" };
    }

    const createResult = await createBusinessWithFallback({
      supabase,
      admin,
      userId: user.id,
      businessName,
      businessSegment,
    });
    if (!createResult.ok) return { ok: false, error: createResult.error, next: "" };

    return { ok: true, error: "", next: "/app/crm" };
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

export async function createBusinessOnboardingAction(
  _prev: State = initial,
  formData: FormData,
): Promise<State> {
  try {
    const businessName = String(formData.get("business_name") || "").trim();
    if (!businessName) {
      return { ok: false, error: "Business name is required", next: "" };
    }

    const supabase = await supabaseServer();
    const admin = supabaseAdmin();

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) return { ok: false, error: userErr.message, next: "" };
    const user = userData.user;
    if (!user) return { ok: false, error: "Please sign in again", next: "/login" };

    const { data: membershipRows, error: membershipErr } = await admin
      .from("memberships")
      .select("business_id")
      .eq("user_id", user.id);
    if (membershipErr) return { ok: false, error: membershipErr.message, next: "" };

    const businessIds = (membershipRows ?? [])
      .map((row) => String(row.business_id ?? "").trim())
      .filter(Boolean);

    if (businessIds.length > 0) {
      const { data: businessRows, error: businessErr } = await admin
        .from("businesses")
        .select("id, slug")
        .in("id", businessIds);
      if (businessErr) return { ok: false, error: businessErr.message, next: "" };

      const hasLinkedBusiness = (businessRows ?? []).some(
        (business) => String(business.slug ?? "").trim().length > 0,
      );
      if (hasLinkedBusiness) {
        return { ok: true, error: "", next: "/app/crm" };
      }
    }

    const createResult = await createBusinessWithFallback({
      supabase,
      admin,
      userId: user.id,
      businessName,
    });
    if (!createResult.ok) return { ok: false, error: createResult.error, next: "" };

    return { ok: true, error: "", next: "/app/crm" };
  } catch (e) {
    return { ok: false, error: msg(e), next: "" };
  }
}
