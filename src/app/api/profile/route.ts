import { NextResponse } from "next/server";

import { loadUserProfileSafe } from "@/lib/profile";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

function cleanText(value: unknown, maxLength: number) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function normalizeBirthDate(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const parsed = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return raw;
}

function parseMissingColumn(message: string) {
  const fromMissing = message.match(/Could not find the '([^']+)' column/i)?.[1];
  if (fromMissing) return String(fromMissing).toLowerCase();
  const fromDoesNotExist = message.match(/column ["']?([a-zA-Z0-9_]+)["']? does not exist/i)?.[1];
  if (fromDoesNotExist) return String(fromDoesNotExist).toLowerCase();
  return null;
}

async function updateProfileSafe(
  admin: ReturnType<typeof supabaseAdmin>,
  userId: string,
  payload: Record<string, unknown>,
) {
  const working = { ...payload };
  for (let i = 0; i < 8; i += 1) {
    const { error } = await admin
      .from("profiles")
      .upsert({ id: userId, ...working }, { onConflict: "id" });
    if (!error) return { ok: true as const };

    const missing = parseMissingColumn(String(error.message ?? ""));
    if (!missing || !(missing in working)) {
      return { ok: false as const, error: error.message };
    }
    delete working[missing];
  }

  return { ok: false as const, error: "Failed to update profile" };
}

export async function GET() {
  try {
    const supabase = await supabaseServer();
    const admin = supabaseAdmin();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const profile = await loadUserProfileSafe(admin, user.id);
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await supabaseServer();
    const admin = supabaseAdmin();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const firstName = cleanText(body?.firstName, 80);
    const lastName = cleanText(body?.lastName, 80);
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() || null;
    const phone = cleanText(body?.phone, 64);
    const birthDate = normalizeBirthDate(body?.birthDate);
    const bio = cleanText(body?.bio, 1000);

    const payload: Record<string, unknown> = {
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      phone,
      birth_date: birthDate,
      bio,
      email: user.email ?? null,
    };

    const updateResult = await updateProfileSafe(admin, user.id, payload);
    if (!updateResult.ok) {
      return NextResponse.json({ ok: false, error: updateResult.error }, { status: 500 });
    }

    await supabase.auth.updateUser({
      data: {
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
      },
    });

    const profile = await loadUserProfileSafe(admin, user.id);
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
