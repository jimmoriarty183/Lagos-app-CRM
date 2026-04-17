import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // Public routes should remain fully accessible for SEO and checkout compliance.
  if (
    pathname === "/" ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/refund") ||
    pathname.startsWith("/demo") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/invite") ||
    pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }

  // 🚫 MVP bypass — если есть ?u=, не трогаем auth
  const u = searchParams.get("u");
  if (u && pathname.startsWith("/b/")) {
    const bypassRes = NextResponse.next();
    const slugMatch = pathname.match(/^\/b\/([^/]+)/);
    if (slugMatch) {
      const slug = decodeURIComponent(slugMatch[1]);
      if (slug && req.cookies.get("active_business_slug")?.value !== slug) {
        bypassRes.cookies.set("active_business_slug", slug, {
          path: "/",
          maxAge: 60 * 60 * 24 * 365,
          sameSite: "lax",
        });
      }
    }
    return bypassRes;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // preview/deploy safety: don't crash middleware when env is not ready
  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.next();
  }

  const res = NextResponse.next();

  const businessSlugMatch = pathname.match(/^\/b\/([^/]+)/);
  if (businessSlugMatch) {
    const slug = decodeURIComponent(businessSlugMatch[1]);
    if (slug && req.cookies.get("active_business_slug")?.value !== slug) {
      res.cookies.set("active_business_slug", slug, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
    }
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
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
  });

  // только для реальной auth-логики
  await supabase.auth.getUser();

  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
