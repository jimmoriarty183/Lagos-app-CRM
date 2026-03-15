import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { BUSINESS_SEGMENTS, isBusinessSegment } from "@/lib/business-segments";

function cleanText(value: unknown, maxLength: number) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function isMissingColumnError(message: string) {
  const lowered = message.toLowerCase();
  return lowered.includes("column") && (lowered.includes("does not exist") || lowered.includes("schema cache"));
}

export async function PATCH(req: Request) {
  try {
    const supabase = await supabaseServer();
    const admin = supabaseAdmin();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const businessId = String(body?.businessId || "").trim();
    if (!businessId) {
      return NextResponse.json({ ok: false, error: "businessId is required" }, { status: 400 });
    }

    const { data: membership, error: membershipErr } = await admin
      .from("memberships")
      .select("role")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipErr) {
      return NextResponse.json({ ok: false, error: membershipErr.message }, { status: 500 });
    }

    const role = String(membership?.role || "").toUpperCase();
    if (role !== "OWNER" && role !== "MANAGER") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const segmentValue = String(body?.businessSegment || "").trim();
    if (segmentValue && !isBusinessSegment(segmentValue)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unsupported business segment",
          allowedSegments: BUSINESS_SEGMENTS,
        },
        { status: 400 },
      );
    }

    const payload = {
      business_phone: cleanText(body?.businessPhone, 64),
      business_address: cleanText(body?.businessAddress, 240),
      business_segment: segmentValue || null,
      business_website: cleanText(body?.businessWebsite, 240),
    };

    const { data, error } = await admin
      .from("businesses")
      .update(payload)
      .eq("id", businessId)
      .select("id,business_phone,business_address,business_segment,business_website")
      .single();

    if (error) {
      if (isMissingColumnError(error.message)) {
        return NextResponse.json(
          {
            ok: false,
            error: "Database columns for business profile are missing. Apply the SQL patch first.",
          },
          { status: 500 },
        );
      }

      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, business: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
