import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createBusinessForOwner } from "@/lib/businesses/business-create-service";
import { isBusinessSegment } from "@/lib/business-segments";

function parseBusinessName(value: unknown) {
  return String(value ?? "").trim();
}

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();
    const admin = supabaseAdmin();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 },
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      business_name?: unknown;
      business_segment?: unknown;
    };

    const businessName = parseBusinessName(body.business_name);
    const businessSegment = String(body.business_segment ?? "").trim();

    if (!businessName) {
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message: "business_name is required",
        },
        { status: 400 },
      );
    }

    if (businessSegment && !isBusinessSegment(businessSegment)) {
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message: "Unsupported business segment",
        },
        { status: 400 },
      );
    }

    const createResult = await createBusinessForOwner({
      supabase,
      admin,
      userId: user.id,
      businessName,
      businessSegment,
    });

    if (!createResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          code: createResult.error.code,
          message: createResult.error.message,
          current_usage: createResult.error.current_usage ?? null,
          limit: createResult.error.limit ?? null,
        },
        { status: createResult.status },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        business: {
          slug: createResult.slug,
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Failed to create business",
      },
      { status: 500 },
    );
  }
}
