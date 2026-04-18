import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import TeamAccessTopBar from "@/app/b/[slug]/settings/team/TeamAccessTopBar";
import { getAdminUsersPath, isAdminEmail } from "@/lib/admin-access";
import { resolveOwnerAccountId } from "@/lib/businesses/business-limits-service";
import { resolveCurrentWorkspace } from "@/lib/platform/workspace";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServerReadOnly } from "@/lib/supabase/server";
import { loadUserProfileSafe } from "@/lib/profile";
import { resolveUserDisplay } from "@/lib/user-display";

import TeamMatrix, { type BusinessRef, type InviteRow, type MemberRow } from "./TeamMatrix";

type Role = "OWNER" | "MANAGER" | "GUEST";

function upperRole(value: string | null | undefined): Role {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "OWNER") return "OWNER";
  if (normalized === "MANAGER") return "MANAGER";
  return "GUEST";
}

export default async function TeamSettingsPage() {
  const [{ user, workspace: cookieWorkspace, workspaces }, supabase] = await Promise.all([
    resolveCurrentWorkspace(),
    supabaseServerReadOnly(),
  ]);

  if (!user) redirect("/login?next=/app/settings/team");
  if (!cookieWorkspace) redirect("/select-business");

  const workspace = cookieWorkspace;
  const accountLabel = user.email || user.phone || "User";
  let currentUserName = accountLabel;
  let currentUserAvatarUrl: string | undefined;
  const adminHref = isAdminEmail(user.email) ? getAdminUsersPath() : undefined;

  try {
    const profile = await loadUserProfileSafe(supabase, user.id);
    const display = resolveUserDisplay({
      full_name: profile?.full_name ?? String(user.user_metadata?.full_name ?? ""),
      first_name: profile?.first_name ?? String(user.user_metadata?.first_name ?? ""),
      last_name: profile?.last_name ?? String(user.user_metadata?.last_name ?? ""),
      email: profile?.email ?? user.email ?? null,
      phone: user.phone ?? null,
    });
    currentUserName = display.primary;
    const avatarUrl = String(profile?.avatar_url ?? user.user_metadata?.avatar_url ?? "").trim();
    currentUserAvatarUrl = avatarUrl || undefined;
  } catch {
    currentUserName = accountLabel;
  }

  const admin = supabaseAdmin();

  const accountId = await resolveOwnerAccountId(admin, user.id);

  let accessDeniedReason: string | null = null;
  let canManageTeam = false;

  if (accountId) {
    const { data: canData, error: canErr } = await admin.rpc("user_can_manage_team", {
      p_user_id: user.id,
      p_account_id: accountId,
    });
    if (canErr) {
      accessDeniedReason = "Unable to verify permissions.";
    } else {
      canManageTeam = Boolean(canData);
      if (!canManageTeam) accessDeniedReason = "Only the account owner or delegated managers can manage the team.";
    }
  } else {
    accessDeniedReason = "No billing account found for this user.";
  }

  let businesses: BusinessRef[] = [];
  let members: MemberRow[] = [];
  let pendingInvites: InviteRow[] = [];
  let seatsUsed = 0;
  let seatLimit: number | null = null;

  if (accountId && canManageTeam) {
    const bizRes = await admin
      .from("businesses")
      .select("id, slug, name")
      .eq("account_id", accountId)
      .order("created_at", { ascending: true });
    businesses = (bizRes.data ?? []).map((b: { id: string; slug: string; name: string | null }) => ({
      id: String(b.id),
      slug: String(b.slug),
      name: String(b.name ?? "").trim() || String(b.slug),
    }));

    const businessIds = businesses.map((b) => b.id);

    if (businessIds.length > 0) {
      // memberships has no FK to profiles, so we fetch them separately and
      // merge in JS (PostgREST implicit joins require a declared relationship).
      const membershipsRes = await admin
        .from("memberships")
        .select("business_id, user_id, role, can_manage_team")
        .in("business_id", businessIds);

      const rows = (membershipsRes.data ?? []) as Array<{
        business_id: string;
        user_id: string;
        role: string | null;
        can_manage_team: boolean | null;
      }>;

      const userIds = Array.from(new Set(rows.map((r) => String(r.user_id))));

      type ProfileRow = {
        id: string;
        email: string | null;
        full_name: string | null;
        first_name: string | null;
        last_name: string | null;
        avatar_url: string | null;
      };
      const profilesById = new Map<string, ProfileRow>();
      if (userIds.length > 0) {
        const profilesRes = await admin
          .from("profiles")
          .select("id, email, full_name, first_name, last_name, avatar_url")
          .in("id", userIds);
        for (const row of (profilesRes.data ?? []) as ProfileRow[]) {
          profilesById.set(String(row.id), row);
        }
      }

      // Fallback for auth.users emails in case profiles row is missing.
      const authEmailsById = new Map<string, string>();
      if (userIds.length > 0) {
        const authRes = await admin
          .from("users")
          .select("id, email")
          .in("id", userIds);
        if (authRes.error) {
          // `auth.users` is not exposed via PostgREST by default. Use admin API.
          for (const uid of userIds) {
            try {
              const got = await admin.auth.admin.getUserById(uid);
              const email = String(got.data.user?.email ?? "").trim();
              if (email) authEmailsById.set(uid, email);
            } catch {
              // skip
            }
          }
        }
      }

      const byUser = new Map<string, MemberRow>();
      for (const row of rows) {
        const userId = String(row.user_id);
        const profile = profilesById.get(userId) ?? null;
        const authEmail = authEmailsById.get(userId) ?? null;
        const role = upperRole(row.role);
        const existing = byUser.get(userId);
        if (existing) {
          existing.businessIds.push(String(row.business_id));
          if (role === "OWNER") existing.isOwner = true;
          if (row.can_manage_team) existing.canManageTeam = true;
        } else {
          const resolvedEmail = String(profile?.email ?? authEmail ?? "").trim().toLowerCase();
          const display = profile
            ? resolveUserDisplay({
                full_name: profile.full_name,
                first_name: profile.first_name,
                last_name: profile.last_name,
                email: profile.email ?? authEmail,
              })
            : null;
          byUser.set(userId, {
            userId,
            email: resolvedEmail,
            name: display?.primary ?? resolvedEmail,
            avatarUrl: String(profile?.avatar_url ?? "").trim() || null,
            isOwner: role === "OWNER",
            canManageTeam: Boolean(row.can_manage_team),
            businessIds: [String(row.business_id)],
          });
        }
      }
      members = Array.from(byUser.values()).sort((a, b) => {
        if (a.isOwner !== b.isOwner) return a.isOwner ? -1 : 1;
        return (a.name || a.email).localeCompare(b.name || b.email);
      });

      const invRes = await admin
        .from("account_invites")
        .select("id, email, can_manage_team, created_at, expires_at, token")
        .eq("account_id", accountId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      const invRows = (invRes.data ?? []) as Array<{
        id: string;
        email: string;
        can_manage_team: boolean;
        created_at: string;
        expires_at: string;
        token: string;
      }>;

      let inviteAccessByInvite: Record<string, string[]> = {};
      if (invRows.length > 0) {
        const accessRes = await admin
          .from("account_invite_business_access")
          .select("invite_id, business_id")
          .in("invite_id", invRows.map((i) => i.id));
        inviteAccessByInvite = (accessRes.data ?? []).reduce<Record<string, string[]>>((acc, r) => {
          const row = r as { invite_id: string; business_id: string };
          const arr = acc[row.invite_id] ?? [];
          arr.push(String(row.business_id));
          acc[row.invite_id] = arr;
          return acc;
        }, {});
      }

      // Legacy per-business invites (pre-Phase-4). Surface them so users can
      // see what's holding seats and revoke them. New invites should use
      // the unified /api/account/team/invite flow.
      const legacyInvRes = await admin
        .from("business_invites")
        .select("id, business_id, email, status, created_at, expires_at, revoked_at")
        .in("business_id", businessIds)
        .ilike("status", "pending")
        .is("revoked_at", null);

      const legacyInvRows = (legacyInvRes.data ?? []) as Array<{
        id: string;
        business_id: string;
        email: string;
        status: string;
        created_at: string | null;
        expires_at: string | null;
        revoked_at: string | null;
      }>;

      pendingInvites = [
        ...invRows.map((row) => ({
          id: String(row.id),
          email: String(row.email),
          canManageTeam: Boolean(row.can_manage_team),
          expiresAt: String(row.expires_at),
          businessIds: inviteAccessByInvite[row.id] ?? [],
          isLegacy: false,
        })),
        ...legacyInvRows.map((row) => ({
          id: String(row.id),
          email: String(row.email),
          canManageTeam: false,
          expiresAt: String(
            row.expires_at ?? new Date(Date.now() + 14 * 86400 * 1000).toISOString(),
          ),
          businessIds: [String(row.business_id)],
          isLegacy: true,
        })),
      ];
    }

    const [{ data: seatsData }, { data: limitData }] = await Promise.all([
      admin.rpc("count_account_seats", { p_account_id: accountId }),
      admin.rpc("resolve_account_int_limit", { p_account_id: accountId, p_feature_key: "max_members_per_account" }),
    ]);
    seatsUsed = Number(seatsData ?? 0);
    seatLimit = limitData === null || limitData === undefined ? null : Number(limitData);
  }

  const content = (
    <div className="rounded-3xl border border-[#E5E7EB] bg-white/92 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
      <Link
        href="/app/settings"
        className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-semibold text-[#374151] transition hover:border-[#D6DAE1] hover:bg-[#FCFCFD]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </Link>
      <div className="mt-2 inline-flex items-center rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
        Account settings
      </div>
      <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-[#111827]">Team &amp; Invites</h1>
      <p className="mt-1 max-w-[640px] text-[13px] leading-4 text-[#6B7280]">
        Manage team members and outgoing invites across all your businesses. Invite people once — grant access to one or more businesses with checkboxes.
      </p>

      {accessDeniedReason ? (
        <div className="mt-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-[13px] leading-5 text-[#991B1B]">
          {accessDeniedReason}
        </div>
      ) : null}

      {accountId && canManageTeam ? (
        <TeamMatrix
          accountId={accountId}
          businesses={businesses}
          members={members}
          pendingInvites={pendingInvites}
          seatsUsed={seatsUsed}
          seatLimit={seatLimit}
          currentUserId={user.id}
        />
      ) : null}
    </div>
  );

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#EEF2FF_100%)] text-[#111827]">
      <TeamAccessTopBar
        ordersHref={`/b/${workspace.slug}`}
        userLabel={currentUserName}
        profileHref="/app/profile"
        currentPlan={null}
        businessId={workspace.id}
        adminHref={adminHref}
        userAvatarUrl={currentUserAvatarUrl}
        businesses={(workspaces ?? []).map((item) => ({
          id: item.id,
          slug: item.slug,
          name: item.name || item.slug,
          role: upperRole(item.role),
          isAdmin: Boolean(adminHref),
        }))}
        currentBusinessSlug={workspace.slug}
      />

      <div className="container-standard pb-6 pt-[66px] sm:pt-[68px]">
        <div className="mx-auto max-w-[960px]">{content}</div>
      </div>
    </main>
  );
}
