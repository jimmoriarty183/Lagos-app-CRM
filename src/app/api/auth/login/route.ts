import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServerReadOnly } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/phone";

const SUPABASE_DEBUG = process.env.SUPABASE_DEBUG === "1";

type LoginBusinessRow = {
  id: string;
  slug: string | null;
  owner_phone: string | null;
  manager_phone: string | null;
  owner_id: string | null;
};

type MembershipRow = {
  user_id: string | null;
  role: string | null;
  created_at: string | null;
};

function debugLog(message: string, payload?: Record<string, unknown>) {
  if (!SUPABASE_DEBUG) return;
  console.log(`[supabase-debug][api/auth/login] ${message}`, payload ?? {});
}

function safePath(input: unknown): string {
  const s = typeof input === "string" ? input : "";
  return s.startsWith("/") ? s : "/";
}

function isMissingRelationError(error: { message?: string } | null | undefined, relationName: string) {
  const message = String(error?.message ?? "").toLowerCase();
  const relation = relationName.toLowerCase();
  if (!message) return false;
  return (
    message.includes(`could not find the table 'public.${relation}'`) ||
    message.includes(`relation \"public.${relation}\" does not exist`) ||
    message.includes(`relation \"${relation}\" does not exist`)
  );
}

async function resolveActorIdForPhoneLogin(input: {
  businessId: string;
  ownerPhone: string | null;
  managerPhone: string | null;
  ownerId: string | null;
  normalizedPhone: string;
}) {
  const admin = supabaseAdmin();
  const isOwnerPhone = normalizePhone(input.ownerPhone ?? "") === input.normalizedPhone;
  const isManagerPhone = normalizePhone(input.managerPhone ?? "") === input.normalizedPhone;

  if (isOwnerPhone && input.ownerId) return input.ownerId;

  let query = admin
    .from("memberships")
    .select("user_id, role, created_at")
    .eq("business_id", input.businessId)
    .order("created_at", { ascending: true });

  if (isOwnerPhone) query = query.eq("role", "OWNER");
  if (isManagerPhone) query = query.eq("role", "MANAGER");

  const { data, error } = await query;
  if (error) return null;

  const rows = (data ?? []) as MembershipRow[];
  const first = rows.find((item) => String(item.user_id ?? "").trim());
  return first ? String(first.user_id) : null;
}

async function trackPhoneLoginEvent(input: {
  businessId: string;
  slug: string | null;
  actorId: string | null;
  normalizedPhone: string;
}) {
  const admin = supabaseAdmin();
  const { error } = await admin.from("activity_events").insert({
    business_id: input.businessId,
    entity_type: "session",
    entity_id: `phone:${input.normalizedPhone}`,
    actor_id: input.actorId,
    actor_type: input.actorId ? "user" : "system",
    event_type: "user.signed_in",
    payload: { source: "phone_login", slug: input.slug ?? null },
    visibility: "internal",
    source: "api.auth.login",
    created_at: new Date().toISOString(),
  });

  if (!error) return;
  if (isMissingRelationError(error, "activity_events")) return;

  console.error("[api/auth/login] failed to track phone login event", {
    businessId: input.businessId,
    actorId: input.actorId,
    error: error.message,
  });
}

export async function POST(req: Request) {
  const body: Record<string, unknown> = await req.json().catch(() => ({}));

  const phoneRaw = String(body?.phone || "");
  const phone = normalizePhone(phoneRaw);
  debugLog("request payload parsed", {
    hasPhone: Boolean(phone),
    next: safePath(body?.next),
  });

  if (!phone) {
    return NextResponse.json({ error: "Invalid phone format" }, { status: 400 });
  }

  const next = safePath(body?.next);

  const cookieStore = await cookies();
  cookieStore.set("ord_session", phone, { httpOnly: true, sameSite: "lax", path: "/" });
  cookieStore.set("ord_phone", phone, { httpOnly: true, sameSite: "lax", path: "/" });

  try {
    const supabase = await supabaseServerReadOnly();
    const [{ data: sessionData }, { data: userData }] = await Promise.all([
      supabase.auth.getSession(),
      supabase.auth.getUser(),
    ]);
    debugLog("auth context", {
      hasSession: Boolean(sessionData.session),
      userId: userData.user?.id ?? null,
    });

    const { data, error } = await supabase
      .from("businesses")
      .select("id, slug, owner_phone, manager_phone, owner_id")
      .or(`owner_phone.eq.${phone},manager_phone.eq.${phone}`)
      .limit(1)
      .maybeSingle();

    if (error) {
      debugLog("business lookup failed", { error: error.message });
      console.error("[api/auth/login] businesses lookup failed", {
        phone,
        error: error.message,
      });
    } else if (data?.slug && data?.id) {
      const business = data as LoginBusinessRow;
      const actorId = await resolveActorIdForPhoneLogin({
        businessId: String(business.id),
        ownerPhone: business.owner_phone,
        managerPhone: business.manager_phone,
        ownerId: business.owner_id,
        normalizedPhone: phone,
      });

      await trackPhoneLoginEvent({
        businessId: String(business.id),
        slug: business.slug,
        actorId,
        normalizedPhone: phone,
      });

      debugLog("business lookup success", { slug: business.slug, actorId });
      if (next && next !== "/") {
        return NextResponse.json({ phone, redirectTo: next });
      }
      return NextResponse.json({ phone, redirectTo: `/b/${business.slug}` });
    }
  } catch (error) {
    console.error("[api/auth/login] supabase init failed", { error });
  }

  if (next && next !== "/") {
    return NextResponse.json({ phone, redirectTo: next });
  }

  return NextResponse.json({ phone, redirectTo: "/" });
}
