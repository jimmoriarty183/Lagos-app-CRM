import React from "react";
import { Building2, ShieldCheck } from "lucide-react";
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
    owner_phone?: string | null;
    manager_phone?: string | null;
  };
  role: "OWNER" | "MANAGER" | "GUEST";
  phone: string;
  isOwnerManager: boolean;
  pendingInvites?: PendingInvite[];
};

function RolePill({ role }: { role: Props["role"] }) {
  const cls =
    role === "OWNER"
      ? "border-blue-100 bg-blue-50 text-blue-700"
      : role === "MANAGER"
        ? "border-emerald-100 bg-emerald-50 text-emerald-700"
        : "border-gray-200 bg-gray-50 text-gray-700";

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
    <section className="desktopOnly rounded-2xl border border-gray-100 bg-white/70 px-4 py-5 shadow-sm backdrop-blur">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-wide text-gray-500">
          <Building2 className="h-3.5 w-3.5" />
          BUSINESS
        </div>

        <h3 className="text-lg font-semibold leading-tight text-gray-900 break-words">
          {business.slug}
        </h3>

        <RolePill role={role} />
      </div>

      <div className="mt-5 border-t border-gray-200/70 pt-4">
        <div className="mb-3 text-xs font-semibold tracking-wide text-gray-500">
          ACCESS
        </div>

        <BusinessPeoplePanel
          businessId={business.id}
          businessSlug={business.slug}
          ownerPhone={business.owner_phone ?? phone ?? null}
          legacyManagerPhone={business.manager_phone ?? null}
          role={role}
          isOwnerManager={isOwnerManager}
          pendingInvites={pendingInvites}
          mode="summary"
        />
      </div>
    </section>
  );
}
