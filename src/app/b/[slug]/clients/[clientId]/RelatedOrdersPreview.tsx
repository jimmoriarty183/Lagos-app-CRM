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
  return parsed.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" });
}

function formatDateTime(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  if (!text) return "—";
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;
  return parsed.toLocaleString("en-GB", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
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
  const [orderPreview, setOrderPreview] = React.useState<OrderPreview | null>(null);
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
      const timeout = window.setTimeout(() => controller.abort("timeout"), 9000);

      void (async () => {
        try {
          const res = await fetch(
            `/api/orders/${encodeURIComponent(targetOrderId)}/preview?business_id=${encodeURIComponent(businessId)}`,
            { cache: "no-store", credentials: "same-origin", signal: controller.signal },
          );
          const data = (await res.json().catch(() => ({}))) as OrderPreview & { error?: string };
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
            error instanceof Error && String(error.message || "").toLowerCase().includes("abort")
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
        <p className="mt-3 text-sm text-slate-500">No linked orders yet.</p>
      ) : (
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Order</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Amount</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Status</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Due</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {normalizedOrders.map((order) => (
                <tr key={order.id}>
                  <td className="px-3 py-2 text-sm text-slate-700">
                    <button
                      type="button"
                      onClick={() => setOpenOrderId(String(order.id))}
                      className="font-semibold text-[var(--brand-700)] hover:underline"
                    >
                      {formatDisplayOrderNumber({ orderNumber: order.order_number, orderId: order.id })}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-sm text-slate-700">{formatMoney(order.amount)}</td>
                  <td className="px-3 py-2 text-sm text-slate-700">{String(order.status ?? "").trim() || "—"}</td>
                  <td className="px-3 py-2 text-sm text-slate-700">{formatDate(order.due_date)}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setOpenOrderId(String(order.id))}
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
        footerHref={openOrderId ? `/b/${slug}?focusOrder=${openOrderId}` : undefined}
        footerLabel="Open full page"
      >
        {orderPreview ? (
          <>
            <CardRow label="Client" value={orderPreview.clientDisplayName} />
            <CardRow label="Client type" value={orderPreview.clientType || "—"} />
            <CardRow label="Contact" value={orderPreview.contactDisplayName ? `Contact: ${orderPreview.contactDisplayName}${orderPreview.contactRole ? ` — ${orderPreview.contactRole}` : ""}` : "—"} />
            <CardRow label="Manager" value={orderPreview.managerName || "Unassigned"} />
            <CardRow label="Amount" value={formatMoney(orderPreview.amount)} />
            <CardRow label="Status" value={orderPreview.status || "—"} />
            <CardRow label="Created date" value={formatDateTime(orderPreview.createdAt)} />
            <CardRow label="Due date" value={formatDate(orderPreview.dueDate)} />
            <CardRow label="Description" value={orderPreview.description || "—"} />
          </>
        ) : selectedOrder ? (
          <div className="space-y-3">
            <CardRow label="Amount" value={formatMoney(selectedOrder.amount)} />
            <CardRow label="Status" value={String(selectedOrder.status ?? "").trim() || "—"} />
            <CardRow label="Due date" value={formatDate(selectedOrder.due_date)} />
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 text-sm text-[#667085]">
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
                    className="inline-flex h-8 items-center rounded-lg border border-[#E5E7EB] bg-white px-3 text-xs font-semibold text-[#374151] hover:border-[#C7D2FE]"
                  >
                    Retry
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 text-sm text-[#667085]">
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
                  className="inline-flex h-8 items-center rounded-lg border border-[#E5E7EB] bg-white px-3 text-xs font-semibold text-[#374151] hover:border-[#C7D2FE]"
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
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[#111827]">{value}</div>
    </div>
  );
}
