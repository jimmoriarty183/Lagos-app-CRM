import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const pathname = url.pathname;

  // Пропускаем статику/next
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  // ✅ /b/* должно открываться если есть ?u=
  if (pathname.startsWith("/b/")) {
    const u = url.searchParams.get("u");
    if (u && /^\d{10,15}$/.test(u)) {
      return NextResponse.next();
    }

    // если нет u — редиректим на login (а не welcome)
    const next = pathname + (url.search ? url.search : "");
    const to = new URL("/login", req.url);
    to.searchParams.set("next", next);
    return NextResponse.redirect(to);
  }

  // Если кто-то всё ещё попадает на /welcome — отправим на /login
  if (pathname === "/welcome") {
    const to = new URL("/login", req.url);
    const next = url.searchParams.get("next");
    const u = url.searchParams.get("u");
    if (u) to.searchParams.set("u", u);
    if (next) to.searchParams.set("next", next);
    return NextResponse.redirect(to);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
