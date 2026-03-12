"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Trash2 } from "lucide-react";
import InviteManager from "./InviteManager";
import { resolveUserDisplay } from "@/lib/user-display";

type Role = "OWNER" | "MANAGER" | "GUEST";

type OwnerProfile = {
  id: string;
  full_name: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email: string | null;
};

type ActiveManager = {
  user_id: string;
  full_name: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone: string | null;
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
  owner_phone: string | null;
  legacy_manager_phone?: string | null;
  owner?: OwnerProfile | null;
  viewer_manager?: ActiveManager | null;
  manager?: ManagerState;
  managers_active?: ActiveManager[];
  managers_pending?: PendingManager[];
};

type Props = {
  businessId?: string | null;
  businessSlug?: string | null;
  ownerPhone: string | null;
  legacyManagerPhone: string | null;
  initialOwner?: OwnerProfile | null;
  role: Role;
  isOwnerManager: boolean;
  currentUserId?: string | null;
  pendingInvites?: Array<{ id?: string; email?: string; created_at?: string | null }>;
  mode?: "summary" | "manage";
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
          : "border-gray-200 bg-gray-50 text-gray-700";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cls}`}
    >
      {children}
    </span>
  );
}

function Row({
  icon,
  label,
  value,
  right,
}: {
  icon: React.ReactNode;
  label?: string;
  value: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50/80 px-4 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="shrink-0 rounded-xl bg-white p-2 text-gray-700 shadow-sm shadow-gray-200/60">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          {label ? (
            <div className="text-[11px] font-semibold tracking-wide text-gray-500">
              {label}
            </div>
          ) : null}

          <div className="min-w-0 text-sm font-semibold text-gray-900">{value}</div>
        </div>
      </div>

      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

function UserValue({
  primary,
  email,
}: {
  primary: string;
  email?: string | null;
}) {
  return (
    <span className="min-w-0">
      <span className="block truncate font-semibold text-gray-900" title={primary}>
        {primary}
      </span>
      {email ? (
        <span className="block truncate text-xs text-gray-500" title={email}>
          {email}
        </span>
      ) : null}
    </span>
  );
}

function getUserDisplay(input: {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  fallback?: string | null;
}) {
  const normalized = resolveUserDisplay(input);
  const fallback = String(input.fallback ?? "").trim();
  const primary =
    normalized.fullName || normalized.fromParts || normalized.email || fallback || "No name";

  return {
    primary,
    email: normalized.email || null,
  };
}

export default function BusinessPeoplePanel({
  businessId,
  businessSlug,
  ownerPhone,
  legacyManagerPhone,
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

  const canManage = role === "OWNER";
  const safeBusinessId = (businessId ?? "").trim();

  async function load() {
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
  }

  React.useEffect(() => {
    if (!safeBusinessId) {
      setLoading(true);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeBusinessId]);

  async function removeManager(managerUserId: string) {
    if (!safeBusinessId) {
      alert("Business is not loaded yet. Please retry.");
      return;
    }

    const ok = confirm(
      "Remove manager? They will lose access to this business immediately.",
    );
    if (!ok) return;

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
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Remove failed";
      alert(message);
    }
  }

  if (!safeBusinessId) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-600">
          Loading business...
        </div>
      </div>
    );
  }

  const ownerDisplay = getUserDisplay({
    full_name: data?.owner?.full_name ?? initialOwner?.full_name,
    first_name: data?.owner?.first_name ?? initialOwner?.first_name,
    last_name: data?.owner?.last_name ?? initialOwner?.last_name,
    email: data?.owner?.email ?? initialOwner?.email,
    fallback: ownerPhone || data?.owner_phone || null,
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
  const ownerPillText = isOwnerManager ? "OWNER & MANAGER" : "OWNER";
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
      })
    : null;

  if (mode === "summary") {
    const href = businessSlug
      ? `/b/${encodeURIComponent(String(businessSlug))}/settings/team${suffix}`
      : `./settings/team${suffix}`;
    const actionLabel = viewerRole === "OWNER" ? "Manage access ->" : "View team ->";

    if (viewerRole === "MANAGER" && viewerManagerDisplay) {
      return (
        <div className="space-y-3">
          <Row
            icon={<User className="h-4 w-4" />}
            value={
              <UserValue
                primary={viewerManagerDisplay.primary}
                email={viewerManagerDisplay.email}
              />
            }
            right={
              <div className="flex shrink-0 items-center gap-2">
                <Pill tone="gray">MANAGER</Pill>
                <Pill tone="gray">YOU</Pill>
              </div>
            }
          />

          <Link
            href={href}
            className="block rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
          >
            {actionLabel}
          </Link>
        </div>
      );
    }

    const summaryManagers = managersActive.slice(0, 2);
    const hiddenManagersCount = Math.max(0, managersActive.length - summaryManagers.length);

    return (
      <div className="space-y-3">
        <Row
          icon={<User className="h-4 w-4" />}
          value={<UserValue primary={ownerDisplay.primary} email={ownerDisplay.email} />}
          right={
            <div className="flex shrink-0 items-center gap-2">
              <Pill tone="blue">{ownerPillText}</Pill>
              {ownerIsYou ? <Pill tone="gray">YOU</Pill> : null}
            </div>
          }
        />

        {summaryManagers.map((manager) => {
          const managerDisplay = getUserDisplay({
            full_name: manager.full_name,
            first_name: manager.first_name,
            last_name: manager.last_name,
            email: manager.email,
          });

          return (
            <Row
              key={manager.user_id}
              icon={<User className="h-4 w-4" />}
              value={<UserValue primary={managerDisplay.primary} email={managerDisplay.email} />}
              right={<Pill tone="gray">MANAGER</Pill>}
            />
          );
        })}

        {hiddenManagersCount > 0 ? (
          <div className="px-2 text-xs font-semibold text-gray-500">
            +{hiddenManagersCount} more
          </div>
        ) : null}

        <Link
          href={href}
          className="block rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
        >
          {actionLabel}
        </Link>
      </div>
    );
  }

  if (viewerRole === "MANAGER") {
    return (
      <div className="space-y-4">
        <Row
          icon={<User className="h-4 w-4" />}
          value={
            <UserValue
              primary={viewerManagerDisplay?.primary ?? "No name"}
              email={viewerManagerDisplay?.email ?? null}
            />
          }
          right={
            <div className="flex shrink-0 items-center gap-2">
              <Pill tone="gray">MANAGER</Pill>
              <Pill tone="gray">YOU</Pill>
            </div>
          }
        />

        <div className="rounded-2xl bg-gray-50/80 px-4 py-3 text-sm text-gray-600">
          Access for this business is managed by the owner.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Row
        icon={<User className="h-4 w-4" />}
        value={<UserValue primary={ownerDisplay.primary} email={ownerDisplay.email} />}
        right={
          <div className="flex shrink-0 items-center gap-2">
            <Pill tone="blue">{ownerPillText}</Pill>
            {ownerIsYou ? <Pill tone="gray">YOU</Pill> : null}
          </div>
        }
      />

      <div className="space-y-3 max-h-[360px] overflow-auto pr-1">
        {loading ? (
          <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-600">
            Loading manager status...
          </div>
        ) : null}

        {!loading && managersActive.length === 0 && !legacyManagerPhone ? (
          <Row
            icon={<User className="h-4 w-4" />}
            label="Manager"
            value={<span className="text-gray-800">Not assigned</span>}
            right={<Pill tone="gray">MANAGER</Pill>}
          />
        ) : null}

        {!loading && managersActive.length > 0
          ? managersActive.map((manager) => {
              const managerIsYou =
                Boolean(currentUserId) &&
                String(manager.user_id) === String(currentUserId);
              const managerDisplay = getUserDisplay({
                full_name: manager.full_name,
                first_name: manager.first_name,
                last_name: manager.last_name,
                email: manager.email,
              });

              return (
                <Row
                  key={manager.user_id}
                  icon={<User className="h-4 w-4" />}
                  value={<UserValue primary={managerDisplay.primary} email={managerDisplay.email} />}
                  right={
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => removeManager(manager.user_id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                        title="Remove manager"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                      <Pill tone="gray">MANAGER</Pill>
                      {managerIsYou ? <Pill tone="gray">YOU</Pill> : null}
                    </div>
                  }
                />
              );
            })
          : null}

        {!loading && managersPending.length > 0
          ? managersPending.map((pending, index) => (
              <Row
                key={pending.invite_id}
                icon={<User className="h-4 w-4" />}
                label={`Manager ${index + 1}`}
                value={
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <span className="font-semibold">Pending invite</span>
                    <span className="text-gray-300">-</span>
                    <span className="font-mono text-xs">{pending.email}</span>
                  </span>
                }
                right={<Pill tone="amber">PENDING</Pill>}
              />
            ))
          : null}
      </div>

      {canManage ? <InviteManager businessId={safeBusinessId} /> : null}
    </div>
  );
}
