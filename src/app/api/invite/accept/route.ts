import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildNameFromParts } from "@/lib/user-display";

function clean(v: any) {
  return String(v ?? "").trim();
}

function getBaseUrl(req: Request) {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) return site.replace(/\/$/, "");

  const origin = req.headers.get("origin")?.trim();
  if (origin) return origin.replace(/\/$/, "");

  const app = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (app) return app.replace(/\/$/, "");

  return "http://localhost:3000";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderEmailLayout(input: {
  baseUrl: string;
  title: string;
  body: string;
}) {
  const logoUrl = `${input.baseUrl}/email-logo.png`;
  return `
    <div style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;padding:24px;">
        <img src="${escapeHtml(logoUrl)}" alt="Ordo" width="72" height="72" style="display:block;border:0;outline:none;text-decoration:none;" />
        <h1 style="font-size:22px;line-height:1.3;margin:18px 0 10px 0;">${escapeHtml(input.title)}</h1>
        <div style="font-size:15px;line-height:1.6;color:#374151;">${input.body}</div>
      </div>
    </div>
  `;
}

function buildFullName(firstName: string, lastName: string, fullName: string) {
  const fn = clean(firstName);
  const ln = clean(lastName);
  const full = clean(fullName);

  if (full.length >= 2) return full;
  const joined = [fn, ln].filter(Boolean).join(" ").trim();
  return joined;
}

async function sendManagerAcceptedEmail(input: {
  to: string;
  businessSlug: string;
  baseUrl: string;
}) {
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.INVITE_FROM_EMAIL || process.env.RESEND_FROM_EMAIL;
  if (!resendKey || !fromEmail) return;

  const { Resend } = await import("resend");
  const resend = new Resend(resendKey);

  await resend.emails.send({
    from: fromEmail,
    to: input.to,
    subject: `Access confirmed for ${input.businessSlug}`,
    html: renderEmailLayout({
      baseUrl: input.baseUrl,
      title: "Access confirmed",
      body: `<p style="margin:0;">Your manager access for <strong>${escapeHtml(input.businessSlug)}</strong> is active.</p><p style="margin:12px 0 0 0;">You can now sign in and manage orders.</p>`,
    }),
  });
}

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();

  const body = await req.json().catch(() => ({}));
  const baseUrl = getBaseUrl(req);
  const invite_id = clean(body?.inviteId || body?.invite_id);

  const firstName = clean(body?.firstName);
  const lastName = clean(body?.lastName);
  const fullName = buildFullName(firstName, lastName, clean(body?.fullName));

  if (!invite_id) {
    return NextResponse.json({ ok: false, error: "invite_id required" }, { status: 400 });
  }

  // 1) текущий пользователь (cookie session)
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }
  const user = authData.user;

  // 2) инвайт из базы (service role)
  const { data: inv, error: invErr } = await admin
    .from("business_invites")
    .select("id,business_id,email,status,role")
    .eq("id", invite_id)
    .limit(1)
    .maybeSingle();

  if (invErr) {
    return NextResponse.json({ ok: false, error: invErr.message }, { status: 400 });
  }
  if (!inv) {
    return NextResponse.json(
      { ok: false, error: "Invite not found (revoked/expired/invalid link)" },
      { status: 404 },
    );
  }

  if (String(inv.status).toUpperCase() !== "PENDING") {
    return NextResponse.json({ ok: false, error: "Invite is not pending" }, { status: 409 });
  }
  if (String(inv.role).toUpperCase() !== "MANAGER") {
    return NextResponse.json({ ok: false, error: "Invite role is not MANAGER" }, { status: 400 });
  }

  // 3) безопасность: email инвайта должен совпасть с email текущей сессии
  const userEmail = (user.email || "").toLowerCase();
  const inviteEmail = String(inv.email || "").toLowerCase();
  if (!userEmail || userEmail !== inviteEmail) {
    return NextResponse.json(
      { ok: false, error: "This invite does not belong to your email" },
      { status: 403 },
    );
  }

  // 4) upsert profile (service role)
  const userMeta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const metadataFirstName = clean(userMeta.first_name);
  const metadataLastName = clean(userMeta.last_name);
  const metadataFullName = clean(userMeta.full_name);

  const safeFirstName = firstName || metadataFirstName || null;
  const safeLastName = lastName || metadataLastName || null;
  const normalizedFullName =
    fullName || metadataFullName || buildNameFromParts(safeFirstName, safeLastName);

  const profilePayload = {
    id: user.id,
    email: userEmail || null,
    full_name: normalizedFullName || null,
    first_name: safeFirstName,
    last_name: safeLastName,
  };

  const { error: profErr } = await admin
    .from("profiles")
    .upsert(profilePayload, { onConflict: "id" });

  if (profErr) {
    return NextResponse.json({ ok: false, error: profErr.message }, { status: 500 });
  }

  const { error: metadataErr } = await supabase.auth.updateUser({
    data: {
      first_name: safeFirstName,
      last_name: safeLastName,
      full_name: normalizedFullName || null,
    },
  });

  if (metadataErr) {
    return NextResponse.json({ ok: false, error: metadataErr.message }, { status: 500 });
  }

  // 5) membership
  const { error: memErr } = await admin
    .from("memberships")
    .upsert(
      { business_id: inv.business_id, user_id: user.id, role: "MANAGER" },
      { onConflict: "business_id,user_id" },
    );

  if (memErr) {
    return NextResponse.json({ ok: false, error: memErr.message }, { status: 500 });
  }

  // 6) mark invite accepted
  const { error: accErr } = await admin
    .from("business_invites")
    .update({
      status: "ACCEPTED",
      accepted_at: new Date().toISOString(),
      accepted_by: user.id,
    })
    .eq("id", invite_id)
    .eq("status", "PENDING");

  if (accErr) {
    return NextResponse.json({ ok: false, error: accErr.message }, { status: 500 });
  }

  // 7) slug
  const { data: biz, error: bizErr } = await admin
    .from("businesses")
    .select("slug")
    .eq("id", inv.business_id)
    .limit(1)
    .maybeSingle();

  if (bizErr) {
    return NextResponse.json({ ok: false, error: bizErr.message }, { status: 500 });
  }
  if (!biz?.slug) {
    return NextResponse.json({ ok: false, error: "Business not found" }, { status: 500 });
  }

  try {
    await sendManagerAcceptedEmail({ to: userEmail, businessSlug: biz.slug, baseUrl });
  } catch {
    // non-blocking email notification
  }

  return NextResponse.json({ ok: true, businessSlug: biz.slug });
}
