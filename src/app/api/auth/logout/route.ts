import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServerAction } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  // Step 1: invalidate the Supabase session — this clears the sb-* auth cookies
  // via the cookie adapter wired into supabaseServerAction. Without this the
  // browser keeps a valid auth token after logout and behaves like a logged-in
  // user on the next request (the "ghost session" bug).
  try {
    const supabase = await supabaseServerAction();
    await supabase.auth.signOut();
  } catch {
    // Continue cookie cleanup even if Supabase signOut fails — we still want
    // a fully cleared response from the legacy MVP cookies below.
  }

  // Step 2: clear legacy phone-MVP cookies that pre-date the Supabase auth.
  const cookieStore = await cookies();

  cookieStore.set("ord_session", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  cookieStore.set("ord_phone", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  cookieStore.set("active_business_slug", "", {
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  cookieStore.set("u", "", {
    path: "/",
    maxAge: 0,
  });

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
