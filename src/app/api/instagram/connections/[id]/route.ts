import { NextResponse, type NextRequest } from "next/server";
import { supabaseServerAction, supabaseServiceRole } from "@/lib/supabase/server";

/**
 * Per-merchant Instagram connection management.
 *
 *   PATCH  /api/instagram/connections/<id> — update catalog/prompt/enabled
 *   DELETE /api/instagram/connections/<id> — disconnect (delete row)
 *
 * Both gated by membership lookup (owner/manager only).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const SHEET_ID_PATTERN = /^[A-Za-z0-9_-]{20,}$/;
const SHEET_GID_PATTERN = /^\d+$/;

async function authorizeForConnection(
  connectionId: string,
): Promise<
  | { ok: true; userId: string; businessId: string }
  | { ok: false; status: number; error: string }
> {
  const supabase = await supabaseServerAction();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, status: 401, error: "Not authenticated" };
  }

  const admin = supabaseServiceRole();
  const { data: connection, error: connErr } = await admin
    .from("instagram_connections")
    .select("id, business_id")
    .eq("id", connectionId)
    .maybeSingle();

  if (connErr) {
    return { ok: false, status: 500, error: connErr.message };
  }
  if (!connection) {
    return { ok: false, status: 404, error: "Connection not found" };
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("business_id", connection.business_id)
    .maybeSingle();

  const role = String(membership?.role ?? "").toLowerCase();
  if (role !== "owner" && role !== "manager") {
    return {
      ok: false,
      status: 403,
      error: "Owner or manager role required",
    };
  }

  return {
    ok: true,
    userId: user.id,
    businessId: String(connection.business_id),
  };
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const auth = await authorizeForConnection(id);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => null)) as {
    catalog_sheet_id?: string | null;
    catalog_sheet_gid?: string | null;
    system_prompt?: string | null;
    shop_name?: string | null;
    shop_about?: string | null;
    shop_address?: string | null;
    shop_contact?: string | null;
    enabled?: boolean;
  } | null;

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const update: Record<string, string | boolean | null> = {};

  if ("catalog_sheet_id" in body) {
    const v = body.catalog_sheet_id;
    if (v === null || v === "") {
      update.catalog_sheet_id = null;
    } else if (typeof v === "string" && SHEET_ID_PATTERN.test(v.trim())) {
      update.catalog_sheet_id = v.trim();
    } else {
      return NextResponse.json(
        {
          error:
            "catalog_sheet_id must be empty or a Google Sheet ID (alphanumeric, ≥20 chars)",
        },
        { status: 400 },
      );
    }
  }

  if ("catalog_sheet_gid" in body) {
    const v = body.catalog_sheet_gid;
    if (v === null || v === "") {
      update.catalog_sheet_gid = "0";
    } else if (typeof v === "string" && SHEET_GID_PATTERN.test(v.trim())) {
      update.catalog_sheet_gid = v.trim();
    } else {
      return NextResponse.json(
        { error: "catalog_sheet_gid must be a number" },
        { status: 400 },
      );
    }
  }

  if ("system_prompt" in body) {
    const v = body.system_prompt;
    if (v === null || (typeof v === "string" && v.trim() === "")) {
      update.system_prompt = null;
    } else if (typeof v === "string") {
      const trimmed = v.trim();
      if (trimmed.length > 4000) {
        return NextResponse.json(
          { error: "system_prompt must be ≤4000 chars" },
          { status: 400 },
        );
      }
      update.system_prompt = trimmed;
    }
  }

  for (const key of [
    "shop_name",
    "shop_about",
    "shop_address",
    "shop_contact",
  ] as const) {
    if (key in body) {
      const v = body[key];
      if (v === null || (typeof v === "string" && v.trim() === "")) {
        update[key] = null;
      } else if (typeof v === "string") {
        const trimmed = v.trim();
        const limit = key === "shop_about" ? 2000 : 500;
        if (trimmed.length > limit) {
          return NextResponse.json(
            { error: `${key} must be ≤${limit} chars` },
            { status: 400 },
          );
        }
        update[key] = trimmed;
      }
    }
  }

  if ("enabled" in body && typeof body.enabled === "boolean") {
    update.enabled = body.enabled;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "No updatable fields supplied" },
      { status: 400 },
    );
  }

  const admin = supabaseServiceRole();
  const { data, error } = await admin
    .from("instagram_connections")
    .update(update)
    .eq("id", id)
    .select(
      "id, ig_username, catalog_sheet_id, catalog_sheet_gid, system_prompt, shop_name, shop_about, shop_address, shop_contact, enabled",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, connection: data });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const auth = await authorizeForConnection(id);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const admin = supabaseServiceRole();
  const { error } = await admin
    .from("instagram_connections")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: id });
}
