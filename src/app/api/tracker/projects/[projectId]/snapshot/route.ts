import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  TRACKER_ITEM_PRIORITIES,
  TRACKER_ITEM_STATUSES,
  TRACKER_ITEM_TYPES,
} from "@/lib/tracker/types";
import { getProjectSnapshot, getTrackerLandingData } from "@/lib/tracker/service";

function pickEnum<T extends readonly string[]>(
  values: T,
  input: string | null,
): T[number] | null {
  if (!input) return null;
  return (values as readonly string[]).includes(input) ? (input as T[number]) : null;
}

export async function GET(
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

    const url = new URL(request.url);
    const status = pickEnum(TRACKER_ITEM_STATUSES, url.searchParams.get("status"));
    const priority = pickEnum(TRACKER_ITEM_PRIORITIES, url.searchParams.get("priority"));
    const type = pickEnum(TRACKER_ITEM_TYPES, url.searchParams.get("type"));
    const epicId = url.searchParams.get("epicId");
    const sprintId = url.searchParams.get("sprintId");
    const assigneeUserId = url.searchParams.get("assigneeUserId");
    const overdue = url.searchParams.get("overdue") === "1";
    const unassigned = url.searchParams.get("unassigned") === "1";
    const search = url.searchParams.get("search");
    const labelIds = (url.searchParams.get("labels") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const { projects } = await getTrackerLandingData(supabase, user.id);

    const snapshot = await getProjectSnapshot(supabase, {
      projectId,
      userId: user.id,
      projectsCount: projects.length,
      filters: {
        status,
        priority,
        type,
        epicId,
        sprintId,
        assigneeUserId,
        overdue,
        unassigned,
        search,
        labelIds,
      },
    });

    if (!snapshot) {
      return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
