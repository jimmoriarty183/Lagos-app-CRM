import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import { normalizePhone } from "@/lib/phone";

function safePath(input: unknown): string {
  const s = typeof input === "string" ? input : "";
  return s.startsWith("/") ? s : "/";
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));

  const phoneRaw = String(body?.phone || "");
  const phone = normalizePhone(phoneRaw);

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
  const { data, error } = await supabase
    .from("businesses")
    .select("slug")
    .or(`owner_phone.eq.${phone},manager_phone.eq.${phone}`)
    .limit(1)
    .maybeSingle();

  if (!error && data?.slug) {
    return NextResponse.json({ phone, redirectTo: `/b/${data.slug}` });
  }

  return NextResponse.json({ phone, redirectTo: "/" });
}
