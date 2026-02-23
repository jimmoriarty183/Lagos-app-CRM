import React from "react";
import { ShieldCheck } from "lucide-react";
import BusinessPeoplePanel from "../BusinessPeoplePanel";

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
    owner_phone: string;
    manager_phone: string | null;
  };
  role: "OWNER" | "MANAGER" | "GUEST";
  phone: string;
  isOwnerManager: boolean;
  pendingInvites?: PendingInvite[];

  card?: React.CSSProperties;
  cardHeader?: React.CSSProperties;
  cardTitle?: React.CSSProperties;
};

function RolePill({ role }: { role: Props["role"] }) {
  const cls =
    role === "OWNER"
      ? "bg-blue-50 text-blue-700 border-blue-100"
      : role === "MANAGER"
        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
        : "bg-gray-50 text-gray-700 border-gray-200";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cls}`}
    >
      <ShieldCheck className="h-3.5 w-3.5 opacity-80" />
      {role}
    </span>
  );
}

export default function DesktopBusinessCard({
  business,
  role,
  phone,
  isOwnerManager,
  pendingInvites = [],
}: Props) {
  return (
    <section className="desktopOnly rounded-2xl border border-gray-100 bg-white/90 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-4 px-5 pt-5">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold tracking-wide text-gray-500">
            BUSINESS
          </div>
          <div className="mt-1 min-w-0 truncate text-base font-semibold text-gray-900">
            {business.slug}
          </div>
          <div className="mt-1 text-xs text-gray-500">Access overview</div>
        </div>

        <RolePill role={role} />
      </div>

      <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-gray-200/70 to-transparent" />

      <div className="px-5 py-4">
        <BusinessPeoplePanel
          businessId={business.id}
          businessSlug={business.slug}
          ownerPhone={business.owner_phone}
          legacyManagerPhone={business.manager_phone}
          role={role}
          isOwnerManager={isOwnerManager}
          pendingInvites={pendingInvites}
          mode="summary" // ✅ only owner + active manager
        />
      </div>
    </section>
  );
}
