import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { moveItemWithAudit } from "@/lib/tracker/service";
import type { TrackerItemStatus } from "@/lib/tracker/types";

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

export async function POST(
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

    const body = await request.json();
    const status = cleanText(body?.status) as TrackerItemStatus;
    if (!status) {
      return NextResponse.json({ ok: false, error: "status is required" }, { status: 400 });
    }

    const item = await moveItemWithAudit(supabase, {
      itemId,
      status,
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
