import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServerAction } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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

  // Native HTML form submits and direct URL hits don't ask for JSON. Without
  // a redirect they'd land on a raw {"ok":true} page (the "black screen"
  // bug). sec-fetch-dest is "empty" for fetch()/XHR callers and "document"
  // for navigations/form submits — use that to decide whether to JSON or
  // redirect. Fall back to Accept/XHR sniffing for callers that don't send
  // sec-fetch-dest (older browsers, some test runners).
  const fetchDest = request.headers.get("sec-fetch-dest");
  const accept = request.headers.get("accept") ?? "";
  const requestedWith = request.headers.get("x-requested-with") ?? "";
  const isProgrammatic = fetchDest
    ? fetchDest === "empty"
    : accept.includes("application/json") ||
      requestedWith.toLowerCase() === "xmlhttprequest";

  if (!isProgrammatic) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl, {
      status: 303,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}

// GET handler covers the case where a user (or a stale link) hits the URL
// directly in a browser. Same redirect-to-/login behavior, no cookie wipe
// here — POST is the canonical path that clears auth state.
export async function GET(request: Request) {
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl, {
    status: 303,
    headers: { "Cache-Control": "no-store" },
  });
}
