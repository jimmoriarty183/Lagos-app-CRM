import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isAuthed(req: NextRequest) {
  // MVP auth cookie (ставится после /api/auth/login)
  const phone = req.cookies.get("ord_phone")?.value;
  return Boolean(phone && phone.trim().length > 0);
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // 1) Всегда пропускаем next internals / api / public files
  const isAlwaysPublic =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/public");

  if (isAlwaysPublic) return NextResponse.next();

  // 2) Публичные страницы сайта
  const isPublicPage =
    pathname === "/" ||
    pathname.startsWith("/welcome") ||
    pathname.startsWith("/pricing");

  if (isPublicPage) return NextResponse.next();

  // 3) Защищаем только /b/*
  const isProtected = pathname.startsWith("/b/");
  if (!isProtected) return NextResponse.next();

  // 4) Если авторизован — пускаем
  if (isAuthed(req)) return NextResponse.next();

  // 5) Иначе — редирект на /welcome?next=...
  const url = req.nextUrl.clone();
  url.pathname = "/welcome";
  url.searchParams.set("next", pathname + (search || ""));
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
