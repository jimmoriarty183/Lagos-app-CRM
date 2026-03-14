"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  AlertTriangle,
  ChevronDown,
  Ellipsis,
  Eye,
  PencilLine,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";

import { StatusCell } from "../../InlineCells";
import { OrderChecklist } from "../../OrderChecklist";
import { OrderComments } from "../../OrderComments";
import { setOrderManager } from "../../actions";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  DASHBOARD_RANGE_OPTIONS,
  type DashboardRange,
} from "@/lib/order-dashboard-summary";

type Status =
  | "NEW"
  | "IN_PROGRESS"
  | "WAITING_PAYMENT"
  | "DONE"
  | "CANCELED"
  | "DUPLICATE";

type StatusFilterValue = Status | "OVERDUE";

type UserRole = "OWNER" | "MANAGER" | "GUEST";

type TeamActor = {
  id: string;
  label: string;
  kind: "OWNER" | "MANAGER";
};

type OrderRow = {
  id: string;
  client_name: string | null;
  client_phone: string | null;
  amount: number;
  description: string | null;
  due_date: string | null;
  status: Status;
  order_number: number | null;
  created_at: string;
  manager_id: string | null;
  manager_name: string | null;
};

type Props = {
  list: OrderRow[];
  todayISO: string;
  businessSlug: string;
  businessId: string;
  phoneRaw: string;
  searchQuery: string;
  statusFilter: StatusFilterValue[];
  rangeFilter: DashboardRange;
  summaryRange: DashboardRange;
  rangeStartDate: string | null;
  rangeEndDate: string | null;
  actorFilter: string;
  clearHref: string;
  hasActiveFilters: boolean;
  resultCount: number;
  currentPage: number;
  perPage: number;
  totalPages: number;
  canManage: boolean;
  canEdit: boolean;
  userRole: UserRole;
  actors: TeamActor[];
  currentUserId: string | null;
};

function fmtAmount(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(n || 0));
}

function formatCreatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  const day = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${day}, ${time}`;
}

function formatDueDate(value: string | null) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function shouldIgnoreOverlayCloseClick() {
  return (
    typeof window !== "undefined" &&
    (window.__ordersOverlayClosingUntil ?? 0) > Date.now()
  );
}

const STATUS_OPTIONS: { value: StatusFilterValue; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "WAITING_PAYMENT", label: "Waiting payment" },
  { value: "DONE", label: "Done" },
  { value: "DUPLICATE", label: "Duplicate" },
  { value: "OVERDUE", label: "Overdue" },
];

function normalizeQuickStatuses(statuses: StatusFilterValue[]) {
  const normalized = statuses.filter((status): status is StatusFilterValue =>
    STATUS_OPTIONS.some((option) => option.value === status),
  );
  return normalized.length === 0
    ? STATUS_OPTIONS.map((option) => option.value)
    : normalized;
}

function getStatusTriggerLabel(statuses: StatusFilterValue[]) {
  if (statuses.length === STATUS_OPTIONS.length) return "All statuses";
  if (statuses.length === 0) return "No statuses";
  if (statuses.length === 1) {
    return STATUS_OPTIONS.find((option) => option.value === statuses[0])?.label ?? "1 status";
  }
  return `${statuses.length} statuses`;
}

function getManagerTriggerLabel(value: string, currentUserId: string | null, options: { value: string; label: string }[]) {
  if (!value || value === "ALL") return "All managers";
  if (value === "ME") return currentUserId ? "Me" : "All managers";
  if (value === "UNASSIGNED") return "Unassigned";
  return options.find((option) => option.value === value)?.label ?? "All managers";
}

function getPeriodTriggerLabel(value: DashboardRange) {
  return DESKTOP_PERIOD_OPTIONS.find((option) => option.value === value)?.label ?? "Period";
}

function normalizeQuickActor(actorFilter: string, actors: TeamActor[], currentUserId: string | null) {
  if (!actorFilter || actorFilter === "ALL") return "ALL";
  if (actorFilter === "UNASSIGNED") return "UNASSIGNED";
  if (actorFilter === "ME") return "ME";
  if (actorFilter.startsWith("user:")) return actorFilter;
  if (currentUserId && actorFilter === `user:${currentUserId}`) return "ME";
  if (actors.some((actor) => `user:${actor.id}` === actorFilter)) return actorFilter;
  return "ALL";
}

function ManagerAssignmentCell({
  orderId,
  businessSlug,
  managerId,
  managerName,
  actors,
  canManage,
  onAssigned,
}: {
  orderId: string;
  businessSlug: string;
  managerId: string | null;
  managerName: string | null;
  actors: TeamActor[];
  canManage: boolean;
  onAssigned?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [localManagerId, setLocalManagerId] = useState<string | null>(managerId);
  const [localManagerName, setLocalManagerName] = useState<string | null>(managerName);

  React.useEffect(() => {
    setLocalManagerId(managerId);
    setLocalManagerName(managerName);
  }, [managerId, managerName]);

  const options = useMemo(
    () =>
      actors
        .slice()
        .sort((a, b) => a.label.localeCompare(b.label)),
    [actors],
  );

  const label = localManagerName?.trim() || "Unassigned";
  const isUnassigned = !localManagerId || !localManagerName?.trim();

  const trigger = (
    <button
      type="button"
      disabled={!canManage || isPending}
      className={[
        "inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition",
        canManage ? "cursor-pointer" : "cursor-default",
        isUnassigned
          ? "border-[#dbe2ea] bg-[#f8fafc] text-[#667085]"
          : "border-transparent bg-transparent px-0 text-[#344054] hover:text-[#111827]",
      ].join(" ")}
    >
      {isUnassigned ? null : <UserRound className="h-3.5 w-3.5 text-[#98a2b3]" />}
      <span className="truncate">{label}</span>
      {canManage ? <ChevronDown className="h-3.5 w-3.5 text-[#98a2b3]" /> : null}
    </button>
  );

  if (!canManage) return trigger;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="w-52 rounded-xl border-[#dde3ee] bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-3 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
          Assign manager
        </div>
        <DropdownMenuRadioGroup value={localManagerId ?? "UNASSIGNED"}>
          <DropdownMenuRadioItem
            value="UNASSIGNED"
            className="rounded-lg px-3 py-2 text-sm font-medium text-[#475467]"
            onSelect={() => {
              const prevId = localManagerId;
              const prevName = localManagerName;
              setLocalManagerId(null);
              setLocalManagerName(null);
              startTransition(async () => {
                try {
                  await setOrderManager({ orderId, businessSlug, managerId: null });
                  onAssigned?.();
                } catch {
                  setLocalManagerId(prevId);
                  setLocalManagerName(prevName);
                  window.alert("Failed to update manager. Try again.");
                }
              });
            }}
          >
            Unassigned
          </DropdownMenuRadioItem>
          {options.map((actor) => (
            <DropdownMenuRadioItem
              key={actor.id}
              value={actor.id}
              className="rounded-lg px-3 py-2 text-sm font-medium text-[#344054]"
              onSelect={() => {
                if (localManagerId === actor.id) return;
                const prevId = localManagerId;
                const prevName = localManagerName;
                setLocalManagerId(actor.id);
                setLocalManagerName(actor.label);
                startTransition(async () => {
                  try {
                    await setOrderManager({ orderId, businessSlug, managerId: actor.id });
                    onAssigned?.();
                  } catch {
                    setLocalManagerId(prevId);
                    setLocalManagerName(prevName);
                    window.alert("Failed to update manager. Try again.");
                  }
                });
              }}
            >
              {actor.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const PAGE_SIZE_OPTIONS = [20, 50, 100, 500] as const;
const DESKTOP_PERIOD_OPTIONS = [
  DASHBOARD_RANGE_OPTIONS.find((option) => option.value === "ALL"),
  ...DASHBOARD_RANGE_OPTIONS.filter((option) => option.value !== "ALL"),
].filter(
  (
    option,
  ): option is {
    value: DashboardRange;
    label: string;
  } => Boolean(option),
);

function getPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 1) return [1];

  const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
}

export default function DesktopOrdersTable({
  list,
  todayISO,
  businessSlug,
  businessId,
  phoneRaw,
  searchQuery,
  statusFilter,
  rangeFilter,
  summaryRange,
  rangeStartDate,
  rangeEndDate,
  actorFilter,
  clearHref,
  hasActiveFilters,
  resultCount,
  currentPage,
  perPage,
  totalPages,
  canManage,
  canEdit,
  userRole,
  actors,
  currentUserId,
}: Props) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [periodMenuOpen, setPeriodMenuOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [managerMenuOpen, setManagerMenuOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState(searchQuery);
  const [rangeValue, setRangeValue] = useState<DashboardRange>(rangeFilter);
  const [customStart, setCustomStart] = useState(rangeStartDate ?? "");
  const [customEnd, setCustomEnd] = useState(rangeEndDate ?? "");
  const [statusValues, setStatusValues] = useState<StatusFilterValue[]>(
    normalizeQuickStatuses(statusFilter),
  );
  const [managerValue, setManagerValue] = useState<string>(
    normalizeQuickActor(actorFilter, actors, currentUserId),
  );
  const [rangeTouched, setRangeTouched] = useState(false);
  const [statusTouched, setStatusTouched] = useState(false);
  const [managerTouched, setManagerTouched] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  const rows = useMemo(() => list ?? [], [list]);
  const managerOptions = useMemo(
    () =>
      actors
        .slice()
        .sort((a, b) => a.label.localeCompare(b.label))
        .map((actor) => ({
          value: `user:${actor.id}`,
          label: actor.label,
        })),
    [actors],
  );

  const buildHref = (next: {
    q: string;
    statusValues: StatusFilterValue[];
    statusTouched: boolean;
    managerValue: string;
    managerTouched: boolean;
    rangeValue?: DashboardRange;
    customStart?: string;
    customEnd?: string;
    rangeTouched?: boolean;
    page?: number;
    perPage?: number;
  }) => {
    const params = new URLSearchParams();
    if (phoneRaw) params.set("u", phoneRaw);
    params.set("srange", summaryRange);
    params.set("page", String(next.page ?? 1));
    params.set("perPage", String(next.perPage ?? perPage));

    const nextRange = next.rangeTouched ? next.rangeValue ?? rangeValue : rangeFilter;
    const nextStart = next.rangeTouched ? next.customStart ?? customStart : rangeStartDate ?? "";
    const nextEnd = next.rangeTouched ? next.customEnd ?? customEnd : rangeEndDate ?? "";

    if (nextRange !== "ALL") params.set("range", nextRange);
    if (nextRange === "custom" && nextStart) params.set("start", nextStart);
    if (nextRange === "custom" && nextEnd) params.set("end", nextEnd);

    const q = next.q.trim();
    if (q) params.set("q", q);

    const nextStatuses = next.statusTouched
      ? next.statusValues.length === STATUS_OPTIONS.length
        ? []
        : next.statusValues
      : statusFilter;
    for (const status of nextStatuses) {
      params.append("status", status);
    }

    const nextActor =
      next.managerTouched || next.managerValue !== "ALL"
        ? next.managerValue === "ALL"
          ? ""
          : next.managerValue === "ME"
            ? "ME"
            : next.managerValue
        : actorFilter;
    if (nextActor) params.set("actor", nextActor);

    const qs = params.toString();
    return qs ? `/b/${businessSlug}?${qs}` : `/b/${businessSlug}`;
  };

  const pageItems = getPaginationItems(currentPage, totalPages);
  const paginationHref = (page: number, nextPerPage = perPage) =>
    buildHref({
      q: searchDraft,
      statusValues,
      statusTouched,
      managerValue,
      managerTouched,
      rangeValue,
      customStart,
      customEnd,
      rangeTouched,
      page,
      perPage: nextPerPage,
    });

  const submitFilters = (next: {
    q: string;
    statusValues: StatusFilterValue[];
    statusTouched: boolean;
    managerValue: string;
    managerTouched: boolean;
    rangeValue: DashboardRange;
    customStart: string;
    customEnd: string;
    rangeTouched: boolean;
  }) => {
    const href = buildHref(next);
    setPeriodMenuOpen(false);
    setStatusMenuOpen(false);
    setManagerMenuOpen(false);
    startTransition(() => {
      router.replace(href);
    });
  };

  const toggleStatus = (status: StatusFilterValue) => {
    const hasStatus = statusValues.includes(status);
    const nextStatuses = hasStatus
      ? statusValues.filter((value) => value !== status)
      : STATUS_OPTIONS.map((option) => option.value).filter(
          (value) => value === status || statusValues.includes(value),
        );

    setStatusValues(nextStatuses);
    setStatusTouched(true);
  };

  const selectAllStatuses = () => {
    setStatusValues(STATUS_OPTIONS.map((option) => option.value));
    setStatusTouched(true);
  };

  const clearAllStatuses = () => {
    setStatusValues([]);
    setStatusTouched(true);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!canEdit || deletingId) return;
    if (!window.confirm("Delete this order? This action cannot be undone.")) return;

    setDeletingId(orderId);
    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", orderId)
      .eq("business_id", businessId);

    setDeletingId(null);

    if (error) {
      window.alert(error.message || "Failed to delete order.");
      return;
    }

    if (openId === orderId) {
      setOpenId(null);
    }
    router.refresh();
  };

  const showCustomRange = rangeValue === "custom";
  const customRangeReady = !showCustomRange || (Boolean(customStart) && Boolean(customEnd));

  return (
    <section className="mx-auto w-full min-w-0 overflow-hidden rounded-[28px] border border-[#dde3ee] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="border-b border-[#eef2f7] px-5 py-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[13px] font-semibold text-[#111827]">Orders</div>
            <div className="mt-1 text-[12px] font-medium text-[#98a2b3]">
              {resultCount} {resultCount === 1 ? "result" : "results"} · Page {currentPage} of {totalPages}
            </div>
          </div>

          {hasActiveFilters ? (
            <a
              href={clearHref}
              className="inline-flex h-9 items-center justify-center rounded-full border border-[#dde3ee] px-3 text-xs font-semibold text-[#667085] transition hover:border-[#cfd8e6] hover:text-[#111827]"
            >
              Reset filters
            </a>
          ) : null}
        </div>

        <form
          className="mt-4 flex flex-wrap items-center gap-3 xl:flex-nowrap"
          onSubmit={(event) => {
            event.preventDefault();
            submitFilters({
              q: searchDraft,
              statusValues,
              statusTouched,
              managerValue,
              managerTouched,
              rangeValue,
              customStart,
              customEnd,
              rangeTouched,
            });
          }}
        >
          <div className="min-w-[260px] flex-[1.2]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a2b3]" />
              <input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    return;
                  }
                }}
                placeholder="Search orders..."
                className="h-11 w-full rounded-2xl border border-[#dde3ee] bg-[#fbfcfe] pl-11 pr-4 text-sm outline-none transition placeholder:text-[#98a2b3] focus:border-[#111827] focus:bg-white focus:ring-2 focus:ring-[#111827]/10"
              />
            </label>
          </div>

          <div className="flex min-w-[320px] flex-1 flex-wrap items-center gap-3 xl:flex-none">
            <DropdownMenu open={periodMenuOpen} onOpenChange={setPeriodMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-11 min-w-[170px] flex-1 items-center justify-between rounded-2xl border border-[#dde3ee] bg-white px-4 text-sm font-medium text-[#344054] outline-none transition hover:border-[#cfd8e6] focus:border-[#111827] focus:ring-2 focus:ring-[#111827]/10"
                >
                  <span className="truncate">{getPeriodTriggerLabel(rangeValue)}</span>
                  <ChevronDown className="ml-3 h-4 w-4 shrink-0 text-[#98a2b3]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={8}
                className="w-56 rounded-xl border-[#dde3ee] bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
                onClick={(event) => event.stopPropagation()}
              >
                <DropdownMenuRadioGroup value={rangeValue}>
                  {DESKTOP_PERIOD_OPTIONS.map((option) => (
                    <DropdownMenuRadioItem
                      key={option.value}
                      value={option.value}
                      className="rounded-lg py-2 pr-3 pl-8 text-sm font-medium text-[#344054] data-[state=checked]:bg-[#eef4ff] data-[state=checked]:font-semibold data-[state=checked]:text-[#2459d3]"
                      onSelect={() => {
                        setRangeValue(option.value);
                        setRangeTouched(true);
                        if (option.value !== "custom") {
                          setCustomStart("");
                          setCustomEnd("");
                        }
                      }}
                    >
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu open={statusMenuOpen} onOpenChange={setStatusMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-11 min-w-[170px] flex-1 items-center justify-between rounded-2xl border border-[#dde3ee] bg-white px-4 text-sm font-medium text-[#344054] outline-none transition hover:border-[#cfd8e6] focus:border-[#111827] focus:ring-2 focus:ring-[#111827]/10"
                >
                  <span className="truncate">{getStatusTriggerLabel(statusValues)}</span>
                  <ChevronDown className="ml-3 h-4 w-4 shrink-0 text-[#98a2b3]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={8}
                className="w-56 rounded-xl border-[#dde3ee] bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-2 px-2 pb-1 pt-1">
                  <button
                    type="button"
                    onClick={selectAllStatuses}
                    className="text-[11px] font-semibold text-[#344054] transition hover:text-[#111827]"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={clearAllStatuses}
                    className="text-[11px] font-semibold text-[#667085] transition hover:text-[#111827]"
                  >
                    Clear all
                  </button>
                </div>
                <DropdownMenuSeparator />
                {STATUS_OPTIONS.map((option) => {
                  const isChecked = statusValues.includes(option.value);

                  return (
                    <DropdownMenuCheckboxItem
                      key={option.value}
                      checked={isChecked}
                      className="rounded-lg py-2 pr-3 pl-8 text-sm font-medium text-[#344054]"
                      onSelect={(event) => event.preventDefault()}
                      onCheckedChange={() => toggleStatus(option.value)}
                    >
                      {option.label}
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu open={managerMenuOpen} onOpenChange={setManagerMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-11 min-w-[190px] flex-1 items-center justify-between rounded-2xl border border-[#dde3ee] bg-white px-4 text-sm font-medium text-[#344054] outline-none transition hover:border-[#cfd8e6] focus:border-[#111827] focus:ring-2 focus:ring-[#111827]/10"
                >
                  <span className="truncate">
                    {getManagerTriggerLabel(managerValue, currentUserId, managerOptions)}
                  </span>
                  <ChevronDown className="ml-3 h-4 w-4 shrink-0 text-[#98a2b3]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={8}
                className="w-56 rounded-xl border-[#dde3ee] bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
                onClick={(event) => event.stopPropagation()}
              >
                <DropdownMenuRadioGroup value={managerValue}>
                  <DropdownMenuRadioItem
                    value="ALL"
                    className="rounded-lg py-2 pr-3 pl-8 text-sm font-medium text-[#344054] data-[state=checked]:bg-[#eef4ff] data-[state=checked]:font-semibold data-[state=checked]:text-[#2459d3]"
                    onSelect={() => {
                      setManagerValue("ALL");
                      setManagerTouched(true);
                    }}
                  >
                    All managers
                  </DropdownMenuRadioItem>
                  {currentUserId ? (
                    <DropdownMenuRadioItem
                      value="ME"
                      className="rounded-lg py-2 pr-3 pl-8 text-sm font-medium text-[#344054] data-[state=checked]:bg-[#eef4ff] data-[state=checked]:font-semibold data-[state=checked]:text-[#2459d3]"
                      onSelect={() => {
                        setManagerValue("ME");
                        setManagerTouched(true);
                      }}
                    >
                      Me
                    </DropdownMenuRadioItem>
                  ) : null}
                  <DropdownMenuRadioItem
                    value="UNASSIGNED"
                    className="rounded-lg py-2 pr-3 pl-8 text-sm font-medium text-[#344054] data-[state=checked]:bg-[#eef4ff] data-[state=checked]:font-semibold data-[state=checked]:text-[#2459d3]"
                    onSelect={() => {
                      setManagerValue("UNASSIGNED");
                      setManagerTouched(true);
                    }}
                  >
                    Unassigned
                  </DropdownMenuRadioItem>
                  {managerOptions.map((option) => (
                    <DropdownMenuRadioItem
                      key={option.value}
                      value={option.value}
                      className="rounded-lg py-2 pr-3 pl-8 text-sm font-medium text-[#344054] data-[state=checked]:bg-[#eef4ff] data-[state=checked]:font-semibold data-[state=checked]:text-[#2459d3]"
                      onSelect={() => {
                        setManagerValue(option.value);
                        setManagerTouched(true);
                      }}
                    >
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {showCustomRange ? (
            <div className="flex min-w-[260px] flex-wrap items-center gap-3 xl:flex-none">
              <input
                type="date"
                value={customStart}
                onChange={(event) => {
                  setCustomStart(event.currentTarget.value);
                  setRangeTouched(true);
                }}
                className="h-11 min-w-[170px] flex-1 rounded-2xl border border-[#dde3ee] bg-white px-4 text-sm font-medium text-[#344054] outline-none transition focus:border-[#111827] focus:ring-2 focus:ring-[#111827]/10"
              />
              <input
                type="date"
                value={customEnd}
                onChange={(event) => {
                  setCustomEnd(event.currentTarget.value);
                  setRangeTouched(true);
                }}
                className="h-11 min-w-[170px] flex-1 rounded-2xl border border-[#dde3ee] bg-white px-4 text-sm font-medium text-[#344054] outline-none transition focus:border-[#111827] focus:ring-2 focus:ring-[#111827]/10"
              />
            </div>
          ) : null}

          <div className="ml-auto flex shrink-0">
            <button
              type="submit"
              disabled={statusValues.length === 0 || !customRangeReady}
              className="inline-flex h-11 min-w-[152px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-[#111827] px-4 text-sm font-semibold transition hover:bg-[#0b1220] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-[#111827]"
              style={{ color: "#ffffff" }}
            >
              <span className="leading-none text-white">Apply</span>
            </button>
          </div>
        </form>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef2f7] px-5 py-3">
        <div className="text-xs font-medium text-[#667085]">
          Showing {rows.length === 0 ? 0 : (currentPage - 1) * perPage + 1}
          -
          {(currentPage - 1) * perPage + rows.length} of {resultCount}
        </div>

        <label className="flex items-center gap-2 text-xs font-medium text-[#667085]">
          <span>Per page</span>
          <select
            value={String(perPage)}
            onChange={(event) => {
              startTransition(() => {
                router.replace(paginationHref(1, Number(event.currentTarget.value)));
              });
            }}
            className="h-9 rounded-xl border border-[#dde3ee] bg-white px-3 text-sm font-medium text-[#344054] outline-none transition focus:border-[#111827] focus:ring-2 focus:ring-[#111827]/10"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1040px] w-full border-collapse">
          <thead>
            <tr className="border-b border-[#eef2f7] text-left">
              <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                Order
              </th>
              <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                Client
              </th>
              <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                Manager
              </th>
              <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                Amount
              </th>
              <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                Due
              </th>
              <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                Status
              </th>
              <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((order) => {
              const dueISO = order.due_date ? String(order.due_date).slice(0, 10) : null;
              const isOverdue =
                !!dueISO &&
                dueISO < todayISO &&
                (order.status === "NEW" || order.status === "IN_PROGRESS");
              const isOpen = openId === order.id;
              const editHref = `/b/${businessSlug}/o/${order.id}?u=${encodeURIComponent(phoneRaw)}`;

              return (
                <React.Fragment key={order.id}>
                  <tr
                    className="cursor-pointer border-b border-[#f2f4f7] transition-colors hover:bg-[#f8fafc]"
                    onClick={() => {
                      if (shouldIgnoreOverlayCloseClick()) return;
                      setOpenId(order.id);
                    }}
                  >
                    <td className="px-5 py-3 align-middle">
                      <div className="text-sm font-semibold leading-5 text-[#111827]">
                        #{order.order_number ?? "—"}
                      </div>
                      <div className="mt-0.5 text-xs font-medium leading-4 text-[#98a2b3]">
                        {formatCreatedAt(order.created_at)}
                      </div>
                    </td>

                    <td className="px-5 py-3 align-middle">
                      <div className="text-sm font-semibold leading-5 text-[#111827]">
                        {order.client_name?.trim() || "Unknown"}
                      </div>
                      <div className="mt-0.5 text-xs leading-4 text-[#98a2b3]">
                        {order.client_phone?.trim() || "No phone number"}
                      </div>
                    </td>

                    <td
                      className="px-5 py-3 align-middle"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <ManagerAssignmentCell
                        orderId={order.id}
                        businessSlug={businessSlug}
                        managerId={order.manager_id}
                        managerName={order.manager_name}
                        actors={actors}
                        canManage={canManage}
                        onAssigned={() => router.refresh()}
                      />
                    </td>

                    <td className="px-5 py-3 text-right align-middle text-sm font-semibold tabular-nums text-[#111827]">
                      {fmtAmount(Number(order.amount))}
                    </td>

                    <td className="px-5 py-3 align-middle">
                      <div
                        className={[
                          "inline-flex items-center gap-2 text-sm font-medium",
                          isOverdue ? "text-[#d92d20]" : "text-[#475467]",
                        ].join(" ")}
                      >
                        <span>{formatDueDate(order.due_date)}</span>
                        {isOverdue ? <AlertTriangle className="h-4 w-4" /> : null}
                      </div>
                    </td>

                    <td className="px-5 py-3 align-middle" onClick={(event) => event.stopPropagation()}>
                      <div className="inline-flex">
                        <StatusCell
                          orderId={order.id}
                          businessSlug={businessSlug}
                          value={order.status}
                          canManage={canManage}
                        />
                      </div>
                    </td>

                    <td
                      className="px-5 py-3 align-middle text-right"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#dde3ee] bg-white text-[#667085] transition hover:border-[#cfd8e6] hover:bg-[#f8fafc] hover:text-[#111827]"
                            aria-label="Open order actions"
                          >
                            <Ellipsis className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-48 rounded-xl border-[#dde3ee] bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
                        >
                          <DropdownMenuItem
                            className="rounded-lg px-3 py-2 text-sm font-medium"
                            onSelect={(event) => {
                              event.preventDefault();
                              setOpenId(order.id);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                            View details
                          </DropdownMenuItem>
                          {canEdit ? (
                            <DropdownMenuItem
                              className="rounded-lg px-3 py-2 text-sm font-medium"
                              onSelect={(event) => {
                                event.preventDefault();
                                router.push(editHref);
                              }}
                            >
                              <PencilLine className="h-4 w-4" />
                              Edit order
                            </DropdownMenuItem>
                          ) : null}
                          {canEdit ? <DropdownMenuSeparator /> : null}
                          {canEdit ? (
                            <DropdownMenuItem
                              className="rounded-lg px-3 py-2 text-sm font-medium text-red-700 focus:text-red-700"
                              onSelect={(event) => {
                                event.preventDefault();
                                void handleDeleteOrder(order.id);
                              }}
                              disabled={deletingId === order.id}
                            >
                              <Trash2 className="h-4 w-4" />
                              {deletingId === order.id ? "Deleting..." : "Delete order"}
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>

                  {isOpen ? (
                    <tr className="border-b border-[#f2f4f7] bg-[#fcfdff]">
                      <td colSpan={7} className="px-5 pb-5">
                        <div
                          className="mt-2 rounded-2xl border border-[#dde3ee] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(240px,0.65fr)]">
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">
                                    Description
                                  </div>
                                  <div className="mt-2 whitespace-pre-wrap break-words text-sm text-[#364153]">
                                    {order.description?.trim() ? order.description : "No description"}
                                  </div>
                                </div>

                                <div className="grid gap-3 rounded-2xl border border-[#eef2f7] bg-[#fbfcfe] p-4">
                                  <div>
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                                      Client
                                    </div>
                                    <div className="mt-1 text-sm font-semibold text-[#111827]">
                                      {order.client_name?.trim() || "Unknown"}
                                    </div>
                                    <div className="mt-1 text-xs text-[#98a2b3]">
                                      {order.client_phone?.trim() || "No phone number"}
                                    </div>
                                  </div>

                                  <div>
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                                      Manager
                                    </div>
                                    <div className="mt-1">
                                      <ManagerAssignmentCell
                                        orderId={order.id}
                                        businessSlug={businessSlug}
                                        managerId={order.manager_id}
                                        managerName={order.manager_name}
                                        actors={actors}
                                        canManage={canManage}
                                        onAssigned={() => router.refresh()}
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                                        Amount
                                      </div>
                                      <div className="mt-1 text-sm font-semibold tabular-nums text-[#111827]">
                                        {fmtAmount(Number(order.amount))}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                                        Due
                                      </div>
                                      <div
                                        className={[
                                          "mt-1 text-sm font-medium",
                                          isOverdue ? "text-[#d92d20]" : "text-[#475467]",
                                        ].join(" ")}
                                      >
                                        {formatDueDate(order.due_date)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <OrderChecklist
                                order={{ id: order.id, business_id: businessId }}
                                supabase={supabase}
                              />

                              <OrderComments
                                order={{ id: order.id, business_id: businessId }}
                                supabase={supabase}
                                author={{
                                  phone: phoneRaw,
                                  role: userRole,
                                }}
                              />
                            </div>

                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setOpenId((current) => (current === order.id ? null : current));
                              }}
                              className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-[#dde3ee] bg-white px-3 text-sm font-semibold text-[#111827] transition hover:bg-[#f8fafc]"
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              );
            })}

            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-sm text-[#98a2b3]">
                  {isPending ? "Updating orders..." : "No orders found"}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="border-t border-[#eef2f7] px-5 py-4">
          <Pagination className="justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={paginationHref(Math.max(1, currentPage - 1))}
                  aria-disabled={currentPage === 1}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {pageItems.map((page, index) => {
                const prevPage = pageItems[index - 1];
                const needsEllipsis = prevPage && page - prevPage > 1;

                return (
                  <React.Fragment key={page}>
                    {needsEllipsis ? (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : null}
                    <PaginationItem>
                      <PaginationLink href={paginationHref(page)} isActive={page === currentPage}>
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  </React.Fragment>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  href={paginationHref(Math.min(totalPages, currentPage + 1))}
                  aria-disabled={currentPage === totalPages}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink
                  href={paginationHref(totalPages)}
                  size="default"
                  aria-disabled={currentPage === totalPages}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                >
                  Last
                </PaginationLink>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      ) : null}
    </section>
  );
}
