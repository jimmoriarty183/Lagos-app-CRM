import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { resolveUserDisplay } from "@/lib/user-display";

type JoinedProfile = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

type OwnerMembershipRow = {
  user_id: string | null;
  role: string | null;
  profiles: JoinedProfile | JoinedProfile[] | null;
};

function unwrapProfile<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = (searchParams.get("business_id") || "").trim();

    if (!businessId) {
      return NextResponse.json(
        { ok: false, error: "business_id required" },
        { status: 400 },
      );
    }

    const supabase = await supabaseServer();

    // Find OWNER membership, then join profile
    const { data, error } = await supabase
      .from("memberships")
      .select("user_id, role, profiles:profiles(id, full_name, first_name, last_name, email)")
      .eq("business_id", businessId)
      .eq("role", "OWNER")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    const ownerRow = (data as OwnerMembershipRow | null) ?? null;
    const ownerProfile = unwrapProfile(ownerRow?.profiles);
    const normalized = ownerProfile
      ? resolveUserDisplay({
          full_name: ownerProfile.full_name,
          first_name: ownerProfile.first_name,
          last_name: ownerProfile.last_name,
          email: ownerProfile.email,
        })
      : null;
    const owner = ownerProfile
      ? {
          id: ownerProfile.id,
          full_name: normalized?.fullName || normalized?.fromParts || null,
          first_name: ownerProfile.first_name ?? null,
          last_name: ownerProfile.last_name ?? null,
          email: normalized?.email || null,
        }
      : null;

    return NextResponse.json({ ok: true, owner });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
