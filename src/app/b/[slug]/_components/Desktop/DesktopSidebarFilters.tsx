"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

import {
  getDefaultVisibleStatusFilters,
  getStatusLabel,
  getStatusTone,
  isTerminalStatus,
  type StatusFilterValue,
} from "@/lib/business-statuses";
import {
  DASHBOARD_RANGE_OPTIONS,
  type DashboardRange,
} from "@/lib/order-dashboard-summary";
import { resolveUserDisplay } from "@/lib/user-display";
import { useBusinessStatuses } from "@/lib/use-business-statuses";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SidebarStatus = StatusFilterValue;
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

type TeamActor = {
  id: string;
  label: string;
  kind: "OWNER" | "MANAGER";
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

type Props = {
  businessId: string;
  phoneRaw: string;
  q: string;
  statuses: SidebarStatus[];
  statusMode: "default" | "all" | "custom";
  range: DashboardRange;
  summaryRange: DashboardRange;
  startDate: string | null;
  endDate: string | null;
  actor: string;
  sort: OrderSort;
  currentUserId?: string | null;
  actors?: TeamActor[];
  hasActiveFilters?: boolean;
  clearHref?: string;
  layoutMode?: "list" | "kanban";
};

function getStatusTriggerLabel(
  statuses: SidebarStatus[],
  activeStatusOptions: readonly SidebarStatus[],
  inactiveStatusOptions: readonly SidebarStatus[],
) {
  if (statuses.length === 0) return "All statuses";
  const allStatusOptions = Array.from(
    new Set([...activeStatusOptions, ...inactiveStatusOptions]),
  );
  if (
    statuses.length === allStatusOptions.length &&
    allStatusOptions.every((status) => statuses.includes(status))
  ) {
    return "All statuses";
  }
  if (
    statuses.length === activeStatusOptions.length &&
    activeStatusOptions.every((status) => statuses.includes(status))
  ) {
    return "Active statuses";
  }
  if (
    statuses.length === inactiveStatusOptions.length &&
    inactiveStatusOptions.every((status) => statuses.includes(status))
  ) {
    return "Inactive statuses";
  }
  if (statuses.length === 1) {
    return statuses[0] === "OVERDUE" ? "Overdue" : getStatusLabel(statuses[0]);
  }
  return `${statuses.length} statuses`;
}

function getManagerTriggerLabel(actor: string, actors: TeamActor[]) {
  if (actor === "ALL") return "All managers";
  if (actor === "ME") return "Me";
  if (actor === "UNASSIGNED") return "Unassigned";
  if (actor.startsWith("user:")) {
    return (
      actors.find((member) => `user:${member.id}` === actor)?.label ?? "Manager"
    );
  }
  return "All managers";
}

function mergeActors(baseActors: TeamActor[], nextActors: TeamActor[]) {
  const map = new Map<string, TeamActor>();
  for (const actor of [...baseActors, ...nextActors]) {
    if (!actor?.id) continue;
    map.set(actor.id, actor);
  }
  return Array.from(map.values());
}

function getInitials(label: string) {
  const clean = label.trim();
  if (!clean) return "U";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function ActorAvatar({ label }: { label: string }) {
  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1F2937] text-[12px] font-semibold text-white">
      {getInitials(label)}
    </span>
  );
}

export default function DesktopSidebarFilters({
  businessId,
  phoneRaw,
  q,
  statuses,
  statusMode,
  range,
  summaryRange,
  startDate,
  endDate,
  actor,
  sort,
  currentUserId,
  actors = [],
  hasActiveFilters = false,
  clearHref,
  layoutMode = "list",
}: Props) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const { customStatuses, statuses: businessStatuses } =
    useBusinessStatuses(businessId);
  const [loadedActors, setLoadedActors] = useState<TeamActor[]>(actors);
  const [rangeValue, setRangeValue] = useState<DashboardRange>(range);
  const [customStart, setCustomStart] = useState(startDate ?? "");
  const [customEnd, setCustomEnd] = useState(endDate ?? "");
  const [statusValues, setStatusValues] = useState<SidebarStatus[]>(statuses);
  const [statusTouched, setStatusTouched] = useState(false);
  const [actorValue, setActorValue] = useState(actor || "ALL");
  const [sortValue, setSortValue] = useState<OrderSort>(sort);
  const [rangeMenuOpen, setRangeMenuOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [actorMenuOpen, setActorMenuOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const showCustomRange = rangeValue === "custom";
  const customRangeReady =
    !showCustomRange || (Boolean(customStart) && Boolean(customEnd));
  const statusOptions = useMemo(
    () => [
      ...businessStatuses.map((status) => ({
        value: status.value as SidebarStatus,
        label: status.label,
      })),
      { value: "OVERDUE" as const, label: "Overdue" },
    ],
    [businessStatuses],
  );
  const activeStatusOptions = useMemo(
    () => getDefaultVisibleStatusFilters(customStatuses),
    [customStatuses],
  );
  const inactiveStatusOptions = useMemo(
    () =>
      businessStatuses
        .filter((status) => isTerminalStatus(status.value))
        .map((status) => status.value as SidebarStatus),
    [businessStatuses],
  );
  const baseStatusValues = useMemo(() => {
    if (statusMode === "all")
      return statusOptions.map((option) => option.value);
    if (statuses.length > 0) return statuses;
    return activeStatusOptions.slice();
  }, [activeStatusOptions, statusMode, statusOptions, statuses]);
  const selectedStatusValues = statusTouched ? statusValues : baseStatusValues;
  const shouldKeepAllStatuses =
    statusMode === "all" ||
    selectedStatusValues.length === 0 ||
    selectedStatusValues.length === statusOptions.length;
  const shouldKeepDefaultStatuses =
    selectedStatusValues.length === activeStatusOptions.length &&
    activeStatusOptions.every((status) =>
      selectedStatusValues.includes(status),
    );

  const effectiveActors = useMemo(
    () => mergeActors(actors, loadedActors),
    [actors, loadedActors],
  );
  const actorOptions = useMemo(
    () =>
      effectiveActors
        .filter(
          (actorOption) => !currentUserId || actorOption.id !== currentUserId,
        )
        .slice()
        .sort((a, b) => a.label.localeCompare(b.label)),
    [currentUserId, effectiveActors],
  );
  const normalizedActorValue =
    actorValue === "ALL" ||
    actorValue === "ME" ||
    actorValue === "UNASSIGNED" ||
    (!!currentUserId && actorValue === `user:${currentUserId}`) ||
    actorOptions.some((member) => `user:${member.id}` === actorValue)
      ? !!currentUserId && actorValue === `user:${currentUserId}`
        ? "ME"
        : actorValue
      : "ALL";

  const inputCls =
    "h-9 w-full rounded-lg border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm font-medium text-[#374151] outline-none transition placeholder:text-[#9CA3AF] focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/15";

  const toggleStatus = (status: SidebarStatus) => {
    if (!statusTouched) setStatusValues(baseStatusValues);
    setStatusTouched(true);
    setStatusValues((current) =>
      (statusTouched ? current : baseStatusValues).includes(status)
        ? (statusTouched ? current : baseStatusValues).filter(
            (value) => value !== status,
          )
        : [...(statusTouched ? current : baseStatusValues), status],
    );
  };

  const submitNow = () => formRef.current?.requestSubmit();

  useEffect(() => {
    let alive = true;

    async function loadActors() {
      try {
        const res = await fetch(
          `/api/manager/status?business_id=${encodeURIComponent(businessId)}`,
          {
            credentials: "same-origin",
            cache: "no-store",
          },
        );
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

        setLoadedActors(nextActors);
      } catch {
        // Keep server-provided actors when client fetch fails.
      }
    }

    void loadActors();

    return () => {
      alive = false;
    };
  }, [businessId]);

  return (
    <section className="max-h-[calc(100vh-100px)] overflow-y-auto rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] overscroll-contain">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF] dark:text-white/40">
          Filters
        </div>

        {hasActiveFilters && clearHref ? (
          <a
            href={clearHref}
            className="inline-flex h-7 items-center justify-center rounded-lg border border-[#E5E7EB] dark:border-white/10 px-2.5 text-[11px] font-semibold text-[#6B7280] dark:text-white/55 transition hover:border-[#C7D2FE] hover:text-[#1F2937]"
          >
            Reset
          </a>
        ) : null}
      </div>

      <form ref={formRef} method="get" className="space-y-3 pb-1">
        <input type="hidden" name="u" value={phoneRaw} />
        <input type="hidden" name="srange" value={summaryRange} />
        <input type="hidden" name="page" value="1" />
        <input type="hidden" name="sort" value={sortValue} />
        {layoutMode === "kanban" ? (
          <input type="hidden" name="view" value="kanban" />
        ) : null}
        <input type="hidden" name="range" value={rangeValue} />
        {shouldKeepAllStatuses ? (
          <input type="hidden" name="statusMode" value="all" />
        ) : null}
        {showCustomRange && customStart ? (
          <input type="hidden" name="start" value={customStart} />
        ) : null}
        {showCustomRange && customEnd ? (
          <input type="hidden" name="end" value={customEnd} />
        ) : null}
        {normalizedActorValue !== "ALL" ? (
          <input type="hidden" name="actor" value={normalizedActorValue} />
        ) : null}
        {!shouldKeepAllStatuses &&
          !shouldKeepDefaultStatuses &&
          selectedStatusValues.map((status) => (
            <input key={status} type="hidden" name="status" value={status} />
          ))}

        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-[#6B7280] dark:text-white/55">
            Search
          </span>
          <div className="flex items-center gap-2">
            <label className="relative block flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF] dark:text-white/40" strokeWidth={2} />
              <input
                name="q"
                defaultValue={q}
                placeholder="Name, phone, amount..."
                className={`${inputCls} pl-9`}
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm font-semibold text-[#374151] transition hover:border-[#C7D2FE] hover:bg-[#F9FAFB] hover:text-[#1F2937] disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!customRangeReady}
            >
              <span className="leading-none">Search</span>
            </button>
          </div>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-[#6B7280] dark:text-white/55">
            Status
          </span>
          <DropdownMenu
            modal={false}
            open={statusMenuOpen}
            onOpenChange={setStatusMenuOpen}
          >
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-9 w-full items-center justify-between rounded-lg border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm font-medium text-[#374151] outline-none transition hover:border-[var(--brand-200)] focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/15"
              >
                <span className="truncate">
                  {getStatusTriggerLabel(
                    selectedStatusValues,
                    activeStatusOptions,
                    inactiveStatusOptions,
                  )}
                </span>
                <ChevronDown className="ml-3 h-4 w-4 shrink-0 text-[#9CA3AF] dark:text-white/40" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
              <DropdownMenuContent
                align="start"
                side="top"
                sideOffset={8}
                className="z-[140] w-56 rounded-xl border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
                onCloseAutoFocus={(event) => event.preventDefault()}
              >
                <div className="flex items-center justify-between gap-2 px-2 pb-1 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setStatusTouched(true);
                      setStatusValues(
                        statusOptions.map((option) => option.value),
                      );
                    }}
                    className="text-[11px] font-semibold text-[#374151] transition hover:text-[#1F2937]"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusTouched(true);
                      setStatusValues([]);
                    }}
                    className="text-[11px] font-semibold text-[#6B7280] dark:text-white/55 transition hover:text-[#1F2937]"
                  >
                    Clear all
                  </button>
                </div>
                <DropdownMenuSeparator />
                <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF] dark:text-white/40">
                  Active
                </div>
                {activeStatusOptions.map((statusValue) => {
                  const option = statusOptions.find(
                    (item) => item.value === statusValue,
                  );
                  if (!option) return null;
                  const tone =
                    option.value === "OVERDUE"
                      ? {
                          dot: "#DC2626",
                          color: "#DC2626",
                          selectedBackground: "#FEF2F2",
                        }
                      : getStatusTone(option.value, customStatuses);

                  return (
                    <DropdownMenuCheckboxItem
                      key={option.value}
                      checked={selectedStatusValues.includes(option.value)}
                      className="rounded-lg py-2 pr-3 pl-8 text-sm font-medium text-[#374151]"
                      onSelect={(event) => event.preventDefault()}
                      onCheckedChange={() => toggleStatus(option.value)}
                      style={
                        selectedStatusValues.includes(option.value)
                          ? {
                              background: tone.selectedBackground,
                              color: tone.color,
                            }
                          : undefined
                      }
                    >
                      <span className="inline-flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="h-[6px] w-[6px] rounded-full"
                          style={{ background: tone.dot }}
                        />
                        {option.label}
                      </span>
                    </DropdownMenuCheckboxItem>
                  );
                })}
                <DropdownMenuSeparator />
                <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF] dark:text-white/40">
                  Inactive
                </div>
                {inactiveStatusOptions.map((statusValue) => {
                  const option = statusOptions.find(
                    (item) => item.value === statusValue,
                  );
                  if (!option) return null;
                  const tone =
                    option.value === "OVERDUE"
                      ? {
                          dot: "#DC2626",
                          color: "#DC2626",
                          selectedBackground: "#FEF2F2",
                        }
                      : getStatusTone(option.value, customStatuses);

                  return (
                    <DropdownMenuCheckboxItem
                      key={option.value}
                      checked={selectedStatusValues.includes(option.value)}
                      className="rounded-lg py-2 pr-3 pl-8 text-sm font-medium text-[#374151]"
                      onSelect={(event) => event.preventDefault()}
                      onCheckedChange={() => toggleStatus(option.value)}
                      style={
                        selectedStatusValues.includes(option.value)
                          ? {
                              background: tone.selectedBackground,
                              color: tone.color,
                            }
                          : undefined
                      }
                    >
                      <span className="inline-flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="h-[6px] w-[6px] rounded-full"
                          style={{ background: tone.dot }}
                        />
                        {option.label}
                      </span>
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenu>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-[#6B7280] dark:text-white/55">
            Period
          </span>
          <DropdownMenu
            modal={false}
            open={rangeMenuOpen}
            onOpenChange={setRangeMenuOpen}
          >
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-9 w-full items-center justify-between rounded-lg border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm font-medium text-[#374151] outline-none transition hover:border-[var(--brand-200)] focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/15"
              >
                <span className="truncate">
                  {DASHBOARD_RANGE_OPTIONS.find(
                    (option) => option.value === rangeValue,
                  )?.label ?? "All time"}
                </span>
                <ChevronDown className="ml-3 h-4 w-4 shrink-0 text-[#9CA3AF] dark:text-white/40" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
              <DropdownMenuContent
                align="start"
                sideOffset={8}
                className="z-[140] w-56 rounded-xl border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
                onCloseAutoFocus={(event) => event.preventDefault()}
              >
                <DropdownMenuRadioGroup value={rangeValue}>
                  {DASHBOARD_RANGE_OPTIONS.map((option) => (
                    <DropdownMenuRadioItem
                      key={option.value}
                      value={option.value}
                      className="rounded-lg py-2 pr-3 pl-8 text-sm font-medium text-[#374151] data-[state=checked]:bg-[var(--brand-50)] data-[state=checked]:font-semibold data-[state=checked]:text-[var(--brand-600)]"
                      onSelect={() => {
                        setRangeValue(option.value);
                        if (option.value !== "custom") {
                          setCustomStart("");
                          setCustomEnd("");
                          setRangeMenuOpen(false);
                          setTimeout(submitNow, 0);
                        }
                      }}
                    >
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenu>
        </label>

        {showCustomRange ? (
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-[#6B7280] dark:text-white/55">
                Start date
              </span>
              <input
                type="date"
                value={customStart}
                onChange={(event) => setCustomStart(event.currentTarget.value)}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-[#6B7280] dark:text-white/55">
                End date
              </span>
              <input
                type="date"
                value={customEnd}
                onChange={(event) => setCustomEnd(event.currentTarget.value)}
                className={inputCls}
              />
            </label>
          </div>
        ) : null}

        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-[#6B7280] dark:text-white/55">
            Team
          </span>
          <DropdownMenu
            modal={false}
            open={actorMenuOpen}
            onOpenChange={setActorMenuOpen}
          >
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-9 w-full items-center justify-between rounded-lg border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm font-medium text-[#374151] outline-none transition hover:border-[var(--brand-200)] focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/15"
              >
                <span className="truncate">
                  {getManagerTriggerLabel(normalizedActorValue, actorOptions)}
                </span>
                <ChevronDown className="ml-3 h-4 w-4 shrink-0 text-[#9CA3AF] dark:text-white/40" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
              <DropdownMenuContent
                align="start"
                sideOffset={8}
                className="z-[140] w-64 rounded-xl border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
                onCloseAutoFocus={(event) => event.preventDefault()}
              >
                <DropdownMenuRadioGroup
                  value={normalizedActorValue}
                  className="max-h-[320px] overflow-y-auto pr-1"
                >
                  {(
                    [
                      { value: "ALL", label: "All managers", avatar: false },
                      ...(currentUserId
                        ? [{ value: "ME", label: "Me", avatar: false }]
                        : []),
                      {
                        value: "UNASSIGNED",
                        label: "Unassigned",
                        avatar: false,
                      },
                      ...actorOptions.map((actorOption) => ({
                        value: `user:${actorOption.id}`,
                        label: actorOption.label,
                        avatar: true,
                      })),
                    ] as Array<{
                      value: string;
                      label: string;
                      avatar: boolean;
                    }>
                  ).map((option) => (
                    <DropdownMenuRadioItem
                      key={option.value}
                      value={option.value}
                      className="rounded-lg py-2 pr-3 pl-8 text-sm font-medium text-[#374151] data-[state=checked]:bg-[var(--brand-50)] data-[state=checked]:font-semibold data-[state=checked]:text-[var(--brand-600)]"
                      onSelect={() => {
                        setActorValue(option.value);
                        setActorMenuOpen(false);
                        setTimeout(submitNow, 0);
                      }}
                    >
                      {option.avatar ? (
                        <div className="flex items-center gap-3">
                          <ActorAvatar label={option.label} />
                          <span className="truncate">{option.label}</span>
                        </div>
                      ) : (
                        option.label
                      )}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenu>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-[#6B7280] dark:text-white/55">
            Sort
          </span>
          <DropdownMenu
            modal={false}
            open={sortMenuOpen}
            onOpenChange={setSortMenuOpen}
          >
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-9 w-full items-center justify-between rounded-lg border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm font-medium text-[#374151] outline-none transition hover:border-[var(--brand-200)] focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/15"
              >
                <span className="truncate">
                  {SORT_OPTIONS.find((option) => option.value === sortValue)
                    ?.label ?? "Default order"}
                </span>
                <ChevronDown className="ml-3 h-4 w-4 shrink-0 text-[#9CA3AF] dark:text-white/40" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
              <DropdownMenuContent
                align="start"
                sideOffset={8}
                className="z-[140] w-56 rounded-xl border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
                onCloseAutoFocus={(event) => event.preventDefault()}
              >
                <DropdownMenuRadioGroup value={sortValue}>
                  {SORT_OPTIONS.map((option) => (
                    <DropdownMenuRadioItem
                      key={option.value}
                      value={option.value}
                      className="rounded-lg py-2 pr-3 pl-8 text-sm font-medium text-[#374151] data-[state=checked]:bg-[var(--brand-50)] data-[state=checked]:font-semibold data-[state=checked]:text-[var(--brand-600)]"
                      onSelect={() => {
                        setSortValue(option.value);
                        setSortMenuOpen(false);
                        setTimeout(submitNow, 0);
                      }}
                    >
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenu>
        </label>

        <button
          type="submit"
          className="inline-flex h-9 w-full items-center justify-center rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm font-semibold text-[#374151] shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-[#C7D2FE] hover:bg-[#F9FAFB] hover:text-[#1F2937] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={!customRangeReady}
        >
          <span className="leading-none">
            {showCustomRange ? "Apply custom range" : "Apply filters"}
          </span>
        </button>
      </form>
    </section>
  );
}
