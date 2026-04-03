import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function upperRole(value: unknown) {
  return cleanText(value).toUpperCase();
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

async function requireBusinessMemberAccess(businessId: string) {
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
  if (role !== "OWNER" && role !== "MANAGER" && role !== "GUEST") throw new Error("Forbidden");
  return { admin };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  try {
    const { clientId } = await params;
    const clientIdNormalized = cleanText(clientId);
    const { searchParams } = new URL(req.url);
    const businessId = cleanText(searchParams.get("business_id"));

    if (!businessId || !isUuid(businessId)) {
      return NextResponse.json({ error: "Valid business_id is required" }, { status: 400 });
    }
    if (!clientIdNormalized || !isUuid(clientIdNormalized)) {
      return NextResponse.json({ error: "Valid client id is required" }, { status: 400 });
    }

    const { admin } = await requireBusinessMemberAccess(businessId);

    const { data: client, error: clientError } = await admin
      .from("clients")
      .select("id, business_id, client_type, display_name, primary_email, primary_phone, postcode, updated_at")
      .eq("id", clientIdNormalized)
      .eq("business_id", businessId)
      .maybeSingle();
    if (clientError) throw new Error(clientError.message);
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const [indRes, compRes, managerRes, contactsRes, ordersRes] = await Promise.all([
      admin
        .from("client_individual_profiles")
        .select("client_id, first_name, last_name, email, phone")
        .eq("client_id", clientIdNormalized)
        .maybeSingle(),
      admin
        .from("client_company_profiles")
        .select("client_id, company_name, email, phone, registration_number, vat_number")
        .eq("client_id", clientIdNormalized)
        .maybeSingle(),
      admin
        .from("client_manager_assignments")
        .select("manager_id")
        .eq("client_id", clientIdNormalized)
        .is("unassigned_at", null)
        .maybeSingle(),
      admin
        .from("client_contacts")
        .select("id, first_name, last_name, full_name, job_title, email, phone, is_primary, is_active")
        .eq("client_id", clientIdNormalized)
        .eq("is_active", true)
        .order("is_primary", { ascending: false })
        .limit(4),
      admin
        .from("orders")
        .select("id, order_number, amount, status, created_at, due_date")
        .eq("business_id", businessId)
        .eq("client_id", clientIdNormalized)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);
    if (indRes.error) throw new Error(indRes.error.message);
    if (compRes.error) throw new Error(compRes.error.message);
    if (managerRes.error) throw new Error(managerRes.error.message);
    if (contactsRes.error) throw new Error(contactsRes.error.message);
    if (ordersRes.error) throw new Error(ordersRes.error.message);

    const managerId = cleanText(managerRes.data?.manager_id);
    const managerProfileRes = managerId
      ? await admin
          .from("profiles")
          .select("full_name, first_name, last_name, email")
          .eq("id", managerId)
          .maybeSingle()
      : { data: null, error: null };
    if (managerProfileRes.error) throw new Error(managerProfileRes.error.message);

    const individual = indRes.data as { first_name: string | null; last_name: string | null; email: string | null; phone: string | null } | null;
    const company = compRes.data as { company_name: string | null; email: string | null; phone: string | null; registration_number: string | null; vat_number: string | null } | null;
    const managerProfile = managerProfileRes.data as { full_name: string | null; first_name: string | null; last_name: string | null; email: string | null } | null;

    const managerName =
      cleanText(managerProfile?.full_name) ||
      [cleanText(managerProfile?.first_name), cleanText(managerProfile?.last_name)].filter(Boolean).join(" ") ||
      cleanText(managerProfile?.email) ||
      null;

    const displayName =
      client.client_type === "company"
        ? cleanText(company?.company_name) || cleanText(client.display_name)
        : [cleanText(individual?.first_name), cleanText(individual?.last_name)].filter(Boolean).join(" ") || cleanText(client.display_name);

    return NextResponse.json({
      id: String(client.id),
      clientType: client.client_type,
      displayName: displayName || "Unnamed client",
      email:
        cleanText(client.client_type === "company" ? company?.email : individual?.email) ||
        cleanText(client.primary_email) ||
        null,
      phone:
        cleanText(client.client_type === "company" ? company?.phone : individual?.phone) ||
        cleanText(client.primary_phone) ||
        null,
      postcode: cleanText(client.postcode) || null,
      managerName,
      registrationNumber: cleanText(company?.registration_number) || null,
      vatNumber: cleanText(company?.vat_number) || null,
      contacts: (contactsRes.data ?? []).map((row) => ({
        id: String(row.id),
        fullName:
          cleanText(row.full_name) ||
          [cleanText(row.first_name), cleanText(row.last_name)].filter(Boolean).join(" ") ||
          "Unnamed contact",
        jobTitle: cleanText(row.job_title) || null,
        email: cleanText(row.email) || null,
        phone: cleanText(row.phone) || null,
        isPrimary: Boolean(row.is_primary),
      })),
      recentOrders: (ordersRes.data ?? []).map((row) => ({
        id: String(row.id),
        orderNumber: row.order_number ?? null,
        amount: Number(row.amount ?? 0),
        status: cleanText(row.status),
        createdAt: row.created_at,
        dueDate: row.due_date,
      })),
      updatedAt: client.updated_at,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load client preview";
    const status = message === "Not authenticated" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
