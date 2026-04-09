import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

const DEFAULT_NEXT = "/app/crm";

function resolveNextPath(raw: string | null): string {
  if (!raw) return DEFAULT_NEXT;
  const candidate = raw.trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return DEFAULT_NEXT;
  }
  return candidate;
}

export async function GET(request: NextRequest) {
  const nextPath = resolveNextPath(request.nextUrl.searchParams.get("next"));

  const demoEmail = process.env.DEMO_ACCOUNT_EMAIL?.trim().toLowerCase() || "";
  const demoPassword = process.env.DEMO_ACCOUNT_PASSWORD?.trim() || "";

  if (!demoEmail || !demoPassword) {
    return NextResponse.redirect(new URL("/login?demo_unavailable=1", request.url));
  }

  const supabase = await supabaseServer();

  // Always reset previous session to guarantee deterministic demo login.
  await supabase.auth.signOut();

  const { error } = await supabase.auth.signInWithPassword({
    email: demoEmail,
    password: demoPassword,
  });

  if (error) {
    return NextResponse.redirect(new URL("/login?demo_error=1", request.url));
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const signedInEmail = userData.user?.email?.trim().toLowerCase() || "";
  if (userError || signedInEmail !== demoEmail) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?demo_error=1", request.url));
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}
