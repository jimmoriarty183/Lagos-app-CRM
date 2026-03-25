import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

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

async function requirePlatformAdmin(supabase: Awaited<ReturnType<typeof supabaseServer>>) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_platform_admin");
  if (adminError) throw new Error(getErrorMessage(adminError));
  if (!isAdmin) throw new Error("Forbidden");

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
    const userId = await requirePlatformAdmin(supabase);

    const payloads = [
      { request_id: requestId, note, created_by_user_id: userId },
      { support_request_id: requestId, note, created_by_user_id: userId },
      { request_id: requestId, message: note, created_by_user_id: userId },
      { support_request_id: requestId, message: note, created_by_user_id: userId },
      { request_id: requestId, body: note, created_by_user_id: userId },
      { support_request_id: requestId, body: note, created_by_user_id: userId },
    ];

    let lastError = "Failed to insert internal note";

    for (const payload of payloads) {
      let nextPayload: Record<string, unknown> = { ...payload };
      const optionalColumns = ["created_by_user_id"];

      while (true) {
        const { error } = await supabase.from("support_request_internal_notes").insert(nextPayload);
        if (!error) {
          return NextResponse.json({ ok: true });
        }

        lastError = getErrorMessage(error);
        const missingOptional = optionalColumns.find(
          (column) => Object.prototype.hasOwnProperty.call(nextPayload, column) && isMissingColumnError(error, column),
        );
        if (missingOptional) {
          delete nextPayload[missingOptional];
          continue;
        }
        break;
      }
    }

    return NextResponse.json({ ok: false, error: lastError }, { status: 500 });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

