import type { SupabaseClient } from "@supabase/supabase-js";

type SendAccountInviteEmailInput = {
  admin: SupabaseClient;
  email: string;
  token: string;
  inviteId: string;
  baseUrl: string;
  businessNames: string[]; // one or more, for subject/body copy
  invitedByLabel?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderEmail(opts: {
  baseUrl: string;
  title: string;
  body: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  const logoUrl = `${opts.baseUrl}/email-logo.png`;
  return `
    <div style="margin:0;padding:24px;background:#f3f4f6;font-family:Geist,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;padding:24px;">
        <img src="${escapeHtml(logoUrl)}" alt="Ordo" width="72" height="72" style="display:block;border:0;outline:none;text-decoration:none;" />
        <h1 style="font-size:22px;line-height:1.3;margin:18px 0 10px 0;">${escapeHtml(opts.title)}</h1>
        <div style="font-size:15px;line-height:1.6;color:#374151;">${opts.body}</div>
        <p style="margin:20px 0 0 0;">
          <a href="${escapeHtml(opts.ctaHref)}" style="display:inline-block;background:#4F46E5;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;">${escapeHtml(opts.ctaLabel)}</a>
        </p>
      </div>
    </div>
  `;
}

function isAlreadyRegisteredError(message: string) {
  const m = message.toLowerCase();
  return m.includes("already been registered") || m.includes("already registered");
}

// Sends an invitation email for an account-scoped invite. Mirrors the proven
// flow used by the legacy `/api/manager/invite` endpoint:
//
//   • NEW user → `auth.admin.inviteUserByEmail(email, { redirectTo })`.
//     Supabase delivers the email through whatever SMTP / template is
//     configured in the project settings (e.g. Resend via custom SMTP with a
//     customised "Invite user" template).
//
//   • EXISTING user → Supabase rejects the call with "already registered".
//     We fall back to `generateLink({ type: 'magiclink' })` and deliver the
//     link ourselves via Resend with our branded template.
export async function sendAccountInviteEmail(
  input: SendAccountInviteEmailInput,
): Promise<{ sent: boolean; existingUser: boolean; reason?: string }> {
  const { admin, email, token, baseUrl, businessNames, invitedByLabel } = input;
  const normalized = String(email ?? "").trim().toLowerCase();
  if (!normalized) return { sent: false, existingUser: false, reason: "empty email" };

  const redirectTo = `${baseUrl.replace(/\/$/, "")}/invite?token=${encodeURIComponent(token)}`;

  const bizPhrase =
    businessNames.length === 0
      ? "a workspace"
      : businessNames.length === 1
        ? businessNames[0]
        : `${businessNames.length} workspaces`;

  const actor = invitedByLabel ? `${invitedByLabel} invited you` : "You were invited";

  // New user → Supabase sends via the configured SMTP / template.
  const { error: authErr } = await admin.auth.admin.inviteUserByEmail(normalized, {
    redirectTo,
  });

  if (!authErr) {
    return { sent: true, existingUser: false };
  }

  if (!isAlreadyRegisteredError(authErr.message)) {
    return { sent: false, existingUser: false, reason: authErr.message };
  }

  // Existing user → magic link + Resend branded template.
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: normalized,
    options: { redirectTo },
  });
  if (linkErr || !linkData?.properties?.action_link) {
    return { sent: false, existingUser: true, reason: linkErr?.message ?? "no action link" };
  }

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.INVITE_FROM_EMAIL || process.env.RESEND_FROM_EMAIL;
  if (!resendKey || !fromEmail) {
    return { sent: false, existingUser: true, reason: "resend not configured" };
  }

  const { Resend } = await import("resend");
  const resend = new Resend(resendKey);

  await resend.emails.send({
    from: fromEmail,
    to: normalized,
    subject: `${actor} to join ${bizPhrase} on Ordo`,
    html: renderEmail({
      baseUrl,
      title: `${actor} to join ${bizPhrase}`,
      body: `<p style="margin:0;">Click below to review the invitation and confirm access.</p>${
        businessNames.length > 1
          ? `<p style="margin:12px 0 0 0;color:#6B7280;">Businesses: ${businessNames
              .map((name) => `<strong>${escapeHtml(name)}</strong>`)
              .join(", ")}.</p>`
          : ""
      }`,
      ctaHref: linkData.properties.action_link,
      ctaLabel: "Open invitation",
    }),
  });

  return { sent: true, existingUser: true };
}

export function inferBaseUrl(req: Request): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) return site.replace(/\/$/, "");
  const origin = req.headers.get("origin")?.trim();
  if (origin) return origin.replace(/\/$/, "");
  const app = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (app) return app.replace(/\/$/, "");
  return "http://localhost:3000";
}
