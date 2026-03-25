import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { SUPPORT_ATTACHMENT_BUCKET } from "@/lib/support/utils";

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function parseStorage(input: Record<string, unknown>) {
  const bucket = cleanText(input.storage_bucket) || cleanText(input.bucket) || SUPPORT_ATTACHMENT_BUCKET;
  const objectPathFromColumn = cleanText(input.storage_object_path) || cleanText(input.object_path);
  if (objectPathFromColumn) return { bucket, objectPath: objectPathFromColumn };

  const storagePath = cleanText(input.storage_path) || cleanText(input.path);
  if (!storagePath) return null;
  if (storagePath.startsWith(`${bucket}/`)) {
    return { bucket, objectPath: storagePath.slice(bucket.length + 1) };
  }
  const [pathBucket, ...rest] = storagePath.split("/");
  if (!pathBucket || rest.length === 0) return null;
  return { bucket: pathBucket, objectPath: rest.join("/") };
}

function getErrorMessage(error: unknown) {
  return cleanText((error as { message?: string } | null)?.message) || "Unknown error";
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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: attachment, error: attachmentError } = await supabase
      .from("support_request_attachments")
      .select("*")
      .eq("id", attachmentId)
      .maybeSingle();
    if (attachmentError) {
      return NextResponse.json({ ok: false, error: getErrorMessage(attachmentError) }, { status: 500 });
    }
    if (!attachment) {
      return NextResponse.json({ ok: false, error: "Attachment not found" }, { status: 404 });
    }

    const parsed = parseStorage(attachment as Record<string, unknown>);
    if (!parsed) {
      return NextResponse.json({ ok: false, error: "Attachment storage path is invalid" }, { status: 500 });
    }

    const shouldDownload = new URL(request.url).searchParams.get("download") === "1";
    const fileName =
      cleanText((attachment as Record<string, unknown>).file_name) ||
      cleanText((attachment as Record<string, unknown>).filename) ||
      "attachment";
    const { data: signed, error: signError } = await supabase.storage
      .from(parsed.bucket)
      .createSignedUrl(parsed.objectPath, 60, shouldDownload ? { download: fileName } : undefined);

    if (signError || !signed?.signedUrl) {
      return NextResponse.json({ ok: false, error: getErrorMessage(signError) }, { status: 500 });
    }

    return NextResponse.redirect(signed.signedUrl, { status: 302 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getErrorMessage(error) }, { status: 500 });
  }
}

