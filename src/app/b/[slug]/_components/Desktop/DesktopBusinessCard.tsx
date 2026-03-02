"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Building2, User } from "lucide-react";

type PendingInvite = {
  id: string;
  business_id: string;
  email: string;
  role: string;
  status: string;
  created_at?: string | null;
};

type Props = {
  business: {
    id: string;
    slug: string;
    owner_phone?: string | null;
    manager_phone?: string | null;
  };
  role: "OWNER" | "MANAGER" | "GUEST";
  phone: string;
  isOwnerManager: boolean;
  pendingInvites?: PendingInvite[];
};

type OwnerProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
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
  manager: ManagerState;
};

function TonePill({
  children,
  tone = "gray",
}: {
  children: React.ReactNode;
  tone?: "gray" | "blue" | "emerald";
}) {
  const cls =
    tone === "blue"
      ? "border-blue-100 bg-blue-50 text-blue-700"
      : tone === "emerald"
        ? "border-emerald-100 bg-emerald-50 text-emerald-700"
        : "border-gray-200 bg-gray-50 text-gray-700";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cls}`}
    >
      {children}
    </span>
  );
}

function AccessRow({
  name,
  role,
  isYou,
}: {
  name: string;
  role: "OWNER" | "MANAGER";
  isYou?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex min-w-0 items-center gap-3">
        <div className="shrink-0 rounded-xl bg-gray-50 p-2 text-gray-700">
          <User className="h-4 w-4" />
        </div>
        <div className="min-w-0 text-sm font-semibold text-gray-900">{name}</div>
      </div>

      <div className="shrink-0 inline-flex items-center gap-2">
        <TonePill tone={role === "OWNER" ? "blue" : "gray"}>{role}</TonePill>
        {isYou ? <TonePill tone="emerald">YOU</TonePill> : null}
      </div>
    </div>
  );
}

function getOwnerName(data: StatusResponse | null, fallbackPhone?: string | null) {
  return (
    data?.owner?.full_name ||
    data?.owner?.email ||
    data?.owner_phone ||
    fallbackPhone ||
    "Owner"
  );
}

function getManagerName(
  data: StatusResponse | null,
  fallbackPhone?: string | null,
) {
  const manager = data?.manager;
  if (!manager || manager.state === "NONE") {
    return fallbackPhone || "Manager";
  }

  if (manager.state === "PENDING") {
    return manager.email || "Manager";
  }

  return manager.full_name || manager.email || fallbackPhone || "Manager";
}

export default function DesktopBusinessCard({
  business,
  role,
  phone,
  isOwnerManager,
}: Props) {
  const searchParams = useSearchParams();
  const [data, setData] = React.useState<StatusResponse | null>(null);

  React.useEffect(() => {
    let active = true;

    async function load() {
      if (!business.id) return;

      try {
        const res = await fetch(
          `/api/manager/status?business_id=${encodeURIComponent(business.id)}`,
          { cache: "no-store" },
        );
        const json = (await res.json().catch(() => null)) as StatusResponse | null;
        if (!active || !res.ok || !json) return;
        setData(json);
      } catch {
        if (active) setData(null);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [business.id]);

  const qs = searchParams?.toString();
  const suffix = qs ? `?${qs}` : "";
  const href = business.slug
    ? `/b/${encodeURIComponent(String(business.slug))}/settings/team${suffix}`
    : `./settings/team${suffix}`;

  const businessRole = role === "OWNER" ? "OWNER" : role === "MANAGER" ? "MANAGER" : "GUEST";
  const ownerName = getOwnerName(data, business.owner_phone ?? null);
  const managerName = getManagerName(
    data,
    business.manager_phone ?? phone ?? null,
  );

  return (
    <section className="desktopOnly rounded-2xl border border-gray-100 bg-white/70 px-4 py-5 shadow-sm backdrop-blur">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-wide text-gray-500">
          <Building2 className="h-3.5 w-3.5" />
          BUSINESS
        </div>
        <h3 className="text-lg font-semibold leading-tight text-gray-900 break-words">
          {business.slug}
        </h3>
        <TonePill tone={businessRole === "OWNER" ? "blue" : "gray"}>{businessRole}</TonePill>
      </div>

      <div className="mt-5">
        <div className="mb-3 text-xs font-semibold tracking-wide text-gray-500">
          ACCESS
        </div>

        <div className="space-y-3">
          <AccessRow name={ownerName} role="OWNER" isYou={role === "OWNER"} />
          <AccessRow
            name={isOwnerManager ? ownerName : managerName}
            role="MANAGER"
            isYou={role === "MANAGER"}
          />
        </div>
      </div>

      <div className="mt-5 border-t border-gray-200/70 pt-4">
        <Link
          href={href}
          className="block rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
        >
          Manage access
        </Link>
      </div>
    </section>
  );
}
