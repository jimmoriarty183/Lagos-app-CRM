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
      phone: string | null;
    };

type StatusResponse = {
  owner_phone: string | null;
  manager: ManagerState;
  legacy_manager_phone?: string | null;
};

type Props = {
  businessId?: string | null;
  businessSlug?: string | null;
  ownerPhone: string | null;
  legacyManagerPhone: string | null;
  role: Role;
  isOwnerManager: boolean;

  // оставляем для совместимости (props приходит с page.tsx)
  pendingInvites?: any[];

  // отображение
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
      <div className="flex min-w-0 items-center gap-3">
        <div className="shrink-0 rounded-xl bg-gray-50 p-2 text-gray-700">
          {icon}
        </div>

        <div className="min-w-0">
          {label ? (
            <div className="text-[11px] font-semibold tracking-wide text-gray-500">
              {label}
            </div>
          ) : null}

          <div className="text-sm font-semibold text-gray-900">{value}</div>
        </div>
      </div>

      {right ? <div className="shrink-0">{right}</div> : null}
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
  mode = "manage",
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  // сохраняем query (включая ?u=... если у тебя есть)
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

  const owner = ownerPhone || data?.owner_phone || "—";
  const legacy = legacyManagerPhone || data?.legacy_manager_phone || null;
  const manager = data?.manager ?? ({ state: "NONE" } as const);

  const ownerPillText = isOwnerManager ? "OWNER & MANAGER" : "OWNER";
  const managerPillText = role === "MANAGER" ? "MANAGER (YOU)" : "MANAGER";

  // ✅ SUMMARY MODE
  if (mode === "summary") {
    const href = businessSlug
      ? `/b/${encodeURIComponent(String(businessSlug))}/settings/team${suffix}`
      : `./settings/team${suffix}`;

    return (
      <div className="space-y-3">
        <Row
          icon={<User className="h-4 w-4" />}
          label="OWNER"
          value={<span className="font-mono whitespace-nowrap">{owner}</span>}
          right={<Pill tone="blue">{ownerPillText}</Pill>}
        />

        {!isOwnerManager && !loading && manager.state === "ACTIVE" ? (
          <Row
            icon={<User className="h-4 w-4" />}
            label="MANAGER"
            value={
              <span className="inline-flex flex-wrap items-center gap-2">
                <span className="font-semibold">
                  {manager.full_name || "Manager"}
                </span>
                <span className="text-gray-300">•</span>
                <span className="font-mono">{manager.phone || "—"}</span>
              </span>
            }
            right={<Pill tone="gray">{managerPillText}</Pill>}
          />
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
      <Row
        icon={<User className="h-4 w-4" />}
        label="OWNER"
        value={<span className="font-mono whitespace-nowrap">{owner}</span>}
        right={<Pill tone="blue">{ownerPillText}</Pill>}
      />

      {!isOwnerManager ? (
        <>
          {loading ? (
            <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-600">
              Loading manager status…
            </div>
          ) : manager.state === "ACTIVE" ? (
            <Row
              icon={<User className="h-4 w-4" />}
              label="MANAGER"
              value={
                <span className="inline-flex flex-wrap items-center gap-2">
                  <span className="font-semibold">
                    {manager.full_name || "Manager"}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="font-mono">{manager.phone || "—"}</span>
                </span>
              }
              right={
                canManage ? (
                  <button
                    onClick={() => removeManager(manager.user_id)}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                    title="Remove manager"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                ) : (
                  <Pill tone="gray">{managerPillText}</Pill>
                )
              }
            />
          ) : legacy ? (
            <Row
              icon={<User className="h-4 w-4" />}
              label="MANAGER"
              value={<span className="font-mono">{legacy}</span>}
              right={<Pill tone="gray">MANAGER</Pill>}
            />
          ) : (
            <Row
              icon={<User className="h-4 w-4" />}
              label="MANAGER"
              value={<span className="text-gray-800">Not assigned</span>}
              right={<Pill tone="gray">MANAGER</Pill>}
            />
          )}
        </>
      ) : null}

      {canManage ? <InviteManager businessId={safeBusinessId} /> : null}
    </div>
  );
}
