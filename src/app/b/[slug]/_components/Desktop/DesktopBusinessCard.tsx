import React from "react";
import { ShieldCheck } from "lucide-react";
import BusinessPeoplePanel from "../BusinessPeoplePanel";

type PendingInvite = {
  id: string;
  business_id: string;
  email: string;
  role: string; // "MANAGER"
  status: string; // "PENDING"
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

  // старые пропсы (совместимость)
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
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${cls}`}
    >
      <ShieldCheck className="h-4 w-4 opacity-80" />
      {role}
    </span>
  );
}

export default function DesktopBusinessCard({
  business,
  role,
  phone,
  isOwnerManager,
  pendingInvites = [], // ✅ IMPORTANT
}: Props) {
  return (
    <section className="desktopOnly rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
        <div className="min-w-0">
          <div className="text-xs font-semibold tracking-wide text-gray-500">
            BUSINESS
          </div>
          <div className="min-w-0 truncate text-lg font-semibold text-gray-900 leading-snug break-words">
            {business.slug}
          </div>
        </div>

        <RolePill role={role} />
      </div>

      <div className="px-5 py-4">
        <BusinessPeoplePanel
          businessId={business.id}
          ownerPhone={business.owner_phone}
          legacyManagerPhone={business.manager_phone}
          role={role}
          isOwnerManager={isOwnerManager}
          pendingInvites={pendingInvites} // ✅ IMPORTANT
        />
      </div>
    </section>
  );
}
