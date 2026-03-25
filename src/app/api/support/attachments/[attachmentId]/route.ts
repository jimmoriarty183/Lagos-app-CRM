import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { SUPPORT_ATTACHMENT_BUCKET, sanitizeFileName } from "@/lib/support/utils";

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
  // If storage_path is already in canonical object form (<business_id>/<request_id>/<filename>),
  // do not treat the first folder as bucket.
  if (/^[0-9a-f-]{36}$/i.test(pathBucket) && rest.length >= 2) {
    return { bucket, objectPath: storagePath };
  }
  return { bucket: pathBucket, objectPath: rest.join("/") };
}

function getErrorMessage(error: unknown) {
  return cleanText((error as { message?: string } | null)?.message) || "Unknown error";
}

function uniqueNonEmpty(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((v) => cleanText(v)).filter(Boolean)),
  );
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

    const requestId =
      cleanText((attachment as Record<string, unknown>).request_id) ||
      cleanText((attachment as Record<string, unknown>).support_request_id);
    const attachmentBusinessId = cleanText((attachment as Record<string, unknown>).business_id);

    let businessId = attachmentBusinessId;
    if (!businessId && requestId) {
      const { data: requestRow } = await supabase
        .from("support_requests")
        .select("business_id")
        .eq("id", requestId)
        .maybeSingle();
      businessId = cleanText((requestRow as Record<string, unknown> | null)?.business_id);
    }

    const storagePath = cleanText((attachment as Record<string, unknown>).storage_path) || cleanText((attachment as Record<string, unknown>).path);
    const canonicalPath =
      businessId && requestId
        ? `${businessId}/${requestId}/${sanitizeFileName(fileName)}`
        : "";

    const objectPathCandidates = uniqueNonEmpty([
      parsed.objectPath,
      storagePath,
      storagePath.startsWith(`${SUPPORT_ATTACHMENT_BUCKET}/`) ? storagePath.slice(SUPPORT_ATTACHMENT_BUCKET.length + 1) : "",
      canonicalPath,
      sanitizeFileName(fileName),
    ]);

    const bucketCandidates = uniqueNonEmpty([
      parsed.bucket,
      cleanText((attachment as Record<string, unknown>).storage_bucket),
      SUPPORT_ATTACHMENT_BUCKET,
    ]);

    let signedUrl: string | null = null;
    let lastSignError = "Object not found";

    for (const bucket of bucketCandidates) {
      for (const objectPath of objectPathCandidates) {
        const { data: signed, error: signError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(objectPath, 60, shouldDownload ? { download: fileName } : undefined);

        if (!signError && signed?.signedUrl) {
          signedUrl = signed.signedUrl;
          break;
        }
        lastSignError = getErrorMessage(signError) || lastSignError;
      }
      if (signedUrl) break;
    }

    if (!signedUrl) {
      return NextResponse.json({ ok: false, error: lastSignError }, { status: 500 });
    }

    return NextResponse.redirect(signedUrl, { status: 302 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getErrorMessage(error) }, { status: 500 });
  }
}
