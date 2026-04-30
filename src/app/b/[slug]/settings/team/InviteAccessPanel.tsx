"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import IncomingInvitesPanel from "./IncomingInvitesPanel";

export default function InviteAccessPanel({
  businessId: _businessId,
  businessSlug,
  canManage,
}: {
  businessId: string;
  businessSlug: string;
  canManage: boolean;
}) {
  return (
    <div className="space-y-4">
      {canManage ? (
        <Link
          href="/app/settings/team"
          className="flex items-center justify-between gap-3 rounded-[18px] border border-[#C7D2FE] dark:border-[var(--brand-500)]/40 bg-[#EEF2FF] dark:bg-[var(--brand-600)]/15 px-4 py-3 text-sm text-[#312E81] transition hover:border-[#A5B4FC] hover:bg-[#E0E7FF]"
        >
          <span className="min-w-0">
            <span className="block font-semibold text-[#3730A3]">
              Inviting people happens on the account level now
            </span>
            <span className="mt-0.5 block text-[13px] leading-5 text-[#4338CA]">
              One invite, multiple businesses. Shared seat limit across all your businesses.
            </span>
          </span>
          <span className="flex-none inline-flex items-center gap-1.5 rounded-full bg-[#4F46E5] px-3 py-1.5 text-xs font-semibold text-white">
            Manage team
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      ) : null}

      <IncomingInvitesPanel currentBusinessSlug={businessSlug} />
    </div>
  );
}
