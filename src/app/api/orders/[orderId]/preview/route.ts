import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { formatDisplayOrderNumber } from "@/lib/orders/display";

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function upperRole(value: unknown) {
  return cleanText(value).toUpperCase();
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function isIntegerText(v: string) {
  return /^[0-9]+$/.test(v);
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
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const { orderId } = await params;
    const orderIdNormalized = cleanText(orderId);
    const { searchParams } = new URL(req.url);
    const businessId = cleanText(searchParams.get("business_id"));

    if (!businessId || !isUuid(businessId)) {
      return NextResponse.json({ error: "Valid business_id is required" }, { status: 400 });
    }
    if (!orderIdNormalized || (!isUuid(orderIdNormalized) && !isIntegerText(orderIdNormalized))) {
      return NextResponse.json({ error: "Valid order id or order number is required" }, { status: 400 });
    }

    const { admin } = await requireBusinessMemberAccess(businessId);

    const orderQuery = admin
      .from("orders")
      .select("id, business_id, order_number, amount, status, due_date, created_at, description, manager_id, client_id, contact_id")
      .eq("business_id", businessId);
    const { data: order, error: orderError } = isUuid(orderIdNormalized)
      ? await orderQuery.eq("id", orderIdNormalized).maybeSingle()
      : await orderQuery.eq("order_number", Number(orderIdNormalized)).maybeSingle();
    if (orderError) throw new Error(orderError.message);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const [clientRes, contactRes, managerRes, indRes, compRes] = await Promise.all([
      order.client_id
        ? admin
            .from("clients")
            .select("id, client_type, display_name, primary_email, primary_phone")
            .eq("id", String(order.client_id))
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      order.contact_id
        ? admin
            .from("client_contacts")
            .select("id, first_name, last_name, full_name, job_title, email, phone")
            .eq("id", String(order.contact_id))
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      order.manager_id
        ? admin
            .from("profiles")
            .select("id, full_name, first_name, last_name, email")
            .eq("id", String(order.manager_id))
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      order.client_id
        ? admin
            .from("client_individual_profiles")
            .select("client_id, first_name, last_name, email, phone")
            .eq("client_id", String(order.client_id))
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      order.client_id
        ? admin
            .from("client_company_profiles")
            .select("client_id, company_name, email, phone")
            .eq("client_id", String(order.client_id))
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (clientRes.error) throw new Error(clientRes.error.message);
    if (contactRes.error) throw new Error(contactRes.error.message);
    if (managerRes.error) throw new Error(managerRes.error.message);
    if (indRes.error) throw new Error(indRes.error.message);
    if (compRes.error) throw new Error(compRes.error.message);

    const client = clientRes.data as
      | { client_type: "individual" | "company"; display_name: string; primary_email: string | null; primary_phone: string | null }
      | null;
    const contact = contactRes.data as
      | { first_name: string | null; last_name: string | null; full_name: string | null; job_title: string | null; email: string | null; phone: string | null }
      | null;
    const manager = managerRes.data as
      | { full_name: string | null; first_name: string | null; last_name: string | null; email: string | null }
      | null;
    const ind = indRes.data as { first_name: string | null; last_name: string | null; email: string | null; phone: string | null } | null;
    const comp = compRes.data as { company_name: string | null; email: string | null; phone: string | null } | null;

    const managerName =
      cleanText(manager?.full_name) ||
      [cleanText(manager?.first_name), cleanText(manager?.last_name)].filter(Boolean).join(" ") ||
      cleanText(manager?.email) ||
      null;
    const clientDisplayName =
      client?.client_type === "company"
        ? cleanText(comp?.company_name) || cleanText(client?.display_name)
        : [cleanText(ind?.first_name), cleanText(ind?.last_name)].filter(Boolean).join(" ") || cleanText(client?.display_name);

    const contactDisplayName =
      cleanText(contact?.full_name) ||
      [cleanText(contact?.first_name), cleanText(contact?.last_name)].filter(Boolean).join(" ") ||
      null;

    return NextResponse.json({
      id: String(order.id),
      orderNumber: order.order_number ?? null,
      displayOrderNumber: formatDisplayOrderNumber({
        orderNumber: order.order_number,
        orderId: order.id,
      }),
      clientId: order.client_id ? String(order.client_id) : null,
      clientType: client?.client_type ?? null,
      clientDisplayName: clientDisplayName || "Unknown client",
      clientEmail:
        cleanText(client?.client_type === "company" ? comp?.email : ind?.email) ||
        cleanText(client?.primary_email) ||
        null,
      clientPhone:
        cleanText(client?.client_type === "company" ? comp?.phone : ind?.phone) ||
        cleanText(client?.primary_phone) ||
        null,
      contactId: order.contact_id ? String(order.contact_id) : null,
      contactDisplayName,
      contactRole: cleanText(contact?.job_title) || null,
      managerName,
      createdByName: null,
      amount: Number(order.amount ?? 0),
      status: cleanText(order.status),
      createdAt: order.created_at,
      dueDate: order.due_date,
      description: cleanText(order.description) || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load order preview";
    const status = message === "Not authenticated" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
