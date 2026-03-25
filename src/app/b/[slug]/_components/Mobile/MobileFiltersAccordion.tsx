"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DASHBOARD_RANGE_OPTIONS,
  type DashboardRange,
} from "@/lib/order-dashboard-summary";
import {
  getDefaultVisibleStatusFilters,
  type StatusFilterValue,
} from "@/lib/business-statuses";
import { useBusinessStatuses } from "@/lib/use-business-statuses";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { resolveUserDisplay } from "@/lib/user-display";

export type TeamActor = {
  id: string;
  label: string;
  kind: "OWNER" | "MANAGER";
};

export type Filters = {
  q: string;
  statuses: StatusFilterValue[];
  range: DashboardRange;
  startDate: string | null;
  endDate: string | null;
};

type ViewMode = "list" | "kanban";
type OrderSort =
  | "default"
  | "newest"
  | "oldest"
  | "dueSoonest"
  | "dueLatest"
  | "statusAsc"
  | "statusDesc"
  | "amountHigh"
  | "amountLow";

const SORT_OPTIONS: Array<{ value: OrderSort; label: string }> = [
  { value: "default", label: "Default order" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "dueSoonest", label: "Due soonest" },
  { value: "dueLatest", label: "Due latest" },
  { value: "statusAsc", label: "Status: A to Z" },
  { value: "statusDesc", label: "Status: Z to A" },
  { value: "amountHigh", label: "Amount: high to low" },
  { value: "amountLow", label: "Amount: low to high" },
];

type Props = {
  businessId: string;
  phoneRaw: string;
  filters: Filters;
  statusMode: "default" | "all" | "custom";
  summaryRange: DashboardRange;
  clearHref: string;
  hasActiveFilters: boolean;
  actor: string;
  actors?: TeamActor[];
  sort: OrderSort;
  viewMode: ViewMode;
};

type ManagerStatusResponse = {
  owner?: {
    id?: string | null;
    full_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  } | null;
  managers_active?: Array<{
    user_id: string;
    full_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  }>;
};

function mergeActors(baseActors: TeamActor[], nextActors: TeamActor[]) {
  const map = new Map<string, TeamActor>();
  for (const actor of [...baseActors, ...nextActors]) {
    if (!actor?.id) continue;
    map.set(actor.id, actor);
  }
  return Array.from(map.values());
}

export default function MobileFiltersAccordion({
  businessId,
  phoneRaw,
  filters,
  statusMode,
  summaryRange,
  clearHref,
  hasActiveFilters,
  actor,
  actors = [],
  sort,
  viewMode,
}: Props) {
  const { customStatuses, statuses } = useBusinessStatuses(businessId);
  const [isOpen, setIsOpen] = useState(false);
  const [rangeValue, setRangeValue] = useState<DashboardRange>(filters.range);
  const [customStart, setCustomStart] = useState(filters.startDate ?? "");
  const [customEnd, setCustomEnd] = useState(filters.endDate ?? "");
  const [actorValue, setActorValue] = useState(actor || "ALL");
  const [sortValue, setSortValue] = useState(sort);
  const [loadedActors, setLoadedActors] = useState<TeamActor[]>(actors);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const onOpen = () => {
      setRangeValue(filters.range);
      setCustomStart(filters.startDate ?? "");
      setCustomEnd(filters.endDate ?? "");
      setActorValue(actor || "ALL");
      setSortValue(sort);
      setIsOpen(true);
    };

    window.addEventListener("orders-mobile-open-filters", onOpen as EventListener);
    return () =>
      window.removeEventListener("orders-mobile-open-filters", onOpen as EventListener);
  }, [actor, filters.endDate, filters.range, filters.startDate, sort]);

  useEffect(() => {
    let alive = true;

    async function loadActors() {
      try {
        const res = await fetch(`/api/manager/status?business_id=${encodeURIComponent(businessId)}`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!res.ok) return;

        const data = (await res.json()) as ManagerStatusResponse;
        if (!alive) return;

        const nextActors: TeamActor[] = [];

        if (data.owner?.id) {
          const ownerDisplay = resolveUserDisplay({
            full_name: data.owner.full_name ?? null,
            first_name: data.owner.first_name ?? null,
            last_name: data.owner.last_name ?? null,
            email: data.owner.email ?? null,
          });

          nextActors.push({
            id: String(data.owner.id),
            label: ownerDisplay.primary,
            kind: "OWNER",
          });
        }

        for (const manager of data.managers_active ?? []) {
          const managerDisplay = resolveUserDisplay({
            full_name: manager.full_name ?? null,
            first_name: manager.first_name ?? null,
            last_name: manager.last_name ?? null,
            email: manager.email ?? null,
          });

          nextActors.push({
            id: String(manager.user_id),
            label: managerDisplay.primary,
            kind: "MANAGER",
          });
        }

        if (alive && isMountedRef.current) {
          setLoadedActors(nextActors);
        }
      } catch {
        // Keep server-provided actors when the client fetch fails.
      }
    }

    void loadActors();

    return () => {
      alive = false;
    };
  }, [businessId]);

  useEffect(() => {
    if (!isOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  const inputCls =
    "h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm text-[#374151] outline-none transition " +
    "focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/15";
  const selectTriggerCls =
    "h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm text-[#374151] shadow-none transition " +
    "focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/15 data-[placeholder]:text-[#9CA3AF]";
  const selectContentCls =
    "z-[130] rounded-xl border border-[#E5E7EB] bg-white p-1 shadow-[0_16px_40px_rgba(15,23,42,0.12)]";

  const defaultVisibleStatuses = getDefaultVisibleStatusFilters(customStatuses);
  const activeCount = [
    filters.q ? 1 : 0,
    filters.statuses.length > 0 ? 1 : 0,
    filters.range !== "ALL" ? 1 : 0,
    actor !== "ALL" ? 1 : 0,
    sort !== "default" ? 1 : 0,
  ].reduce((sum, item) => sum + item, 0);

  const hasFiltersApplied = activeCount > 0;
  const showCustomRange = rangeValue === "custom";
  const statusOptions = [
    ...statuses.map((status) => ({ value: status.value as StatusFilterValue, label: status.label })),
    { value: "OVERDUE" as const, label: "Overdue" },
  ];
  const effectiveActors = useMemo(
    () => mergeActors(actors, loadedActors),
    [actors, loadedActors],
  );
  const actorOptions = useMemo(
    () => [
      { value: "ALL", label: "All team" },
      { value: "ME", label: "Me" },
      { value: "UNASSIGNED", label: "Unassigned" },
      { value: "OWNER", label: "Owners" },
      { value: "MANAGER", label: "Managers" },
      ...effectiveActors
        .slice()
        .sort((a, b) => a.label.localeCompare(b.label))
        .map((member) => ({
          value: `user:${member.id}`,
          label: member.label,
        })),
    ],
    [effectiveActors],
  );
  const shouldKeepAllStatuses = statusMode === "all";
  const shouldKeepDefaultStatuses =
    statusMode === "default" ||
    (filters.statuses.length === defaultVisibleStatuses.length &&
      defaultVisibleStatuses.every((status) => filters.statuses.includes(status)));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close filters"
        onClick={() => setIsOpen(false)}
        className="absolute inset-0 bg-[#0f172a]/32 backdrop-blur-[2px]"
      />

      <section className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-hidden rounded-t-[28px] border border-[#E5E7EB] bg-white shadow-[0_-20px_60px_rgba(15,23,42,0.12)]">
        <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-[#E5E7EB]" />

        <div className="flex items-center justify-between gap-3 border-b border-[#F3F4F6] px-4 py-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#1F2937]">
              <SlidersHorizontal className="h-4 w-4 text-[#6B7280]" />
              Search & Filters
            </div>
            <div className="mt-1 text-xs text-[#9CA3AF]">
              {hasFiltersApplied ? `${activeCount} active` : "No active filters"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters ? (
              <a
                href={clearHref}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-3 text-xs font-semibold text-[#374151] transition hover:border-[#C7D2FE] hover:bg-[#F9FAFB]"
              >
                Reset
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#6B7280] transition hover:border-[#C7D2FE] hover:bg-[#F9FAFB] hover:text-[#1F2937]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <form method="get" className="grid max-h-[calc(88vh-72px)] gap-4 overflow-y-auto px-4 py-4">
          <input type="hidden" name="u" value={phoneRaw} />
          <input type="hidden" name="srange" value={summaryRange} />
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="range" value={rangeValue} />
          <input type="hidden" name="actor" value={actorValue} />
          <input type="hidden" name="sort" value={sortValue} />
          {shouldKeepAllStatuses ? <input type="hidden" name="statusMode" value="all" /> : null}
          {viewMode === "kanban" ? <input type="hidden" name="view" value="kanban" /> : null}

          <label className="grid gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
              Search
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                name="q"
                defaultValue={filters.q}
                placeholder="Client, phone, manager, amount..."
                className={`${inputCls} pl-11`}
              />
            </div>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
                Period
              </span>
              <Select
                value={rangeValue}
                onValueChange={(value) => {
                  const next = value as DashboardRange;
                  setRangeValue(next);
                  if (next !== "custom") {
                    setCustomStart("");
                    setCustomEnd("");
                  }
                }}
              >
                <SelectTrigger className={selectTriggerCls}>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent className={selectContentCls}>
                  {DASHBOARD_RANGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="grid gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
                Assignee
              </span>
              <Select value={actorValue} onValueChange={setActorValue}>
                <SelectTrigger className={selectTriggerCls}>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent className={selectContentCls}>
                  {actorOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
              Sort
            </span>
            <Select value={sortValue} onValueChange={(value) => setSortValue(value as OrderSort)}>
              <SelectTrigger className={selectTriggerCls}>
                <SelectValue placeholder="Select sort" />
              </SelectTrigger>
              <SelectContent className={selectContentCls}>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <div className="grid gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
              Statuses
            </div>
            <div className="flex flex-wrap gap-2 rounded-[20px] border border-[#E5E7EB] bg-[#F9FAFB] p-2.5">
              {statusOptions.map((option) => (
                <label key={option.value} className="cursor-pointer">
                  <input
                    type="checkbox"
                    name="status"
                    value={option.value}
                    defaultChecked={
                      shouldKeepAllStatuses ||
                      (shouldKeepDefaultStatuses
                        ? defaultVisibleStatuses.includes(option.value)
                        : filters.statuses.includes(option.value))
                    }
                    className="peer sr-only"
                  />
                  <span className="inline-flex min-h-9 items-center rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-[12px] font-medium leading-4 text-[#374151] transition peer-checked:border-[#6366F1] peer-checked:bg-[#6366F1] peer-checked:text-white">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
            <div className="text-[11px] text-[#9CA3AF]">
              {shouldKeepDefaultStatuses
                ? "Default view shows all statuses."
                : "Choose one or several statuses."}
            </div>
          </div>

          {showCustomRange ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
                  Start
                </span>
                <input
                  type="date"
                  name="start"
                  value={customStart}
                  onChange={(event) => setCustomStart(event.currentTarget.value)}
                  className={inputCls}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
                  End
                </span>
                <input
                  type="date"
                  name="end"
                  value={customEnd}
                  onChange={(event) => setCustomEnd(event.currentTarget.value)}
                  className={inputCls}
                />
              </label>
            </div>
          ) : null}

          <div className="sticky bottom-0 grid grid-cols-[minmax(0,1fr)_120px] gap-3 border-t border-[#F3F4F6] bg-white pb-1 pt-4">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#374151] transition hover:border-[#C7D2FE] hover:bg-[#F9FAFB]"
            >
              Cancel
            </button>
            <Button
              type="submit"
              size="sm"
              className="h-11 w-full justify-center rounded-2xl px-4 text-sm"
              disabled={showCustomRange && (!customStart || !customEnd)}
            >
              Apply
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
