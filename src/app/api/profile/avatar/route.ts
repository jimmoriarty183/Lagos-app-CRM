import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

const PROFILE_AVATAR_BUCKET = "profile-avatars";
const MAX_FILE_BYTES = 5 * 1024 * 1024;

function sanitizeFileName(value: string) {
  return value.replace(/[^\w.\-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "avatar";
}

function parseMissingColumn(message: string) {
  const fromMissing = message.match(/Could not find the '([^']+)' column/i)?.[1];
  if (fromMissing) return String(fromMissing).toLowerCase();
  const fromDoesNotExist = message.match(/column ["']?([a-zA-Z0-9_]+)["']? does not exist/i)?.[1];
  if (fromDoesNotExist) return String(fromDoesNotExist).toLowerCase();
  return null;
}

async function ensureAvatarBucket(admin: ReturnType<typeof supabaseAdmin>) {
  const { data: existing, error: existingError } = await admin.storage.getBucket(PROFILE_AVATAR_BUCKET);
  if (existing && !existingError) return;

  const { error } = await admin.storage.createBucket(PROFILE_AVATAR_BUCKET, {
    public: true,
    fileSizeLimit: MAX_FILE_BYTES,
  });

  if (!error) return;
  if (/already exists|duplicate/i.test(String(error.message || ""))) return;

  const { data: created } = await admin.storage.getBucket(PROFILE_AVATAR_BUCKET);
  if (created) return;
  throw error;
}

async function updateAvatarSafe(
  admin: ReturnType<typeof supabaseAdmin>,
  userId: string,
  avatarUrl: string,
) {
  const payload: Record<string, unknown> = { avatar_url: avatarUrl };
  for (let i = 0; i < 4; i += 1) {
    const { error } = await admin
      .from("profiles")
      .upsert({ id: userId, ...payload }, { onConflict: "id" });
    if (!error) return { ok: true as const };
    const missing = parseMissingColumn(String(error.message ?? ""));
    if (!missing || !(missing in payload)) return { ok: false as const, error: error.message };
    delete payload[missing];
  }
  return { ok: false as const, error: "Failed to update avatar" };
}

export async function POST(request: Request) {
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

    const formData = await request.formData();
    const fileEntry = formData.get("file");
    if (!(fileEntry instanceof File)) {
      return NextResponse.json({ ok: false, error: "Image file is required" }, { status: 400 });
    }

    const contentType = String(fileEntry.type || "").toLowerCase();
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ ok: false, error: "Only image files are allowed" }, { status: 400 });
    }

    if (fileEntry.size > MAX_FILE_BYTES) {
      return NextResponse.json({ ok: false, error: "Image is too large (max 5MB)" }, { status: 400 });
    }

    await ensureAvatarBucket(admin);

    const unique = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const objectPath = `${user.id}/${unique}-${sanitizeFileName(fileEntry.name)}`;

    const { error: uploadError } = await admin.storage.from(PROFILE_AVATAR_BUCKET).upload(objectPath, fileEntry, {
      cacheControl: "3600",
      upsert: true,
      contentType: contentType || undefined,
    });

    if (uploadError) {
      return NextResponse.json({ ok: false, error: uploadError.message }, { status: 500 });
    }

    const { data: publicData } = admin.storage.from(PROFILE_AVATAR_BUCKET).getPublicUrl(objectPath);
    const avatarUrl = String(publicData.publicUrl || "").trim();
    if (!avatarUrl) {
      return NextResponse.json({ ok: false, error: "Could not resolve avatar URL" }, { status: 500 });
    }

    const updateResult = await updateAvatarSafe(admin, user.id, avatarUrl);
    if (!updateResult.ok) {
      return NextResponse.json({ ok: false, error: updateResult.error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, avatarUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
