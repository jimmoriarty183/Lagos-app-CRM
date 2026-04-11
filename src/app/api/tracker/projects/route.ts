import { NextResponse } from "next/server";
import { resolveCurrentWorkspace } from "@/lib/platform/workspace";
import { supabaseServer } from "@/lib/supabase/server";
import { createProjectWithAudit, getTrackerLandingData } from "@/lib/tracker/service";

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

export async function GET() {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { projects } = await getTrackerLandingData(supabase, user.id);
    return NextResponse.json({ ok: true, projects });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { workspace } = await resolveCurrentWorkspace();
    if (!workspace) {
      return NextResponse.json({ ok: false, error: "No workspace selected" }, { status: 400 });
    }

    const body = await request.json();
    const key = cleanText(body?.key).toUpperCase();
    const name = cleanText(body?.name);
    const description = cleanText(body?.description);

    if (!key || !name) {
      return NextResponse.json({ ok: false, error: "key and name are required" }, { status: 400 });
    }

    const project = await createProjectWithAudit(supabase, {
      businessId: workspace.id,
      key,
      name,
      description: description || null,
      ownerUserId: user.id,
    });

    return NextResponse.json({ ok: true, project });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
