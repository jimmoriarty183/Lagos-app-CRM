"use server";

import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createBusinessForOwner } from "@/lib/businesses/business-create-service";
import { BUSINESS_LIMIT_REACHED_CODE } from "@/lib/businesses/errors";

type State = { ok: boolean; error: string; errorCode?: string; next: string };
const initial: State = { ok: false, error: "", errorCode: undefined, next: "" };

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

function isConfirmationEmailDeliveryError(message: string) {
  const lowered = message.toLowerCase();
  return (
    lowered.includes("error sending confirmation email") ||
    (lowered.includes("confirmation") &&
      lowered.includes("email") &&
      lowered.includes("error sending"))
  );
}

function isEmailNotConfirmedError(message: string) {
  const lowered = message.toLowerCase();
  return lowered.includes("email not confirmed") || lowered.includes("email_not_confirmed");
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
    const next = String(formData.get("next") || "").trim();
    const safeNext =
      next.startsWith("/") && !next.startsWith("//") ? next : "";

    const supabase = await supabaseServer();

    // 1) sign in
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInErr) {
      if (isEmailNotConfirmedError(signInErr.message)) {
        return {
          ok: false,
          error: "Email is not confirmed. Please open the confirmation link in your inbox and then sign in.",
          next: "",
        };
      }
      return { ok: false, error: signInErr.message, next: "" };
    }

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

    if (safeNext) {
      return { ok: true, error: "", next: safeNext };
    }

    // 3) load memberships
    const { data: mems, error: memErr } = await supabase
      .from("memberships")
      .select("business_id, role, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (memErr) return { ok: false, error: memErr.message, next: "" };

    if (!mems || mems.length === 0) {
      // No business yet. Whether or not they have a Paddle account, the
      // owner must first create a business (with the auto-trial). The plan
      // picker comes after creation so the user is in a logged-in cabinet
      // with their email visible — never on the public /pricing page.
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

    const firstName = String(formData.get("first_name") || "").trim();
    const lastName = String(formData.get("last_name") || "").trim();

    const agree = String(formData.get("agree") || ""); // expected: "on"
    const next = String(formData.get("next") || "").trim();
    const safeNext =
      next.startsWith("/") && !next.startsWith("//") ? next : "";

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

    const fullName = `${firstName} ${lastName}`.trim();

    const supabase = await supabaseServer();
    const h = await headers();
    const origin =
      h.get("origin") ||
      (() => {
        const proto = h.get("x-forwarded-proto");
        const host = h.get("x-forwarded-host");
        if (!proto || !host) return "";
        return `${proto}://${host}`;
      })();
    const redirectBase =
      origin ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "";
    const emailRedirectTo = (() => {
      if (!redirectBase) return undefined;
      try {
        // Encode where /auth/callback should land after exchanging the code.
        // Without this, /auth/callback defaults to /app/crm which then
        // re-redirects to /onboarding/business (no workspace) — a needless
        // double-hop that flashes the CRM shell. Sending them directly to
        // /onboarding/business or to the saved Buy intent feels instant.
        const callback = new URL("/auth/callback", redirectBase);
        const desiredNext = safeNext || "/onboarding/business";
        callback.searchParams.set("next", desiredNext);
        return callback.toString();
      } catch {
        return undefined;
      }
    })();

    const signUpOptions: {
      data: { first_name: string; last_name: string; full_name: string };
      emailRedirectTo?: string;
    } = {
      data: { first_name: firstName, last_name: lastName, full_name: fullName },
    };
    if (emailRedirectTo) signUpOptions.emailRedirectTo = emailRedirectTo;

    const { error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: signUpOptions,
    });

    if (signUpErr) {
      if (isConfirmationEmailDeliveryError(signUpErr.message)) {
        return {
          ok: false,
          error: "Could not send confirmation email. Please try again in a minute or contact support.",
          next: "",
        };
      }
      return { ok: false, error: signUpErr.message, next: "" };
    }

    const { data: signedInData } = await supabase.auth.getUser();
    if (signedInData.user) {
      // Fresh signups go straight to business creation (the auto-trial in
      // resolveMaxBusinessesEntitlement lets them create their first business
      // without a Paddle subscription). After creation the form forwards them
      // to /onboarding/plan to subscribe with their email clearly visible.
      return {
        ok: true,
        error: "",
        next: safeNext || "/onboarding/business",
      };
    }

    // Access may require email confirmation in some environments.
    const loginRedirect = safeNext
      ? `/login?check_email=1&next=${encodeURIComponent(safeNext)}`
      : "/login?check_email=1";
    return { ok: true, error: "", next: loginRedirect };

  } catch (e) {
    return { ok: false, error: msg(e), next: "" };
  }
}

/** ✅ FORGOT PASSWORD:
 * Отправляем email со ссылкой на /auth/confirm, где recovery token
 * провалидаируется серверно через verifyOtp(), а потом идёт редирект
 * на /reset-password с уже установленной recovery session.
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

    const redirectTo = `${origin}/auth/confirm?next=%2Freset-password`;

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

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) return { ok: false, error: sessionError.message, next: "" };
    if (!sessionData.session) {
      return {
        ok: false,
        error: "Recovery session is missing or expired. Open the reset link from the latest email and try again.",
        next: "",
      };
    }

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
        .select("id, slug, name")
        .in("id", businessIds);
      if (businessErr) return { ok: false, error: businessErr.message, next: "" };

      const linkedBusiness = (businessRows ?? []).find(
        (business) => String(business.slug ?? "").trim().length > 0,
      );
      if (linkedBusiness) {
        const linkedBusinessId = String(linkedBusiness.id ?? "").trim();
        const currentName = String(linkedBusiness.name ?? "").trim();
        if (linkedBusinessId && currentName !== businessName) {
          // Idempotent overwrite protects against accidental concatenation/duplication.
          const { error: updateNameErr } = await admin
            .from("businesses")
            .update({ name: businessName })
            .eq("id", linkedBusinessId);
          if (updateNameErr && !isMissingColumnError(updateNameErr.message)) {
            return { ok: false, error: updateNameErr.message, next: "" };
          }
        }
        return { ok: true, error: "", next: "/app/crm" };
      }
    }

    const createResult = await createBusinessForOwner({
      supabase,
      admin,
      userId: user.id,
      businessName,
    });
    if (!createResult.ok) {
      return {
        ok: false,
        error: createResult.error.message,
        errorCode:
          createResult.error.code === BUSINESS_LIMIT_REACHED_CODE
            ? BUSINESS_LIMIT_REACHED_CODE
            : undefined,
        next: "",
      };
    }

    return { ok: true, error: "", next: "/app/crm" };
  } catch (e) {
    return { ok: false, error: msg(e), next: "" };
  }
}


