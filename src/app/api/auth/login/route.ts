import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServerReadOnly } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/phone";

const SUPABASE_DEBUG = process.env.SUPABASE_DEBUG === "1";

function debugLog(message: string, payload?: Record<string, unknown>) {
  if (!SUPABASE_DEBUG) return;
  console.log(`[supabase-debug][api/auth/login] ${message}`, payload ?? {});
}

function safePath(input: unknown): string {
  const s = typeof input === "string" ? input : "";
  return s.startsWith("/") ? s : "/";
}

export async function POST(req: Request) {
  const body: Record<string, unknown> = await req.json().catch(() => ({}));

  const phoneRaw = String(body?.phone || "");
  const phone = normalizePhone(phoneRaw);
  debugLog("request payload parsed", {
    hasPhone: Boolean(phone),
    next: safePath(body?.next),
  });

  if (!phone) {
    return NextResponse.json({ error: "Invalid phone format" }, { status: 400 });
  }

  const next = safePath(body?.next);

  const cookieStore = await cookies();
  cookieStore.set("ord_session", phone, { httpOnly: true, sameSite: "lax", path: "/" });
  cookieStore.set("ord_phone", phone, { httpOnly: true, sameSite: "lax", path: "/" });

  // если next задан и не "/" — ведём туда
  if (next && next !== "/") {
    return NextResponse.json({ phone, redirectTo: next });
  }

  // иначе ищем бизнес по телефону (под твою схему, возможно нужно поменять поля!)
  try {
    const supabase = await supabaseServerReadOnly();
    const [{ data: sessionData }, { data: userData }] = await Promise.all([
      supabase.auth.getSession(),
      supabase.auth.getUser(),
    ]);
    debugLog("auth context", {
      hasSession: Boolean(sessionData.session),
      userId: userData.user?.id ?? null,
    });

    const { data, error } = await supabase
      .from("businesses")
      .select("slug")
      .or(`owner_phone.eq.${phone},manager_phone.eq.${phone}`)
      .limit(1)
      .maybeSingle();

    if (error) {
      debugLog("business lookup failed", { error: error.message });
      console.error("[api/auth/login] businesses lookup failed", {
        phone,
        error: error.message,
      });
    } else if (data?.slug) {
      debugLog("business lookup success", { slug: data.slug });
      return NextResponse.json({ phone, redirectTo: `/b/${data.slug}` });
    }
  } catch (error) {
    console.error("[api/auth/login] supabase init failed", { error });
  }

  return NextResponse.json({ phone, redirectTo: "/" });
}
