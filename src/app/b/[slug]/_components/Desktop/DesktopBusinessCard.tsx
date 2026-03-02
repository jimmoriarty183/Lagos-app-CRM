import React from "react";
import BusinessPeoplePanel from "../BusinessPeoplePanel"; // ✅ ВАЖНО: импорт

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
    // ✅ phone поля можешь оставить или убрать — не критично
    owner_phone?: string | null;
    manager_phone?: string | null;
  };
  role: "OWNER" | "MANAGER" | "GUEST";
  isOwnerManager: boolean;
  pendingInvites?: PendingInvite[];
  currentUserId: string;
};

export default function DesktopBusinessCard({
  business,
  role,
  isOwnerManager,
  pendingInvites = [],
  currentUserId,
}: Props) {
  return (
    <section className="desktopOnly rounded-2xl border border-gray-100 bg-white/90 shadow-sm backdrop-blur">
      <div className="px-5 pt-5">
        <div className="text-[11px] font-semibold tracking-wide text-gray-500">
          BUSINESS
        </div>
        <div className="mt-1 min-w-0 truncate text-base font-semibold text-gray-900">
          {business.slug}
        </div>
        <div className="mt-1 text-xs text-gray-500">Access overview</div>
      </div>

      <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-gray-200/70 to-transparent" />

      <div className="px-5 py-4">
        <BusinessPeoplePanel
          businessId={business.id}
          businessSlug={business.slug}
          ownerPhone={business.owner_phone ?? null}
          legacyManagerPhone={business.manager_phone ?? null}
          role={role}
          isOwnerManager={isOwnerManager}
          pendingInvites={pendingInvites}
          currentUserId={currentUserId}
          mode="summary"
        />
      </div>
    </section>
  );
}
