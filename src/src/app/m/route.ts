import { NextResponse } from "next/server";

export function GET(request: Request) {
  const url = new URL(request.url);
  const phone = (url.searchParams.get("phone") || "").trim();

  if (!phone) {
    return NextResponse.redirect(new URL("/m", request.url));
  }

  return NextResponse.redirect(
    new URL(`/m/${encodeURIComponent(phone)}`, request.url)
  );
}
