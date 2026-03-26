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

async function requireSupportOperator(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
  requestId: string,
) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");

  const { data: isAdmin } = await supabase.rpc("is_platform_admin");
  if (isAdmin) return user.id;

  const { data: requestRow, error: requestError } = await supabase
    .from("support_requests")
    .select("business_id")
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
  if (!["OWNER", "MANAGER"].includes(role)) throw new Error("Forbidden");

  return user.id;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  try {
    const { requestId } = await context.params;
    if (!requestId) {
      return NextResponse.json({ ok: false, error: "requestId is required" }, { status: 400 });
    }

    const body = (await request.json()) as { note?: string };
    const note = cleanText(body.note);
    if (!note) {
      return NextResponse.json({ ok: false, error: "Note is required" }, { status: 400 });
    }

    const supabase = await supabaseServer();
    const userId = await requireSupportOperator(supabase, requestId);
    const admin = supabaseAdmin();

    const requestIdColumns = ["request_id", "support_request_id", "ticket_id", "support_ticket_id"];
    const noteColumns = ["note_text", "note", "message", "internal_note", "content", "text", "body"];
    const authorColumns = ["author_user_id", "created_by_user_id", "created_by", "user_id"];

    let lastError = "Failed to insert internal note";

    for (const reqCol of requestIdColumns) {
      for (const noteCol of noteColumns) {
        for (const authorCol of [...authorColumns, ""]) {
          const payload: Record<string, unknown> = {
            [reqCol]: requestId,
            [noteCol]: note,
          };
          if (authorCol) payload[authorCol] = userId;

          const { error } = await admin.from("support_request_internal_notes").insert(payload);
          if (!error) {
            return NextResponse.json({ ok: true });
          }

          lastError = getErrorMessage(error);
          const missingReq = isMissingColumnError(error, reqCol);
          const missingNote = isMissingColumnError(error, noteCol);
          const missingAuthor = authorCol ? isMissingColumnError(error, authorCol) : false;

          // If the attempt failed because current column combination does not exist, keep trying other combinations.
          if (missingReq || missingNote || missingAuthor) {
            continue;
          }
          // Any other error (RLS, FK, validation, etc.) is terminal and should be returned immediately.
          return NextResponse.json({ ok: false, error: lastError }, { status: 500 });
        }
      }
    }

    return NextResponse.json(
      { ok: false, error: lastError || "Could not match internal notes table columns." },
      { status: 500 },
    );
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
