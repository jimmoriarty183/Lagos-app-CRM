import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function getErrorMessage(error: unknown) {
  return cleanText((error as { message?: string } | null)?.message) || "Unknown error";
}

function isEmailValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const admin = supabaseAdmin();
    const formData = await request.formData();

    const fullName = cleanText(formData.get("full_name"));
    const workEmail = cleanText(formData.get("work_email")).toLowerCase();
    const companyName = cleanText(formData.get("company_name"));
    const teamSize = cleanText(formData.get("team_size"));
    const currentTool = cleanText(formData.get("current_tool"));
    const mainGoal = cleanText(formData.get("main_goal"));
    const timeline = cleanText(formData.get("timeline"));
    const notes = cleanText(formData.get("notes"));
    const honey = cleanText(formData.get("website"));

    if (honey) {
      return NextResponse.json({ ok: true });
    }

    if (!fullName || !workEmail || !companyName || !mainGoal) {
      return NextResponse.json(
        { ok: false, error: "full_name, work_email, company_name and main_goal are required" },
        { status: 400 },
      );
    }

    if (!isEmailValid(workEmail)) {
      return NextResponse.json({ ok: false, error: "Invalid work email" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("sales_requests")
      .insert({
        full_name: fullName,
        work_email: workEmail,
        company_name: companyName,
        team_size: teamSize || null,
        current_tool: currentTool || null,
        main_goal: mainGoal,
        timeline: timeline || null,
        notes: notes || null,
        source: "pricing_contact_sales",
        status: "new",
      })
      .select("id")
      .single();

    if (error || !data?.id) {
      return NextResponse.json({ ok: false, error: getErrorMessage(error) }, { status: 500 });
    }

    return NextResponse.json({ ok: true, requestId: String(data.id) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getErrorMessage(error) }, { status: 500 });
  }
}
