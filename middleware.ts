import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  const bypassReasons: Array<{ path: string; why: string }> = [];

  if (pathname.startsWith("/login")) {
    bypassReasons.push({ path: pathname, why: "login route" });
  }

  if (pathname.startsWith("/invite")) {
    bypassReasons.push({ path: pathname, why: "invite flow route" });
  }

  if (pathname.startsWith("/auth/callback")) {
    bypassReasons.push({ path: pathname, why: "auth callback route" });
  }

  const u = searchParams.get("u");
  if (u && pathname.startsWith("/b/")) {
    bypassReasons.push({ path: pathname, why: "business public bypass with ?u=" });
  }

  if (bypassReasons.length > 0) {
    console.info("[middleware] bypass", bypassReasons);
    return NextResponse.next();
  }

  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            res.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  await supabase.auth.getUser();

  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
