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
  if (adminError) {
    throw new Error(getErrorMessage(adminError));
  }
  if (!isAdmin) {
    throw new Error("Forbidden");
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
    };

    const status = cleanText(body.status);
    const priority = cleanText(body.priority);
    const assignedToUserId = cleanText(body.assignedToUserId);

    const supabase = await supabaseServer();
    await requirePlatformAdmin(supabase);

    if (!status && !priority && body.assignedToUserId === undefined) {
      return NextResponse.json({ ok: false, error: "Nothing to update" }, { status: 400 });
    }

    const basePatch: Record<string, unknown> = {};
    if (status) basePatch.status = status;
    if (priority) basePatch.priority = priority;

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

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

