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

function upperRole(value: unknown): "OWNER" | "MANAGER" | "GUEST" {
  const role = String(value ?? "").trim().toUpperCase();
  if (role === "OWNER") return "OWNER";
  if (role === "MANAGER") return "MANAGER";
  return "GUEST";
}

async function getMembershipRole(
  admin: ReturnType<typeof supabaseAdmin>,
  businessId: string,
  userId: string,
) {
  const { data: primary, error: primaryErr } = await admin
    .from("memberships")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!primaryErr && primary?.role) return upperRole(primary.role);

  const { data: fallback, error: fallbackErr } = await admin
    .from("business_memberships")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!fallbackErr && fallback?.role) return upperRole(fallback.role);

  if (primaryErr && fallbackErr) {
    throw new Error(primaryErr.message || fallbackErr.message || "Failed to resolve membership role");
  }

  return "GUEST";
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

    const role = await getMembershipRole(admin, businessId, user.id);
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
