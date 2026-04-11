import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { updateItemWithAudit } from "@/lib/tracker/service";
import type { TrackerItem } from "@/lib/tracker/types";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ itemId: string }> },
) {
  try {
    const { itemId } = await context.params;
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Partial<TrackerItem>;
    const item = await updateItemWithAudit(supabase, {
      itemId,
      patch: body,
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
