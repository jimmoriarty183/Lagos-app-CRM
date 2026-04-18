"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Mail, Plus, Shield, Trash2, UserRound, X } from "lucide-react";

export type BusinessRef = { id: string; slug: string; name: string };

export type MemberRow = {
  userId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  isOwner: boolean;
  canManageTeam: boolean;
  businessIds: string[];
};

export type InviteRow = {
  id: string;
  email: string;
  canManageTeam: boolean;
  expiresAt: string;
  businessIds: string[];
  // Legacy = pre-Phase-4 invite from business_invites table. Revoke uses a
  // different endpoint and the row is per-business rather than account-wide.
  isLegacy?: boolean;
};

type Props = {
  accountId: string;
  businesses: BusinessRef[];
  members: MemberRow[];
  pendingInvites: InviteRow[];
  seatsUsed: number;
  seatLimit: number | null;
  currentUserId: string;
};

export default function TeamMatrix({
  accountId,
  businesses,
  members,
  pendingInvites,
  seatsUsed,
  seatLimit,
  currentUserId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const atLimit = seatLimit !== null && seatsUsed >= seatLimit;
  const progress = seatLimit === null ? 0 : Math.min(100, Math.round((seatsUsed / Math.max(seatLimit, 1)) * 100));
  const progressTone = atLimit ? "bg-red-500" : progress > 80 ? "bg-amber-500" : "bg-emerald-500";

  const allBusinessIds = useMemo(() => businesses.map((b) => b.id), [businesses]);

  async function call(path: string, method: string, body: unknown, key: string) {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch(path, {
        method,
        headers: { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok || json.ok === false) {
        setError(String(json.error || json.message || "Request failed"));
        return false;
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      return false;
    } finally {
      setBusy(null);
    }
  }

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function toggleMembership(userId: string, businessId: string, currentlyHas: boolean) {
    const ok = await call(
      "/api/account/team/member",
      "PATCH",
      { accountId, userId, businessId, action: currentlyHas ? "remove" : "add" },
      `${userId}:${businessId}`,
    );
    if (ok) refresh();
  }

  async function togglePermission(userId: string, next: boolean) {
    const ok = await call(
      "/api/account/team/member",
      "PATCH",
      { accountId, userId, action: "set_can_manage_team", canManageTeam: next },
      `perm:${userId}`,
    );
    if (ok) refresh();
  }

  async function removeMember(userId: string) {
    if (!confirm("Remove this member from all businesses in the account?")) return;
    const ok = await call(
      "/api/account/team/member",
      "DELETE",
      { accountId, userId },
      `del:${userId}`,
    );
    if (ok) refresh();
  }

  async function revokeInvite(inviteId: string, isLegacy?: boolean) {
    const suffix = isLegacy ? "?legacy=1" : "";
    const ok = await call(
      `/api/account/team/invite/${inviteId}${suffix}`,
      "DELETE",
      undefined,
      `inv:${inviteId}`,
    );
    if (ok) refresh();
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Header: seat counter + invite button */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3">
        <div className="min-w-[220px]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">Team seats</div>
          <div className="mt-0.5 text-lg font-semibold text-[#111827]">
            {seatsUsed} {seatLimit === null ? "" : `/ ${seatLimit}`}
            {seatLimit === null ? <span className="ml-1 text-sm font-normal text-[#6B7280]">unlimited</span> : null}
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#F3F4F6]">
            <div className={`h-full ${progressTone}`} style={{ width: `${progress}%` }} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          disabled={atLimit || businesses.length === 0}
          className="inline-flex items-center gap-2 rounded-full bg-[#111827] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1F2937] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Invite member
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-[13px] leading-5 text-[#991B1B]">
          {error}
        </div>
      ) : null}

      {/* Members */}
      <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
        <div className="border-b border-[#F3F4F6] bg-[#F9FAFB] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
          Members ({members.length})
        </div>
        {members.length === 0 ? (
          <div className="p-4 text-sm text-[#6B7280]">No members yet.</div>
        ) : (
          <div className="divide-y divide-[#F3F4F6]">
            {members.map((m) => (
              <MemberRowView
                key={m.userId}
                member={m}
                businesses={businesses}
                allBusinessIds={allBusinessIds}
                isSelf={m.userId === currentUserId}
                onToggleBusiness={(biz) => toggleMembership(m.userId, biz, m.businessIds.includes(biz))}
                onTogglePermission={(next) => togglePermission(m.userId, next)}
                onRemove={() => removeMember(m.userId)}
                busy={busy}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pending invites */}
      {pendingInvites.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
          <div className="border-b border-[#F3F4F6] bg-[#F9FAFB] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
            Pending invites ({pendingInvites.length})
          </div>
          <div className="divide-y divide-[#F3F4F6]">
            {pendingInvites.map((inv) => (
              <InviteRowView
                key={inv.id}
                invite={inv}
                businesses={businesses}
                onRevoke={() => revokeInvite(inv.id, inv.isLegacy)}
                busy={busy}
              />
            ))}
          </div>
        </div>
      ) : null}

      {inviteOpen ? (
        <InviteModal
          accountId={accountId}
          businesses={businesses}
          onClose={() => setInviteOpen(false)}
          onSubmitted={() => {
            setInviteOpen(false);
            refresh();
          }}
          setGlobalError={setError}
          currentSeats={seatsUsed}
          seatLimit={seatLimit}
        />
      ) : null}

      {isPending ? (
        <div className="pointer-events-none fixed inset-0 z-10 flex items-start justify-center pt-16">
          <div className="flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#374151] shadow">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Refreshing…
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MemberRowView({
  member,
  businesses,
  allBusinessIds,
  isSelf,
  onToggleBusiness,
  onTogglePermission,
  onRemove,
  busy,
}: {
  member: MemberRow;
  businesses: BusinessRef[];
  allBusinessIds: string[];
  isSelf: boolean;
  onToggleBusiness: (businessId: string) => void;
  onTogglePermission: (next: boolean) => void;
  onRemove: () => void;
  busy: string | null;
}) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF2FF] text-[#4F46E5]">
          {member.avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={member.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <UserRound className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-semibold text-[#111827]">{member.name || member.email}</div>
            {member.isOwner ? (
              <span className="inline-flex items-center rounded-full bg-[#111827] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Owner</span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#4B5563]">Manager</span>
            )}
          </div>
          <div className="truncate text-xs text-[#6B7280]">{member.email}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {businesses.map((b) => {
          const has = member.businessIds.includes(b.id);
          const disabled = member.isOwner || busy === `${member.userId}:${b.id}`;
          return (
            <button
              key={b.id}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onToggleBusiness(b.id)}
              className={[
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition",
                has
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100"
                  : "bg-[#F9FAFB] text-[#6B7280] ring-1 ring-inset ring-[#E5E7EB] hover:bg-[#F3F4F6]",
                disabled ? "opacity-60" : "",
              ].join(" ")}
              title={member.isOwner ? "Owner is in all businesses" : has ? `Remove from ${b.name}` : `Add to ${b.name}`}
            >
              {has ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
              <span className="max-w-[120px] truncate">{b.name}</span>
            </button>
          );
        })}

        {!member.isOwner ? (
          <label className="ml-1 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-2.5 py-1 text-xs text-[#374151] hover:bg-[#FCFCFD]">
            <input
              type="checkbox"
              className="h-3.5 w-3.5"
              checked={member.canManageTeam}
              disabled={busy === `perm:${member.userId}`}
              onChange={(e) => onTogglePermission(e.currentTarget.checked)}
            />
            <Shield className="h-3 w-3" />
            Manage team
          </label>
        ) : null}

        {!member.isOwner && !isSelf ? (
          <button
            type="button"
            onClick={onRemove}
            disabled={busy === `del:${member.userId}`}
            className="ml-1 inline-flex items-center gap-1 rounded-full border border-[#FECACA] bg-white px-2.5 py-1 text-xs font-semibold text-[#991B1B] transition hover:bg-[#FEF2F2]"
          >
            <Trash2 className="h-3 w-3" />
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}

function InviteRowView({
  invite,
  businesses,
  onRevoke,
  busy,
}: {
  invite: InviteRow;
  businesses: BusinessRef[];
  onRevoke: () => void;
  busy: string | null;
}) {
  const namesById = useMemo(() => new Map(businesses.map((b) => [b.id, b.name])), [businesses]);
  return (
    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FEF3C7] text-[#B45309]">
          <Mail className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-semibold text-[#111827]">{invite.email}</div>
            {invite.isLegacy ? (
              <span
                title="Legacy per-business invite — counts towards your seat limit until accepted or revoked."
                className="inline-flex items-center rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#B45309]"
              >
                Legacy
              </span>
            ) : null}
          </div>
          <div className="truncate text-xs text-[#6B7280]">
            Expires {new Date(invite.expiresAt).toLocaleDateString("en-GB")}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {invite.businessIds.map((id) => (
          <span key={id} className="inline-flex items-center gap-1 rounded-full bg-[#F9FAFB] px-2.5 py-1 text-xs font-semibold text-[#4B5563] ring-1 ring-inset ring-[#E5E7EB]">
            <span className="max-w-[120px] truncate">{namesById.get(id) ?? id}</span>
          </span>
        ))}
        {invite.canManageTeam ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200">
            <Shield className="h-3 w-3" />
            Manage team
          </span>
        ) : null}
        <button
          type="button"
          onClick={onRevoke}
          disabled={busy === `inv:${invite.id}`}
          className="inline-flex items-center gap-1 rounded-full border border-[#FECACA] bg-white px-2.5 py-1 text-xs font-semibold text-[#991B1B] transition hover:bg-[#FEF2F2]"
        >
          <X className="h-3 w-3" />
          Revoke
        </button>
      </div>
    </div>
  );
}

function InviteModal({
  accountId,
  businesses,
  onClose,
  onSubmitted,
  setGlobalError,
  currentSeats,
  seatLimit,
}: {
  accountId: string;
  businesses: BusinessRef[];
  onClose: () => void;
  onSubmitted: () => void;
  setGlobalError: (v: string | null) => void;
  currentSeats: number;
  seatLimit: number | null;
}) {
  const [email, setEmail] = useState("");
  const [selectedBizIds, setSelectedBizIds] = useState<string[]>(
    businesses.length === 1 ? [businesses[0].id] : [],
  );
  const [canManageTeam, setCanManageTeam] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function submit() {
    setLocalError(null);
    const e = email.trim().toLowerCase();
    if (!e || !e.includes("@")) {
      setLocalError("Enter a valid email");
      return;
    }
    if (selectedBizIds.length === 0) {
      setLocalError("Select at least one business");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/account/team/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          accountId,
          email: e,
          businessIds: selectedBizIds,
          canManageTeam,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; code?: string; currentUsage?: number; limitValue?: number };
      if (!res.ok || json.ok === false) {
        const msg = json.code === "SEAT_LIMIT_REACHED"
          ? `You've reached ${json.limitValue ?? seatLimit} seats on your plan. Upgrade to invite more people.`
          : (json.error || "Could not send invite");
        setLocalError(msg);
        return;
      }
      onSubmitted();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
      setGlobalError(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/30 p-4 pt-16" onClick={onClose}>
      <div
        className="w-full max-w-[480px] rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#111827]">Invite team member</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-[#6B7280] hover:bg-[#F3F4F6]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-[13px] leading-5 text-[#6B7280]">
          If this email already belongs to your team, we&apos;ll add them to the selected businesses without an invite email.
        </p>

        <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">Email</div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          className="mt-1 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#4F46E5]"
        />

        <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">Access to businesses</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {businesses.map((b) => {
            const has = selectedBizIds.includes(b.id);
            return (
              <button
                key={b.id}
                type="button"
                onClick={() =>
                  setSelectedBizIds((prev) => (prev.includes(b.id) ? prev.filter((x) => x !== b.id) : [...prev, b.id]))
                }
                className={[
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition",
                  has
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                    : "bg-[#F9FAFB] text-[#6B7280] ring-1 ring-inset ring-[#E5E7EB] hover:bg-[#F3F4F6]",
                ].join(" ")}
              >
                {has ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                {b.name}
              </button>
            );
          })}
        </div>

        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs text-[#374151]">
          <input
            type="checkbox"
            checked={canManageTeam}
            onChange={(e) => setCanManageTeam(e.currentTarget.checked)}
            className="h-3.5 w-3.5"
          />
          <Shield className="h-3 w-3" />
          Can invite & manage team
        </label>

        {localError ? (
          <div className="mt-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-2.5 text-[13px] leading-5 text-[#991B1B]">
            {localError}
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-[#6B7280]">
            {seatLimit === null ? `${currentSeats} seats used` : `${currentSeats} of ${seatLimit} seats used`}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-semibold text-[#374151] hover:bg-[#FCFCFD]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-[#111827] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1F2937] disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
              Send invite
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
