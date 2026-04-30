"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Crown, Mail, User } from "lucide-react";
import InviteManager from "./InviteManager";
import { resolveUserDisplay } from "@/lib/user-display";
import { EmptyState as UiEmptyState } from "@/components/ui/empty-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Role = "OWNER" | "MANAGER" | "GUEST";

type OwnerProfile = {
  id: string;
  full_name: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email: string | null;
  phone?: string | null;
  profile_missing?: boolean;
  safe_fallback?: string | null;
};

type ActiveManager = {
  user_id: string;
  full_name: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone: string | null;
  profile_missing?: boolean;
  safe_fallback?: string | null;
};

type PendingManager = {
  invite_id: string;
  email: string;
  created_at?: string | null;
};

type ManagerState =
  | { state: "NONE" }
  | { state: "PENDING"; email: string; created_at?: string }
  | {
      state: "ACTIVE";
      user_id: string;
      full_name: string | null;
      first_name?: string | null;
      last_name?: string | null;
      email?: string | null;
      phone: string | null;
    };

type StatusResponse = {
  viewer_role?: Role;
  owner?: OwnerProfile | null;
  viewer_manager?: ActiveManager | null;
  manager?: ManagerState;
  managers_active?: ActiveManager[];
  managers_pending?: PendingManager[];
};

type Props = {
  businessId?: string | null;
  businessSlug?: string | null;
  initialOwner?: OwnerProfile | null;
  role: Role;
  isOwnerManager: boolean;
  currentUserId?: string | null;
  pendingInvites?: Array<{ id?: string; email?: string; created_at?: string | null }>;
  mode?: "summary" | "manage" | "teamOnly";
};

function Pill({
  tone,
  children,
}: {
  tone: "gray" | "blue" | "amber" | "red";
  children: React.ReactNode;
}) {
  const cls =
    tone === "blue"
      ? "border-blue-100 bg-blue-50 text-blue-700"
      : tone === "amber"
        ? "border-amber-100 bg-amber-50 text-amber-700"
        : tone === "red"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] text-slate-700 dark:text-white/80";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold ${cls}`}
    >
      {children}
    </span>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 max-w-full space-y-2.5 sm:space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="product-section-title text-slate-700 dark:text-white/80">
          {title}
          {typeof count === "number" ? ` (${count})` : ""}
        </h2>
      </div>
      {children}
    </section>
  );
}

function RowShell({
  icon,
  primary,
  secondary,
  meta,
  action,
  tone = "default",
}: {
  icon: React.ReactNode;
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  tone?: "default" | "owner";
}) {
  return (
    <div
      className={[
        "flex w-full min-w-0 max-w-full flex-col gap-2 rounded-xl border p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-2.5",
        tone === "owner"
          ? "border-blue-100 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)]"
          : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03]",
      ].join(" ")}
    >
      <div className="flex min-w-0 max-w-full items-start gap-3 sm:items-center">
        <div
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border sm:h-10 sm:w-10",
            tone === "owner"
              ? "border-blue-100 bg-blue-50 text-blue-700"
              : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] text-slate-600 dark:text-white/70",
          ].join(" ")}
        >
          {icon}
        </div>

        <div className="min-w-0 max-w-full flex-1">
          <div className="flex min-w-0 flex-col items-start gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-1.5">
            <div className="min-w-0 break-words text-[14px] font-semibold leading-5 text-slate-900 dark:text-white sm:text-[14px]">
              {primary}
            </div>
            {meta ? <div className="flex flex-wrap items-center gap-2">{meta}</div> : null}
          </div>
          {secondary ? (
            <div className="mt-0.5 min-w-0 break-words text-[12px] leading-5 text-slate-500 dark:text-white/55">
              {secondary}
            </div>
          ) : null}
        </div>
      </div>

      {action ? <div className="flex w-full min-w-0 shrink-0 justify-end sm:w-auto sm:justify-start">{action}</div> : null}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <UiEmptyState
      title={text}
      className="rounded-2xl border-dashed px-4 py-4 text-left justify-items-start"
    />
  );
}

function getUserDisplay(input: {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  fallback?: string | null;
}) {
  const normalized = resolveUserDisplay(input);
  const fallback = String(input.fallback ?? "").trim();
  const primary =
    normalized.fullName || normalized.fromParts || normalized.email || normalized.phone || fallback || "No name";

  return {
    primary,
    meta: normalized.email || normalized.phone || "No contact info",
  };
}

function formatRelativeTime(value?: string | null) {
  if (!value) return "Pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Pending";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) return `Sent ${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `Sent ${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `Sent ${diffDays}d ago`;
}

export default function BusinessPeoplePanel({
  businessId,
  businessSlug,
  initialOwner,
  role,
  isOwnerManager,
  currentUserId,
  pendingInvites,
  mode = "manage",
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  const qs = sp?.toString();
  const suffix = qs ? `?${qs}` : "";

  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<StatusResponse | null>(null);
  const [showAllManagers, setShowAllManagers] = React.useState(false);
  const [managerToRemove, setManagerToRemove] = React.useState<ActiveManager | null>(null);
  const [inviteToRevoke, setInviteToRevoke] = React.useState<PendingManager | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);

  const canManage = role === "OWNER";
  const showInviteSections = mode === "manage";
  const safeBusinessId = (businessId ?? "").trim();

  const load = React.useCallback(async () => {
    if (!safeBusinessId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/manager/status?business_id=${encodeURIComponent(safeBusinessId)}`,
        { cache: "no-store" },
      );

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to load");
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [safeBusinessId]);

  React.useEffect(() => {
    if (!safeBusinessId) {
      setLoading(true);
      return;
    }
    load();
  }, [load, safeBusinessId]);

  async function removeManager(managerUserId: string) {
    if (!safeBusinessId) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/manager/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: safeBusinessId,
          manager_user_id: managerUserId,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Remove failed");

      await load();
      router.refresh();
      setManagerToRemove(null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Remove failed";
      alert(message);
    } finally {
      setActionLoading(false);
    }
  }

  async function revokeInvite(inviteId: string) {
    setActionLoading(true);
    try {
      const res = await fetch("/api/invite/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_id: inviteId, inviteId }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to revoke invite");
      }

      await load();
      router.refresh();
      setInviteToRevoke(null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to revoke invite";
      alert(message);
    } finally {
      setActionLoading(false);
    }
  }

  if (!safeBusinessId) {
    return <EmptyState text="Loading business..." />;
  }

  const ownerDisplay = getUserDisplay({
    full_name: data?.owner?.full_name ?? initialOwner?.full_name,
    first_name: data?.owner?.first_name ?? initialOwner?.first_name,
    last_name: data?.owner?.last_name ?? initialOwner?.last_name,
    email: data?.owner?.email ?? initialOwner?.email,
    phone: data?.owner?.phone ?? initialOwner?.phone ?? null,
    fallback: data?.owner?.safe_fallback ?? initialOwner?.safe_fallback ?? null,
  });

  const managersActiveRaw = data?.managers_active ?? [];
  const managersPendingRaw = data?.managers_pending ?? [];

  const managersFromLegacy: ActiveManager[] =
    data?.manager?.state === "ACTIVE"
      ? [
          {
            user_id: data.manager.user_id,
            full_name: data.manager.full_name,
            first_name: data.manager.first_name ?? null,
            last_name: data.manager.last_name ?? null,
            email: data.manager.email ?? null,
            phone: data.manager.phone,
          },
        ]
      : [];

  const managerCandidates =
    managersActiveRaw.length > 0 ? managersActiveRaw : managersFromLegacy;
  const ownerId = data?.owner?.id ? String(data.owner.id) : "";

  const managersActive = managerCandidates.filter((manager) => {
    if (ownerId && String(manager.user_id) === ownerId) return false;
    return true;
  });

  const managersPending =
    managersPendingRaw.length > 0
      ? managersPendingRaw
      : data?.manager?.state === "PENDING"
        ? [
            {
              invite_id: "legacy",
              email: data.manager.email,
              created_at: data.manager.created_at,
            },
          ]
        : (pendingInvites ?? []).map((invite, index) => ({
            invite_id: String(invite.id ?? index),
            email: String(invite.email ?? ""),
            created_at: invite.created_at ? String(invite.created_at) : null,
          }));

  const viewerRole =
    data?.viewer_role === "OWNER" || data?.viewer_role === "MANAGER"
      ? data.viewer_role
      : role;

  const ownerPillText = isOwnerManager ? "Owner • Manager" : "Owner";
  const ownerIsYou =
    Boolean(currentUserId) &&
    Boolean(data?.owner?.id ?? initialOwner?.id) &&
    String(data?.owner?.id ?? initialOwner?.id) === String(currentUserId);

  const viewerManager =
    data?.viewer_manager ??
    managersActive.find((manager) => String(manager.user_id) === String(currentUserId)) ??
    null;

  const viewerManagerDisplay = viewerManager
    ? getUserDisplay({
        full_name: viewerManager.full_name,
        first_name: viewerManager.first_name,
        last_name: viewerManager.last_name,
        email: viewerManager.email,
        phone: viewerManager.phone,
        fallback: viewerManager.safe_fallback ?? null,
      })
    : null;

  const managersToShow = showAllManagers ? managersActive : managersActive.slice(0, 5);
  const hasMoreManagers = managersActive.length > 5;

  if (mode === "summary") {
    const href = businessSlug
      ? `/b/${encodeURIComponent(String(businessSlug))}/settings${suffix}`
      : `./settings${suffix}`;

    if (viewerRole === "MANAGER" && viewerManagerDisplay) {
      return (
        <div className="space-y-3">
          <RowShell
            icon={<User className="h-4 w-4" />}
            primary={viewerManagerDisplay.primary}
            secondary={viewerManagerDisplay.meta}
            meta={
              <>
                <Pill tone="gray">Manager</Pill>
                <Pill tone="gray">You</Pill>
              </>
            }
          />
          <Link
            href={href}
            className="block rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white hover:bg-slate-50"
          >
            Manage access →
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <RowShell
          icon={<Crown className="h-4 w-4" />}
          primary={ownerDisplay.primary}
          secondary={ownerDisplay.meta}
          tone="owner"
          meta={
            <>
              <Pill tone="blue">{ownerPillText}</Pill>
              {ownerIsYou ? <Pill tone="gray">You</Pill> : null}
            </>
          }
        />
        <Link
          href={href}
          className="block rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white hover:bg-slate-50"
        >
          Manage access →
        </Link>
      </div>
    );
  }

  if (viewerRole === "MANAGER") {
    return (
      <div className="space-y-6">
        <Section title="Owner">
          <RowShell
            icon={<Crown className="h-4 w-4" />}
            primary={ownerDisplay.primary}
            secondary={ownerDisplay.meta}
            tone="owner"
            meta={
              <>
                <Pill tone="blue">{ownerPillText}</Pill>
                {ownerIsYou ? <Pill tone="gray">You</Pill> : null}
              </>
            }
          />
        </Section>

        <Section title="Your access">
          <RowShell
            icon={<User className="h-4 w-4" />}
            primary={viewerManagerDisplay?.primary ?? "No name"}
            secondary={viewerManagerDisplay?.meta ?? "No contact info"}
            meta={
              <>
                <Pill tone="gray">Manager</Pill>
                <Pill tone="gray">You</Pill>
              </>
            }
          />
          <EmptyState text="Access for this business is managed by the owner." />
        </Section>
      </div>
    );
  }

  return (
    <>
      <div className="min-w-0 max-w-full space-y-5 pb-4 sm:space-y-4 sm:pb-0">
        <Section title="Owner">
          <RowShell
            icon={<Crown className="h-4 w-4" />}
            primary={ownerDisplay.primary}
            secondary={ownerDisplay.meta}
            tone="owner"
            meta={
              <>
                <Pill tone="blue">{ownerPillText}</Pill>
                {ownerIsYou ? <Pill tone="gray">You</Pill> : null}
              </>
            }
          />
        </Section>

        <Section title="Managers" count={managersActive.length}>
          {loading ? <EmptyState text="Loading managers..." /> : null}

          {!loading && managersActive.length === 0 ? (
            <EmptyState text="No managers added yet." />
          ) : null}

          {!loading && managersToShow.length > 0 ? (
            <div className="min-w-0 max-w-full space-y-2">
              {managersToShow.map((manager) => {
                const managerIsYou =
                  Boolean(currentUserId) &&
                  String(manager.user_id) === String(currentUserId);
                const managerDisplay = getUserDisplay({
                  full_name: manager.full_name,
                  first_name: manager.first_name,
                  last_name: manager.last_name,
                  email: manager.email,
                  phone: manager.phone,
                  fallback: manager.safe_fallback ?? null,
                });

                return (
                  <RowShell
                    key={manager.user_id}
                    icon={<User className="h-4 w-4" />}
                    primary={managerDisplay.primary}
                    secondary={managerDisplay.meta}
                    meta={
                      <>
                        <Pill tone="gray">Manager</Pill>
                        {managerIsYou ? <Pill tone="gray">You</Pill> : null}
                      </>
                    }
                    action={
                      <button
                        type="button"
                        onClick={() => setManagerToRemove(manager)}
                        className="inline-flex h-9 min-w-[104px] items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 px-4 text-sm font-semibold text-slate-700 dark:text-white/80 transition hover:bg-slate-50 hover:text-slate-900 sm:h-8 sm:min-w-0 sm:rounded-lg sm:px-3 sm:text-xs sm:text-slate-600"
                      >
                        Remove
                      </button>
                    }
                  />
                );
              })}
            </div>
          ) : null}

          {hasMoreManagers ? (
            <button
              type="button"
              onClick={() => setShowAllManagers((prev) => !prev)}
              className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-white/80 transition hover:bg-slate-50 hover:text-slate-900 sm:w-auto sm:justify-start sm:border-0 sm:px-0 sm:py-0"
            >
              {showAllManagers ? "Show fewer managers" : "Show all managers"}
            </button>
          ) : null}
        </Section>

        {showInviteSections && canManage ? (
          <Section title="Invite manager">
            <InviteManager
              businessId={safeBusinessId}
              onInvited={async () => {
                await load();
                router.refresh();
              }}
            />
          </Section>
        ) : null}

        {showInviteSections ? <Section title="Pending invites" count={managersPending.length}>
          {managersPending.length === 0 ? (
            <EmptyState text="No pending invites." />
          ) : (
            <div className="min-w-0 max-w-full space-y-2">
              {managersPending.map((invite) => (
                <RowShell
                  key={invite.invite_id}
                  icon={<Mail className="h-4 w-4" />}
                  primary={invite.email}
                  secondary={
                    <span className="inline-flex items-center gap-2">
                      <span>Pending</span>
                      <span className="text-slate-300 dark:text-white/30">•</span>
                      <span>{formatRelativeTime(invite.created_at)}</span>
                    </span>
                  }
                  meta={<Pill tone="amber">Pending</Pill>}
                    action={
                      invite.invite_id !== "legacy" ? (
                        <button
                          type="button"
                          onClick={() => setInviteToRevoke(invite)}
                          className="inline-flex h-9 min-w-[104px] items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 px-4 text-sm font-semibold text-slate-700 dark:text-white/80 transition hover:bg-slate-50 hover:text-slate-900 sm:h-8 sm:min-w-0 sm:rounded-lg sm:px-3 sm:text-xs sm:text-slate-600"
                        >
                          Revoke
                        </button>
                    ) : null
                  }
                />
              ))}
            </div>
          )}
        </Section> : null}
      </div>

      <AlertDialog
        open={Boolean(managerToRemove)}
        onOpenChange={(open) => {
          if (!open && !actionLoading) setManagerToRemove(null);
        }}
      >
        <AlertDialogContent className="rounded-[24px] border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-6 shadow-[0_24px_64px_rgba(15,23,42,0.18)] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="product-page-title text-slate-900 dark:text-white">
              Remove manager?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-6 text-slate-500 dark:text-white/55">
              {managerToRemove
                ? `${getUserDisplay({
                    full_name: managerToRemove.full_name,
                    first_name: managerToRemove.first_name,
                    last_name: managerToRemove.last_name,
                    email: managerToRemove.email,
                    phone: managerToRemove.phone,
                    fallback: managerToRemove.safe_fallback ?? null,
                  }).primary} will lose access to this business immediately.`
                : "This manager will lose access to this business immediately."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={actionLoading}
              className="rounded-xl border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/80 shadow-none"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading || !managerToRemove}
              onClick={(event) => {
                event.preventDefault();
                if (!managerToRemove || actionLoading) return;
                void removeManager(managerToRemove.user_id);
              }}
              className="rounded-xl border border-red-600 bg-red-600 text-white shadow-none hover:bg-red-700"
            >
              {actionLoading ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(inviteToRevoke)}
        onOpenChange={(open) => {
          if (!open && !actionLoading) setInviteToRevoke(null);
        }}
      >
        <AlertDialogContent className="rounded-[24px] border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-6 shadow-[0_24px_64px_rgba(15,23,42,0.18)] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="product-page-title text-slate-900 dark:text-white">
              Revoke invite?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-6 text-slate-500 dark:text-white/55">
              {inviteToRevoke
                ? `Pending invite for ${inviteToRevoke.email} will be revoked.`
                : "This pending invite will be revoked."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={actionLoading}
              className="rounded-xl border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/80 shadow-none"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading || !inviteToRevoke}
              onClick={(event) => {
                event.preventDefault();
                if (!inviteToRevoke || actionLoading) return;
                void revokeInvite(inviteToRevoke.invite_id);
              }}
              className="rounded-xl border border-red-600 bg-red-600 text-white shadow-none hover:bg-red-700"
            >
              {actionLoading ? "Revoking..." : "Revoke"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
