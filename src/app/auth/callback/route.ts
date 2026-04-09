import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

const SUPABASE_DEBUG = process.env.SUPABASE_DEBUG === "1";

function resolveNextPath(raw: string | null): string {
  if (!raw) return "/app/crm";
  const candidate = raw.trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return "/app/crm";
  }
  return candidate;
}

function debugLog(message: string, payload?: Record<string, unknown>) {
  if (!SUPABASE_DEBUG) return;
  console.log(`[supabase-debug][auth/callback] ${message}`, payload ?? {});
}

export async function GET(req: NextRequest) {
  const supabase = await supabaseServer();

  const url = new URL(req.url);

  // invite flow
  const inviteId = url.searchParams.get("invite_id") || "";
  const code = url.searchParams.get("code");
  const nextPath = resolveNextPath(url.searchParams.get("next"));
  const isDemoFlow = url.searchParams.get("demo") === "1";
  const demoEmail = process.env.DEMO_ACCOUNT_EMAIL?.trim().toLowerCase() || "";
  debugLog("request received", {
    inviteIdPresent: Boolean(inviteId),
    codePresent: Boolean(code),
    isDemoFlow,
    nextPath,
  });

  // PKCE / OAuth code
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    const { data: sessionData } = await supabase.auth.getSession();
    const { data: userData } = await supabase.auth.getUser();

    debugLog("exchange result", {
      exchangeError: error?.message ?? null,
      hasSession: Boolean(sessionData.session),
      userId: userData.user?.id ?? null,
    });

    if (!error) {
      const signedInEmail = userData.user?.email?.trim().toLowerCase() || "";

      if (isDemoFlow && (!demoEmail || signedInEmail !== demoEmail)) {
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL("/login?demo_error=1", url.origin));
      }

      return NextResponse.redirect(
        new URL(
          inviteId
            ? `/invite?invite_id=${encodeURIComponent(inviteId)}`
            : nextPath,
          url.origin,
        ),
      );
    }

    console.error("[supabase-auth-callback] exchangeCodeForSession failed", {
      error: error.message,
    });
  }

  // если вдруг пришёл без code — отправляем на логин
  return NextResponse.redirect(
    new URL(isDemoFlow ? "/login?demo_error=1" : "/login?callback_failed=1", url.origin),
  );
}
