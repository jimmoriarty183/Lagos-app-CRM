import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

async function canManageSupportRequest(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
  requestId: string,
) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");

  const { data: isAdmin } = await supabase.rpc("is_platform_admin");
  if (isAdmin) {
    return { userId: user.id, requestBusinessId: null as string | null, requesterUserId: null as string | null, currentStatus: null as string | null, subject: null as string | null };
  }

  const { data: requestRow, error: requestError } = await supabase
    .from("support_requests")
    .select("id, business_id, created_by_user_id, status, subject")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError || !requestRow) throw new Error("Support request not found");

  const businessId = cleanText((requestRow as Record<string, unknown>).business_id);
  if (!businessId) throw new Error("Support request business is missing");

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .maybeSingle();

  const role = cleanText((membership as Record<string, unknown> | null)?.role).toUpperCase();
  if (!["OWNER", "MANAGER"].includes(role)) {
    throw new Error("Forbidden");
  }

  return {
    userId: user.id,
    requestBusinessId: businessId,
    requesterUserId: cleanText((requestRow as Record<string, unknown>).created_by_user_id) || null,
    currentStatus: cleanText((requestRow as Record<string, unknown>).status) || null,
    subject: cleanText((requestRow as Record<string, unknown>).subject) || null,
  };
}

async function notifyRequesterBestEffort(input: {
  recipientUserId: string | null;
  actorUserId: string;
  requestId: string;
  businessId: string | null;
  status: string | null;
  previousStatus: string | null;
  customerReply: string | null;
  subject: string | null;
}) {
  if (!input.recipientUserId) return;

  const admin = supabaseAdmin();
  const metadata = {
    business_id: input.businessId,
    support_request_id: input.requestId,
    previous_status: input.previousStatus,
    status: input.status,
    customer_reply: input.customerReply,
    subject: input.subject,
  };

  const payloads: Record<string, unknown>[] = [
    {
      recipient_user_id: input.recipientUserId,
      actor_user_id: input.actorUserId,
      type: "support_request_updated",
      entity_type: "support_request",
      entity_id: input.requestId,
      metadata,
    },
    {
      workspace_id: input.businessId,
      recipient_user_id: input.recipientUserId,
      actor_user_id: input.actorUserId,
      type: "support_request_updated",
      entity_type: "support_request",
      entity_id: input.requestId,
      metadata,
    },
  ];

  for (const payload of payloads) {
    const { error } = await admin.from("notifications").insert(payload);
    if (!error) return;
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  try {
    const { requestId } = await context.params;
    if (!requestId) {
      return NextResponse.json({ ok: false, error: "requestId is required" }, { status: 400 });
    }

    const body = (await request.json()) as {
      status?: string;
      priority?: string;
      assignedToUserId?: string | null;
      customerReply?: string | null;
    };

    const status = cleanText(body.status).toLowerCase();
    const priority = cleanText(body.priority).toLowerCase();
    const assignedToUserId = cleanText(body.assignedToUserId);
    const customerReply = cleanText(body.customerReply);

    const supabase = await supabaseServer();
    const access = await canManageSupportRequest(supabase, requestId);

    if (!status && !priority && body.assignedToUserId === undefined && !customerReply) {
      return NextResponse.json({ ok: false, error: "Nothing to update" }, { status: 400 });
    }

    const basePatch: Record<string, unknown> = {};
    if (status) basePatch.status = status;
    // Keep priority fixed after creation; ignore priority updates from UI/API.

    const assignmentColumns = ["assigned_to_user_id", "assignee_user_id", "assigned_user_id"];
    if (body.assignedToUserId !== undefined) {
      let updated = false;
      for (const column of assignmentColumns) {
        const patchWithAssignment = {
          ...basePatch,
          [column]: assignedToUserId || null,
        };
        const { error } = await supabase.from("support_requests").update(patchWithAssignment).eq("id", requestId);
        if (!error) {
          updated = true;
          break;
        }
        if (isMissingColumnError(error, column)) {
          continue;
        }
        return NextResponse.json({ ok: false, error: getErrorMessage(error) }, { status: 500 });
      }

      if (!updated && Object.keys(basePatch).length > 0) {
        const { error } = await supabase.from("support_requests").update(basePatch).eq("id", requestId);
        if (error) {
          return NextResponse.json({ ok: false, error: getErrorMessage(error) }, { status: 500 });
        }
      }
    } else {
      const { error } = await supabase.from("support_requests").update(basePatch).eq("id", requestId);
      if (error) {
        return NextResponse.json({ ok: false, error: getErrorMessage(error) }, { status: 500 });
      }
    }

    if (customerReply) {
      const { data: currentRow, error: currentError } = await supabase
        .from("support_requests")
        .select("message, description")
        .eq("id", requestId)
        .maybeSingle();
      if (currentError) {
        return NextResponse.json({ ok: false, error: getErrorMessage(currentError) }, { status: 500 });
      }

      const existingMessage =
        cleanText((currentRow as Record<string, unknown> | null)?.message) ||
        cleanText((currentRow as Record<string, unknown> | null)?.description);
      const replyBlock = `\n\nSupport reply:\n${customerReply}`;
      const nextMessage = existingMessage.includes(customerReply)
        ? existingMessage
        : `${existingMessage}${replyBlock}`.trim();

      const messageColumns = ["message", "description"];
      let messageUpdated = false;
      for (const column of messageColumns) {
        const { error } = await supabase
          .from("support_requests")
          .update({ [column]: nextMessage })
          .eq("id", requestId);
        if (!error) {
          messageUpdated = true;
          break;
        }
        if (isMissingColumnError(error, column)) continue;
        return NextResponse.json({ ok: false, error: getErrorMessage(error) }, { status: 500 });
      }
      if (!messageUpdated) {
        return NextResponse.json({ ok: false, error: "Failed to save customer reply" }, { status: 500 });
      }
    }

    await notifyRequesterBestEffort({
      recipientUserId: access.requesterUserId,
      actorUserId: access.userId,
      requestId,
      businessId: access.requestBusinessId,
      status: status || access.currentStatus,
      previousStatus: access.currentStatus,
      customerReply: customerReply || null,
      subject: access.subject,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
