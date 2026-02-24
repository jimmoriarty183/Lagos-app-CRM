import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    },
  );

  const url = new URL(req.url);

  // invite flow
  const inviteId = url.searchParams.get("invite_id") || "";

  // PKCE / OAuth code
  const code = url.searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(
        new URL(
          inviteId ? `/invite?invite_id=${encodeURIComponent(inviteId)}` : "/",
          url.origin,
        ),
      );
    }
  }

  // если вдруг пришёл без code — отправляем на логин
  return NextResponse.redirect(new URL("/login?callback_failed=1", url.origin));
}