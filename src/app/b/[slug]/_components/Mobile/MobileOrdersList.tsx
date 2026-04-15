"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Ellipsis,
  Eye,
  List,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";

import { StatusCell } from "../../InlineCells";
import { setOrderStatus } from "../../actions";
import { CANCELED_REASONS } from "../../order-status-reasons";
import { OrderPreview } from "../orders/OrderPreview";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import {
  getDefaultVisibleStatusFilters,
  getStatusTone,
  type StatusFilterValue,
  type StatusValue,
} from "@/lib/business-statuses";
import { formatDisplayOrderNumber } from "@/lib/orders/display";
import type { DashboardRange } from "@/lib/order-dashboard-summary";
import { createClient } from "@/lib/supabase/client";
import { resolveUserDisplay } from "@/lib/user-display";
import { useBusinessStatuses } from "@/lib/use-business-statuses";

declare global {
  interface Window {
    __ordersOverlayClosingUntil?: number;
  }
}

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
};

type HiddenKanbanCounts = {
  done: number;
  canceled: number;
};

function fmtAmount(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Number(n || 0),
  );
}

function formatCreatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

function normalizeQuickStatus(statuses: StatusFilterValue[]) {
  return statuses.length === 1 ? statuses[0] : "ALL";
}

function normalizeQuickActor(
  actorFilter: string,
  actors: TeamActor[],
  currentUserId: string | null,
) {
  if (!actorFilter || actorFilter === "ALL") return "ALL";
  if (actorFilter === "UNASSIGNED") return "UNASSIGNED";
  if (actorFilter === "ME") return "ME";
  if (actorFilter.startsWith("user:")) return actorFilter;
  if (currentUserId && actorFilter === `user:${currentUserId}`) return "ME";
  if (actors.some((actor) => `user:${actor.id}` === actorFilter))
    return actorFilter;
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

const PAGE_SIZE_OPTIONS = [20, 50, 100, 500] as const;
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

function getPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 1) return [1];

  const pages = new Set<number>([
    1,
    totalPages,
    currentPage,
    currentPage - 1,
    currentPage + 1,
  ]);
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
}

function isOrderOverdue(
  order: { due_date: string | null; status: StatusValue },
  todayISO: string,
) {
  const dueISO = order.due_date ? String(order.due_date).slice(0, 10) : null;
  return (
    !!dueISO &&
    dueISO < todayISO &&
    (order.status === "NEW" || order.status === "IN_PROGRESS")
  );
}

function KanbanTransitionPlaceholder() {
  return (
    <div className="grid gap-3">
      <section className="overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
          <div className="text-sm font-semibold text-[#1F2937]">
            Подготавливаю контент
          </div>
          <div className="mt-1 text-xs text-[#6B7280]">
            Формируем канбан-колонки из уже загруженных данных
          </div>
        </div>
        <div className="mt-3 grid gap-2">
          <div className="h-10 w-full animate-pulse rounded-full bg-[#EEF2FF]" />
          <div className="h-28 w-full animate-pulse rounded-[20px] bg-[#F3F4F6]" />
          <div className="h-28 w-full animate-pulse rounded-[20px] bg-[#F3F4F6]" />
        </div>
      </section>
    </div>
  );
}

export default function MobileOrdersList({
  list = [],
  todayISO,
  businessSlug,
  businessId,
  phoneRaw,
  resultsCount,
  currentPage,
  perPage,
  totalPages,
  canManage,
  canEdit,
  userRole,
  canSwitchView,
  actors,
  currentUserId,
  currentUserName,
  initialOpenOrderId = null,
  searchQuery,
  sort,
  initialViewMode,
  statusMode,
  statusFilter,
  summaryRange,
  rangeFilter,
  rangeStartDate,
  rangeEndDate,
  actorFilter,
  hiddenKanbanCounts,
}: {
  list?: OrderRow[];
  todayISO: string;
  businessSlug: string;
  businessId: string;
  phoneRaw: string;
  resultsCount: number;
  currentPage: number;
  perPage: number;
  totalPages: number;
  canManage: boolean;
  canEdit: boolean;
  userRole: UserRole;
  canSwitchView: boolean;
  actors: TeamActor[];
  currentUserId: string | null;
  currentUserName: string;
  initialOpenOrderId?: string | null;
  searchQuery: string;
  sort: OrderSort;
  initialViewMode: ViewMode;
  statusMode: "default" | "all" | "custom";
  statusFilter: StatusFilterValue[];
  summaryRange: DashboardRange;
  rangeFilter: DashboardRange;
  rangeStartDate: string | null;
  rangeEndDate: string | null;
  actorFilter: string;
  hiddenKanbanCounts: HiddenKanbanCounts;
}) {
  const router = useRouter();
  const { customStatuses, statuses } = useBusinessStatuses(businessId);
  const activeStatusOptions = useMemo(
    () => getDefaultVisibleStatusFilters(customStatuses),
    [customStatuses],
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
  const [openId, setOpenId] = useState<string | null>(null);
  const [createPreviewOpen, setCreatePreviewOpen] = useState(false);
  const searchDraft = searchQuery;
  const sortValue = sort;
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [statusValues] = useState<StatusFilterValue[]>(statusFilter);
  const managerValue = normalizeQuickActor(actorFilter, actors, currentUserId);
  const [statusTouched] = useState(false);
  const managerTouched = false;
  void hiddenKanbanCounts;
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedKanbanStatus, setSelectedKanbanStatus] = useState<
    string | null
  >(null);
  const [kanbanCanScrollLeft, setKanbanCanScrollLeft] = useState(false);
  const [kanbanCanScrollRight, setKanbanCanScrollRight] = useState(false);
  const [isPending] = useTransition();
  const kanbanTabsRef = useRef<HTMLDivElement | null>(null);
  const [navigationMessage, setNavigationMessage] = useState<string | null>(
    null,
  );
  const [loadedActors, setLoadedActors] = useState<TeamActor[]>(actors);
  const [isPreparingKanban, setIsPreparingKanban] = useState(false);
  const isMountedRef = useRef(false);
  const switchToKanbanFrameRef = useRef<number | null>(null);
  const switchToKanbanDoneFrameRef = useRef<number | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (switchToKanbanFrameRef.current !== null) {
        window.cancelAnimationFrame(switchToKanbanFrameRef.current);
      }
      if (switchToKanbanDoneFrameRef.current !== null) {
        window.cancelAnimationFrame(switchToKanbanDoneFrameRef.current);
      }
    };
  }, []);

  const supabase = useMemo(() => createClient(), []);

  const effectiveActors = useMemo(
    () => mergeActors(actors, loadedActors),
    [actors, loadedActors],
  );
  const actorLabelById = useMemo(
    () => new Map(effectiveActors.map((actor) => [actor.id, actor.label])),
    [effectiveActors],
  );
  const rows = useMemo(
    () =>
      (list ?? []).map((order) => ({
        ...order,
        manager_name:
          order.manager_name ||
          actorLabelById.get(String(order.manager_id ?? "")) ||
          null,
      })),
    [actorLabelById, list],
  );
  const selectedOrder = useMemo(
    () => rows.find((order) => order.id === openId) ?? null,
    [openId, rows],
  );
  const clearFocusOrderParam = useCallback(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    if (!url.searchParams.has("focusOrder")) return;

    url.searchParams.delete("focusOrder");
    const nextSearch = url.searchParams.toString();
    const nextHref = `${url.pathname}${nextSearch ? `?${nextSearch}` : ""}`;
    router.replace(nextHref, { scroll: false });
  }, [router]);
  useEffect(() => {
    if (!initialOpenOrderId) return;
    if (!rows.some((order) => order.id === initialOpenOrderId)) return;
    setOpenId(initialOpenOrderId);
    clearFocusOrderParam();
  }, [clearFocusOrderParam, initialOpenOrderId, rows]);
  const managerOptions = useMemo(
    () =>
      effectiveActors
        .slice()
        .sort((a, b) => a.label.localeCompare(b.label))
        .map((actor) => ({
          value: `user:${actor.id}`,
          label: actor.label,
        })),
    [effectiveActors],
  );
  const workflowStatuses = useMemo(
    () => statuses.filter((status) => status.active !== false),
    [statuses],
  );
  const appliedStatuses =
    statusMode === "all"
      ? allSelectableStatuses
      : statusTouched
        ? statusValues
        : normalizeQuickStatus(statusFilter) === "ALL"
          ? activeStatusOptions
          : statusFilter;
  const visibleKanbanColumns = useMemo(
    () =>
      workflowStatuses.map((status) => ({
        ...status,
        orders: rows.filter(
          (order) =>
            String(order.status ?? "").toUpperCase() ===
            status.value.toUpperCase(),
        ),
      })),
    [rows, workflowStatuses],
  );
  const effectiveSelectedKanbanStatus =
    selectedKanbanStatus &&
    visibleKanbanColumns.some((column) => column.value === selectedKanbanStatus)
      ? selectedKanbanStatus
      : (visibleKanbanColumns[0]?.value ?? null);
  const selectedKanbanColumn = useMemo(
    () =>
      visibleKanbanColumns.find(
        (column) => column.value === effectiveSelectedKanbanStatus,
      ) ?? null,
    [effectiveSelectedKanbanStatus, visibleKanbanColumns],
  );

  const buildHref = (next: {
    q: string;
    sortValue: OrderSort;
    statusValues: StatusFilterValue[];
    statusTouched: boolean;
    managerValue: string;
    managerTouched: boolean;
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
    if (rangeFilter !== "ALL") params.set("range", rangeFilter);
    if (rangeStartDate) params.set("start", rangeStartDate);
    if (rangeEndDate) params.set("end", rangeEndDate);

    const q = next.q.trim();
    if (q) params.set("q", q);
    if (next.sortValue !== "default") params.set("sort", next.sortValue);

    const nextStatuses = next.statusTouched ? next.statusValues : statusFilter;
    const selectingAllStatuses =
      nextStatuses.length > 0 &&
      allSelectableStatuses.every((status) => nextStatuses.includes(status));
    const selectingDefaultStatuses =
      nextStatuses.length === activeStatusOptions.length &&
      activeStatusOptions.every((status) => nextStatuses.includes(status));

    if (!next.statusTouched && statusMode === "all") {
      params.set("statusMode", "all");
    } else if (
      selectingAllStatuses ||
      (next.statusTouched && nextStatuses.length === 0)
    ) {
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

  useEffect(() => {
    if (viewMode !== "kanban") return;

    const node = kanbanTabsRef.current;
    if (!node) return;

    const updateScrollState = () => {
      const maxScrollLeft = node.scrollWidth - node.clientWidth;
      setKanbanCanScrollLeft(node.scrollLeft > 8);
      setKanbanCanScrollRight(node.scrollLeft < maxScrollLeft - 8);
    };

    updateScrollState();
    node.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      node.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [viewMode, visibleKanbanColumns.length]);

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

  const navigateWithFallback = (href: string) => {
    if (isMountedRef.current) setNavigationMessage("Updating orders...");
    const currentHref = `${window.location.pathname}${window.location.search}`;
    if (href === currentHref) {
      window.location.reload();
      return;
    }
    window.location.assign(href);
  };

  const openFilters = () => {
    window.dispatchEvent(new Event("orders-mobile-open-filters"));
  };

  const handleCancelOrder = async (orderId: string, status: StatusValue) => {
    if (!canEdit || deletingId) return;
    if (status === "CANCELED" || status === "DONE") return;
    const presetOptions = CANCELED_REASONS.map(
      (reason, index) => `${index + 1}. ${reason}`,
    ).join("\n");
    const reasonInput = window.prompt(
      `Cancel reason is required.\nEnter a custom reason or choose preset:\n${presetOptions}\n\nUse "duplicate" for duplicate orders.`,
      "duplicate",
    );
    const normalizedReason = String(reasonInput ?? "").trim();
    if (!normalizedReason) return;

    setDeletingId(orderId);
    try {
      await setOrderStatus({
        orderId,
        businessSlug,
        status: "CANCELED",
        reason: normalizedReason,
      });
    } catch (error) {
      setDeletingId(null);
      window.alert(
        error instanceof Error ? error.message : "Failed to cancel order.",
      );
      return;
    }
    setDeletingId(null);

    if (openId === orderId) setOpenId(null);
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
    if (openId === orderId) setOpenId(null);
    router.refresh();
  };

  const pageItems = getPaginationItems(currentPage, totalPages);
  const paginationHref = (page: number, nextPerPage = perPage) =>
    buildHref({
      q: searchDraft,
      sortValue,
      statusValues,
      statusTouched,
      managerValue,
      managerTouched,
      page,
      perPage: nextPerPage,
    });
  const viewHref = (nextViewMode: ViewMode) =>
    buildHref({
      q: searchDraft,
      sortValue,
      statusValues,
      statusTouched,
      managerValue,
      managerTouched,
      page: 1,
      viewMode: nextViewMode,
    });
  const replaceUrlWithoutReload = (href: string) => {
    if (typeof window === "undefined") return;
    window.history.replaceState(window.history.state, "", href);
  };
  const handleViewModeChange = (nextViewMode: ViewMode) => {
    if (viewMode === nextViewMode) return;

    const href = viewHref(nextViewMode);
    replaceUrlWithoutReload(href);

    if (nextViewMode === "kanban") {
      setNavigationMessage("Подготавливаю контент...");
      setIsPreparingKanban(true);

      if (switchToKanbanFrameRef.current !== null) {
        window.cancelAnimationFrame(switchToKanbanFrameRef.current);
      }
      if (switchToKanbanDoneFrameRef.current !== null) {
        window.cancelAnimationFrame(switchToKanbanDoneFrameRef.current);
      }

      switchToKanbanFrameRef.current = window.requestAnimationFrame(() => {
        if (!isMountedRef.current) return;
        setViewMode("kanban");

        switchToKanbanDoneFrameRef.current = window.requestAnimationFrame(
          () => {
            if (!isMountedRef.current) return;
            setIsPreparingKanban(false);
            setNavigationMessage(null);
          },
        );
      });
      return;
    }

    setIsPreparingKanban(false);
    setNavigationMessage(null);
    setViewMode(nextViewMode);
  };
  const openCreateOrder = () => {
    setOpenId(null);
    setCreatePreviewOpen(true);
  };

  return (
    <section className="grid gap-4 lg:hidden">
      <div className="rounded-[24px] border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[#1F2937]">Orders</div>
            <div className="mt-1 text-xs font-medium text-[#9CA3AF]">
              {resultsCount} {resultsCount === 1 ? "result" : "results"} В· Page{" "}
              {currentPage} of {totalPages}
            </div>
          </div>
          <button
            type="button"
            onClick={openCreateOrder}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-[var(--brand-600)] bg-[var(--brand-600)] px-4 text-sm font-medium text-white transition hover:bg-[var(--brand-700)] hover:border-[var(--brand-700)]"
          >
            <Plus className="h-4 w-4 text-white" />
            <span className="text-white">Add deal</span>
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {canSwitchView ? (
              <div className="inline-flex flex-1 items-center rounded-xl border border-[#C7D2FE] bg-[#EEF2FF] p-1">
                <button
                  type="button"
                  onClick={() => {
                    handleViewModeChange("list");
                  }}
                  className={[
                    "inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-medium transition",
                    viewMode === "list"
                      ? "border border-[var(--brand-200)] bg-white text-[#1F2937] shadow-[0_8px_18px_rgba(91,91,179,0.12)]"
                      : "border border-transparent text-[#6B7280] hover:text-[#1F2937]",
                  ].join(" ")}
                >
                  <List className="h-4 w-4" />
                  List
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleViewModeChange("kanban");
                  }}
                  className={[
                    "inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-medium transition",
                    viewMode === "kanban"
                      ? "border border-[var(--brand-200)] bg-white text-[#1F2937] shadow-[0_8px_18px_rgba(91,91,179,0.12)]"
                      : "border border-transparent text-[#6B7280] hover:text-[#1F2937]",
                  ].join(" ")}
                >
                  <Columns3 className="h-4 w-4" />
                  Kanban
                </button>
              </div>
            ) : (
              <div className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3.5 text-sm font-medium text-[#4B5563]">
                <Eye className="h-4 w-4 text-[#6B7280]" />
                View only: {viewMode === "kanban" ? "Kanban" : "List"}
              </div>
            )}
            <button
              type="button"
              onClick={openFilters}
              className="group inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border-2 border-[var(--brand-600)] bg-white px-4 text-sm font-medium text-[var(--brand-600)] transition hover:bg-[var(--brand-600)] hover:text-white"
            >
              <Search className="icon-button" strokeWidth={2} />
              <SlidersHorizontal className="icon-button" strokeWidth={2} />
              Search & Filters
            </button>
          </div>

          <div className="rounded-2xl border border-[#F3F4F6] bg-[#F9FAFB] px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
                  Current setup
                </div>
                <div className="mt-1 truncate text-sm font-semibold text-[#1F2937]">
                  {searchDraft ? `Search: ${searchDraft}` : "No search query"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
                  Sort
                </div>
                <div className="mt-1 text-sm font-semibold text-[#1F2937]">
                  {SORT_OPTIONS.find((option) => option.value === sortValue)
                    ?.label ?? "Default order"}
                </div>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-[#E5E7EB] bg-white px-2.5 py-1 text-[11px] font-medium text-[#4B5563]">
                {managerValue === "ALL"
                  ? "All managers"
                  : (managerOptions.find(
                      (option) => option.value === managerValue,
                    )?.label ?? managerValue)}
              </span>
              <span className="inline-flex items-center rounded-full border border-[#E5E7EB] bg-white px-2.5 py-1 text-[11px] font-medium text-[#4B5563]">
                {statusMode === "all"
                  ? "All statuses"
                  : `${appliedStatuses.length} status filters`}
              </span>
            </div>
          </div>
        </div>

        {navigationMessage ? (
          <div className="mt-3 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-sm text-[#4B5563]">
            {navigationMessage}
          </div>
        ) : null}

        {viewMode === "list" ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#F3F4F6] pt-3">
            <div className="text-xs font-medium text-[#6B7280]">
              Showing {list.length === 0 ? 0 : (currentPage - 1) * perPage + 1}-
              {(currentPage - 1) * perPage + list.length} of {resultsCount}
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-[#6B7280]">
              <span>Per page</span>
              <select
                value={String(perPage)}
                onChange={(event) => {
                  navigateWithFallback(
                    paginationHref(1, Number(event.currentTarget.value)),
                  );
                }}
                className="h-9 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-medium text-[#374151] outline-none transition focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/15"
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </div>

      {isPreparingKanban ? (
        <KanbanTransitionPlaceholder />
      ) : viewMode === "list" ? (
        rows.map((order) => {
          const isOverdue = isOrderOverdue(order, todayISO);
          const canCancel =
            canEdit && order.status !== "CANCELED" && order.status !== "DONE";
          const canDeletePermanently = userRole === "OWNER";
          const clientName =
            order.client_full_name?.trim() ||
            order.client_name?.trim() ||
            "No client name";
          const clientPhone = order.client_phone?.trim() || "No phone number";
          const managerName =
            order.manager_name ||
            actorLabelById.get(String(order.manager_id ?? "")) ||
            "Unassigned";
          const amount = fmtAmount(Number(order.amount));
          const dueDate = formatDueDate(order.due_date);

          return (
            <article
              key={order.id}
              onClick={() => {
                if (shouldIgnoreOverlayCloseClick()) return;
                setOpenId(order.id);
              }}
              className="cursor-pointer rounded-[20px] border border-[#E5E7EB] bg-white px-3 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-[#C7D2FE] hover:bg-[#F9FAFB]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[#1F2937]">
                    {formatDisplayOrderNumber({
                      orderNumber: order.order_number,
                      orderId: order.id,
                    })}
                  </div>
                  <div className="mt-0.5 truncate text-sm font-semibold text-[#1F2937]">
                    {clientName}
                  </div>
                  <div className="mt-0.5 text-[11px] font-medium text-[#9CA3AF]">
                    {formatCreatedAt(order.created_at)}
                  </div>
                </div>

                <div
                  className="flex items-start gap-2"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="inline-flex shrink-0">
                    <StatusCell
                      orderId={order.id}
                      businessId={businessId}
                      businessSlug={businessSlug}
                      value={order.status}
                      canManage={canManage}
                    />
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#6B7280] transition hover:border-[#C7D2FE] hover:bg-[#F9FAFB] hover:text-[#1F2937]"
                        aria-label="Open order actions"
                      >
                        <Ellipsis className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-48 rounded-xl border-[#E5E7EB] bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
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
                          {deletingId === order.id
                            ? "Canceling..."
                            : "Cancel order"}
                        </DropdownMenuItem>
                      ) : null}
                      {canDeletePermanently ? (
                        <DropdownMenuItem
                          className="rounded-lg px-3 py-2 text-sm font-medium text-red-700 focus:text-red-700"
                          onSelect={(event) => {
                            event.preventDefault();
                            setConfirmDeleteId(order.id);
                          }}
                          disabled={deletingId === order.id}
                        >
                          <Trash2 className="h-4 w-4" />
                          {deletingId === order.id
                            ? "Deleting..."
                            : "Delete permanently"}
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="mt-2 grid gap-1.5 text-xs text-[#6B7280]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="mr-1.5 font-semibold uppercase tracking-[0.06em] text-[#9CA3AF]">
                      Manager
                    </span>
                    <span className="font-medium text-[#374151]">
                      {managerName}
                    </span>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="mr-1.5 font-semibold uppercase tracking-[0.06em] text-[#9CA3AF]">
                      Amount
                    </span>
                    <span className="font-semibold tabular-nums text-[#1F2937]">
                      {amount}
                    </span>
                  </div>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div
                    className={[
                      "min-w-0 inline-flex items-center gap-1.5 font-medium",
                      isOverdue ? "text-[#d92d20]" : "text-[#4B5563]",
                    ].join(" ")}
                  >
                    <span className="font-semibold uppercase tracking-[0.06em] text-[#9CA3AF]">
                      Due
                    </span>
                    {isOverdue ? (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    ) : null}
                    <span className="truncate">{dueDate}</span>
                  </div>
                  <div className="min-w-0 truncate text-right text-[11px] text-[#9CA3AF]">
                    {clientPhone}
                  </div>
                </div>
              </div>
            </article>
          );
        })
      ) : selectedKanbanColumn ? (
        (() => {
          const column = selectedKanbanColumn;
          const tone = getStatusTone(column.value, customStatuses);
          return (
            <div className="grid gap-3">
              <section className="overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                <div className="relative border-b border-[#F3F4F6] px-4 py-3">
                  {kanbanCanScrollLeft ? (
                    <div className="pointer-events-none absolute left-0 top-0 z-[1] h-full w-10 bg-gradient-to-r from-white via-white/80 to-transparent" />
                  ) : null}
                  {kanbanCanScrollRight ? (
                    <div className="pointer-events-none absolute right-0 top-0 z-[1] h-full w-10 bg-gradient-to-l from-white via-white/80 to-transparent" />
                  ) : null}

                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
                        Status lane
                      </div>
                      <div className="mt-1 text-xs text-[#6B7280]">
                        Swipe horizontally to move between statuses
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[#9CA3AF]">
                      <ChevronLeft
                        className={`h-4 w-4 ${kanbanCanScrollLeft ? "opacity-100" : "opacity-30"}`}
                      />
                      <ChevronRight
                        className={`h-4 w-4 ${kanbanCanScrollRight ? "opacity-100" : "opacity-30"}`}
                      />
                    </div>
                  </div>

                  <div
                    ref={kanbanTabsRef}
                    className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                    <div className="flex w-max gap-2">
                      {visibleKanbanColumns.map((statusColumn) => {
                        const tabTone = getStatusTone(
                          statusColumn.value,
                          customStatuses,
                        );
                        const isSelected = statusColumn.value === column.value;
                        const visibleCount = statusColumn.orders.length;
                        return (
                          <button
                            key={statusColumn.value}
                            type="button"
                            onClick={() =>
                              setSelectedKanbanStatus(statusColumn.value)
                            }
                            className={[
                              "inline-flex min-h-10 items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition",
                              isSelected
                                ? "border-transparent text-[#1F2937]"
                                : "border-[#E5E7EB] bg-white text-[#6B7280]",
                            ].join(" ")}
                            style={
                              isSelected
                                ? { background: tabTone.background }
                                : undefined
                            }
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ background: tabTone.dot }}
                            />
                            <span>{statusColumn.label}</span>
                            <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[11px] font-semibold text-[#4B5563]">
                              {visibleCount}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div
                  className="border-b px-4 py-3"
                  style={{
                    borderColor: tone.background,
                    background: `linear-gradient(180deg, ${tone.background} 0%, #ffffff 100%)`,
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ background: tone.dot }}
                        />
                        <div className="truncate text-sm font-semibold text-[#1F2937]">
                          {column.label}
                        </div>
                      </div>
                      <div className="mt-1 text-xs font-medium text-[#6B7280]">
                        {column.orders.length}{" "}
                        {column.orders.length === 1 ? "order" : "orders"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-semibold"
                        style={{
                          background: tone.background,
                          color: tone.color,
                        }}
                      >
                        {column.orders.length}
                      </div>
                    </div>
                  </div>
                </div>

                {column.orders.length > 0 ? (
                  <div className="grid gap-3 p-3">
                    {column.orders.map((order) => {
                      const isOverdue = isOrderOverdue(order, todayISO);
                      const canCancel =
                        canEdit &&
                        order.status !== "CANCELED" &&
                        order.status !== "DONE";
                      const canDeletePermanently = userRole === "OWNER";

                      return (
                        <article
                          key={order.id}
                          onClick={() => {
                            if (shouldIgnoreOverlayCloseClick()) return;
                            setOpenId(order.id);
                          }}
                          className="cursor-pointer rounded-[20px] border border-transparent bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-[#1F2937]">
                                {formatDisplayOrderNumber({
                                  orderNumber: order.order_number,
                                  orderId: order.id,
                                })}
                              </div>
                              <div className="mt-1 text-xs font-medium text-[#9CA3AF]">
                                {formatCreatedAt(order.created_at)}
                              </div>
                            </div>

                            <div
                              className="flex items-center gap-2"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <div className="inline-flex">
                                <StatusCell
                                  orderId={order.id}
                                  businessId={businessId}
                                  businessSlug={businessSlug}
                                  value={order.status}
                                  canManage={canManage}
                                />
                              </div>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#6B7280] transition hover:border-[#C7D2FE] hover:bg-[#F9FAFB] hover:text-[#1F2937]"
                                    aria-label="Open order actions"
                                  >
                                    <Ellipsis className="h-4 w-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-48 rounded-xl border-[#E5E7EB] bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
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
                                        void handleCancelOrder(
                                          order.id,
                                          order.status,
                                        );
                                      }}
                                      disabled={deletingId === order.id}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      {deletingId === order.id
                                        ? "Canceling..."
                                        : "Cancel order"}
                                    </DropdownMenuItem>
                                  ) : null}
                                  {canDeletePermanently ? (
                                    <DropdownMenuItem
                                      className="rounded-lg px-3 py-2 text-sm font-medium text-red-700 focus:text-red-700"
                                      onSelect={(event) => {
                                        event.preventDefault();
                                        setConfirmDeleteId(order.id);
                                      }}
                                      disabled={deletingId === order.id}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      {deletingId === order.id
                                        ? "Deleting..."
                                        : "Delete permanently"}
                                    </DropdownMenuItem>
                                  ) : null}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3">
                            <div className="min-w-0">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
                                Client
                              </div>
                              <div className="mt-1 text-sm font-semibold text-[#1F2937]">
                                {order.client_full_name?.trim() ||
                                  order.client_name?.trim() ||
                                  "No client name"}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
                                  Manager
                                </div>
                                <div className="mt-1 text-sm font-medium text-[#374151]">
                                  {order.manager_name ||
                                    actorLabelById.get(
                                      String(order.manager_id ?? ""),
                                    ) ||
                                    "Unassigned"}
                                </div>
                              </div>
                              <div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
                                  Amount
                                </div>
                                <div className="mt-1 text-sm font-semibold tabular-nums text-[#1F2937]">
                                  {fmtAmount(Number(order.amount))}
                                </div>
                              </div>
                            </div>
                            <div className="inline-flex items-center gap-2 text-sm font-medium text-[#4B5563]">
                              {isOverdue ? (
                                <AlertTriangle className="h-4 w-4 text-[#d92d20]" />
                              ) : null}
                              <span>{formatDueDate(order.due_date)}</span>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="rounded-[20px] border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-5 text-center text-sm text-[#9CA3AF]">
                      No deals in this status yet
                    </div>
                  </div>
                )}
              </section>
            </div>
          );
        })()
      ) : (
        <div className="rounded-[24px] border border-[#E5E7EB] bg-white p-6 text-center text-sm text-[#9CA3AF] shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          No workflow statuses available
        </div>
      )}

      {list.length === 0 ? (
        <div className="rounded-[24px] border border-[#E5E7EB] bg-white p-6 text-center text-sm text-[#9CA3AF] shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          {isPending
            ? "Updating orders..."
            : "No deals yet. Add your first one to start building the workflow."}
        </div>
      ) : null}

      {totalPages > 1 ? (
        <div className="rounded-[24px] border border-[#E5E7EB] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={paginationHref(Math.max(1, currentPage - 1))}
                  aria-disabled={currentPage === 1}
                  className={
                    currentPage === 1 ? "pointer-events-none opacity-50" : ""
                  }
                />
              </PaginationItem>
              {pageItems.map((page, index) => {
                const prevPage = pageItems[index - 1];
                const needsEllipsis = prevPage && page - prevPage > 1;

                return (
                  <Fragment key={page}>
                    {needsEllipsis ? (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : null}
                    <PaginationItem>
                      <PaginationLink
                        href={paginationHref(page)}
                        isActive={page === currentPage}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  </Fragment>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  href={paginationHref(Math.min(totalPages, currentPage + 1))}
                  aria-disabled={currentPage === totalPages}
                  className={
                    currentPage === totalPages
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink
                  href={paginationHref(totalPages)}
                  size="default"
                  aria-disabled={currentPage === totalPages}
                  className={
                    currentPage === totalPages
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                >
                  Last
                </PaginationLink>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      ) : null}
      <AlertDialog
        open={Boolean(confirmDeleteId)}
        onOpenChange={(open) => {
          if (!open && !deletingId) setConfirmDeleteId(null);
        }}
      >
        <AlertDialogContent className="rounded-[24px] border-slate-200 bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.18)] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="product-page-title text-slate-900">
              Delete order permanently?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-6 text-slate-500">
              This order will be permanently removed from the orders list,
              analytics, and future dashboard calculations. It cannot be
              restored.
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
      <OrderPreview
        open={Boolean(selectedOrder) || createPreviewOpen}
        order={selectedOrder}
        businessId={businessId}
        businessSlug={businessSlug}
        phoneRaw={phoneRaw}
        currentUserId={currentUserId}
        userRole={userRole}
        canManage={canManage}
        currentUserName={currentUserName}
        actors={effectiveActors}
        supabase={supabase}
        mode={createPreviewOpen ? "create" : "view"}
        onClose={() => {
          setOpenId(null);
          setCreatePreviewOpen(false);
          clearFocusOrderParam();
        }}
      />
    </section>
  );
}
