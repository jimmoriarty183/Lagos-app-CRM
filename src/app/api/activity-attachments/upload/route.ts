import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

const ACTIVITY_ATTACHMENT_BUCKET = "activity-attachments";

async function ensureAttachmentBucket() {
  const admin = supabaseAdmin();
  const { data: existing, error: existingError } = await admin.storage.getBucket(ACTIVITY_ATTACHMENT_BUCKET);

  if (existing && !existingError) {
    return admin;
  }

  const { error } = await admin.storage.createBucket(ACTIVITY_ATTACHMENT_BUCKET, {
    public: false,
    fileSizeLimit: 20 * 1024 * 1024,
  });

  if (!error) return admin;

  if (/already exists|duplicate/i.test(String(error.message || ""))) {
    return admin;
  }

  const { data: created } = await admin.storage.getBucket(ACTIVITY_ATTACHMENT_BUCKET);
  if (created) {
    return admin;
  }

  throw error;
}

function sanitizeFileName(value: string) {
  return value.replace(/[^\w.\-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "attachment";
}

function buildAttachmentObjectPath(businessId: string, orderId: string, fileName: string) {
  const unique = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${businessId}/orders/${orderId}/${unique}-${sanitizeFileName(fileName)}`;
}

export async function POST(request: Request) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const businessId = String(formData.get("businessId") || "").trim();
    const orderId = String(formData.get("orderId") || "").trim();
    const fileEntry = formData.get("file");

    if (!businessId || !orderId || !(fileEntry instanceof File)) {
      return NextResponse.json({ ok: false, error: "businessId, orderId, and file are required" }, { status: 400 });
    }

    const admin = await ensureAttachmentBucket();
    const { data: membership, error: membershipError } = await admin
      .from("memberships")
      .select("role")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      return NextResponse.json({ ok: false, error: membershipError.message }, { status: 500 });
    }

    if (!membership) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const objectPath = buildAttachmentObjectPath(businessId, orderId, fileEntry.name);
    const storagePath = `${ACTIVITY_ATTACHMENT_BUCKET}/${objectPath}`;

    const { error: uploadError } = await admin.storage.from(ACTIVITY_ATTACHMENT_BUCKET).upload(objectPath, fileEntry, {
      cacheControl: "3600",
      upsert: false,
      contentType: fileEntry.type || undefined,
    });

    if (uploadError) {
      return NextResponse.json({ ok: false, error: uploadError.message }, { status: 500 });
    }

    const { data, error } = await admin
      .from("activity_attachments")
      .insert({
        business_id: businessId,
        entity_type: "order",
        entity_id: orderId,
        order_id: orderId,
        uploaded_by: user.id,
        file_name: fileEntry.name,
        storage_path: storagePath,
        mime_type: fileEntry.type || null,
        file_size: fileEntry.size,
        extra: null,
      })
      .select("id, business_id, entity_type, entity_id, order_id, uploaded_by, file_name, storage_path, mime_type, file_size, extra, created_at")
      .single();

    if (error || !data) {
      return NextResponse.json({ ok: false, error: error?.message || "Failed to insert attachment metadata." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, attachment: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
