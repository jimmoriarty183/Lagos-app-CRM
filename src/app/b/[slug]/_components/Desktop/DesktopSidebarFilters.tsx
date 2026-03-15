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
  currentUserId?: string | null;
  actors?: TeamActor[];
  hasActiveFilters?: boolean;
  clearHref?: string;
};

function getStatusTriggerLabel(
  statuses: SidebarStatus[],
  activeStatusOptions: readonly SidebarStatus[],
  inactiveStatusOptions: readonly SidebarStatus[],
) {
  if (statuses.length === 0) return "All statuses";
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
    return actors.find((member) => `user:${member.id}` === actor)?.label ?? "Manager";
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
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#111827] text-[12px] font-semibold text-white">
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
  currentUserId,
  actors = [],
  hasActiveFilters = false,
  clearHref,
}: Props) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const { customStatuses, statuses: businessStatuses } = useBusinessStatuses(businessId);
  const [loadedActors, setLoadedActors] = useState<TeamActor[]>(actors);
  const [rangeValue, setRangeValue] = useState<DashboardRange>(range);
  const [customStart, setCustomStart] = useState(startDate ?? "");
  const [customEnd, setCustomEnd] = useState(endDate ?? "");
  const [statusValues, setStatusValues] = useState<SidebarStatus[]>(statuses);
  const [actorValue, setActorValue] = useState(actor || "ALL");
  const [rangeMenuOpen, setRangeMenuOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [actorMenuOpen, setActorMenuOpen] = useState(false);
  const showCustomRange = rangeValue === "custom";
  const customRangeReady = !showCustomRange || (Boolean(customStart) && Boolean(customEnd));
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
  const shouldKeepAllStatuses =
    statusMode === "all" || statusValues.length === 0 || statusValues.length === statusOptions.length;
  const shouldKeepDefaultStatuses =
    statusValues.length === activeStatusOptions.length &&
    activeStatusOptions.every((status) => statusValues.includes(status));

  const effectiveActors = useMemo(() => mergeActors(actors, loadedActors), [actors, loadedActors]);
  const actorOptions = useMemo(
    () =>
      effectiveActors
        .filter((actorOption) => !currentUserId || actorOption.id !== currentUserId)
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
    "h-11 w-full rounded-2xl border border-[#dde3ee] bg-white px-4 text-sm font-medium text-[#344054] outline-none transition placeholder:text-[#98a2b3] focus:border-[#111827] focus:ring-2 focus:ring-[#111827]/10";

  const toggleStatus = (status: SidebarStatus) => {
    setStatusValues((current) =>
      current.includes(status)
        ? current.filter((value) => value !== status)
        : [...current, status],
    );
  };

  const submitNow = () => formRef.current?.requestSubmit();

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
    <section className="rounded-[28px] border border-[#dde3ee] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#98a2b3]">
            Filters
          </div>
          <div className="mt-1 text-sm text-[#667085]">
            Clear filter state for the orders list
          </div>
        </div>

        {hasActiveFilters && clearHref ? (
          <a
            href={clearHref}
            className="inline-flex h-9 items-center justify-center rounded-full border border-[#dde3ee] px-3 text-xs font-semibold text-[#667085] transition hover:border-[#cfd8e6] hover:text-[#111827]"
          >
            Reset
          </a>
        ) : null}
      </div>

      <form ref={formRef} method="get" className="space-y-4 pb-2">
        <input type="hidden" name="u" value={phoneRaw} />
        <input type="hidden" name="srange" value={summaryRange} />
        <input type="hidden" name="page" value="1" />
        <input type="hidden" name="range" value={rangeValue} />
        {shouldKeepAllStatuses ? <input type="hidden" name="statusMode" value="all" /> : null}
        {showCustomRange && customStart ? <input type="hidden" name="start" value={customStart} /> : null}
        {showCustomRange && customEnd ? <input type="hidden" name="end" value={customEnd} /> : null}
        {normalizedActorValue !== "ALL" ? <input type="hidden" name="actor" value={normalizedActorValue} /> : null}
        {!shouldKeepAllStatuses && !shouldKeepDefaultStatuses && statusValues.map((status) => (
          <input key={status} type="hidden" name="status" value={status} />
        ))}

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-[#667085]">
            Search
          </span>
          <div className="flex items-center gap-2">
            <label className="relative block flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a2b3]" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Name, phone, amount..."
                className={`${inputCls} pl-11`}
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-2xl bg-[#111827] px-4 text-sm font-semibold text-white transition hover:bg-[#0b1220] disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!customRangeReady}
              style={{ color: "#ffffff" }}
            >
              <span className="leading-none text-white">Search</span>
            </button>
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-[#667085]">
            Status
          </span>
          <DropdownMenu modal={false} open={statusMenuOpen} onOpenChange={setStatusMenuOpen}>
            <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex h-11 w-full items-center justify-between rounded-2xl border border-[#dde3ee] bg-white px-4 text-sm font-medium text-[#344054] outline-none transition hover:border-[#cfd8e6] focus:border-[#111827] focus:ring-2 focus:ring-[#111827]/10"
            >
              <span className="truncate">
                {getStatusTriggerLabel(statusValues, activeStatusOptions, inactiveStatusOptions)}
              </span>
              <ChevronDown className="ml-3 h-4 w-4 shrink-0 text-[#98a2b3]" />
            </button>
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
            <DropdownMenuContent
              align="start"
              side="top"
              sideOffset={8}
              className="z-[140] w-56 rounded-xl border-[#dde3ee] bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
              onCloseAutoFocus={(event) => event.preventDefault()}
            >
              <div className="flex items-center justify-between gap-2 px-2 pb-1 pt-1">
                <button
                  type="button"
                  onClick={() => setStatusValues(statusOptions.map((option) => option.value))}
                  className="text-[11px] font-semibold text-[#344054] transition hover:text-[#111827]"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => setStatusValues([])}
                  className="text-[11px] font-semibold text-[#667085] transition hover:text-[#111827]"
                >
                  Clear all
                </button>
              </div>
              <DropdownMenuSeparator />
              <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                Active
              </div>
              {activeStatusOptions.map((statusValue) => {
                const option = statusOptions.find((item) => item.value === statusValue);
                if (!option) return null;
                const tone =
                  option.value === "OVERDUE"
                    ? { dot: "#DC2626", color: "#DC2626", selectedBackground: "#FEF2F2" }
                    : getStatusTone(option.value, customStatuses);

                return (
                  <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={statusValues.includes(option.value)}
                    className="rounded-lg py-2 pr-3 pl-8 text-sm font-medium text-[#344054]"
                    onSelect={(event) => event.preventDefault()}
                    onCheckedChange={() => toggleStatus(option.value)}
                    style={
                      statusValues.includes(option.value)
                        ? { background: tone.selectedBackground, color: tone.color }
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
              <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                Inactive
              </div>
              {inactiveStatusOptions.map((statusValue) => {
                const option = statusOptions.find((item) => item.value === statusValue);
                if (!option) return null;
                const tone =
                  option.value === "OVERDUE"
                    ? { dot: "#DC2626", color: "#DC2626", selectedBackground: "#FEF2F2" }
                    : getStatusTone(option.value, customStatuses);

                return (
                  <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={statusValues.includes(option.value)}
                    className="rounded-lg py-2 pr-3 pl-8 text-sm font-medium text-[#344054]"
                    onSelect={(event) => event.preventDefault()}
                    onCheckedChange={() => toggleStatus(option.value)}
                    style={
                      statusValues.includes(option.value)
                        ? { background: tone.selectedBackground, color: tone.color }
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
          <div className="mt-1.5 text-[11px] font-medium text-[#98a2b3]">
            Choose one or several statuses. If none selected, all statuses are shown.
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-[#667085]">
            Period
          </span>
          <DropdownMenu modal={false} open={rangeMenuOpen} onOpenChange={setRangeMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-11 w-full items-center justify-between rounded-2xl border border-[#dde3ee] bg-white px-4 text-sm font-medium text-[#344054] outline-none transition hover:border-[#cfd8e6] focus:border-[#111827] focus:ring-2 focus:ring-[#111827]/10"
              >
                <span className="truncate">
                  {DASHBOARD_RANGE_OPTIONS.find((option) => option.value === rangeValue)?.label ?? "All time"}
                </span>
                <ChevronDown className="ml-3 h-4 w-4 shrink-0 text-[#98a2b3]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
            <DropdownMenuContent
              align="start"
              sideOffset={8}
              className="z-[140] w-56 rounded-xl border-[#dde3ee] bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
              onCloseAutoFocus={(event) => event.preventDefault()}
            >
              <DropdownMenuRadioGroup value={rangeValue}>
                {DASHBOARD_RANGE_OPTIONS.map((option) => (
                  <DropdownMenuRadioItem
                    key={option.value}
                    value={option.value}
                    className="rounded-lg py-2 pr-3 pl-8 text-sm font-medium text-[#344054] data-[state=checked]:bg-[#eef4ff] data-[state=checked]:font-semibold data-[state=checked]:text-[#2459d3]"
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
              <span className="mb-1.5 block text-xs font-medium text-[#667085]">Start date</span>
              <input
                type="date"
                value={customStart}
                onChange={(event) => setCustomStart(event.currentTarget.value)}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[#667085]">End date</span>
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
          <span className="mb-1.5 block text-xs font-medium text-[#667085]">
            Team
          </span>
          <DropdownMenu modal={false} open={actorMenuOpen} onOpenChange={setActorMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-11 w-full items-center justify-between rounded-2xl border border-[#dde3ee] bg-white px-4 text-sm font-medium text-[#344054] outline-none transition hover:border-[#cfd8e6] focus:border-[#111827] focus:ring-2 focus:ring-[#111827]/10"
              >
                <span className="truncate">{getManagerTriggerLabel(normalizedActorValue, actorOptions)}</span>
                <ChevronDown className="ml-3 h-4 w-4 shrink-0 text-[#98a2b3]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
            <DropdownMenuContent
              align="start"
              sideOffset={8}
              className="z-[140] w-64 rounded-xl border-[#dde3ee] bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
              onCloseAutoFocus={(event) => event.preventDefault()}
            >
              <DropdownMenuRadioGroup value={normalizedActorValue} className="max-h-[320px] overflow-y-auto pr-1">
                {([
                  { value: "ALL", label: "All managers", avatar: false },
                  ...(currentUserId ? [{ value: "ME", label: "Me", avatar: false }] : []),
                  { value: "UNASSIGNED", label: "Unassigned", avatar: false },
                  ...actorOptions.map((actorOption) => ({
                    value: `user:${actorOption.id}`,
                    label: actorOption.label,
                    avatar: true,
                  })),
                ] as Array<{ value: string; label: string; avatar: boolean }>).map((option) => (
                  <DropdownMenuRadioItem
                    key={option.value}
                    value={option.value}
                    className="rounded-lg py-2 pr-3 pl-8 text-sm font-medium text-[#344054] data-[state=checked]:bg-[#eef4ff] data-[state=checked]:font-semibold data-[state=checked]:text-[#2459d3]"
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

        <button
          type="submit"
          className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[#111827] px-4 text-sm font-semibold text-white transition hover:bg-[#0b1220] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={!customRangeReady}
          style={{ color: "#ffffff" }}
        >
          <span className="leading-none text-white">
            {showCustomRange ? "Apply custom range" : "Apply filters"}
          </span>
        </button>
      </form>
    </section>
  );
}
