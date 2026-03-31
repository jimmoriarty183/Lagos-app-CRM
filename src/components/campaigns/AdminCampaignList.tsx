"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CampaignDeliveryBadge,
  CampaignStatusBadge,
  CampaignTypeBadge,
} from "@/components/campaigns/CampaignBadges";
import type { Campaign } from "@/lib/campaigns/types";

type Props = {
  initialItems: Campaign[];
};

function fmtDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function AdminCampaignList({ initialItems }: Props) {
  const [typeFilter, setTypeFilter] = useState<
    "all" | "announcement" | "survey"
  >("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "draft" | "active" | "archived"
  >("all");

  const items = useMemo(() => {
    return initialItems.filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      return true;
    });
  }, [initialItems, statusFilter, typeFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={typeFilter}
          onChange={(event) =>
            setTypeFilter(
              event.target.value as "all" | "announcement" | "survey",
            )
          }
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
        >
          <option value="all">All types</option>
          <option value="announcement">Announcement</option>
          <option value="survey">Survey</option>
        </select>
        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value as "all" | "draft" | "active" | "archived",
            )
          }
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Sent</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          No campaigns found
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full table-fixed border-collapse">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                  Markers
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                  Period
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                  Audience
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr
                  key={item.id || `campaign-row-${index}`}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {item.id ? (
                      <Link
                        href={`/admin/campaigns/${item.id}`}
                        className="font-semibold text-slate-900 hover:text-[var(--brand-700)]"
                      >
                        {item.title}
                      </Link>
                    ) : (
                      <span
                        className="font-semibold text-rose-600"
                        title="Campaign id is missing"
                      >
                        {item.title} (no id)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    <div className="flex flex-wrap gap-1.5">
                      <CampaignTypeBadge type={item.type} />
                      <CampaignStatusBadge status={item.status} />
                      <CampaignDeliveryBadge channels={item.channels} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {fmtDate(item.startsAt)} - {fmtDate(item.endsAt)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {item.targetRoles.length > 0
                      ? item.targetRoles.join(", ")
                      : "All roles"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
