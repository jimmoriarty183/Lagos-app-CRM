"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  AlertTriangle,
  Ellipsis,
  Eye,
  PencilLine,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { StatusCell } from "../../InlineCells";
import { OrderChecklist } from "../../OrderChecklist";
import { OrderComments } from "../../OrderComments";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DashboardRange } from "@/lib/order-dashboard-summary";

declare global {
  interface Window {
    __ordersOverlayClosingUntil?: number;
  }
}

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

export default function MobileOrdersList({
  list = [],
  todayISO,
  businessSlug,
  businessId,
  phoneRaw,
  resultsCount,
  canManage,
  canEdit,
  userRole,
  actors,
  currentUserId,
  searchQuery,
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
  canManage: boolean;
  canEdit: boolean;
  userRole: UserRole;
  actors: TeamActor[];
  currentUserId: string | null;
  searchQuery: string;
  statusFilter: StatusFilterValue[];
  summaryRange: DashboardRange;
  rangeFilter: DashboardRange;
  rangeStartDate: string | null;
  rangeEndDate: string | null;
  actorFilter: string;
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState(searchQuery);
  const [statusValue, setStatusValue] = useState<string>(normalizeQuickStatus(statusFilter));
  const [managerValue, setManagerValue] = useState<string>(
    normalizeQuickActor(actorFilter, actors, currentUserId),
  );
  const [statusTouched, setStatusTouched] = useState(false);
  const [managerTouched, setManagerTouched] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const submitTimerRef = useRef<number | null>(null);

  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

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
    statusValue: string;
    statusTouched: boolean;
    managerValue: string;
    managerTouched: boolean;
  }) => {
    const params = new URLSearchParams();
    if (phoneRaw) params.set("u", phoneRaw);
    params.set("srange", summaryRange);
    params.set("page", "1");
    if (rangeFilter !== "ALL") params.set("range", rangeFilter);
    if (rangeStartDate) params.set("start", rangeStartDate);
    if (rangeEndDate) params.set("end", rangeEndDate);

    const q = next.q.trim();
    if (q) params.set("q", q);

    const nextStatuses =
      next.statusTouched || next.statusValue !== "ALL"
        ? next.statusValue === "ALL"
          ? []
          : [next.statusValue]
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

  const submitFilters = (next: {
    q: string;
    statusValue: string;
    statusTouched: boolean;
    managerValue: string;
    managerTouched: boolean;
  }) => {
    startTransition(() => {
      router.replace(buildHref(next));
    });
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

    if (openId === orderId) setOpenId(null);
    router.refresh();
  };

  return (
    <section className="grid gap-4 lg:hidden">
      <div className="rounded-[24px] border border-[#dde3ee] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[#111827]">Orders</div>
            <div className="mt-1 text-xs font-medium text-[#98a2b3]">
              {resultsCount} {resultsCount === 1 ? "result" : "results"}
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
                    statusValue,
                    statusTouched,
                    managerValue,
                    managerTouched,
                  });
                }, 120);
              }}
              placeholder="Search by client, phone, order ID..."
              className="h-11 w-full rounded-2xl border border-[#dde3ee] bg-[#fbfcfe] pl-11 pr-4 text-sm outline-none transition placeholder:text-[#98a2b3] focus:border-[#111827] focus:bg-white focus:ring-2 focus:ring-[#111827]/10"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={statusValue}
              onChange={(event) => {
                const next = event.currentTarget.value;
                setStatusValue(next);
                setStatusTouched(true);
                submitFilters({
                  q: searchDraft,
                  statusValue: next,
                  statusTouched: true,
                  managerValue,
                  managerTouched,
                });
              }}
              className="h-11 min-w-0 rounded-2xl border border-[#dde3ee] bg-white px-3 text-sm font-medium text-[#344054] outline-none transition focus:border-[#111827] focus:ring-2 focus:ring-[#111827]/10"
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">New</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_PAYMENT">Waiting Payment</option>
              <option value="DONE">Done</option>
              <option value="DUPLICATE">Duplicate</option>
            </select>

            <select
              value={managerValue}
              onChange={(event) => {
                const next = event.currentTarget.value;
                setManagerValue(next);
                setManagerTouched(true);
                submitFilters({
                  q: searchDraft,
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
          </div>
        </div>
      </div>

      {list.map((order) => {
        const isOpen = openId === order.id;
        const dueISO = order.due_date ? String(order.due_date).slice(0, 10) : null;
        const isOverdue =
          !!dueISO &&
          dueISO < todayISO &&
          (order.status === "NEW" || order.status === "IN_PROGRESS");
        const editHref = `/b/${businessSlug}/o/${order.id}?u=${encodeURIComponent(phoneRaw)}`;

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
                      View Details
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
                        Edit Order
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
                        {deletingId === order.id ? "Deleting..." : "Delete Order"}
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
                  {order.client_name?.trim() || "No client name"}
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
                    {order.manager_name || "Unassigned"}
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

            {isOpen ? (
              <div
                className="mt-4 rounded-2xl border border-[#dde3ee] bg-[#fbfcfe] p-3"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                  Description
                </div>
                <div className="mt-2 whitespace-pre-wrap break-words text-sm text-[#364153]">
                  {order.description?.trim() ? order.description : "No description"}
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

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenId((current) => (current === order.id ? null : current));
                    }}
                    className="inline-flex h-9 items-center justify-center rounded-xl border border-[#dde3ee] bg-white px-3 text-sm font-semibold text-[#111827] transition hover:bg-[#f8fafc]"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : null}
          </article>
        );
      })}

      {list.length === 0 ? (
        <div className="rounded-[24px] border border-[#dde3ee] bg-white p-6 text-center text-sm text-[#98a2b3] shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          {isPending ? "Updating orders..." : "No orders found"}
        </div>
      ) : null}
    </section>
  );
}
