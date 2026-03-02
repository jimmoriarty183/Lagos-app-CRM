"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Trash2 } from "lucide-react";
import InviteManager from "./InviteManager";

type Role = "OWNER" | "MANAGER" | "GUEST";

type Person = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at?: string | null;
};

type PendingManagerInvite = {
  id: string;
  email: string;
  created_at?: string | null;
  status?: string;
  role?: string;
};

type StatusResponse = {
  owner_phone: string | null;
  legacy_manager_phone?: string | null;
  owners: Person[];
  managers: Person[];
  pending_manager_invites?: PendingManagerInvite[];
};

type Props = {
  businessId?: string | null;
  businessSlug?: string | null;
  ownerPhone: string | null;
  legacyManagerPhone: string | null;
  role: Role;
  isOwnerManager: boolean;
  currentUserId?: string | null;
  pendingInvites?: PendingManagerInvite[];
  mode?: "summary" | "manage";
};

function Pill({
  tone,
  children,
}: {
  tone: "gray" | "blue" | "amber" | "red" | "neutral";
  children: React.ReactNode;
}) {
  const cls =
    tone === "blue"
      ? "border-blue-100 bg-blue-50 text-blue-700"
      : tone === "amber"
        ? "border-amber-100 bg-amber-50 text-amber-700"
        : tone === "red"
          ? "border-red-200 bg-red-50 text-red-700"
          : tone === "neutral"
            ? "border-gray-300 bg-white text-gray-600"
            : "border-gray-200 bg-gray-50 text-gray-700";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cls}`}
    >
      {children}
    </span>
  );
}

function PersonValue({
  primary,
  secondary,
}: {
  primary: string;
  secondary?: string | null;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="text-sm font-semibold leading-5 text-gray-900 break-words" title={primary}>
        {primary}
      </div>
      {secondary ? (
        <div
          className="mt-0.5 text-xs font-medium leading-5 text-gray-500 break-words"
          title={secondary}
        >
          {secondary}
        </div>
      ) : null}
    </div>
  );
}

function PersonRow({
  person,
  roleLabel,
  isYou,
  onRemove,
}: {
  person: Person;
  roleLabel: "OWNER" | "MANAGER";
  isYou: boolean;
  onRemove?: () => void;
}) {
  const primary =
    person.full_name || person.phone || person.email || `User ${person.user_id.slice(0, 8)}`;

  const secondary =
    person.full_name && (person.email || person.phone)
      ? person.email || person.phone
      : null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="shrink-0 rounded-xl bg-gray-50 p-2 text-gray-700">
          <User className="h-4 w-4" />
        </div>

        <PersonValue primary={primary} secondary={secondary} />
      </div>

      {onRemove ? (
        <button
          onClick={onRemove}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
          title="Remove manager"
        >
          <Trash2 className="h-4 w-4" />
          Remove
        </button>
      ) : (
        <div className="flex items-center gap-2 shrink-0">
          <Pill tone={roleLabel === "OWNER" ? "blue" : "gray"}>{roleLabel}</Pill>
          {isYou ? <Pill tone="neutral">YOU</Pill> : null}
        </div>
      )}
    </div>
  );
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

  const owners =
    data?.owners?.length
      ? data.owners
      : [
          {
            user_id: "legacy-owner",
            full_name: null,
            email: ownerPhone || data?.owner_phone || "—",
            phone: ownerPhone || data?.owner_phone || null,
          },
        ];

  const managers = data?.managers ?? [];
  const pendingManagers = (data?.pending_manager_invites ?? pendingInvites ?? []) as PendingManagerInvite[];
  const legacy = legacyManagerPhone || data?.legacy_manager_phone || null;

  const visibleManagers =
    showAllManagers || managers.length <= 3 ? managers : managers.slice(0, 3);

  const href = businessSlug
    ? `/b/${encodeURIComponent(String(businessSlug))}/settings/team${suffix}`
    : `./settings/team${suffix}`;

  return (
    <div className={mode === "summary" ? "space-y-3" : "space-y-4"}>
      {owners.map((owner, idx) => (
        <PersonRow
          key={`owner-${owner.user_id || idx}`}
          person={owner}
          roleLabel="OWNER"
          isYou={
            (Boolean(currentUserId) &&
              String(owner.user_id) === String(currentUserId)) ||
            (String(owner.user_id || "") === "legacy-owner" &&
              (role === "OWNER" || isOwnerManager))
          }
        />
      ))}

      {loading ? (
        <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-600">
          Loading manager status…
        </div>
      ) : managers.length > 0 ? (
        <>
          {visibleManagers.map((manager) => (
            <PersonRow
              key={`manager-${manager.user_id}`}
              person={manager}
              roleLabel="MANAGER"
              isYou={Boolean(currentUserId) && String(manager.user_id) === String(currentUserId)}
              onRemove={mode === "manage" && canManage ? () => removeManager(manager.user_id) : undefined}
            />
          ))}

          {managers.length > 3 ? (
            <button
              type="button"
              onClick={() => setShowAllManagers((v) => !v)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              {showAllManagers
                ? "Hide managers"
                : `Show all managers (${managers.length})`}
            </button>
          ) : null}
        </>
      ) : legacy ? (
        <PersonRow
          person={{
            user_id: "legacy-manager",
            full_name: null,
            email: legacy,
            phone: legacy,
          }}
          roleLabel="MANAGER"
          isYou={role === "MANAGER"}
        />
      ) : null}

      {pendingManagers.length > 0 ? (
        pendingManagers.slice(0, 10).map((invite) => (
          <div
            key={`pending-${invite.id}`}
            className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="shrink-0 rounded-xl bg-gray-50 p-2 text-gray-700">
                <User className="h-4 w-4" />
              </div>
              <PersonValue primary="Pending invite" secondary={invite.email} />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Pill tone="amber">PENDING</Pill>
            </div>
          </div>
        ))
      ) : null}

      {mode === "summary" ? (
        <Link
          href={href}
          className="block rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
        >
          Manage access →
        </Link>
      ) : null}

      {mode === "manage" && canManage ? <InviteManager businessId={safeBusinessId} /> : null}
    </div>
  );
}
