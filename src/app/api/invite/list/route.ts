import { NextResponse } from "next/server";
import { supabaseServerReadOnly } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    // поддержим оба варианта параметров
    const businessId =
      url.searchParams.get("businessId") || url.searchParams.get("business_id") || "";

    if (!businessId) {
      return NextResponse.json(
        { ok: false, error: "businessId is required" },
        { status: 400 },
      );
    }

    const supabase = await supabaseServerReadOnly();

    // ВАЖНО: выбираем только существующие поля
    const { data, error } = await supabase
      .from("business_invites")
      .select("id,email,status,created_at") // <-- без expires_at
      .eq("business_id", businessId)
      .eq("role", "MANAGER")
      .eq("status", "PENDING")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      invites: (data ?? []).map((x) => ({
        id: x.id,
        email: x.email,
        status: x.status,
        created_at: x.created_at,
        expires_at: null, // чтобы фронт не ломался, если ждёт поле
      })),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 },
    );
  }
}