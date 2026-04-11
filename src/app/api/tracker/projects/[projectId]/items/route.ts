import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createItemWithAudit } from "@/lib/tracker/service";
import type { TrackerItemPriority, TrackerItemStatus, TrackerItemType } from "@/lib/tracker/types";

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await context.params;
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const item = await createItemWithAudit(supabase, {
      projectId,
      type: (cleanText(body?.type) || "task") as TrackerItemType,
      title: cleanText(body?.title),
      description: cleanText(body?.description) || null,
      status: (cleanText(body?.status) || "backlog") as TrackerItemStatus,
      priority: (cleanText(body?.priority) || "medium") as TrackerItemPriority,
      assigneeUserId: cleanText(body?.assigneeUserId) || null,
      reporterUserId: user.id,
      epicId: cleanText(body?.epicId) || null,
      parentItemId: cleanText(body?.parentItemId) || null,
      sprintId: cleanText(body?.sprintId) || null,
      dueDate: cleanText(body?.dueDate) || null,
      position: Number.isFinite(Number(body?.position)) ? Number(body.position) : null,
      actorUserId: user.id,
    });

    return NextResponse.json({ ok: true, item });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
