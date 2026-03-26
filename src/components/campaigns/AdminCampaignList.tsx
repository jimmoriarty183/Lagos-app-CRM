"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Campaign } from "@/lib/campaigns/types";

type Props = {
  initialItems: Campaign[];
};

function fmtDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function AdminCampaignList({ initialItems }: Props) {
  const [typeFilter, setTypeFilter] = useState<"all" | "announcement" | "survey">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "active" | "archived">("all");

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
          onChange={(event) => setTypeFilter(event.target.value as "all" | "announcement" | "survey")}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
        >
          <option value="all">Все типы</option>
          <option value="announcement">Уведомление</option>
          <option value="survey">Опрос</option>
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as "all" | "draft" | "active" | "archived")}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
        >
          <option value="all">Все статусы</option>
          <option value="draft">Черновик</option>
          <option value="active">Активно</option>
          <option value="archived">Архив</option>
        </select>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          Кампании не найдены
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full table-fixed border-collapse">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.12em] text-slate-500">Заголовок</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.12em] text-slate-500">Тип</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.12em] text-slate-500">Статус</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.12em] text-slate-500">Период</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.12em] text-slate-500">Роли</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id || `campaign-row-${index}`} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {item.id ? (
                      <Link href={`/admin/campaigns/${item.id}`} className="font-semibold text-slate-900 hover:text-indigo-700">
                        {item.title}
                      </Link>
                    ) : (
                      <span className="font-semibold text-rose-600" title="Campaign id is missing">
                        {item.title} (no id)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{item.type}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{item.status}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {fmtDate(item.startsAt)} - {fmtDate(item.endsAt)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {item.targetRoles.length > 0 ? item.targetRoles.join(", ") : "Все роли"}
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
