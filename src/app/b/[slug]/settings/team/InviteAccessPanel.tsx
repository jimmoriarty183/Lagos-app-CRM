"use client";

import { useRef, useState } from "react";
import { Send } from "lucide-react";
import InviteManager from "@/app/b/[slug]/_components/InviteManager";
import PendingInvites, { type PendingInvitesHandle } from "@/app/b/[slug]/_components/PendingInvites";
import IncomingInvitesPanel from "./IncomingInvitesPanel";

export default function InviteAccessPanel({
  businessId,
  businessSlug,
  canManage,
}: {
  businessId: string;
  businessSlug: string;
  canManage: boolean;
}) {
  const pendingInvitesRef = useRef<PendingInvitesHandle | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <div className="space-y-4">
        {canManage ? (
          <section className="rounded-[18px] border border-[#E5E7EB] bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280]">
                <Send className="h-4 w-4" />
              </span>
              Invite manager
            </div>

            <div className="mt-3">
              <InviteManager
                businessId={businessId}
                onInvited={async () => {
                  setRefreshKey((current) => current + 1);
                  await pendingInvitesRef.current?.reload();
                }}
              />
            </div>
          </section>
        ) : null}

        <PendingInvites
          ref={pendingInvitesRef}
          businessId={businessId}
          refreshKey={refreshKey}
        />
      </div>

      <IncomingInvitesPanel currentBusinessSlug={businessSlug} />
    </div>
  );
}
