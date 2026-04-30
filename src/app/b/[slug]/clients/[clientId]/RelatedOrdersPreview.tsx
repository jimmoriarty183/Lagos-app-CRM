"use client";

import * as React from "react";
import { PreviewDrawer } from "@/app/b/[slug]/_components/preview/PreviewDrawer";
import { formatDisplayOrderNumber } from "@/lib/orders/display";

type OrderRow = {
  id: string | number;
  order_number: number | null;
  amount: number | string | null;
  status: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string | null;
  contact_id: string | null;
};

type OrderPreview = {
  id: string;
  orderNumber: number | null;
  displayOrderNumber?: string;
  clientType: "individual" | "company" | null;
  clientDisplayName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  contactDisplayName: string | null;
  contactRole: string | null;
  managerName: string | null;
  amount: number;
  status: string;
  createdAt: string;
  dueDate: string | null;
  description: string | null;
};

function formatDate(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  if (!text) return "—";
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;
  return parsed.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatDateTime(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  if (!text) return "—";
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;
  return parsed.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function normalizeStatus(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function StatusChip({ status }: { status: string | null }) {
  const normalized = normalizeStatus(status);
  if (!normalized) {
    return (
      <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-white/70">
        Unknown
      </span>
    );
  }

  const classes =
    normalized === "PAID"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : normalized === "CANCELLED" || normalized === "CANCELED"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${classes}`}
    >
      {normalized}
    </span>
  );
}

export function RelatedOrdersPreview({
  orders,
  slug,
  businessId,
}: {
  orders: OrderRow[];
  slug: string;
  businessId: string;
}) {
  const normalizedOrders = React.useMemo(
    () => orders.map((order) => ({ ...order, id: String(order.id) })),
    [orders],
  );
  const [openOrderId, setOpenOrderId] = React.useState<string | null>(null);
  const [orderPreview, setOrderPreview] = React.useState<OrderPreview | null>(
    null,
  );
  const [isOrderLoading, setIsOrderLoading] = React.useState(false);
  const [orderError, setOrderError] = React.useState<string | null>(null);
  const requestRef = React.useRef(0);
  const selectedOrder = React.useMemo(
    () => normalizedOrders.find((order) => order.id === openOrderId) ?? null,
    [openOrderId, normalizedOrders],
  );

  const loadOrderPreview = React.useCallback(
    (targetOrderId: string) => {
      const requestId = ++requestRef.current;
      const controller = new AbortController();
      setIsOrderLoading(true);
      setOrderError(null);
      const timeout = window.setTimeout(
        () => controller.abort("timeout"),
        9000,
      );

      void (async () => {
        try {
          const res = await fetch(
            `/api/orders/${encodeURIComponent(targetOrderId)}/preview?business_id=${encodeURIComponent(businessId)}`,
            {
              cache: "no-store",
              credentials: "same-origin",
              signal: controller.signal,
            },
          );
          const data = (await res.json().catch(() => ({}))) as OrderPreview & {
            error?: string;
          };
          if (requestId !== requestRef.current) return;
          if (!res.ok) {
            setOrderPreview(null);
            setOrderError(data.error || "Failed to load order preview");
            return;
          }
          setOrderPreview(data);
        } catch (error) {
          if (requestId !== requestRef.current) return;
          setOrderPreview(null);
          setOrderError(
            error instanceof Error &&
              String(error.message || "")
                .toLowerCase()
                .includes("abort")
              ? "Preview request timed out"
              : "Failed to load order preview",
          );
        } finally {
          if (requestId === requestRef.current) setIsOrderLoading(false);
          window.clearTimeout(timeout);
        }
      })();

      return () => {
        window.clearTimeout(timeout);
        controller.abort();
      };
    },
    [businessId],
  );

  React.useEffect(() => {
    if (!openOrderId) {
      setOrderPreview(null);
      setOrderError(null);
      return;
    }
    return loadOrderPreview(openOrderId);
  }, [loadOrderPreview, openOrderId]);

  return (
    <>
      {normalizedOrders.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-white/55">No linked orders yet.</p>
      ) : (
        <div className="mt-3 overflow-hidden rounded-xl bg-slate-50/70">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-white/10">
            <thead className="bg-slate-50 dark:bg-white/[0.04]">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-white/55">
                  Order
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-white/55">
                  Amount
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-white/55">
                  Status
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-white/55">
                  Due
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-white/55">
                  Preview
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10 bg-white dark:bg-white/[0.03]">
              {normalizedOrders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => setOpenOrderId(String(order.id))}
                  className="cursor-pointer transition hover:bg-[#F8FAFF]"
                >
                  <td className="px-3 py-2 text-sm text-slate-700 dark:text-white/80">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenOrderId(String(order.id));
                      }}
                      className="font-semibold text-[var(--brand-700)] hover:underline"
                    >
                      {formatDisplayOrderNumber({
                        orderNumber: order.order_number,
                        orderId: order.id,
                      })}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-sm text-slate-700 dark:text-white/80">
                    {formatMoney(order.amount)}
                  </td>
                  <td className="px-3 py-2 text-sm text-slate-700 dark:text-white/80">
                    <StatusChip status={order.status} />
                  </td>
                  <td className="px-3 py-2 text-sm text-slate-700 dark:text-white/80">
                    {formatDate(order.due_date)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenOrderId(String(order.id));
                      }}
                      className="inline-flex h-8 items-center rounded-lg border border-[var(--brand-200)] bg-[var(--brand-50)] px-3 text-xs font-semibold text-[var(--brand-700)]"
                    >
                      Preview
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PreviewDrawer
        open={Boolean(openOrderId)}
        onClose={() => setOpenOrderId(null)}
        title={
          orderPreview
            ? `Order ${orderPreview.displayOrderNumber ?? formatDisplayOrderNumber({ orderNumber: orderPreview.orderNumber, orderId: orderPreview.id })}`
            : selectedOrder
              ? `Order ${formatDisplayOrderNumber({ orderNumber: selectedOrder.order_number, orderId: selectedOrder.id })}`
              : "Order preview"
        }
        subtitle={
          orderPreview
            ? `${orderPreview.clientDisplayName} • ${orderPreview.status}`
            : selectedOrder
              ? `${String(selectedOrder.status ?? "").trim() || "Unknown"} • Due ${formatDate(selectedOrder.due_date)}`
              : "Loading…"
        }
        footerHref={
          openOrderId ? `/b/${slug}?focusOrder=${openOrderId}` : undefined
        }
        footerLabel="Open full page"
      >
        {orderPreview ? (
          <>
            <CardRow label="Client" value={orderPreview.clientDisplayName} />
            <CardRow
              label="Client type"
              value={orderPreview.clientType || "—"}
            />
            <CardRow
              label="Contact"
              value={
                orderPreview.contactDisplayName
                  ? `Contact: ${orderPreview.contactDisplayName}${orderPreview.contactRole ? ` — ${orderPreview.contactRole}` : ""}`
                  : "—"
              }
            />
            <CardRow
              label="Manager"
              value={orderPreview.managerName || "Unassigned"}
            />
            <CardRow label="Amount" value={formatMoney(orderPreview.amount)} />
            <CardRow label="Status" value={orderPreview.status || "—"} />
            <CardRow
              label="Created date"
              value={formatDateTime(orderPreview.createdAt)}
            />
            <CardRow
              label="Due date"
              value={formatDate(orderPreview.dueDate)}
            />
            <CardRow
              label="Description"
              value={orderPreview.description || "—"}
            />
          </>
        ) : selectedOrder ? (
          <div className="space-y-3">
            <CardRow label="Amount" value={formatMoney(selectedOrder.amount)} />
            <CardRow
              label="Status"
              value={String(selectedOrder.status ?? "").trim() || "—"}
            />
            <CardRow
              label="Due date"
              value={formatDate(selectedOrder.due_date)}
            />
            <div className="rounded-2xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 text-sm text-[#667085]">
              {isOrderLoading
                ? "Loading full order details…"
                : orderError
                  ? orderError
                  : "Order preview unavailable"}
              {!isOrderLoading && openOrderId ? (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => loadOrderPreview(openOrderId)}
                    className="inline-flex h-8 items-center rounded-lg border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-xs font-semibold text-[#374151] hover:border-[#C7D2FE] dark:hover:border-[var(--brand-500)]/40"
                  >
                    Retry
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 text-sm text-[#667085]">
            {isOrderLoading
              ? "Loading order preview…"
              : orderError
                ? orderError
                : "Order preview unavailable"}
            {!isOrderLoading && openOrderId ? (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => loadOrderPreview(openOrderId)}
                  className="inline-flex h-8 items-center rounded-lg border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-xs font-semibold text-[#374151] hover:border-[#C7D2FE] dark:hover:border-[var(--brand-500)]/40"
                >
                  Retry
                </button>
              </div>
            ) : null}
          </div>
        )}
      </PreviewDrawer>
    </>
  );
}

function CardRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF] dark:text-white/40">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-[#111827]">{value}</div>
    </div>
  );
}
