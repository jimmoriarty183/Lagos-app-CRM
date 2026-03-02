"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Trash2 } from "lucide-react";
import InviteManager from "./InviteManager";

type Role = "OWNER" | "MANAGER" | "GUEST";

type ManagerState =
  | { state: "NONE" }
  | { state: "PENDING"; email: string; created_at?: string }
  | {
      state: "ACTIVE";
      user_id: string;
      full_name: string | null;
      email?: string | null;
      phone: string | null; // legacy, будет null
    };

type OwnerProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type StatusResponse = {
  // legacy
  owner_phone: string | null;
  legacy_manager_phone?: string | null;

  // ✅ new (from your new status)
  owner?: OwnerProfile | null;
  owners?: OwnerProfile[] | null;
  manager: ManagerState;
  managers?: Array<Extract<ManagerState, { state: "ACTIVE" }>> | null;
};

type Props = {
  businessId?: string | null;
  businessSlug?: string | null;

  // legacy/fallback (оставляем, чтобы не ломать page.tsx)
  ownerPhone: string | null;
  legacyManagerPhone: string | null;

  role: Role;
  isOwnerManager: boolean;
  currentUserId?: string | null;

  pendingInvites?: any[];
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
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="shrink-0 rounded-xl bg-gray-50 p-2 text-gray-700">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          {label ? (
            <div className="text-[11px] font-semibold tracking-wide text-gray-500">
              {label}
            </div>
          ) : null}

          <div className="min-w-0 truncate text-sm font-semibold text-gray-900">
            {value}
          </div>
        </div>
      </div>

      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

function labelForOwner(
  owner?: OwnerProfile | null,
  fallbackPhone?: string | null,
) {
  return owner?.full_name || owner?.email || fallbackPhone || "—";
}

function labelForManager(m: ManagerState) {
  if (m.state !== "ACTIVE") return "Manager";
  return m.full_name || (m as any).email || "Manager";
}

function metaForManager(m: ManagerState) {
  if (m.state !== "ACTIVE") return null;
  const email = (m as any).email as string | null | undefined;
  return email || null;
}

const MAX_MANAGERS = 10;
const DEFAULT_VISIBLE_MANAGERS = 3;

export default function BusinessPeoplePanel({
  businessId,
  businessSlug,
  ownerPhone,
  legacyManagerPhone,
  role,
  isOwnerManager,
  currentUserId,
  mode = "manage",
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  const qs = sp?.toString();
  const suffix = qs ? `?${qs}` : "";

  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<StatusResponse | null>(null);
  const [showAllManagers, setShowAllManagers] = React.useState(false);

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

  React.useEffect(() => {
    setShowAllManagers(false);
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
    } catch (e: any) {
      alert(e?.message || "Remove failed");
    }
  }

  const manager = data?.manager;
  const legacy = legacyManagerPhone || data?.legacy_manager_phone || null;


  const owners = React.useMemo(() => {
    const rawOwners = Array.isArray(data?.owners) ? data?.owners : [];

    if (rawOwners.length > 0) {
      return rawOwners;
    }

    if (data?.owner) {
      return [data.owner];
    }

    return [
      {
        id: "legacy-owner",
        full_name: null,
        email: ownerPhone || data?.owner_phone || null,
      },
    ];
  }, [data?.owner, data?.owners, data?.owner_phone, ownerPhone]);

  const activeManagers = React.useMemo(() => {
    const fromManagers = Array.isArray(data?.managers)
      ? data.managers.filter((m): m is Extract<ManagerState, { state: "ACTIVE" }> => Boolean(m?.user_id))
      : [];

    if (fromManagers.length > 0) {
      return fromManagers.slice(0, MAX_MANAGERS);
    }

    if (manager?.state === "ACTIVE") {
      return [manager].slice(0, MAX_MANAGERS);
    }

    return [];
  }, [data?.managers, manager]);

  const visibleManagers = showAllManagers
    ? activeManagers
    : activeManagers.slice(0, DEFAULT_VISIBLE_MANAGERS);

  const canExpandManagers = activeManagers.length > DEFAULT_VISIBLE_MANAGERS;
  const canAddMoreManagers = activeManagers.length < MAX_MANAGERS;

  if (!safeBusinessId) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-600">
          Loading business…
        </div>
      </div>
    );
  }

  const ownerPillText = isOwnerManager ? "OWNER & MANAGER" : "OWNER";
  const managerPillText = "MANAGER";

  // ✅ SUMMARY MODE
  if (mode === "summary") {
    const href = businessSlug
      ? `/b/${encodeURIComponent(String(businessSlug))}/settings/team${suffix}`
      : `./settings/team${suffix}`;

    return (
      <div className="space-y-3">
        {owners.map((owner, index) => {
          const ownerLabelItem = labelForOwner(owner, ownerPhone || data?.owner_phone || null);
          const thisOwnerIsYou =
            Boolean(currentUserId) &&
            Boolean(owner?.id) &&
            String(owner.id) === String(currentUserId);

          return (
            <Row
              key={`${owner?.id ?? "owner"}-${index}`}
              icon={<User className="h-4 w-4" />}
              label="OWNER"
              value={<span title={ownerLabelItem}>{ownerLabelItem}</span>}
              right={
                <div className="flex items-center gap-2 shrink-0">
                  <Pill tone="blue">{ownerPillText}</Pill>
                  {thisOwnerIsYou ? <Pill tone="gray">YOU</Pill> : null}
                </div>
              }
            />
          );
        })}

        {!loading && activeManagers.length > 0
          ? visibleManagers.map((activeManager) => {
              const activeManagerIsYou =
                Boolean(currentUserId) &&
                String(activeManager.user_id ?? "") === String(currentUserId);

              return (
                <Row
                  key={activeManager.user_id}
                  icon={<User className="h-4 w-4" />}
                  label="MANAGER"
                  value={
                    <span
                      className="inline-flex min-w-0 items-center gap-2"
                      title={labelForManager(activeManager)}
                    >
                      <span className="min-w-0 truncate font-semibold">
                        {labelForManager(activeManager)}
                      </span>
                      {metaForManager(activeManager) ? (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="font-mono text-xs">
                            {metaForManager(activeManager)}
                          </span>
                        </>
                      ) : null}
                    </span>
                  }
                  right={
                    <div className="flex items-center gap-2 shrink-0">
                      <Pill tone="gray">{managerPillText}</Pill>
                      {activeManagerIsYou ? <Pill tone="gray">YOU</Pill> : null}
                    </div>
                  }
                />
              );
            })
          : null}

        {!loading && canExpandManagers ? (
          <button
            type="button"
            onClick={() => setShowAllManagers((prev) => !prev)}
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-50"
          >
            {showAllManagers
              ? "Show less"
              : `Show more (${activeManagers.length - DEFAULT_VISIBLE_MANAGERS} more)`}
          </button>
        ) : null}

        <Link
          href={href}
          className="block rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
        >
          Manage access →
        </Link>
      </div>
    );
  }

  // ✅ MANAGE MODE
  return (
    <div className="space-y-4">
      {owners.map((owner, index) => {
        const ownerLabelItem = labelForOwner(owner, ownerPhone || data?.owner_phone || null);
        const thisOwnerIsYou =
          Boolean(currentUserId) &&
          Boolean(owner?.id) &&
          String(owner.id) === String(currentUserId);

        return (
          <Row
            key={`${owner?.id ?? "owner-manage"}-${index}`}
            icon={<User className="h-4 w-4" />}
            label="OWNER"
            value={<span title={ownerLabelItem}>{ownerLabelItem}</span>}
            right={
              <div className="flex items-center gap-2 shrink-0">
                <Pill tone="blue">{ownerPillText}</Pill>
                {thisOwnerIsYou ? <Pill tone="gray">YOU</Pill> : null}
              </div>
            }
          />
        );
      })}

      {loading ? (
        <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-600">
          Loading manager status…
        </div>
      ) : activeManagers.length > 0 ? (
        <>
          {visibleManagers.map((activeManager) => {
            const activeManagerIsYou =
              Boolean(currentUserId) &&
              String(activeManager.user_id ?? "") === String(currentUserId);

            return (
              <Row
                key={activeManager.user_id}
                icon={<User className="h-4 w-4" />}
                label="MANAGER"
                value={
                  <span
                    className="inline-flex min-w-0 items-center gap-2"
                    title={labelForManager(activeManager)}
                  >
                    <span className="min-w-0 truncate font-semibold">
                      {labelForManager(activeManager)}
                    </span>
                    {metaForManager(activeManager) ? (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="font-mono text-xs">
                          {metaForManager(activeManager)}
                        </span>
                      </>
                    ) : null}
                  </span>
                }
                right={
                  canManage ? (
                    <button
                      onClick={() => removeManager(activeManager.user_id)}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                      title="Remove manager"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      <Pill tone="gray">{managerPillText}</Pill>
                      {activeManagerIsYou ? <Pill tone="gray">YOU</Pill> : null}
                    </div>
                  )
                }
              />
            );
          })}

          {canExpandManagers ? (
            <button
              type="button"
              onClick={() => setShowAllManagers((prev) => !prev)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              {showAllManagers
                ? "Show less"
                : `Show more (${activeManagers.length - DEFAULT_VISIBLE_MANAGERS} more)`}
            </button>
          ) : null}
        </>
      ) : legacy ? (
        <Row
          icon={<User className="h-4 w-4" />}
          label="MANAGER"
          value={<span className="font-mono">{legacy}</span>}
          right={<Pill tone="gray">MANAGER</Pill>}
        />
      ) : manager?.state === "PENDING" ? (
        <Row
          icon={<User className="h-4 w-4" />}
          label="MANAGER"
          value={
            <span className="inline-flex flex-wrap items-center gap-2">
              <span className="font-semibold">Pending invite</span>
              <span className="text-gray-300">•</span>
              <span className="font-mono text-xs">{manager?.state === "PENDING" ? manager.email : null}</span>
            </span>
          }
          right={<Pill tone="amber">PENDING</Pill>}
        />
      ) : (
        <Row
          icon={<User className="h-4 w-4" />}
          label="MANAGER"
          value={<span className="text-gray-800">Not assigned</span>}
          right={<Pill tone="gray">MANAGER</Pill>}
        />
      )}

      {canManage && canAddMoreManagers ? <InviteManager businessId={safeBusinessId} /> : null}
      {canManage && !canAddMoreManagers ? (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
          Maximum of {MAX_MANAGERS} managers reached.
        </div>
      ) : null}
    </div>
  );
}
