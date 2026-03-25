import Link from "next/link";
import type { SupportRequestRecord } from "@/lib/support/types";
import { formatSupportDate, normalizeEnumLabel } from "@/lib/support/utils";
import { SupportPriorityBadge, SupportStatusBadge } from "@/components/support/SupportBadges";

export function SupportRequestsListView({
  items,
  hrefBuilder,
  showBusiness = false,
  showSubmitter = false,
  emptyTitle,
  emptyDescription,
}: {
  items: SupportRequestRecord[];
  hrefBuilder: (requestId: string) => string;
  showBusiness?: boolean;
  showSubmitter?: boolean;
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
        <div className="text-sm font-semibold text-slate-900">{emptyTitle}</div>
        <div className="mt-1 text-sm text-slate-500">{emptyDescription}</div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed border-collapse">
          <thead className="bg-slate-50/80">
            <tr className="border-b border-slate-200">
              <th className="w-[11%] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">ID</th>
              {showBusiness ? <th className="w-[11%] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Business</th> : null}
              <th className="w-[10%] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Type</th>
              <th className={`${showSubmitter ? "w-[18%]" : "w-[27%]"} px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500`}>Subject</th>
              <th className="w-[10%] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Status</th>
              <th className="w-[10%] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Priority</th>
              {showSubmitter ? <th className="w-[10%] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Submitter</th> : null}
              <th className="w-[12%] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Created</th>
              <th className="w-[12%] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Updated</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-slate-100 transition-colors hover:bg-[#f7faff]">
                <td className="px-4 py-4 align-top text-sm text-slate-700">
                  <Link href={hrefBuilder(item.id)} className="font-semibold text-slate-900 transition hover:text-blue-700">
                    #{item.id.slice(0, 8)}
                  </Link>
                </td>
                {showBusiness ? (
                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    <div className="truncate">{item.businessLabel || item.businessId || "-"}</div>
                  </td>
                ) : null}
                <td className="px-4 py-4 align-top text-sm text-slate-700">
                  <div className="truncate">{item.type ? normalizeEnumLabel(item.type).replaceAll("_", " ") : "-"}</div>
                </td>
                <td className="px-4 py-4 align-top text-sm text-slate-700">
                  <div className="truncate font-medium text-slate-900">{item.subject || "No subject"}</div>
                </td>
                <td className="px-4 py-4 align-top text-sm text-slate-700">
                  <SupportStatusBadge status={item.status} />
                </td>
                <td className="px-4 py-4 align-top text-sm text-slate-700">
                  <SupportPriorityBadge priority={item.priority} />
                </td>
                {showSubmitter ? (
                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    <div className="truncate">{item.submitterLabel || item.submitterUserId || "-"}</div>
                  </td>
                ) : null}
                <td className="px-4 py-4 align-top text-sm text-slate-700">{formatSupportDate(item.createdAt)}</td>
                <td className="px-4 py-4 align-top text-sm text-slate-700">{formatSupportDate(item.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
