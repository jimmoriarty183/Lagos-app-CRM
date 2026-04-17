import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

function parseStoragePath(storagePath: string) {
  const [bucket, ...rest] = String(storagePath || "").split("/");
  if (!bucket || rest.length === 0) return null;
  return { bucket, objectPath: rest.join("/") };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ attachmentId: string }> },
) {
  try {
    const { attachmentId } = await context.params;
    if (!attachmentId) {
      return NextResponse.json({ ok: false, error: "attachmentId is required" }, { status: 400 });
    }

    const supabase = await supabaseServer();
    const admin = supabaseAdmin();
    const { searchParams } = new URL(request.url);
    const shouldDownload = searchParams.get("download") === "1";

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: attachment, error: attachmentError } = await admin
      .from("activity_attachments")
      .select("id, business_id, file_name, storage_path")
      .eq("id", attachmentId)
      .maybeSingle();

    if (attachmentError) {
      return NextResponse.json({ ok: false, error: attachmentError.message }, { status: 500 });
    }

    if (!attachment) {
      return NextResponse.json({ ok: false, error: "Attachment not found" }, { status: 404 });
    }

    const { data: membership, error: membershipError } = await admin
      .from("memberships")
      .select("role")
      .eq("business_id", attachment.business_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      return NextResponse.json({ ok: false, error: membershipError.message }, { status: 500 });
    }

    if (!membership) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const parsed = parseStoragePath(attachment.storage_path);
    if (!parsed) {
      return NextResponse.json({ ok: false, error: "Invalid storage path" }, { status: 500 });
    }

    const { data: signed, error: signedError } = await admin.storage
      .from(parsed.bucket)
      .createSignedUrl(parsed.objectPath, 60, shouldDownload ? { download: attachment.file_name } : undefined);

    if (signedError || !signed?.signedUrl) {
      return NextResponse.json({ ok: false, error: signedError?.message || "Failed to create signed URL" }, { status: 500 });
    }

    return NextResponse.redirect(signed.signedUrl, { status: 302 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ attachmentId: string }> },
) {
  try {
    const { attachmentId } = await context.params;
    if (!attachmentId) {
      return NextResponse.json({ ok: false, error: "attachmentId is required" }, { status: 400 });
    }

    const supabase = await supabaseServer();
    const admin = supabaseAdmin();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: attachment, error: attachmentError } = await admin
      .from("activity_attachments")
      .select("id, business_id, storage_path")
      .eq("id", attachmentId)
      .maybeSingle();

    if (attachmentError) {
      return NextResponse.json({ ok: false, error: attachmentError.message }, { status: 500 });
    }

    if (!attachment) {
      return NextResponse.json({ ok: false, error: "Attachment not found" }, { status: 404 });
    }

    const { data: membership, error: membershipError } = await admin
      .from("memberships")
      .select("role")
      .eq("business_id", attachment.business_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      return NextResponse.json({ ok: false, error: membershipError.message }, { status: 500 });
    }

    if (!membership) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const parsed = parseStoragePath(attachment.storage_path);
    if (parsed) {
      await admin.storage.from(parsed.bucket).remove([parsed.objectPath]);
    }

    const { error: deleteError } = await admin
      .from("activity_attachments")
      .delete()
      .eq("id", attachmentId);

    if (deleteError) {
      return NextResponse.json({ ok: false, error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
