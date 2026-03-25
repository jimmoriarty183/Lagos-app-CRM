import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildSupportAttachmentObjectPath, SUPPORT_ATTACHMENT_BUCKET } from "@/lib/support/utils";

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function getErrorMessage(error: unknown) {
  return cleanText((error as { message?: string } | null)?.message) || "Unknown error";
}

function isMissingColumnError(error: unknown, column: string) {
  const message = getErrorMessage(error).toLowerCase();
  return (
    (message.includes("schema cache") && message.includes(column.toLowerCase())) ||
    (message.includes("column") && message.includes(column.toLowerCase()) && message.includes("does not exist"))
  );
}

function isInvalidEnumValue(error: unknown, enumName: string) {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes("invalid input value for enum") && message.includes(enumName.toLowerCase());
}

function isCreatedByForeignKeyError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("support_requests_created_by_user_id_fkey") ||
    (message.includes("foreign key") && message.includes("created_by_user_id"))
  );
}

async function resolveSupportActorId(
  admin: ReturnType<typeof supabaseAdmin>,
  user: { id: string; email?: string | null },
) {
  const normalizedEmail = cleanText(user.email).toLowerCase();

  const byId = await admin
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (!byId.error && byId.data?.id != null) return String(byId.data.id);

  if (normalizedEmail) {
    const byEmail = await admin
      .from("users")
      .select("id, email")
      .ilike("email", normalizedEmail)
      .maybeSingle();
    if (!byEmail.error && byEmail.data?.id != null) return String(byEmail.data.id);
  }

  throw new Error(
    "No matching actor in public.users for current auth user and business.",
  );
}

function buildPriorityCandidates(value: unknown) {
  const raw = cleanText(value);
  const upper = raw.toUpperCase();
  const mapped =
    upper === "MEDIUM"
      ? "NORMAL"
      : upper === "NORMAL"
        ? "MEDIUM"
        : upper;
  return Array.from(new Set([raw, upper, raw.toLowerCase(), mapped, mapped.toLowerCase()].filter(Boolean)));
}

function buildTypeCandidates(value: unknown) {
  const raw = cleanText(value);
  const upper = raw.toUpperCase();
  const snake = upper.replaceAll(" ", "_");
  const normalized = snake.toLowerCase();
  const aliasesByType: Record<string, string[]> = {
    integration: ["integration", "feature_request", "feature", "bug"],
    account_access: ["account_access", "account", "access", "bug"],
    feature_request: ["feature_request", "feature", "improvement", "bug"],
    billing: ["billing", "payment", "invoice", "bug"],
    bug: ["bug", "issue", "defect"],
  };
  const aliases = aliasesByType[normalized] ?? [];
  return Array.from(
    new Set(
      [raw, upper, raw.toLowerCase(), snake, snake.toLowerCase(), ...aliases, "bug", "BUG"].filter(Boolean),
    ),
  );
}

function buildSourceCandidates(value: unknown) {
  const raw = cleanText(value);
  const upper = raw.toUpperCase();
  return Array.from(new Set([raw, upper, raw.toLowerCase(), "WEB", "web", "PORTAL", "portal"].filter(Boolean)));
}

async function insertSupportRequestWithFallback(
  admin: ReturnType<typeof supabaseAdmin>,
  payload: Record<string, unknown>,
) {
  const nextPayload = { ...payload };
  const priorityCandidates = buildPriorityCandidates(payload.priority);
  const typeCandidates = buildTypeCandidates(payload.type);
  const sourceCandidates = buildSourceCandidates(payload.source);
  let priorityIndex = 0;
  let typeIndex = 0;
  let sourceIndex = 0;

  if (priorityCandidates[priorityIndex]) nextPayload.priority = priorityCandidates[priorityIndex];
  if (typeCandidates[typeIndex]) nextPayload.type = typeCandidates[typeIndex];
  if (sourceCandidates[sourceIndex]) nextPayload.source = sourceCandidates[sourceIndex];

  const optionalColumns = ["created_by_user_id", "contact_email", "contact_phone", "source", "type", "priority"];

  while (true) {
    const { data, error } = await admin.from("support_requests").insert(nextPayload).select("id").single();
    if (!error && data?.id != null) {
      return String(data.id);
    }

    if (isInvalidEnumValue(error, "support_request_priority")) {
      priorityIndex += 1;
      if (priorityIndex < priorityCandidates.length) {
        nextPayload.priority = priorityCandidates[priorityIndex];
        continue;
      }
    }

    if (isInvalidEnumValue(error, "support_request_type")) {
      typeIndex += 1;
      if (typeIndex < typeCandidates.length) {
        nextPayload.type = typeCandidates[typeIndex];
        continue;
      }
    }

    if (isInvalidEnumValue(error, "support_request_source")) {
      sourceIndex += 1;
      if (sourceIndex < sourceCandidates.length) {
        nextPayload.source = sourceCandidates[sourceIndex];
        continue;
      }
      delete nextPayload.source;
      continue;
    }

    const missingColumn = optionalColumns.find(
      (column) => Object.prototype.hasOwnProperty.call(nextPayload, column) && isMissingColumnError(error, column),
    );

    if (!missingColumn) {
      throw new Error(getErrorMessage(error));
    }
    delete nextPayload[missingColumn];
  }
}

async function insertAttachmentMetadataWithFallback(
  admin: ReturnType<typeof supabaseAdmin>,
  input: {
    businessId: string;
    requestId: string;
    fileName: string;
    objectPath: string;
    fileType: string;
    fileSize: number;
    userId: string;
  },
) {
  const basePayload = {
    business_id: input.businessId,
    file_name: input.fileName,
    storage_bucket: SUPPORT_ATTACHMENT_BUCKET,
    storage_object_path: input.objectPath,
    storage_path: `${SUPPORT_ATTACHMENT_BUCKET}/${input.objectPath}`,
    mime_type: input.fileType || null,
    file_size: input.fileSize,
    file_size_bytes: input.fileSize,
    uploaded_by_user_id: input.userId,
    created_by_user_id: input.userId,
  };

  const candidatePayloads: Record<string, unknown>[] = [
    { ...basePayload, request_id: input.requestId },
    { ...basePayload, support_request_id: input.requestId },
  ];

  let lastError = "Failed to insert attachment metadata";

  for (const payload of candidatePayloads) {
    const nextPayload = { ...payload };
    const optionalColumns = [
      "storage_bucket",
      "storage_object_path",
      "storage_path",
      "mime_type",
      "file_size_bytes",
      "file_size",
      "uploaded_by_user_id",
      "created_by_user_id",
      "business_id",
    ];

    while (true) {
      const { error } = await admin.from("support_request_attachments").insert(nextPayload);
      if (!error) return;

      lastError = getErrorMessage(error);
      const missingColumn = optionalColumns.find(
        (column) => Object.prototype.hasOwnProperty.call(nextPayload, column) && isMissingColumnError(error, column),
      );
      if (!missingColumn) break;
      delete nextPayload[missingColumn];
    }
  }

  throw new Error(lastError);
}

export async function POST(request: Request) {
  try {
    const supabase = await supabaseServer();
    const admin = supabaseAdmin();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const businessSlug = cleanText(formData.get("businessSlug"));
    const type = cleanText(formData.get("type"));
    const subject = cleanText(formData.get("subject"));
    const message = cleanText(formData.get("message"));
    const priority = cleanText(formData.get("priority"));
    const contactEmail = cleanText(formData.get("contact_email"));
    const contactPhone = cleanText(formData.get("contact_phone"));
    const attachment = formData.get("attachment");

    if (!businessSlug) {
      return NextResponse.json({ ok: false, error: "Business slug is required" }, { status: 400 });
    }
    if (!type || !subject || !message || !priority) {
      return NextResponse.json({ ok: false, error: "type, subject, message and priority are required" }, { status: 400 });
    }

    const { data: business, error: businessError } = await admin
      .from("businesses")
      .select("id, slug")
      .eq("slug", businessSlug)
      .maybeSingle();

    if (businessError || !business?.id) {
      return NextResponse.json({ ok: false, error: "Business not found" }, { status: 404 });
    }

    const { data: membership, error: membershipError } = await admin
      .from("memberships")
      .select("role")
      .eq("business_id", business.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      return NextResponse.json({ ok: false, error: getErrorMessage(membershipError) }, { status: 500 });
    }
    if (!membership) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const supportActorId = await resolveSupportActorId(admin, {
      id: user.id,
      email: user.email,
    });

    let requestId: string;
    try {
      requestId = await insertSupportRequestWithFallback(admin, {
        business_id: business.id,
        created_by_user_id: supportActorId,
        type,
        subject,
        message,
        priority,
        source: "WEB",
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
      });
    } catch (insertError) {
      if (isCreatedByForeignKeyError(insertError)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Support user FK mismatch: created_by_user_id has no matching row in referenced users table. Check support_requests_created_by_user_id_fkey target table and ensure this auth user is mirrored there.",
          },
          { status: 400 },
        );
      }
      throw insertError;
    }

    let uploadWarning: string | null = null;
    if (attachment instanceof File && attachment.size > 0) {
      try {
        const objectPath = buildSupportAttachmentObjectPath(String(business.id), requestId, attachment.name);
        const { error: uploadError } = await admin.storage
          .from(SUPPORT_ATTACHMENT_BUCKET)
          .upload(objectPath, attachment, {
            upsert: false,
            contentType: attachment.type || undefined,
            cacheControl: "3600",
          });

        if (uploadError) {
          uploadWarning = `Attachment upload failed: ${getErrorMessage(uploadError)}`;
        } else {
          try {
            await insertAttachmentMetadataWithFallback(admin, {
              businessId: String(business.id),
              requestId,
              fileName: attachment.name,
              objectPath,
              fileType: attachment.type,
              fileSize: attachment.size,
              userId: supportActorId,
            });
          } catch (metadataError) {
            uploadWarning = `Attachment uploaded, but metadata insert failed: ${getErrorMessage(metadataError)}`;
          }
        }
      } catch (attachmentError) {
        uploadWarning = `Attachment processing failed: ${getErrorMessage(attachmentError)}`;
      }
    }

    return NextResponse.json({ ok: true, requestId, uploadWarning });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getErrorMessage(error) }, { status: 500 });
  }
}
