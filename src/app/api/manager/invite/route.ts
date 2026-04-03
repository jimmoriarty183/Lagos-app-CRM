import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function json(status: number, payload: unknown) {
  return NextResponse.json(payload, { status });
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

function isAlreadyRegisteredError(message: string) {
  const m = message.toLowerCase();
  return m.includes("already been registered") || m.includes("already registered");
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
  ctaHref?: string;
  ctaLabel?: string;
}) {
  const logoUrl = `${input.baseUrl}/email-logo.png`;
  const ctaBlock =
    input.ctaHref && input.ctaLabel
      ? `<p style="margin:20px 0 0 0;"><a href="${escapeHtml(input.ctaHref)}" style="display:inline-block;background:#6366F1;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;">${escapeHtml(input.ctaLabel)}</a></p>`
      : "";

  return `
    <div style="margin:0;padding:24px;background:#f3f4f6;font-family:Geist,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;padding:24px;">
        <img src="${escapeHtml(logoUrl)}" alt="Ordo" width="72" height="72" style="display:block;border:0;outline:none;text-decoration:none;" />
        <h1 style="font-size:22px;line-height:1.3;margin:18px 0 10px 0;">${escapeHtml(input.title)}</h1>
        <div style="font-size:15px;line-height:1.6;color:#374151;">${input.body}</div>
        ${ctaBlock}
      </div>
    </div>
  `;
}

async function sendExistingUserAccessEmail(input: {
  to: string;
  actionLink: string;
  businessSlug: string;
  baseUrl: string;
}) {
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.INVITE_FROM_EMAIL || process.env.RESEND_FROM_EMAIL;
  if (!resendKey || !fromEmail) return false;

  const { Resend } = await import("resend");
  const resend = new Resend(resendKey);

  await resend.emails.send({
    from: fromEmail,
    to: input.to,
    subject: `You've been granted manager access to ${input.businessSlug}`,
    html: renderEmailLayout({
      baseUrl: input.baseUrl,
      title: "Manager access granted",
      body: `<p style="margin:0;">You already have an account.</p><p style="margin:12px 0 0 0;">Click below to confirm access to <strong>${escapeHtml(input.businessSlug)}</strong>.</p>`,
      ctaHref: input.actionLink,
      ctaLabel: "Open business access",
    }),
  });

  return true;
}

export async function POST(req: Request) {
  try {
    const body: Record<string, unknown> = await req.json().catch(() => ({}));
    const business_id = String(body?.business_id || body?.businessId || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();

    if (!business_id) return json(400, { error: "business_id required" });
    if (!email) return json(400, { error: "email required" });

    const supabase = supabaseAdmin();

    const { data: existing, error: selErr } = await supabase
      .from("business_invites")
      .select("id,status")
      .eq("business_id", business_id)
      .eq("email", email)
      .maybeSingle();

    if (selErr) {
      console.error("[api/manager/invite] failed to load existing invite", { error: selErr.message });
      return json(500, { error: selErr.message });
    }

    let invite_id: string;

    if (existing?.id) {
      if (existing.status === "PENDING") {
        invite_id = existing.id;
      } else {
        const { error: updErr } = await supabase
          .from("business_invites")
          .update({
            status: "PENDING",
            accepted_at: null,
            accepted_by: null,
            revoked_at: null,
            revoked_by: null,
          })
          .eq("id", existing.id);

        if (updErr) {
          console.error("[api/manager/invite] failed to reactivate invite", { error: updErr.message });
          return json(500, { error: updErr.message });
        }
        invite_id = existing.id;
      }
    } else {
      const { data: created, error: createErr } = await supabase
        .from("business_invites")
        .insert({
          business_id,
          email,
          role: "MANAGER",
          status: "PENDING",
        })
        .select("id")
        .limit(1)
        .maybeSingle();

      if (createErr || !created?.id) {
        if (createErr) {
          console.error("[api/manager/invite] failed to create invite", { error: createErr.message });
        }
        return json(500, { error: createErr?.message || "Insert failed" });
      }
      invite_id = created.id;
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("slug")
      .eq("id", business_id)
      .maybeSingle();

    const businessSlug = String(business?.slug || "business");

    const baseUrl = getBaseUrl(req);
    const redirectTo = `${baseUrl}/invite?invite_id=${encodeURIComponent(invite_id)}`;

    const { error: authErr } = await supabase.auth.admin.inviteUserByEmail(email, { redirectTo });

    if (authErr && isAlreadyRegisteredError(authErr.message)) {
      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo },
      });

      if (linkErr || !linkData?.properties?.action_link) {
        return json(400, {
          error: `Supabase existing-user link failed: ${linkErr?.message || "No action link"}`,
          invite_id,
          redirectTo,
        });
      }

      const sent = await sendExistingUserAccessEmail({
        to: email,
        actionLink: linkData.properties.action_link,
        businessSlug,
        baseUrl,
      });

      return json(200, {
        ok: true,
        invite_id,
        email,
        status: "PENDING",
        email_sent: sent,
        redirectTo,
        existing_user: true,
      });
    }

    if (authErr) {
      return json(400, {
        error: `Supabase invite email failed: ${authErr.message}`,
        invite_id,
        redirectTo,
      });
    }

    return json(200, {
      ok: true,
      invite_id,
      email,
      status: "PENDING",
      email_sent: true,
      redirectTo,
      existing_user: false,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return json(500, { error: message });
  }
}
