import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const DEFAULT_NEXT = "/app/crm";
const AUTH_NEXT_COOKIE = "ordo_auth_next";

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

  if (!demoEmail) {
    return NextResponse.redirect(new URL("/login?demo_unavailable=1", request.url));
  }

  const callbackUrl = new URL("/login", request.url);
  callbackUrl.searchParams.set("demo", "1");
  callbackUrl.searchParams.set("next", nextPath);

  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: demoEmail,
    options: {
      redirectTo: callbackUrl.toString(),
    },
  });

  const actionLink = data?.properties?.action_link;
  if (error || !actionLink) {
    return NextResponse.redirect(new URL("/login?demo_error=1", request.url));
  }

  const response = NextResponse.redirect(actionLink);
  response.cookies.set({
    name: AUTH_NEXT_COOKIE,
    value: nextPath,
    path: "/",
    maxAge: 60 * 10,
    sameSite: "lax",
    httpOnly: false,
    secure: request.nextUrl.protocol === "https:",
  });
  return response;
}
