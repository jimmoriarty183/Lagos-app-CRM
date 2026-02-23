import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // 🚫 НЕ обрабатываем login вообще
  if (pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  // 🚫 MVP bypass — если есть ?u=, не трогаем auth
  const u = searchParams.get("u");
  if (u && pathname.startsWith("/b/")) {
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
    }
  );

  // только для реальной auth-логики
  await supabase.auth.getUser();

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};