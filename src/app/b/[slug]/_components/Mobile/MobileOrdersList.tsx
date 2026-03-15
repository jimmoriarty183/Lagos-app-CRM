"use client";

import { Fragment, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Ellipsis,
  Eye,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { StatusCell } from "../../InlineCells";
import { setOrderStatus } from "../../actions";
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
  getStatusLabel,
  type StatusFilterValue,
  type StatusValue,
} from "@/lib/business-statuses";
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

function fmtAmount(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(n || 0));
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

  const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
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
  actors,
  currentUserId,
  currentUserName,
  searchQuery,
  sort,
  statusMode,
  statusFilter,
  summaryRange,
  rangeFilter,
  rangeStartDate,
  rangeEndDate,
  actorFilter,
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
  actors: TeamActor[];
  currentUserId: string | null;
  currentUserName: string;
  searchQuery: string;
  sort: OrderSort;
  statusMode: "default" | "all" | "custom";
  statusFilter: StatusFilterValue[];
  summaryRange: DashboardRange;
  rangeFilter: DashboardRange;
  rangeStartDate: string | null;
  rangeEndDate: string | null;
  actorFilter: string;
}) {
  const router = useRouter();
  const { statuses } = useBusinessStatuses(businessId);
  const [openId, setOpenId] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState(searchQuery);
  const [sortValue, setSortValue] = useState<OrderSort>(sort);
  const [statusValue, setStatusValue] = useState<string>(normalizeQuickStatus(statusFilter));
  const [managerValue, setManagerValue] = useState<string>(
    normalizeQuickActor(actorFilter, actors, currentUserId),
  );
  const [statusTouched, setStatusTouched] = useState(false);
  const [managerTouched, setManagerTouched] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isPending] = useTransition();
  const submitTimerRef = useRef<number | null>(null);
  const [navigationMessage, setNavigationMessage] = useState<string | null>(null);
  const [loadedActors, setLoadedActors] = useState<TeamActor[]>(actors);
  const isMountedRef = useRef(false);

  useEffect(() => {
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
  const selectedOrder = useMemo(
    () => rows.find((order) => order.id === openId) ?? null,
    [openId, rows],
  );
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

  const buildHref = (next: {
    q: string;
    sortValue: OrderSort;
    statusValue: string;
    statusTouched: boolean;
    managerValue: string;
    managerTouched: boolean;
    page?: number;
    perPage?: number;
  }) => {
    const params = new URLSearchParams();
    if (phoneRaw) params.set("u", phoneRaw);
    params.set("srange", summaryRange);
    params.set("page", String(next.page ?? 1));
    params.set("perPage", String(next.perPage ?? perPage));
    if (rangeFilter !== "ALL") params.set("range", rangeFilter);
    if (rangeStartDate) params.set("start", rangeStartDate);
    if (rangeEndDate) params.set("end", rangeEndDate);

    const q = next.q.trim();
    if (q) params.set("q", q);
    if (next.sortValue !== "default") params.set("sort", next.sortValue);

    const nextStatuses =
      next.statusTouched || next.statusValue !== "ALL"
        ? next.statusValue === "ALL"
          ? []
          : [next.statusValue]
        : statusFilter;

    if (!next.statusTouched && statusMode === "all") {
      params.set("statusMode", "all");
    } else if (next.statusTouched && next.statusValue === "ALL") {
      params.set("statusMode", "all");
    } else {
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
    return () => {
      if (submitTimerRef.current) window.clearTimeout(submitTimerRef.current);
    };
  }, []);

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

  const submitFilters = (next: {
    q: string;
    sortValue: OrderSort;
    statusValue: string;
    statusTouched: boolean;
    managerValue: string;
    managerTouched: boolean;
  }) => {
    navigateWithFallback(buildHref(next));
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
      statusValue,
      statusTouched,
      managerValue,
      managerTouched,
      page,
      perPage: nextPerPage,
    });

  return (
    <section className="grid gap-4 lg:hidden">
      <div className="rounded-[24px] border border-[#dde3ee] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[#111827]">Orders</div>
            <div className="mt-1 text-xs font-medium text-[#98a2b3]">
              {resultsCount} {resultsCount === 1 ? "result" : "results"} · Page {currentPage} of {totalPages}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const target = document.getElementById("mobile-create-order");
              target?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#111827] px-3.5 text-sm font-semibold text-white transition hover:bg-[#0b1220]"
          >
            <Plus className="h-4 w-4" />
            Create
          </button>
        </div>

        <div className="mt-4 grid gap-2">
          <label className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a2b3]" />
            <input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitFilters({
                    q: searchDraft,
                    sortValue,
                    statusValue,
                    statusTouched,
                    managerValue,
                    managerTouched,
                  });
                }
              }}
              onBlur={() => {
                if (submitTimerRef.current) window.clearTimeout(submitTimerRef.current);
                submitTimerRef.current = window.setTimeout(() => {
                  submitFilters({
                    q: searchDraft,
                    sortValue,
                    statusValue,
                    statusTouched,
                    managerValue,
                    managerTouched,
                  });
                }, 120);
              }}
              placeholder="Search by client, phone, manager, status, amount..."
              className="h-11 w-full rounded-2xl border border-[#dde3ee] bg-[#fbfcfe] pl-11 pr-4 text-sm outline-none transition placeholder:text-[#98a2b3] focus:border-[#111827] focus:bg-white focus:ring-2 focus:ring-[#111827]/10"
            />
          </label>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <select
              value={statusValue}
              onChange={(event) => {
                const next = event.currentTarget.value;
                setStatusValue(next);
                setStatusTouched(true);
                submitFilters({
                  q: searchDraft,
                  sortValue,
                  statusValue: next,
                  statusTouched: true,
                  managerValue,
                  managerTouched,
                });
              }}
              className="h-11 min-w-0 rounded-2xl border border-[#dde3ee] bg-white px-3 text-sm font-medium text-[#344054] outline-none transition focus:border-[#111827] focus:ring-2 focus:ring-[#111827]/10"
            >
              <option value="ALL">All Statuses</option>
              {statuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {getStatusLabel(status.value)}
                </option>
              ))}
            </select>

            <select
              value={managerValue}
              onChange={(event) => {
                const next = event.currentTarget.value;
                setManagerValue(next);
                setManagerTouched(true);
                submitFilters({
                  q: searchDraft,
                  sortValue,
                  statusValue,
                  statusTouched,
                  managerValue: next,
                  managerTouched: true,
                });
              }}
              className="h-11 min-w-0 rounded-2xl border border-[#dde3ee] bg-white px-3 text-sm font-medium text-[#344054] outline-none transition focus:border-[#111827] focus:ring-2 focus:ring-[#111827]/10"
            >
              <option value="ALL">All Managers</option>
              {currentUserId ? <option value="ME">Me</option> : null}
              <option value="UNASSIGNED">Unassigned</option>
              {managerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={sortValue}
              onChange={(event) => {
                const next = event.currentTarget.value as OrderSort;
                setSortValue(next);
                submitFilters({
                  q: searchDraft,
                  sortValue: next,
                  statusValue,
                  statusTouched,
                  managerValue,
                  managerTouched,
                });
              }}
              className="h-11 min-w-0 rounded-2xl border border-[#dde3ee] bg-white px-3 text-sm font-medium text-[#344054] outline-none transition focus:border-[#111827] focus:ring-2 focus:ring-[#111827]/10"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {navigationMessage ? (
          <div className="mt-3 rounded-2xl border border-[#dbe2ea] bg-[#f8fafc] px-4 py-3 text-sm text-[#475467]">
            {navigationMessage}
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#eef2f7] pt-3">
          <div className="text-xs font-medium text-[#667085]">
            Showing {list.length === 0 ? 0 : (currentPage - 1) * perPage + 1}
            -
            {(currentPage - 1) * perPage + list.length} of {resultsCount}
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-[#667085]">
            <span>Per page</span>
            <select
              value={String(perPage)}
              onChange={(event) => {
                navigateWithFallback(paginationHref(1, Number(event.currentTarget.value)));
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
      </div>

      {rows.map((order) => {
        const dueISO = order.due_date ? String(order.due_date).slice(0, 10) : null;
        const isOverdue =
          !!dueISO &&
          dueISO < todayISO &&
          (order.status === "NEW" || order.status === "IN_PROGRESS");
        const canCancel = canEdit && order.status !== "CANCELED" && order.status !== "DONE";
        const canDeletePermanently = userRole === "OWNER";

        return (
          <article
            key={order.id}
            onClick={() => {
              if (shouldIgnoreOverlayCloseClick()) return;
              setOpenId(order.id);
            }}
            className="cursor-pointer rounded-[24px] border border-[#dde3ee] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-[#cfd8e6]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[#111827]">#{order.order_number ?? "—"}</div>
                <div className="mt-1 text-xs font-medium text-[#98a2b3]">
                  {formatCreatedAt(order.created_at)}
                </div>
              </div>

              <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
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
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                  Client
                </div>
                <div className="mt-1 text-sm font-semibold text-[#111827]">
                  {order.client_full_name?.trim() || order.client_name?.trim() || "No client name"}
                </div>
                <div className="mt-1 text-xs text-[#98a2b3]">
                  {order.client_phone?.trim() || "No phone number"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                    Manager
                  </div>
                  <div className="mt-1 text-sm font-medium text-[#344054]">
                    {order.manager_name || actorLabelById.get(String(order.manager_id ?? "")) || "Unassigned"}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                    Amount
                  </div>
                  <div className="mt-1 text-sm font-semibold tabular-nums text-[#111827]">
                    {fmtAmount(Number(order.amount))}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                  Due
                </div>
                <div
                  className={[
                    "mt-1 inline-flex items-center gap-2 text-sm font-medium",
                    isOverdue ? "text-[#d92d20]" : "text-[#475467]",
                  ].join(" ")}
                >
                  {isOverdue ? <AlertTriangle className="h-4 w-4" /> : null}
                  <span>{formatDueDate(order.due_date)}</span>
                </div>
              </div>
            </div>

          </article>
        );
      })}

      {list.length === 0 ? (
        <div className="rounded-[24px] border border-[#dde3ee] bg-white p-6 text-center text-sm text-[#98a2b3] shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          {isPending ? "Updating orders..." : "No orders found"}
        </div>
      ) : null}

      {totalPages > 1 ? (
        <div className="rounded-[24px] border border-[#dde3ee] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <Pagination>
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
                  <Fragment key={page}>
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
                  </Fragment>
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
      <OrderPreview
        open={Boolean(selectedOrder)}
        order={selectedOrder}
        businessId={businessId}
        businessSlug={businessSlug}
        phoneRaw={phoneRaw}
        userRole={userRole}
        canManage={canManage}
        currentUserName={currentUserName}
        actors={effectiveActors}
        supabase={supabase}
        onClose={() => setOpenId(null)}
      />
    </section>
  );
}
