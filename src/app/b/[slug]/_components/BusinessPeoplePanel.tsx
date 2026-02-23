"use client";

import * as React from "react";
import { Mail, User, Trash2, ChevronDown, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

type PendingInvite = {
  id: string;
  business_id: string;
  email: string;
  role: string; // "MANAGER"
  status: string; // "PENDING"
  created_at?: string | null;
};

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
  ownerPhone: string | null;
  legacyManagerPhone: string | null;
  role: Role;
  isOwnerManager: boolean;

  // ✅ приходит из page.tsx -> DesktopBusinessCard -> сюда
  pendingInvites?: PendingInvite[];
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
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}
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
    <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="shrink-0 rounded-lg bg-gray-50 p-2 text-gray-700">
          {icon}
        </div>

        <div className="min-w-0">
          {label ? (
            <div className="text-xs font-medium text-gray-500">{label}</div>
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
  ownerPhone,
  legacyManagerPhone,
  role,
  isOwnerManager,
  pendingInvites = [],
}: Props) {
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<StatusResponse | null>(null);

  const [email, setEmail] = React.useState("");
  const [sending, setSending] = React.useState(false);

  // dropdown pending list
  const [showPendingList, setShowPendingList] = React.useState(false);
  const [revokingId, setRevokingId] = React.useState<string | null>(null);

  // ✅ Owner всегда может управлять менеджером
  const canManage = role === "OWNER";

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());
  const safeBusinessId = (businessId ?? "").trim();

  // ✅ нормализуем pendingInvites (только для текущего бизнеса, только PENDING)
  const pendingForBusiness = React.useMemo(() => {
    const list = (pendingInvites ?? [])
      .filter(
        (i) =>
          String(i.business_id) === String(safeBusinessId) &&
          String(i.status).toUpperCase() === "PENDING" &&
          String(i.role).toUpperCase() === "MANAGER",
      )
      .sort((a, b) => {
        const da = a.created_at ? Date.parse(a.created_at) : 0;
        const db = b.created_at ? Date.parse(b.created_at) : 0;
        return db - da; // newest first
      });

    return list;
  }, [pendingInvites, safeBusinessId]);

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
      // если status endpoint упал — UI всё равно покажет pendingInvites из пропсов
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

  async function invite() {
    if (!safeBusinessId) {
      alert("Business is not loaded yet. Please retry.");
      return;
    }

    const v = email.trim().toLowerCase();
    if (!v) return;

    setSending(true);
    try {
      const res = await fetch("/api/manager/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: safeBusinessId,
          businessId: safeBusinessId,
          email: v,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Invite failed");

      setEmail("");
      setShowPendingList(false);
      await load();
      router.refresh();
    } catch (e: any) {
      alert(e?.message || "Invite failed");
    } finally {
      setSending(false);
    }
  }

  async function revokeInvite(inviteId: string) {
    if (!inviteId) return;

    const ok = confirm("Revoke this invite?");
    if (!ok) return;

    setRevokingId(inviteId);
    try {
      const res = await fetch("/api/invite/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_id: inviteId }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Revoke failed");

      setShowPendingList(false);
      await load();
      router.refresh();
    } catch (e: any) {
      alert(e?.message || "Revoke failed");
    } finally {
      setRevokingId(null);
    }
  }

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
        <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-600">
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

  // ✅ если API не сказал PENDING, но у нас есть pendingInvites — считаем это pending
  const pendingFromPropsPrimary = pendingForBusiness[0] ?? null;
  const hasPendingFromProps = !!pendingFromPropsPrimary;

  const shouldShowPendingRow =
    !loading &&
    !isOwnerManager &&
    manager.state !== "ACTIVE" &&
    (manager.state === "PENDING" || hasPendingFromProps);

  const pendingEmailToShow =
    manager.state === "PENDING"
      ? manager.email
      : pendingFromPropsPrimary?.email || "";

  const pendingCount =
    manager.state === "PENDING"
      ? Math.max(pendingForBusiness.length, 1)
      : pendingForBusiness.length;

  return (
    <div className="space-y-4">
      {/* Owner */}
      <Row
        icon={<User className="h-4 w-4" />}
        value={<span className="font-mono whitespace-nowrap">{owner}</span>}
        right={<Pill tone="blue">{ownerPillText}</Pill>}
      />

      {/* ✅ Если owner=manager — не показываем строку менеджера */}
      {!isOwnerManager ? (
        <>
          {/* Manager row */}
          {loading ? (
            <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-600">
              Loading manager status…
            </div>
          ) : manager.state === "ACTIVE" ? (
            <Row
              icon={<User className="h-4 w-4" />}
              value={
                <span className="inline-flex flex-wrap items-center gap-2">
                  <span className="font-semibold">
                    {manager.full_name || "Manager"}
                  </span>
                  <span className="text-gray-400">•</span>
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
          ) : shouldShowPendingRow ? (
            <>
              <Row
                icon={<Mail className="h-4 w-4" />}
                value={
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <span className="font-mono break-all">
                      {pendingEmailToShow}
                    </span>
                    {pendingCount > 1 ? (
                      <span className="text-xs font-semibold text-gray-500">
                        +{pendingCount - 1} more
                      </span>
                    ) : null}
                  </span>
                }
                right={
                  <div className="flex items-center gap-2">
                    <Pill tone="amber">INVITE PENDING</Pill>

                    {pendingForBusiness.length > 1 ? (
                      <button
                        onClick={() => setShowPendingList((v) => !v)}
                        className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50"
                        title="Show all pending invites"
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition ${
                            showPendingList ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    ) : null}
                  </div>
                }
              />

              {/* ✅ Dropdown list */}
              {showPendingList ? (
                <div className="rounded-2xl border border-gray-100 bg-white p-3">
                  <div className="mb-2 text-xs font-semibold text-gray-500">
                    Pending invites
                  </div>

                  <div className="space-y-2">
                    {pendingForBusiness.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-mono text-xs font-semibold text-gray-900">
                            {inv.email}
                          </div>
                          {inv.created_at ? (
                            <div className="text-[11px] text-gray-500">
                              {new Date(inv.created_at).toLocaleString()}
                            </div>
                          ) : null}
                        </div>

                        {canManage ? (
                          <button
                            onClick={() => revokeInvite(inv.id)}
                            disabled={revokingId === inv.id}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                            title="Revoke invite"
                          >
                            <XCircle className="h-4 w-4" />
                            {revokingId === inv.id ? "Revoking…" : "Revoke"}
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : legacy ? (
            <Row
              icon={<User className="h-4 w-4" />}
              value={<span className="font-mono">{legacy}</span>}
              right={<Pill tone="gray">MANAGER</Pill>}
            />
          ) : (
            <Row
              icon={<User className="h-4 w-4" />}
              value={
                <span className="text-gray-800 whitespace-nowrap">
                  Not assigned
                </span>
              }
              right={<Pill tone="gray">MANAGER</Pill>}
            />
          )}
        </>
      ) : null}

      {/* Invite */}
      {canManage ? (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <div className="mb-2 text-sm font-semibold text-gray-900">
            Invite manager by email
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="manager@company.com"
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-8 text-sm font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />

              {email.trim() ? (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {emailOk ? (
                    <span className="text-xs font-semibold text-emerald-600">
                      ✓
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-gray-300">
                      •
                    </span>
                  )}
                </div>
              ) : null}
            </div>

            {email.trim() ? (
              emailOk ? (
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
                  <div className="font-mono text-gray-800 break-words">
                    {email.trim()}
                  </div>
                </div>
              ) : (
                <div className="px-1 text-xs text-gray-500">
                  Enter a valid email (example: manager@company.com)
                </div>
              )
            ) : null}
          </div>

          <button
            onClick={invite}
            disabled={sending || !emailOk}
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {sending ? "Sending…" : "Invite"}
          </button>

          <div className="mt-2 text-xs text-gray-500">
            The email will remain visible as <b>INVITE PENDING</b> until the
            manager registers and gets access to this business.
          </div>
        </div>
      ) : null}
    </div>
  );
}
