"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Trash2 } from "lucide-react";
import InviteManager from "./InviteManager";

type Role = "OWNER" | "MANAGER" | "GUEST";

type OwnerProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type ActiveManager = {
  user_id: string;
  full_name: string | null;
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
      email?: string | null;
      phone: string | null;
    };

type StatusResponse = {
  owner_phone: string | null;
  legacy_manager_phone?: string | null;
  owner?: OwnerProfile | null;
  manager?: ManagerState;
  managers_active?: ActiveManager[];
  managers_pending?: PendingManager[];
};

type Props = {
  businessId?: string | null;
  businessSlug?: string | null;
  ownerPhone: string | null;
  legacyManagerPhone: string | null;
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
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="shrink-0 rounded-xl bg-gray-50 p-2 text-gray-700">{icon}</div>

        <div className="min-w-0 flex-1">
          {label ? (
            <div className="text-[11px] font-semibold tracking-wide text-gray-500">
              {label}
            </div>
          ) : null}

          <div className="min-w-0 truncate text-sm font-semibold text-gray-900">{value}</div>
        </div>
      </div>

      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

function labelForOwner(owner?: OwnerProfile | null, fallbackPhone?: string | null) {
  return owner?.full_name || owner?.email || fallbackPhone || "—";
}

function displayManagerName(m: ActiveManager) {
  return m.full_name || m.email || "Manager";
}

function managerMeta(m: ActiveManager) {
  return m.email || null;
}

export default function BusinessPeoplePanel({
  businessId,
  businessSlug,
  ownerPhone,
  legacyManagerPhone,
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
    } catch (e: any) {
      alert(e?.message || "Remove failed");
    }
  }

  if (!safeBusinessId) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-600">
          Loading business…
        </div>
      </div>
    );
  }

  const ownerLabel = labelForOwner(
    data?.owner ?? null,
    ownerPhone || data?.owner_phone || null,
  );

  const managersActiveRaw = data?.managers_active ?? [];
  const managersPendingRaw = data?.managers_pending ?? [];

  const managersFromLegacy: ActiveManager[] =
    data?.manager?.state === "ACTIVE"
      ? [
          {
            user_id: data.manager.user_id,
            full_name: data.manager.full_name,
            email: data.manager.email ?? null,
            phone: data.manager.phone,
          },
        ]
      : [];

  const managerCandidates = managersActiveRaw.length > 0 ? managersActiveRaw : managersFromLegacy;
  const ownerId = data?.owner?.id ? String(data.owner.id) : "";
  const ownerName = String(data?.owner?.full_name ?? "").trim().toLowerCase();

  // IMPORTANT: UI inclusion is based on full_name/email quality, not role checks.
  const managersActive = managerCandidates.filter((m) => {
    const fullName = String(m.full_name ?? "").trim();
    const email = String(m.email ?? "").trim();
    if (!fullName && !email) return false;
    if (ownerId && String(m.user_id) === ownerId) return false;
    if (ownerName && fullName && fullName.toLowerCase() === ownerName) return false;
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
        : (pendingInvites ?? []).map((inv, idx) => ({
            invite_id: String(inv.id ?? idx),
            email: String(inv.email ?? ""),
            created_at: inv.created_at ? String(inv.created_at) : null,
          }));

  const ownerPillText = isOwnerManager ? "OWNER & MANAGER" : "OWNER";
  const ownerIsYou =
    Boolean(currentUserId) &&
    Boolean(data?.owner?.id) &&
    String(data?.owner?.id) === String(currentUserId);


  if (mode === "summary") {
    const href = businessSlug
      ? `/b/${encodeURIComponent(String(businessSlug))}/settings/team${suffix}`
      : `./settings/team${suffix}`;

    return (
      <div className="space-y-3">
        <Row
          icon={<User className="h-4 w-4" />}
          label="OWNER"
          value={
            <span className="inline-flex min-w-0 items-center gap-2" title={ownerLabel}>
              <span className="min-w-0 truncate font-semibold">{ownerLabel}</span>
              {data?.owner?.email ? (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="font-mono text-xs">{data.owner.email}</span>
                </>
              ) : null}
            </span>
          }
          right={
            <div className="flex items-center gap-2 shrink-0">
              <Pill tone="blue">{ownerPillText}</Pill>
              {ownerIsYou ? <Pill tone="gray">YOU</Pill> : null}
            </div>
          }
        />

        {canManage ? (
          <Link
            href={href}
            className="block rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 text-right"
          >
            Manage access →
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Row
        icon={<User className="h-4 w-4" />}
        label="OWNER"
        value={
          <span className="inline-flex min-w-0 items-center gap-2" title={ownerLabel}>
            <span className="min-w-0 truncate font-semibold">{ownerLabel}</span>
            {data?.owner?.email ? (
              <>
                <span className="text-gray-300">•</span>
                <span className="font-mono text-xs">{data.owner.email}</span>
              </>
            ) : null}
          </span>
        }
        right={
          <div className="flex items-center gap-2 shrink-0">
            <Pill tone="blue">{ownerPillText}</Pill>
            {ownerIsYou ? <Pill tone="gray">YOU</Pill> : null}
          </div>
        }
      />

      {role === "OWNER" ? (
        <div className="space-y-3 max-h-[360px] overflow-auto pr-1">
          {loading ? (
            <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-600">
              Loading manager status…
            </div>
          ) : null}

          {!loading && managersActive.length === 0 && !legacyManagerPhone ? (
            <Row
              icon={<User className="h-4 w-4" />}
              label="Manager"
              value={<span className="text-gray-800">Not assigned</span>}
              right={<Pill tone="gray">Manager</Pill>}
            />
          ) : null}

          {!loading && managersActive.length > 0
            ? managersActive.map((manager, index) => {
                const managerIsYou =
                  Boolean(currentUserId) &&
                  String(manager.user_id) === String(currentUserId);
                return (
                  <Row
                    key={manager.user_id}
                    icon={<User className="h-4 w-4" />}
                    label={`Manager ${index + 1}`}
                    value={
                      <span
                        className="inline-flex min-w-0 items-center gap-2"
                        title={displayManagerName(manager)}
                      >
                        <span className="min-w-0 truncate font-semibold">
                          {displayManagerName(manager)}
                        </span>
                        {managerMeta(manager) ? (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className="font-mono text-xs">{managerMeta(manager)}</span>
                          </>
                        ) : null}
                      </span>
                    }
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
                        <Pill tone="gray">Manager</Pill>
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
                      <span className="text-gray-300">•</span>
                      <span className="font-mono text-xs">{pending.email}</span>
                    </span>
                  }
                  right={<Pill tone="amber">PENDING</Pill>}
                />
              ))
            : null}
        </div>
      ) : null}

      {canManage ? <InviteManager businessId={safeBusinessId} /> : null}
    </div>
  );
}
