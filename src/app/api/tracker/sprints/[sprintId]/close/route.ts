import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { closeSprintWithAudit } from "@/lib/tracker/service";

export async function POST(
  _request: Request,
  context: { params: Promise<{ sprintId: string }> },
) {
  try {
    const { sprintId } = await context.params;
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const sprint = await closeSprintWithAudit(supabase, {
      sprintId,
      actorUserId: user.id,
    });

    return NextResponse.json({ ok: true, sprint });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
