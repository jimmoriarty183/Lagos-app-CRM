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

type PeopleMembershipRow = {
  role: string | null;
  user_id: string | null;
  profiles: JoinedProfile | JoinedProfile[] | null;
};

function unwrapProfile<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId") || "";
    if (!businessId) {
      return NextResponse.json({ ok: false, error: "businessId required" }, { status: 400 });
    }

    const supabase = await supabaseServer();

    // memberships -> profiles (owner + manager)
    const { data, error } = await supabase
      .from("memberships")
      .select("role, user_id, profiles:profiles(id, full_name, first_name, last_name, email)")
      .eq("business_id", businessId)
      .in("role", ["OWNER", "MANAGER"]);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    const rows = (data ?? []) as PeopleMembershipRow[];
    const ownerProfile = unwrapProfile(
      rows.find((row) => String(row.role).toUpperCase() === "OWNER")?.profiles,
    );
    const managerProfile = unwrapProfile(
      rows.find((row) => String(row.role).toUpperCase() === "MANAGER")?.profiles,
    );
    const ownerDisplay = ownerProfile
      ? resolveUserDisplay({
          full_name: ownerProfile.full_name,
          first_name: ownerProfile.first_name,
          last_name: ownerProfile.last_name,
          email: ownerProfile.email,
        })
      : null;
    const managerDisplay = managerProfile
      ? resolveUserDisplay({
          full_name: managerProfile.full_name,
          first_name: managerProfile.first_name,
          last_name: managerProfile.last_name,
          email: managerProfile.email,
        })
      : null;
    const owner = ownerProfile
      ? {
          id: ownerProfile.id,
          full_name: ownerDisplay?.fullName || ownerDisplay?.fromParts || null,
          first_name: ownerProfile.first_name ?? null,
          last_name: ownerProfile.last_name ?? null,
          email: ownerDisplay?.email || null,
        }
      : null;
    const manager = managerProfile
      ? {
          id: managerProfile.id,
          full_name: managerDisplay?.fullName || managerDisplay?.fromParts || null,
          first_name: managerProfile.first_name ?? null,
          last_name: managerProfile.last_name ?? null,
          email: managerDisplay?.email || null,
        }
      : null;

    return NextResponse.json({ ok: true, owner, manager });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
