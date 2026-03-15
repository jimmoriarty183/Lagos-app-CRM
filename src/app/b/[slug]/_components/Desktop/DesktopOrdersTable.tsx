"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Columns3,
  Ellipsis,
  Eye,
  List,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";

import { StatusCell } from "../../InlineCells";
import { setOrderManager, setOrderStatus } from "../../actions";
import { OrderPreview } from "../orders/OrderPreview";
import DesktopKanbanCreateOrder from "./DesktopKanbanCreateOrder";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { createClient } from "@/lib/supabase/client";
import {
  getDefaultVisibleStatusFilters,
  getStatusLabel,
  getStatusTone,
  isTerminalStatus,
  type StatusFilterValue,
  type StatusValue,
} from "@/lib/business-statuses";
import {
  DASHBOARD_RANGE_OPTIONS,
  type DashboardRange,
} from "@/lib/order-dashboard-summary";
import { resolveUserDisplay } from "@/lib/user-display";
import { useBusinessStatuses } from "@/lib/use-business-statuses";
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
type UserRole = "OWNER" | "MANAGER" | "GUEST";
type ViewMode = "list" | "kanban";

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

type OrderRow = {
  id: string;
  client_name: string | null;
  client_first_name?: string | null;
  client_last_name?: string | null;
  client_full_name?: string | null;
  client_phone: string | null;
  amount: number;
  description: string | null;
  due_date: string | null;
  status: StatusValue;
  order_number: number | null;
  created_at: string;
  manager_id: string | null;
  manager_name: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  created_by_role?: "OWNER" | "MANAGER" | null;
};

type Props = {
  list: OrderRow[];
  todayISO: string;
  businessSlug: string;
  businessId: string;
  phoneRaw: string;
  searchQuery: string;
  sort: OrderSort;
  initialViewMode: ViewMode;
  statusMode: "default" | "all" | "custom";
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
  hiddenKanbanCounts: {
    done: number;
    canceled: number;
    duplicate: number;
  };
  canManage: boolean;
  canEdit: boolean;
  userRole: UserRole;
  actors: TeamActor[];
  currentUserId: string | null;
  currentUserName: string;
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

type SortColumn = "order" | "amount" | "due" | "status";

function normalizeQuickStatuses(
  statuses: StatusFilterValue[],
  activeStatusOptions: readonly StatusFilterValue[],
) {
  const normalized = statuses.filter(Boolean);
  return normalized.length === 0 ? [...activeStatusOptions] : normalized;
}

function getDesktopSortState(sort: OrderSort, column: SortColumn): "asc" | "desc" | null {
  switch (column) {
    case "order":
      return sort === "newest" ? "desc" : sort === "oldest" ? "asc" : null;
    case "amount":
      return sort === "amountLow" ? "asc" : sort === "amountHigh" ? "desc" : null;
    case "due":
      return sort === "dueSoonest" ? "asc" : sort === "dueLatest" ? "desc" : null;
    case "status":
      return sort === "statusAsc" ? "asc" : sort === "statusDesc" ? "desc" : null;
    default:
      return null;
  }
}

function getNextDesktopSort(sort: OrderSort, column: SortColumn): OrderSort {
  const current = getDesktopSortState(sort, column);
  switch (column) {
    case "order":
      return current === null ? "newest" : current === "desc" ? "oldest" : "default";
    case "amount":
      return current === null ? "amountHigh" : current === "desc" ? "amountLow" : "default";
    case "due":
      return current === null ? "dueSoonest" : current === "asc" ? "dueLatest" : "default";
    case "status":
      return current === null ? "statusAsc" : current === "asc" ? "statusDesc" : "default";
    default:
      return "default";
  }
}

function getStatusTriggerLabel(
  statuses: StatusFilterValue[],
  activeStatusOptions: readonly StatusFilterValue[],
  inactiveStatusOptions: readonly StatusFilterValue[],
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

function getManagerTriggerLabel(value: string, currentUserId: string | null, options: { value: string; label: string }[]) {
  if (!value || value === "ALL") return "All managers";
  if (value === "ME") return currentUserId ? "Me" : "All managers";
  if (value === "UNASSIGNED") return "Unassigned";
  return options.find((option) => option.value === value)?.label ?? "All managers";
}

function getInitials(label: string) {
  const clean = label.trim();
  if (!clean) return "U";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function getCompactManagerLabel(label: string) {
  const clean = label.trim();
  if (!clean) return "Unassigned";

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return clean;

  const firstInitial = parts[0]?.slice(0, 1).toUpperCase();
  const lastName = parts[parts.length - 1];
  return firstInitial ? `${firstInitial}. ${lastName}` : clean;
}

function isOrderOverdue(order: { due_date: string | null; status: StatusValue }, todayISO: string) {
  const dueISO = order.due_date ? String(order.due_date).slice(0, 10) : null;
  return !!dueISO && dueISO < todayISO && (order.status === "NEW" || order.status === "IN_PROGRESS");
}

function orderMatchesAppliedStatusFilter(
  order: { due_date: string | null; status: StatusValue },
  todayISO: string,
  statusMode: "default" | "all" | "custom",
  activeStatuses: StatusFilterValue[],
) {
  if (statusMode === "all") return true;
  if (activeStatuses.includes(order.status)) return true;
  return activeStatuses.includes("OVERDUE") && isOrderOverdue(order, todayISO);
}

function moveOrderToStatus(
  rows: OrderRow[],
  orderId: string,
  nextStatus: StatusValue,
  keepVisible: boolean,
) {
  const current = rows.find((order) => order.id === orderId);
  if (!current) return rows;

  const updatedOrder = { ...current, status: nextStatus };
  const withoutCurrent = rows.filter((order) => order.id !== orderId);
  if (!keepVisible) return withoutCurrent;

  const insertAt = withoutCurrent.reduce((lastIndex, order, index) => {
    return order.status === nextStatus ? index + 1 : lastIndex;
  }, 0);

  return [
    ...withoutCurrent.slice(0, insertAt),
    updatedOrder,
    ...withoutCurrent.slice(insertAt),
  ];
}

function ActorAvatar({ label }: { label: string }) {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
      {getInitials(label)}
    </div>
  );
}

// Kept for potential fallback header styling variants.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function SortableHeader({
  label,
  column,
  sortValue,
  onClick,
  align = "left",
}: {
  label: string;
  column: SortColumn;
  sortValue: OrderSort;
  onClick: (column: SortColumn) => void;
  align?: "left" | "right";
}) {
  const state = getDesktopSortState(sortValue, column);
  const indicator = state === "asc" ? "↑" : state === "desc" ? "↓" : "↕";

  return (
    <button
      type="button"
      onClick={() => onClick(column)}
      className={[
        "inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] transition",
        state ? "text-[#667085]" : "text-[#98a2b3] hover:text-[#667085]",
        align === "right" ? "ml-auto" : "",
      ].join(" ")}
    >
      <span>{label}</span>
      <span className="text-[11px]">{indicator}</span>
    </button>
  );
}

// Kept for potential fallback header styling variants.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function TableSortHeader({
  label,
  column,
  sortValue,
  onClick,
  align = "left",
}: {
  label: string;
  column: SortColumn;
  sortValue: OrderSort;
  onClick: (column: SortColumn) => void;
  align?: "left" | "right";
}) {
  const state = getDesktopSortState(sortValue, column);
  const indicator = state === "asc" ? "↑" : state === "desc" ? "↓" : "↕";

  return (
    <button
      type="button"
      onClick={() => onClick(column)}
      className={[
        "inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3] transition hover:text-[#667085]",
        align === "right" ? "ml-auto" : "",
      ].join(" ")}
    >
      <span>{label}</span>
      <span className="text-[10px] leading-none text-[#98a2b3]">{indicator}</span>
    </button>
  );
}

function ActiveTableSortHeader({
  label,
  column,
  sortValue,
  onClick,
  align = "left",
}: {
  label: string;
  column: SortColumn;
  sortValue: OrderSort;
  onClick: (column: SortColumn) => void;
  align?: "left" | "right";
}) {
  const state = getDesktopSortState(sortValue, column);

  return (
    <button
      type="button"
      onClick={() => onClick(column)}
      className={[
        "inline-flex appearance-none items-center gap-0.5 border-0 bg-transparent p-0 align-middle transition",
        align === "right" ? "ml-auto" : "",
      ].join(" ")}
    >
      <span
        className={[
          "text-[10px] font-semibold uppercase leading-none tracking-[0.08em]",
          state ? "text-[#344054]" : "text-[#98a2b3]",
        ].join(" ")}
      >
        {label}
      </span>
      <span className="inline-flex flex-col items-center justify-center leading-none opacity-100">
        <ChevronUp
          className={[
            "h-2 w-2",
            state === "asc" ? "text-[#344054]" : "text-[#b8c1d1]",
          ].join(" ")}
        />
        <ChevronDown
          className={[
            "-mt-1 h-2 w-2",
            state === "desc" ? "text-[#344054]" : "text-[#b8c1d1]",
          ].join(" ")}
        />
      </span>
    </button>
  );
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

function mergeActors(baseActors: TeamActor[], nextActors: TeamActor[]) {
  const map = new Map<string, TeamActor>();
  for (const actor of [...baseActors, ...nextActors]) {
    if (!actor?.id) continue;
    map.set(actor.id, actor);
  }
  return Array.from(map.values());
}

function ManagerAssignmentCell({
  orderId,
  businessSlug,
  managerId,
  managerName,
  actors,
  canManage,
  avatarOnly = false,
  onAssigned,
}: {
  orderId: string;
  businessSlug: string;
  managerId: string | null;
  managerName: string | null;
  actors: TeamActor[];
  canManage: boolean;
  avatarOnly?: boolean;
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

  const resolvedManagerName =
    localManagerName?.trim() ||
    options.find((actor) => actor.id === localManagerId)?.label ||
    "";
  const label = resolvedManagerName || "Unassigned";
  const isUnassigned = !localManagerId;
  const compactLabel = isUnassigned ? label : getCompactManagerLabel(label);

  const triggerButton = avatarOnly ? (
    <button
      type="button"
      disabled={!canManage || isPending}
      onClick={(event) => event.stopPropagation()}
      aria-label={label}
      title={label}
      className={[
        "inline-flex h-8 w-8 items-center justify-center rounded-full border transition",
        canManage ? "cursor-pointer" : "cursor-default",
        isUnassigned
          ? "border-[#dbe2ea] bg-[#f8fafc] text-[#667085]"
          : "border-white bg-transparent shadow-[0_0_0_1px_rgba(221,227,238,0.95)] hover:shadow-[0_0_0_1px_rgba(17,24,39,0.18)]",
      ].join(" ")}
    >
      {isUnassigned ? (
        <UserRound className="h-3.5 w-3.5 text-[#98a2b3]" />
      ) : (
        <ActorAvatar label={label} />
      )}
    </button>
  ) : (
    <button
      type="button"
      disabled={!canManage || isPending}
      onClick={(event) => event.stopPropagation()}
      className={[
        "inline-flex h-8 max-w-full items-center gap-2 rounded-full border px-2.5 text-xs font-medium transition",
        canManage ? "cursor-pointer" : "cursor-default",
        isUnassigned
          ? "border-[#dbe2ea] bg-[#f8fafc] text-[#667085]"
          : "border-transparent bg-transparent px-0 text-[#344054] hover:text-[#111827]",
      ].join(" ")}
    >
      {isUnassigned ? (
        <UserRound className="h-3.5 w-3.5 text-[#98a2b3]" />
      ) : (
        <ActorAvatar label={label} />
      )}
      <span className="truncate" title={label}>
        {compactLabel}
      </span>
      {canManage ? <ChevronDown className="h-3.5 w-3.5 text-[#98a2b3]" /> : null}
    </button>
  );

  const trigger = triggerButton;

  if (!canManage) return trigger;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="w-[236px] rounded-xl border-[#dde3ee] bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-3 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
          Assign manager
        </div>
        <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
          <button
            type="button"
            className={[
              "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition",
              !localManagerId ? "bg-[#eef4ff] text-[#2459d3]" : "text-[#475467] hover:bg-[#f8fafc]",
            ].join(" ")}
            onClick={() => {
              const prevId = localManagerId;
              const prevName = localManagerName;
              setLocalManagerId(null);
              setLocalManagerName(null);
              startTransition(async () => {
                try {
                  await setOrderManager({ orderId, businessSlug, managerId: null });
                  onAssigned?.();
                } catch (error) {
                  setLocalManagerId(prevId);
                  setLocalManagerName(prevName);
                  const message =
                    error instanceof Error ? error.message : "Failed to update manager. Try again.";
                  window.alert(message);
                }
              });
            }}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#dbe2ea] bg-white text-[11px] font-semibold text-[#667085]">
              U
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">Unassigned</div>
            </div>
          </button>

          {options.map((actor) => (
            <button
              key={actor.id}
              type="button"
              className={[
                "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition",
                localManagerId === actor.id
                  ? "bg-[#eef4ff] text-[#2459d3]"
                  : "text-[#344054] hover:bg-[#f8fafc]",
              ].join(" ")}
              onClick={() => {
                if (localManagerId === actor.id) return;
                const prevId = localManagerId;
                const prevName = localManagerName;
                setLocalManagerId(actor.id);
                setLocalManagerName(actor.label);
                startTransition(async () => {
                  try {
                    await setOrderManager({ orderId, businessSlug, managerId: actor.id });
                    onAssigned?.();
                  } catch (error) {
                    setLocalManagerId(prevId);
                    setLocalManagerName(prevName);
                    const message =
                      error instanceof Error ? error.message : "Failed to update manager. Try again.";
                    window.alert(message);
                  }
                });
              }}
            >
              <ActorAvatar label={actor.label} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{actor.label}</div>
                <div className="text-[11px] uppercase tracking-[0.08em] text-[#98a2b3]">{actor.kind}</div>
              </div>
            </button>
          ))}
        </div>
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
  sort,
  initialViewMode,
  statusMode,
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
  hiddenKanbanCounts,
  canManage,
  canEdit,
  userRole,
  actors,
  currentUserId,
  currentUserName,
}: Props) {
  const router = useRouter();
  const { customStatuses, statuses } = useBusinessStatuses(businessId);
  const [openId, setOpenId] = useState<string | null>(null);
  const [createPreviewOpen, setCreatePreviewOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [periodMenuOpen, setPeriodMenuOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [managerMenuOpen, setManagerMenuOpen] = useState(false);
  const [perPageMenuOpen, setPerPageMenuOpen] = useState(false);
  const [draggingOrderId, setDraggingOrderId] = useState<string | null>(null);
  const [dropStatusValue, setDropStatusValue] = useState<string | null>(null);
  const [savingStatusOrderId, setSavingStatusOrderId] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState(searchQuery);
  const [sortValue, setSortValue] = useState<OrderSort>(sort);
  const [rangeValue, setRangeValue] = useState<DashboardRange>(rangeFilter);
  const [customStart, setCustomStart] = useState(rangeStartDate ?? "");
  const [customEnd, setCustomEnd] = useState(rangeEndDate ?? "");
  const [managerValue, setManagerValue] = useState<string>(
    normalizeQuickActor(actorFilter, actors, currentUserId),
  );
  const [rangeTouched, setRangeTouched] = useState(false);
  const [statusTouched, setStatusTouched] = useState(false);
  const [managerTouched, setManagerTouched] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isPending] = useTransition();
  const [navigationMessage, setNavigationMessage] = useState<string | null>(null);
  const [loadedActors, setLoadedActors] = useState<TeamActor[]>(actors);
  const isMountedRef = React.useRef(false);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const supabase = useMemo(() => createClient(), []);

  const effectiveActors = useMemo(() => mergeActors(actors, loadedActors), [actors, loadedActors]);
  const actorLabelById = useMemo(
    () => new Map(effectiveActors.map((actor) => [actor.id, actor.label])),
    [effectiveActors],
  );
  const rows = useMemo(
    () =>
      (list ?? []).map((order) => ({
        ...order,
        manager_name:
          order.manager_name || actorLabelById.get(String(order.manager_id ?? "")) || null,
      })),
    [actorLabelById, list],
  );
  const [boardRows, setBoardRows] = useState<OrderRow[]>(rows);
  React.useEffect(() => {
    setBoardRows(rows);
  }, [rows]);
  React.useEffect(() => {
    setViewMode(initialViewMode);
  }, [initialViewMode]);
  const managerOptions = useMemo(
    () =>
      effectiveActors
        .filter((actor) => !currentUserId || actor.id !== currentUserId)
        .slice()
        .sort((a, b) => a.label.localeCompare(b.label))
        .map((actor) => ({
          value: `user:${actor.id}`,
          label: actor.label,
        })),
    [currentUserId, effectiveActors],
  );
  const selectedOrder = useMemo(
    () => boardRows.find((order) => order.id === openId) ?? null,
    [boardRows, openId],
  );
  const statusOptions = useMemo(
    () => [
      ...statuses.map((status) => ({
        value: status.value as StatusFilterValue,
        label: status.label,
      })),
      { value: "OVERDUE" as const, label: "Overdue" },
    ],
    [statuses],
  );
  const allSelectableStatuses = useMemo(
    () => statusOptions.map((option) => option.value),
    [statusOptions],
  );
  const activeStatusOptions = useMemo(
    () => getDefaultVisibleStatusFilters(customStatuses),
    [customStatuses],
  );
  const inactiveStatusOptions = useMemo(
    () =>
      statuses
        .filter((status) => isTerminalStatus(status.value))
        .map((status) => status.value as StatusFilterValue),
    [statuses],
  );
  const [statusValues, setStatusValues] = useState<StatusFilterValue[]>(
    normalizeQuickStatuses(statusFilter, activeStatusOptions),
  );
  React.useEffect(() => {
    if (statusTouched) return;
    setStatusValues(
      statusMode === "all"
        ? allSelectableStatuses
        : normalizeQuickStatuses(statusFilter, activeStatusOptions),
    );
  }, [activeStatusOptions, allSelectableStatuses, statusFilter, statusMode, statusTouched]);
  const workflowStatuses = useMemo(
    () => statuses.filter((status) => status.active !== false),
    [statuses],
  );
  const doneVisibleInFilter =
    statusMode === "all" ||
    statusValues.includes("DONE") ||
    (!statusTouched && statusFilter.includes("DONE"));
  const canceledVisibleInFilter =
    statusMode === "all" ||
    statusValues.includes("CANCELED") ||
    (!statusTouched && statusFilter.includes("CANCELED"));
  const duplicateVisibleInFilter =
    statusMode === "all" ||
    statusValues.includes("DUPLICATE") ||
    (!statusTouched && statusFilter.includes("DUPLICATE"));
  const kanbanColumns = useMemo(
    () =>
      workflowStatuses.map((status) => ({
        ...status,
        orders: boardRows.filter((order) => order.status === status.value),
      })),
    [boardRows, workflowStatuses],
  );
  const visibleKanbanColumns = useMemo(
    () =>
      kanbanColumns.filter((column) => {
        if (column.value === "DONE") return doneVisibleInFilter || hiddenKanbanCounts.done > 0;
        if (column.value === "CANCELED") return canceledVisibleInFilter || hiddenKanbanCounts.canceled > 0;
        if (column.value === "DUPLICATE") return duplicateVisibleInFilter || hiddenKanbanCounts.duplicate > 0;
        return true;
      }),
    [
      canceledVisibleInFilter,
      doneVisibleInFilter,
      duplicateVisibleInFilter,
      hiddenKanbanCounts.canceled,
      hiddenKanbanCounts.done,
      hiddenKanbanCounts.duplicate,
      kanbanColumns,
    ],
  );

  const toggleOrderPreview = (orderId: string) => {
    if (shouldIgnoreOverlayCloseClick()) return;
    setOpenId((current) => (current === orderId ? null : orderId));
  };

  const navigateWithFallback = (href: string) => {
    if (isMountedRef.current) setNavigationMessage("Updating orders...");
    const currentHref = `${window.location.pathname}${window.location.search}`;
    if (href === currentHref) {
      window.location.reload();
      return;
    }
    window.location.assign(href);
  };

  React.useEffect(() => {
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

        if (isMountedRef.current) setLoadedActors(nextActors);
      } catch {
        // Keep server-provided actors when the client fetch fails.
      }
    }

    void loadActors();

    return () => {
      alive = false;
    };
  }, [businessId]);

  const buildHref = (next: {
    q: string;
    statusValues: StatusFilterValue[];
    statusTouched: boolean;
    managerValue: string;
    managerTouched: boolean;
    sortValue?: OrderSort;
    rangeValue?: DashboardRange;
    customStart?: string;
    customEnd?: string;
    rangeTouched?: boolean;
    page?: number;
    perPage?: number;
    viewMode?: ViewMode;
  }) => {
    const params = new URLSearchParams();
    if (phoneRaw) params.set("u", phoneRaw);
    params.set("srange", summaryRange);
    params.set("page", String(next.page ?? 1));
    params.set("perPage", String(next.perPage ?? perPage));
    const nextViewMode = next.viewMode ?? viewMode;
    if (nextViewMode === "kanban") params.set("view", nextViewMode);

    const nextRange = next.rangeTouched ? next.rangeValue ?? rangeValue : rangeFilter;
    const nextStart = next.rangeTouched ? next.customStart ?? customStart : rangeStartDate ?? "";
    const nextEnd = next.rangeTouched ? next.customEnd ?? customEnd : rangeEndDate ?? "";

    if (nextRange !== "ALL") params.set("range", nextRange);
    if (nextRange === "custom" && nextStart) params.set("start", nextStart);
    if (nextRange === "custom" && nextEnd) params.set("end", nextEnd);

    const q = next.q.trim();
    if (q) params.set("q", q);
    const nextSort = next.sortValue ?? sortValue;
    if (nextSort !== "default") params.set("sort", nextSort);

    const nextStatuses = next.statusTouched ? next.statusValues : statusFilter;
    const selectingAllStatuses =
      nextStatuses.length > 0 && allSelectableStatuses.every((status) => nextStatuses.includes(status));
    const selectingDefaultStatuses =
      nextStatuses.length === activeStatusOptions.length &&
      activeStatusOptions.every((status) => nextStatuses.includes(status));

    if (!next.statusTouched && statusMode === "all") {
      params.set("statusMode", "all");
    } else if (selectingAllStatuses || (next.statusTouched && nextStatuses.length === 0)) {
      params.set("statusMode", "all");
    } else if (!selectingDefaultStatuses) {
      for (const status of nextStatuses) {
        params.append("status", status);
      }
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
      sortValue,
      rangeValue,
      customStart,
      customEnd,
      rangeTouched,
      page,
      perPage: nextPerPage,
    });
  const viewHref = (nextViewMode: ViewMode) =>
    buildHref({
      q: searchDraft,
      statusValues,
      statusTouched,
      managerValue,
      managerTouched,
      sortValue,
      rangeValue,
      customStart,
      customEnd,
      rangeTouched,
      page: 1,
      viewMode: nextViewMode,
    });
  const revealStatusInBoard = (status: StatusFilterValue) => {
    const baseStatuses =
      statusMode === "all"
        ? allSelectableStatuses
        : statusTouched
          ? statusValues
          : normalizeQuickStatuses(statusFilter, activeStatusOptions);
    const nextStatuses = Array.from(new Set([...baseStatuses, status]));
    setStatusValues(nextStatuses);
    setStatusTouched(true);
    navigateWithFallback(
      buildHref({
        q: searchDraft,
        statusValues: nextStatuses,
        statusTouched: true,
        managerValue,
        managerTouched,
        sortValue,
        rangeValue,
        customStart,
        customEnd,
        rangeTouched,
        page: 1,
      }),
    );
  };

  const submitFilters = (next: {
    q: string;
    statusValues: StatusFilterValue[];
    statusTouched: boolean;
    managerValue: string;
    managerTouched: boolean;
    sortValue: OrderSort;
    rangeValue: DashboardRange;
    customStart: string;
    customEnd: string;
    rangeTouched: boolean;
  }) => {
    const href = buildHref(next);
    setPeriodMenuOpen(false);
    setStatusMenuOpen(false);
    setManagerMenuOpen(false);
    navigateWithFallback(href);
  };

  const handleSortChange = (column: SortColumn) => {
    const nextSort = getNextDesktopSort(sortValue, column);
    setSortValue(nextSort);
    navigateWithFallback(
      buildHref({
        q: searchDraft,
        statusValues,
        statusTouched,
        managerValue,
        managerTouched,
        sortValue: nextSort,
        rangeValue,
        customStart,
        customEnd,
        rangeTouched,
        page: 1,
      }),
    );
  };

  const toggleStatus = (status: StatusFilterValue) => {
    const hasStatus = statusValues.includes(status);
    const nextStatuses = hasStatus
      ? statusValues.filter((value) => value !== status)
      : allSelectableStatuses.filter(
          (value) => value === status || statusValues.includes(value),
        );

    setStatusValues(nextStatuses);
    setStatusTouched(true);
  };

  const selectAllStatuses = () => {
    setStatusValues(allSelectableStatuses);
    setStatusTouched(true);
  };

  const clearAllStatuses = () => {
    setStatusValues([]);
    setStatusTouched(true);
  };

  const handleCancelOrder = async (orderId: string, status: StatusValue) => {
    if (!canEdit || deletingId) return;
    if (status === "CANCELED" || status === "DONE") return;
    if (!window.confirm("Cancel this order? The order will stay in the list with Canceled status.")) return;

    setDeletingId(orderId);
    try {
      await setOrderStatus({
        orderId,
        businessSlug,
        status: "CANCELED",
      });
    } catch (error) {
      setDeletingId(null);
      window.alert(error instanceof Error ? error.message : "Failed to cancel order.");
      return;
    }

    setDeletingId(null);

    if (openId === orderId) {
      setOpenId(null);
    }
    router.refresh();
  };

  const handlePermanentDeleteOrder = async (orderId: string) => {
    if (userRole !== "OWNER" || deletingId) return;

    setDeletingId(orderId);
    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", orderId)
      .eq("business_id", businessId);

    setDeletingId(null);

    if (error) {
      window.alert(error.message || "Failed to delete order permanently.");
      return;
    }

    setConfirmDeleteId(null);
    if (openId === orderId) {
      setOpenId(null);
    }
    router.refresh();
  };

  const handleDropToStatus = async (orderId: string, nextStatus: StatusValue) => {
    const order = boardRows.find((row) => row.id === orderId);
    if (!order || savingStatusOrderId || order.status === nextStatus) return;

    if (nextStatus === "CANCELED") {
      const ok = window.confirm("Cancel this order? The order will stay in the list with Canceled status.");
      if (!ok) {
        setDraggingOrderId(null);
        setDropStatusValue(null);
        return;
      }
    }

    const nextOrder = { ...order, status: nextStatus };
    const appliedStatuses =
      statusMode === "all"
        ? allSelectableStatuses
        : statusTouched
          ? statusValues
          : normalizeQuickStatuses(statusFilter, activeStatusOptions);
    const keepVisible = orderMatchesAppliedStatusFilter(nextOrder, todayISO, statusMode, appliedStatuses);
    const previousRows = boardRows;

    setSavingStatusOrderId(orderId);
    setBoardRows((currentRows) => moveOrderToStatus(currentRows, orderId, nextStatus, keepVisible));
    setDraggingOrderId(null);
    setDropStatusValue(null);

    try {
      await setOrderStatus({
        orderId,
        businessSlug,
        status: nextStatus,
      });
    } catch (error) {
      setBoardRows(previousRows);
      window.alert(error instanceof Error ? error.message : "Failed to update status.");
    } finally {
      setSavingStatusOrderId(null);
    }
  };

  const showCustomRange = rangeValue === "custom";
  const customRangeReady = !showCustomRange || (Boolean(customStart) && Boolean(customEnd));
  const shouldStretchKanban = visibleKanbanColumns.length > 0 && visibleKanbanColumns.length <= 4;

  return (
    <section
      className={[
        "w-full min-w-0 overflow-visible rounded-[28px] border border-[#dde3ee] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
        viewMode === "kanban" ? "mx-0" : "mx-auto",
      ].join(" ")}
    >
      <div className="border-b border-[#eef2f7] px-5 py-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[13px] font-semibold text-[#111827]">Orders</div>
            <div className="mt-1 text-[12px] font-medium text-[#98a2b3]">
              {resultCount} {resultCount === 1 ? "result" : "results"} · Page {currentPage} of {totalPages}
            </div>
          </div>
          <div className="inline-flex items-center rounded-2xl border border-[#dde3ee] bg-[#f8fafc] p-1">
            <button
              type="button"
              onClick={() => {
                if (viewMode === "list") return;
                setViewMode("list");
                navigateWithFallback(viewHref("list"));
              }}
              className={[
                "inline-flex h-9 items-center gap-2 rounded-[14px] px-3 text-sm font-semibold transition",
                viewMode === "list"
                  ? "bg-white text-[#111827] shadow-[0_1px_2px_rgba(16,24,40,0.08)]"
                  : "text-[#667085] hover:text-[#111827]",
              ].join(" ")}
            >
              <List className="h-4 w-4" />
              List
            </button>
            <button
              type="button"
              onClick={() => {
                if (viewMode === "kanban") return;
                setViewMode("kanban");
                navigateWithFallback(viewHref("kanban"));
              }}
              className={[
                "inline-flex h-9 items-center gap-2 rounded-[14px] px-3 text-sm font-semibold transition",
                viewMode === "kanban"
                  ? "bg-white text-[#111827] shadow-[0_1px_2px_rgba(16,24,40,0.08)]"
                  : "text-[#667085] hover:text-[#111827]",
              ].join(" ")}
            >
              <Columns3 className="h-4 w-4" />
              Kanban
            </button>
          </div>
        </div>

        <form
          className="mt-4 flex flex-wrap items-center gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            submitFilters({
              q: searchDraft,
              statusValues,
              statusTouched,
              managerValue,
              managerTouched,
              sortValue,
              rangeValue,
              customStart,
              customEnd,
              rangeTouched,
            });
          }}
        >
          <div className="min-w-[220px] flex-[1.15]">
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
                placeholder="Search by client, phone, manager, status, amount..."
                className="h-11 w-full rounded-2xl border border-[#dde3ee] bg-[#fbfcfe] pl-11 pr-4 text-sm outline-none transition placeholder:text-[#98a2b3] focus:border-[#111827] focus:bg-white focus:ring-2 focus:ring-[#111827]/10"
              />
            </label>
          </div>

          <div className="flex min-w-[300px] flex-1 flex-nowrap items-center gap-3 xl:flex-none">
            <DropdownMenu modal={false} open={periodMenuOpen} onOpenChange={setPeriodMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-11 min-w-[150px] flex-1 items-center justify-between rounded-2xl border border-[#dde3ee] bg-white px-4 text-sm font-medium text-[#344054] outline-none transition hover:border-[#cfd8e6] focus:border-[#111827] focus:ring-2 focus:ring-[#111827]/10"
                >
                  <span className="truncate">{getPeriodTriggerLabel(rangeValue)}</span>
                  <ChevronDown className="ml-3 h-4 w-4 shrink-0 text-[#98a2b3]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                side="top"
                sideOffset={8}
                className="w-56 rounded-xl border-[#dde3ee] bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
                onClick={(event) => event.stopPropagation()}
                onCloseAutoFocus={(event) => event.preventDefault()}
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

            <DropdownMenu modal={false} open={statusMenuOpen} onOpenChange={setStatusMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-11 min-w-[150px] flex-1 items-center justify-between rounded-2xl border border-[#dde3ee] bg-white px-4 text-sm font-medium text-[#344054] outline-none transition hover:border-[#cfd8e6] focus:border-[#111827] focus:ring-2 focus:ring-[#111827]/10"
                >
                  <span className="truncate">
                    {getStatusTriggerLabel(statusValues, activeStatusOptions, inactiveStatusOptions)}
                  </span>
                  <ChevronDown className="ml-3 h-4 w-4 shrink-0 text-[#98a2b3]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={8}
                className="w-56 rounded-xl border-[#dde3ee] bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
                onClick={(event) => event.stopPropagation()}
                onCloseAutoFocus={(event) => event.preventDefault()}
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
                <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                  Active
                </div>
                {activeStatusOptions.map((statusValue) => {
                  const option = statusOptions.find((item) => item.value === statusValue);
                  if (!option) return null;
                  const isChecked = statusValues.includes(option.value);
                  const tone =
                    option.value === "OVERDUE"
                      ? { dot: "#DC2626", color: "#DC2626", selectedBackground: "#FEF2F2" }
                      : getStatusTone(option.value, customStatuses);

                  return (
                    <DropdownMenuCheckboxItem
                      key={option.value}
                      checked={isChecked}
                      className="rounded-lg py-2 pr-3 pl-8 text-sm font-medium text-[#344054]"
                      onSelect={(event) => event.preventDefault()}
                      onCheckedChange={() => toggleStatus(option.value)}
                      style={isChecked ? { background: tone.selectedBackground, color: tone.color } : undefined}
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
                  const isChecked = statusValues.includes(option.value);
                  const tone =
                    option.value === "OVERDUE"
                      ? { dot: "#DC2626", color: "#DC2626", selectedBackground: "#FEF2F2" }
                      : getStatusTone(option.value, customStatuses);

                  return (
                    <DropdownMenuCheckboxItem
                      key={option.value}
                      checked={isChecked}
                      className="rounded-lg py-2 pr-3 pl-8 text-sm font-medium text-[#344054]"
                      onSelect={(event) => event.preventDefault()}
                      onCheckedChange={() => toggleStatus(option.value)}
                      style={isChecked ? { background: tone.selectedBackground, color: tone.color } : undefined}
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
            </DropdownMenu>

            <DropdownMenu modal={false} open={managerMenuOpen} onOpenChange={setManagerMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-11 min-w-[170px] flex-1 items-center justify-between rounded-2xl border border-[#dde3ee] bg-white px-4 text-sm font-medium text-[#344054] outline-none transition hover:border-[#cfd8e6] focus:border-[#111827] focus:ring-2 focus:ring-[#111827]/10"
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
                onCloseAutoFocus={(event) => event.preventDefault()}
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
                      <div className="flex items-center gap-2">
                        <ActorAvatar label={option.label} />
                        <span className="truncate">{option.label}</span>
                      </div>
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

          <div
            className={`ml-auto flex shrink-0 items-center justify-end gap-3 ${
              hasActiveFilters ? "w-[214px]" : "w-[112px]"
            }`}
          >
            <a
              href={hasActiveFilters ? clearHref : "#"}
              aria-hidden={!hasActiveFilters}
              tabIndex={hasActiveFilters ? 0 : -1}
              className={`inline-flex h-11 min-w-[84px] shrink-0 items-center justify-center whitespace-nowrap rounded-2xl border px-3 text-sm font-semibold transition ${
                hasActiveFilters
                  ? "border-[#dde3ee] bg-white text-[#344054] hover:border-[#cfd8e6] hover:bg-[#f8fafc]"
                  : "pointer-events-none border-transparent bg-transparent text-transparent"
              }`}
            >
              Reset
            </a>
            <button
              type="submit"
              disabled={statusValues.length === 0 || !customRangeReady}
              className="inline-flex h-11 min-w-[112px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-[#111827] px-4 text-sm font-semibold transition hover:bg-[#0b1220] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-[#111827]"
              style={{ color: "#ffffff" }}
            >
              <span className="leading-none text-white">Apply</span>
            </button>
          </div>
        </form>

        {navigationMessage ? (
          <div className="mt-3 rounded-2xl border border-[#dbe2ea] bg-[#f8fafc] px-4 py-3 text-sm text-[#475467]">
            {navigationMessage}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef2f7] px-5 py-3">
        <div className="text-xs font-medium text-[#667085]">
          Showing {boardRows.length === 0 ? 0 : (currentPage - 1) * perPage + 1}
          -
          {(currentPage - 1) * perPage + boardRows.length} of {resultCount}
        </div>

          <div className="flex items-center gap-2 text-xs font-medium text-[#667085]">
            <span>Per page</span>
            <DropdownMenu modal={false} open={perPageMenuOpen} onOpenChange={setPerPageMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-9 min-w-[74px] items-center justify-between rounded-xl border border-[#dde3ee] bg-white px-3 text-sm font-medium text-[#344054] outline-none transition hover:border-[#cfd8e6] focus:border-[#111827] focus:ring-2 focus:ring-[#111827]/10"
                >
                  <span>{perPage}</span>
                  <ChevronDown className="ml-3 h-4 w-4 shrink-0 text-[#98a2b3]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="z-[70] w-24 rounded-xl border-[#dde3ee] bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
                onCloseAutoFocus={(event) => event.preventDefault()}
              >
                <DropdownMenuRadioGroup value={String(perPage)}>
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <DropdownMenuRadioItem
                      key={option}
                      value={String(option)}
                      className="rounded-lg py-2 pr-3 pl-8 text-sm font-medium text-[#344054] data-[state=checked]:bg-[#eef4ff] data-[state=checked]:font-semibold data-[state=checked]:text-[#2459d3]"
                      onSelect={() => navigateWithFallback(paginationHref(1, option))}
                    >
                      {option}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

      {viewMode === "list" ? (
        <div className="overflow-x-auto overflow-y-visible">
        <table className="min-w-[1040px] w-full border-collapse">
          <thead>
            <tr className="border-b border-[#eef2f7] text-left">
              <th className="px-5 py-2.5">
                <ActiveTableSortHeader label="Order" column="order" sortValue={sortValue} onClick={handleSortChange} />
              </th>
              <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                Client
              </th>
              <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                Manager
              </th>
              <th className="px-5 py-2.5 text-right">
                <ActiveTableSortHeader label="Amount" column="amount" sortValue={sortValue} onClick={handleSortChange} align="right" />
              </th>
              <th className="px-5 py-2.5">
                <ActiveTableSortHeader label="Due" column="due" sortValue={sortValue} onClick={handleSortChange} />
              </th>
              <th className="px-5 py-2.5">
                <ActiveTableSortHeader label="Status" column="status" sortValue={sortValue} onClick={handleSortChange} />
              </th>
              <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {boardRows.map((order) => {
              const isOverdue = isOrderOverdue(order, todayISO);
              const canCancel = canEdit && order.status !== "CANCELED" && order.status !== "DONE";
              const canDeletePermanently = userRole === "OWNER";

              return (
                <React.Fragment key={order.id}>
                  <tr
                    className="cursor-pointer border-b border-[#f2f4f7] transition-colors hover:bg-[#f8fafc]"
                    onClick={() => toggleOrderPreview(order.id)}
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
                        {order.client_full_name?.trim() || order.client_name?.trim() || "Unknown"}
                      </div>
                      <div className="mt-0.5 text-xs leading-4 text-[#98a2b3]">
                        {order.client_phone?.trim() || "No phone number"}
                      </div>
                    </td>

                    <td className="px-5 py-3 align-middle">
                      <ManagerAssignmentCell
                        orderId={order.id}
                        businessSlug={businessSlug}
                        managerId={order.manager_id}
                        managerName={order.manager_name}
                        actors={effectiveActors}
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

                    <td className="px-5 py-3 align-middle">
                      <div className="inline-flex" onClick={(event) => event.stopPropagation()}>
                        <StatusCell
                          orderId={order.id}
                          businessId={businessId}
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
                            Open order
                          </DropdownMenuItem>
                          {canCancel ? (
                            <DropdownMenuItem
                              className="rounded-lg px-3 py-2 text-sm font-medium text-red-700 focus:text-red-700"
                              onSelect={(event) => {
                                event.preventDefault();
                                void handleCancelOrder(order.id, order.status);
                              }}
                              disabled={deletingId === order.id}
                            >
                              <Trash2 className="h-4 w-4" />
                              {deletingId === order.id ? "Canceling..." : "Cancel order"}
                            </DropdownMenuItem>
                          ) : null}
                          {canDeletePermanently ? (
                            <>
                              {canCancel ? <DropdownMenuSeparator /> : null}
                              <DropdownMenuItem
                                className="rounded-lg px-3 py-2 text-sm font-medium text-red-700 focus:text-red-700"
                                onSelect={(event) => {
                                  event.preventDefault();
                                  setConfirmDeleteId(order.id);
                                }}
                                disabled={deletingId === order.id}
                              >
                                <Trash2 className="h-4 w-4" />
                                {deletingId === order.id ? "Deleting..." : "Delete permanently"}
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}

            {boardRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-sm text-[#98a2b3]">
                  {isPending ? "Updating orders..." : "No orders found"}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        </div>
      ) : (
        <div className="px-5 py-5">
          {visibleKanbanColumns.length > 0 ? (
            <div className="overflow-x-auto overflow-y-hidden pb-2">
            <div
              className="grid min-h-[calc(100vh-320px)] gap-4"
              style={
                shouldStretchKanban
                  ? { gridTemplateColumns: `repeat(${visibleKanbanColumns.length}, minmax(0, 1fr))` }
                  : {
                      minWidth: `${visibleKanbanColumns.length * 280}px`,
                      gridTemplateColumns: `repeat(${visibleKanbanColumns.length}, minmax(280px, 1fr))`,
                    }
              }
            >
              {visibleKanbanColumns.map((column) => {
                const tone = getStatusTone(column.value, customStatuses);
                const hiddenTerminalCount =
                  column.value === "DONE"
                    ? hiddenKanbanCounts.done
                    : column.value === "CANCELED"
                      ? hiddenKanbanCounts.canceled
                      : column.value === "DUPLICATE"
                        ? hiddenKanbanCounts.duplicate
                        : 0;
                const hiddenByFilter =
                  (column.value === "DONE" && !doneVisibleInFilter && hiddenKanbanCounts.done > 0) ||
                  (column.value === "CANCELED" && !canceledVisibleInFilter && hiddenKanbanCounts.canceled > 0) ||
                  (column.value === "DUPLICATE" && !duplicateVisibleInFilter && hiddenKanbanCounts.duplicate > 0);
                const showInlineCreate = column.value === "NEW";
                const revealLabel =
                  column.value === "DONE"
                    ? "Show done"
                    : column.value === "CANCELED"
                      ? "Show canceled"
                      : column.value === "DUPLICATE"
                        ? "Show duplicates"
                        : `Show ${column.label.toLowerCase()}`;
                const hiddenTitle =
                  column.value === "DONE"
                    ? "Done is hidden by filters"
                    : `${column.label} is hidden by filters`;

                return (
                  <div
                    key={column.value}
                    className={[
                      "flex h-[calc(100vh-320px)] min-h-[560px] flex-col rounded-[26px] border p-3 transition",
                      dropStatusValue === column.value
                        ? "border-[#111827] bg-[#f8fbff] shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
                        : "border-[#e2e8f0] bg-[#fbfcfe]",
                    ].join(" ")}
                    onDragOver={(event) => {
                      if (!canManage) return;
                      event.preventDefault();
                      setDropStatusValue(column.value);
                    }}
                    onDragLeave={(event) => {
                      if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                      setDropStatusValue((current) => (current === column.value ? null : current));
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const orderId = event.dataTransfer.getData("text/order-id") || draggingOrderId;
                      if (!orderId) return;
                      void handleDropToStatus(orderId, column.value);
                    }}
                  >
                    <div className="flex items-center justify-between gap-3 rounded-[20px] px-2 pb-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: tone.dot }} />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-[#111827]">{column.label}</div>
                          <div className="text-xs font-medium text-[#98a2b3]">
                            {column.orders.length} {column.orders.length === 1 ? "order" : "orders"}
                          </div>
                        </div>
                      </div>
                      <div
                        className="inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-semibold"
                        style={{ background: tone.background, color: tone.color }}
                      >
                        {column.orders.length}
                      </div>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-[20px] bg-white/50 p-1">
                      {showInlineCreate ? (
                        <DesktopKanbanCreateOrder
                          onCreate={() => {
                            setOpenId(null);
                            setCreatePreviewOpen(true);
                          }}
                        />
                      ) : null}

                      {hiddenByFilter ? (
                        <div className="flex min-h-[160px] flex-col items-center justify-center rounded-[20px] border border-dashed border-[#dbe2ea] bg-white/70 px-4 text-center">
                          <div className="text-sm font-semibold text-[#344054]">
                            {hiddenTitle}
                          </div>
                          <div className="mt-1 text-sm text-[#98a2b3]">
                            {hiddenTerminalCount} {hiddenTerminalCount === 1 ? "order" : "orders"} in this status
                          </div>
                          <button
                            type="button"
                            onClick={() => revealStatusInBoard(column.value)}
                            className="mt-3 inline-flex h-9 items-center justify-center rounded-xl border border-[#dde3ee] bg-white px-3 text-sm font-semibold text-[#344054] transition hover:border-[#cfd8e6] hover:bg-[#f8fafc]"
                          >
                            {revealLabel}
                          </button>
                        </div>
                      ) : null}

                      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                      {column.orders.map((order) => {
                        const isOverdue = isOrderOverdue(order, todayISO);
                        const canCancel = canEdit && order.status !== "CANCELED" && order.status !== "DONE";
                        const canDeletePermanently = userRole === "OWNER";
                        const isDragging = draggingOrderId === order.id;
                        const isSavingCard = savingStatusOrderId === order.id;

                        return (
                          <div
                            key={order.id}
                            draggable={canManage && !isSavingCard}
                            onDragStart={(event) => {
                              if (!canManage) return;
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("text/order-id", order.id);
                              setDraggingOrderId(order.id);
                              setDropStatusValue(column.value);
                            }}
                            onDragEnd={() => {
                              setDraggingOrderId(null);
                              setDropStatusValue(null);
                            }}
                            className={[
                              "group rounded-[22px] border border-[#e2e8f0] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition",
                              isDragging ? "scale-[0.985] opacity-60" : "hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(15,23,42,0.08)]",
                              canManage && !isSavingCard ? "cursor-grab active:cursor-grabbing" : "",
                            ].join(" ")}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <button
                                type="button"
                                onClick={() => toggleOrderPreview(order.id)}
                                className="min-w-0 text-left"
                              >
                                <div className="text-sm font-semibold text-[#111827]">
                                  #{order.order_number ?? "—"}
                                </div>
                                <div className="mt-1 text-xs font-medium text-[#98a2b3]">
                                  {formatCreatedAt(order.created_at)}
                                </div>
                              </button>

                              <div onClick={(event) => event.stopPropagation()}>
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
                                      Open order
                                    </DropdownMenuItem>
                                    {canCancel ? (
                                      <DropdownMenuItem
                                        className="rounded-lg px-3 py-2 text-sm font-medium text-red-700 focus:text-red-700"
                                        onSelect={(event) => {
                                          event.preventDefault();
                                          void handleCancelOrder(order.id, order.status);
                                        }}
                                        disabled={deletingId === order.id}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        {deletingId === order.id ? "Canceling..." : "Cancel order"}
                                      </DropdownMenuItem>
                                    ) : null}
                                    {canDeletePermanently ? (
                                      <>
                                        {canCancel ? <DropdownMenuSeparator /> : null}
                                        <DropdownMenuItem
                                          className="rounded-lg px-3 py-2 text-sm font-medium text-red-700 focus:text-red-700"
                                          onSelect={(event) => {
                                            event.preventDefault();
                                            setConfirmDeleteId(order.id);
                                          }}
                                          disabled={deletingId === order.id}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          {deletingId === order.id ? "Deleting..." : "Delete permanently"}
                                        </DropdownMenuItem>
                                      </>
                                    ) : null}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleOrderPreview(order.id)}
                              className="mt-4 block w-full text-left"
                            >
                              <div className="text-sm font-semibold text-[#111827]">
                                {order.client_full_name?.trim() || order.client_name?.trim() || "Unknown"}
                              </div>
                              <div className="mt-1 truncate text-xs text-[#98a2b3]">
                                {order.client_phone?.trim() || "No phone number"}
                              </div>
                            </button>

                            <div className="mt-4 grid gap-3 rounded-[18px] bg-[#f8fafc] p-3">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                                  Amount
                                </span>
                                <span className="text-sm font-semibold tabular-nums text-[#111827]">
                                  {fmtAmount(Number(order.amount))}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                                  Due
                                </span>
                                <span className={["inline-flex items-center gap-2 text-sm font-medium", isOverdue ? "text-[#d92d20]" : "text-[#475467]"].join(" ")}>
                                  <span>{formatDueDate(order.due_date)}</span>
                                  {isOverdue ? <AlertTriangle className="h-4 w-4" /> : null}
                                </span>
                              </div>
                              <div className="flex items-start justify-between gap-3">
                                <span className="pt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                                  Manager
                                </span>
                                <div onClick={(event) => event.stopPropagation()}>
                                  <ManagerAssignmentCell
                                    orderId={order.id}
                                    businessSlug={businessSlug}
                                    managerId={order.manager_id}
                                    managerName={order.manager_name}
                                    actors={effectiveActors}
                                    canManage={canManage}
                                    avatarOnly
                                    onAssigned={() => router.refresh()}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-3">
                              <div onClick={(event) => event.stopPropagation()}>
                                <StatusCell
                                  orderId={order.id}
                                  businessId={businessId}
                                  businessSlug={businessSlug}
                                  value={order.status}
                                  canManage={canManage}
                                />
                              </div>
                              <div className="text-[11px] font-medium text-[#98a2b3]">
                                {isSavingCard ? "Saving..." : canManage ? "Drag to move" : "Read only"}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {column.orders.length === 0 && !hiddenByFilter ? (
                        <div className="flex min-h-[160px] items-center justify-center rounded-[20px] border border-dashed border-[#dbe2ea] bg-white/70 px-4 text-center text-sm text-[#98a2b3]">
                          {dropStatusValue === column.value ? "Drop order here" : "No orders in this status"}
                        </div>
                      ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-[#dde3ee] bg-white px-6 py-12 text-center text-sm text-[#98a2b3]">
              No workflow statuses available
            </div>
          )}
        </div>
      )}

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

      <OrderPreview
        open={Boolean(selectedOrder) || createPreviewOpen}
        order={selectedOrder}
        businessId={businessId}
        businessSlug={businessSlug}
        phoneRaw={phoneRaw}
        userRole={userRole}
        canManage={canManage}
        actors={effectiveActors}
        currentUserName={currentUserName}
        supabase={supabase}
        mode={createPreviewOpen ? "create" : "view"}
        onClose={() => {
          setOpenId(null);
          setCreatePreviewOpen(false);
        }}
      />
      <AlertDialog
        open={Boolean(confirmDeleteId)}
        onOpenChange={(open) => {
          if (!open && !deletingId) setConfirmDeleteId(null);
        }}
      >
        <AlertDialogContent className="rounded-[24px] border-slate-200 bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.18)] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl tracking-[-0.02em] text-slate-900">
              Delete order permanently?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-6 text-slate-500">
              This order will be permanently removed from the orders list, analytics, and future dashboard
              calculations. It cannot be restored.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              disabled={Boolean(deletingId)}
            >
              Keep order
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl border border-red-600 bg-red-600 text-white hover:bg-red-700"
              disabled={!confirmDeleteId || Boolean(deletingId)}
              onClick={(event) => {
                event.preventDefault();
                if (!confirmDeleteId) return;
                void handlePermanentDeleteOrder(confirmDeleteId);
              }}
            >
              {deletingId ? "Deleting..." : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
