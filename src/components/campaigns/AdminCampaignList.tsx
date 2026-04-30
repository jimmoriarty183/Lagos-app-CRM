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
          className="h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm text-slate-700 dark:text-white/80"
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
          className="h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm text-slate-700 dark:text-white/80"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Sent</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-white/[0.04] px-4 py-8 text-center text-sm text-slate-500 dark:text-white/55">
          No campaigns found
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03]">
          <table className="w-full table-fixed border-collapse">
            <thead className="bg-slate-50 dark:bg-white/[0.04]">
              <tr className="border-b border-slate-200 dark:border-white/10">
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-white/55">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-white/55">
                  Markers
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-white/55">
                  Period
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-white/55">
                  Audience
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr
                  key={item.id || `campaign-row-${index}`}
                  className="border-b border-slate-100 dark:border-white/[0.06] hover:bg-slate-50"
                >
                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-white/80">
                    {item.id ? (
                      <Link
                        href={`/admin/campaigns/${item.id}`}
                        className="font-semibold text-slate-900 dark:text-white hover:text-[var(--brand-700)]"
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
                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-white/80">
                    <div className="flex flex-wrap gap-1.5">
                      <CampaignTypeBadge type={item.type} />
                      <CampaignStatusBadge status={item.status} />
                      <CampaignDeliveryBadge channels={item.channels} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-white/80">
                    {fmtDate(item.startsAt)} - {fmtDate(item.endsAt)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-white/80">
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
