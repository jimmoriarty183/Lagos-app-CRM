import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  findCompanyMatches,
  findIndividualMatches,
  type ClientType,
} from "@/lib/clients/matching";

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function upperRole(value: unknown) {
  return cleanText(value).toUpperCase();
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

async function requireBusinessManagerAccess(businessId: string) {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const { data: membership, error } = await admin
    .from("memberships")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);

  const role = upperRole(membership?.role);
  if (role !== "OWNER" && role !== "MANAGER") throw new Error("Forbidden");

  return { admin };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const businessId = cleanText(body.businessId);
    const clientType = cleanText(body.clientType) as ClientType;

    if (!businessId || !isUuid(businessId)) {
      return NextResponse.json({ error: "Valid businessId is required" }, { status: 400 });
    }
    if (clientType !== "individual" && clientType !== "company") {
      return NextResponse.json({ error: "Valid clientType is required" }, { status: 400 });
    }

    const { admin } = await requireBusinessManagerAccess(businessId);
    const result =
      clientType === "individual"
        ? await findIndividualMatches(admin, businessId, {
            inn: cleanText(body.inn) || null,
            phone: cleanText(body.phone) || null,
            email: cleanText(body.email) || null,
            firstName: cleanText(body.firstName) || null,
            lastName: cleanText(body.lastName) || null,
          })
        : await findCompanyMatches(admin, businessId, {
            registrationNumber: cleanText(body.registrationNumber) || null,
            vatNumber: cleanText(body.vatNumber) || null,
            phone: cleanText(body.phone) || null,
            email: cleanText(body.email) || null,
            companyName: cleanText(body.companyName) || null,
          });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run client matching";
    const status = message === "Not authenticated" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
