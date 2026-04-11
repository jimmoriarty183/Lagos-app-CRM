import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createCommentWithAudit } from "@/lib/tracker/service";

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
    const comment = await createCommentWithAudit(supabase, {
      itemId,
      userId: user.id,
      body: cleanText(body?.body),
    });

    return NextResponse.json({ ok: true, comment });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
