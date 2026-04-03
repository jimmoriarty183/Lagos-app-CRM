"use client";

import * as React from "react";
import Link from "next/link";
import { PreviewDrawer } from "@/app/b/[slug]/_components/preview/PreviewDrawer";
import { formatDisplayOrderNumber } from "@/lib/orders/display";

type ClientListRow = {
  id: string | number;
  client_type: "individual" | "company";
  resolved_name: string;
  resolved_email: string | null;
  resolved_phone: string | null;
  resolved_postcode: string | null;
  current_manager_name: string | null;
  contacts_count: number;
  orders_count: number;
  turnover_total: number;
  last_order_at: string | null;
  updated_at: string;
};

type Props = {
  rows: ClientListRow[];
  slug: string;
  businessId: string;
  mobileOnly?: boolean;
};

type ClientPreview = {
  id: string;
  clientType: "individual" | "company";
  displayName: string;
  email: string | null;
  phone: string | null;
  postcode: string | null;
  managerName: string | null;
  registrationNumber: string | null;
  vatNumber: string | null;
  contacts: Array<{
    id: string;
    fullName: string;
    jobTitle: string | null;
    email: string | null;
    phone: string | null;
    isPrimary: boolean;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: number | null;
    amount: number;
    status: string;
    createdAt: string;
    dueDate: string | null;
  }>;
  updatedAt: string;
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

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function ClientDirectoryList({ rows, slug, businessId, mobileOnly = false }: Props) {
  const normalizedRows = React.useMemo(
    () => rows.map((row) => ({ ...row, id: String(row.id) })),
    [rows],
  );
  const [openClientId, setOpenClientId] = React.useState<string | null>(null);
  const [clientPreview, setClientPreview] = React.useState<ClientPreview | null>(null);
  const [isClientLoading, setIsClientLoading] = React.useState(false);
  const [clientError, setClientError] = React.useState<string | null>(null);
  const [clientReloadToken, setClientReloadToken] = React.useState(0);
  const [openOrderId, setOpenOrderId] = React.useState<string | null>(null);
  const [orderPreview, setOrderPreview] = React.useState<OrderPreview | null>(null);
  const [isOrderLoading, setIsOrderLoading] = React.useState(false);
  const [orderError, setOrderError] = React.useState<string | null>(null);
  const [orderReloadToken, setOrderReloadToken] = React.useState(0);
  const clientRequestRef = React.useRef(0);
  const orderRequestRef = React.useRef(0);
  const selectedClientRow = React.useMemo(
    () => normalizedRows.find((row) => row.id === openClientId) ?? null,
    [normalizedRows, openClientId],
  );

  React.useEffect(() => {
    if (!openClientId) {
      setClientPreview(null);
      setClientError(null);
      return;
    }
    const requestId = ++clientRequestRef.current;
    const controller = new AbortController();
    setIsClientLoading(true);
    setClientError(null);
    const timeout = window.setTimeout(() => controller.abort("timeout"), 9000);
    void (async () => {
      try {
        const res = await fetch(
          `/api/clients/${encodeURIComponent(openClientId)}/preview?business_id=${encodeURIComponent(businessId)}`,
          { cache: "no-store", credentials: "same-origin", signal: controller.signal },
        );
        const data = (await res.json().catch(() => ({}))) as ClientPreview & { error?: string };
        if (requestId !== clientRequestRef.current) return;
        if (!res.ok) {
          setClientPreview(null);
          setClientError(data.error || "Failed to load client preview");
          return;
        }
        setClientPreview(data);
      } catch (error) {
        if (requestId !== clientRequestRef.current) return;
        setClientPreview(null);
        setClientError(
          error instanceof Error && String(error.message || "").toLowerCase().includes("abort")
            ? "Preview request timed out"
            : "Failed to load client preview",
        );
      } finally {
        if (requestId === clientRequestRef.current) setIsClientLoading(false);
        window.clearTimeout(timeout);
      }
    })();
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [businessId, openClientId, clientReloadToken]);

  React.useEffect(() => {
    if (!openOrderId) {
      setOrderPreview(null);
      setOrderError(null);
      return;
    }
    const requestId = ++orderRequestRef.current;
    const controller = new AbortController();
    setIsOrderLoading(true);
    setOrderError(null);
    const timeout = window.setTimeout(() => controller.abort("timeout"), 9000);
    void (async () => {
      try {
        const res = await fetch(
          `/api/orders/${encodeURIComponent(openOrderId)}/preview?business_id=${encodeURIComponent(businessId)}`,
          { cache: "no-store", credentials: "same-origin", signal: controller.signal },
        );
        const data = (await res.json().catch(() => ({}))) as OrderPreview & { error?: string };
        if (requestId !== orderRequestRef.current) return;
        if (!res.ok) {
          setOrderPreview(null);
          setOrderError(data.error || "Failed to load order preview");
          return;
        }
        setOrderPreview(data);
      } catch (error) {
        if (requestId !== orderRequestRef.current) return;
        setOrderPreview(null);
        setOrderError(
          error instanceof Error && String(error.message || "").toLowerCase().includes("abort")
            ? "Preview request timed out"
            : "Failed to load order preview",
        );
      } finally {
        if (requestId === orderRequestRef.current) setIsOrderLoading(false);
        window.clearTimeout(timeout);
      }
    })();
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [businessId, openOrderId, orderReloadToken]);

  return (
    <>
      {!mobileOnly ? (
        <div className="overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E5E7EB]">
            <thead className="bg-[#F9FAFB]">
              <tr>
                <HeaderCell>Client</HeaderCell>
                <HeaderCell>Type</HeaderCell>
                <HeaderCell>Manager</HeaderCell>
                <HeaderCell>Contacts</HeaderCell>
                <HeaderCell>Orders</HeaderCell>
                <HeaderCell>Turnover</HeaderCell>
                <HeaderCell>Last order</HeaderCell>
                <HeaderCell>Updated</HeaderCell>
                <HeaderCell />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] bg-white">
              {normalizedRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-500">
                    No clients matched current filters.
                  </td>
                </tr>
              ) : (
                normalizedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-[#FAFBFF]">
                    <Cell>
                      <div className="font-semibold text-slate-900">{row.resolved_name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {row.resolved_email || row.resolved_phone || row.resolved_postcode || "No contact data"}
                      </div>
                    </Cell>
                    <Cell>
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
                        {row.client_type}
                      </span>
                    </Cell>
                    <Cell>{row.current_manager_name || "Unassigned"}</Cell>
                    <Cell>{String(row.contacts_count)}</Cell>
                    <Cell>{String(row.orders_count)}</Cell>
                    <Cell>{formatMoney(row.turnover_total)}</Cell>
                    <Cell>{formatDate(row.last_order_at)}</Cell>
                    <Cell>{formatDateTime(row.updated_at)}</Cell>
                    <Cell>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setOpenClientId(String(row.id))}
                          className="inline-flex h-8 items-center rounded-lg border border-[var(--brand-200)] bg-[var(--brand-50)] px-3 text-xs font-semibold text-[var(--brand-700)] transition hover:border-[var(--brand-300)]"
                        >
                          Preview
                        </button>
                        <Link
                          href={`/b/${slug}/clients/${String(row.id)}`}
                          className="inline-flex h-8 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                        >
                          Open
                        </Link>
                      </div>
                    </Cell>
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="space-y-4 lg:hidden">
        {normalizedRows.map((row) => (
          <article
            key={row.id}
            className="rounded-[20px] border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">{row.resolved_name}</div>
                <div className="mt-1 text-xs text-slate-500">{row.client_type}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpenClientId(String(row.id))}
                  className="inline-flex h-8 items-center rounded-lg border border-[var(--brand-200)] bg-[var(--brand-50)] px-3 text-xs font-semibold text-[var(--brand-700)]"
                >
                  Preview
                </button>
                <Link
                  href={`/b/${slug}/clients/${String(row.id)}`}
                  className="inline-flex h-8 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700"
                >
                  Open
                </Link>
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <Stat label="Manager" value={row.current_manager_name || "Unassigned"} />
              <Stat label="Orders" value={String(row.orders_count)} />
              <Stat label="Turnover" value={formatMoney(row.turnover_total)} />
              <Stat label="Contacts" value={String(row.contacts_count)} />
              <Stat label="Last order" value={formatDate(row.last_order_at)} />
            </dl>
          </article>
        ))}
      </div>

      <PreviewDrawer
        open={Boolean(openClientId)}
        onClose={() => setOpenClientId(null)}
        title={clientPreview?.displayName || selectedClientRow?.resolved_name || "Client preview"}
        subtitle={
          clientPreview
            ? `${clientPreview.clientType.toUpperCase()} • ${clientPreview.email || "No email"} • ${clientPreview.phone || "No phone"}`
            : selectedClientRow
              ? `${selectedClientRow.client_type.toUpperCase()} • ${selectedClientRow.resolved_email || "No email"} • ${selectedClientRow.resolved_phone || "No phone"}`
              : "Loading…"
        }
        footerHref={openClientId ? `/b/${slug}/clients/${openClientId}` : undefined}
        footerLabel="Open full page"
      >
        {clientPreview ? (
          <>
            <CardRow label="Current manager" value={clientPreview.managerName || "Unassigned"} />
            <CardRow label="Postcode" value={clientPreview.postcode || "—"} />
            {clientPreview.clientType === "company" ? (
              <>
                <CardRow label="Registration number" value={clientPreview.registrationNumber || "—"} />
                <CardRow label="VAT number" value={clientPreview.vatNumber || "—"} />
              </>
            ) : null}

            {clientPreview.clientType === "company" ? (
              <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
                <div className="text-sm font-semibold text-[#111827]">Key contacts</div>
                {clientPreview.contacts.length === 0 ? (
                  <div className="mt-2 text-sm text-[#667085]">No active contacts</div>
                ) : (
                  <div className="mt-2 space-y-2">
                    {clientPreview.contacts.map((contact) => (
                      <div key={contact.id} className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                        <div className="text-sm font-semibold text-[#111827]">
                          {contact.fullName}
                          {contact.isPrimary ? (
                            <span className="ml-2 inline-flex items-center rounded-full border border-[var(--brand-200)] bg-[var(--brand-50)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--brand-700)]">
                              Primary
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 text-xs text-[#667085]">
                          {[contact.jobTitle, contact.email, contact.phone].filter(Boolean).join(" • ")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
              <div className="text-sm font-semibold text-[#111827]">Recent orders</div>
              {clientPreview.recentOrders.length === 0 ? (
                <div className="mt-2 text-sm text-[#667085]">No linked orders</div>
              ) : (
                <div className="mt-2 space-y-2">
                  {clientPreview.recentOrders.map((order) => (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => setOpenOrderId(String(order.id))}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-left transition hover:border-[#C7D2FE]"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-[#111827]">
                          {formatDisplayOrderNumber({ orderNumber: order.orderNumber, orderId: order.id })}
                        </span>
                        <span className="block text-xs text-[#667085]">
                          {order.status} • Due {formatDate(order.dueDate)}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-[#111827]">
                        {formatMoney(order.amount)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 text-sm text-[#667085]">
            {isClientLoading
              ? "Loading client preview…"
              : clientError || "Client preview unavailable"}
            {!isClientLoading && openClientId ? (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setClientReloadToken((v) => v + 1)}
                  className="inline-flex h-8 items-center rounded-lg border border-[#E5E7EB] bg-white px-3 text-xs font-semibold text-[#374151] hover:border-[#C7D2FE]"
                >
                  Retry
                </button>
              </div>
            ) : null}
          </div>
        )}
      </PreviewDrawer>

      <PreviewDrawer
        open={Boolean(openOrderId)}
        onClose={() => setOpenOrderId(null)}
        title={orderPreview ? `Order ${orderPreview.displayOrderNumber ?? formatDisplayOrderNumber({ orderNumber: orderPreview.orderNumber, orderId: orderPreview.id })}` : "Order preview"}
        subtitle={
          orderPreview
            ? `${orderPreview.clientDisplayName} • ${orderPreview.status}`
            : isOrderLoading
              ? "Loading…"
              : orderError || "Preview unavailable"
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
            <CardRow label="Created" value={formatDateTime(orderPreview.createdAt)} />
            <CardRow label="Due date" value={formatDate(orderPreview.dueDate)} />
            <CardRow label="Description" value={orderPreview.description || "—"} />
          </>
        ) : (
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 text-sm text-[#667085]">
            {isOrderLoading
              ? "Loading order preview…"
              : orderError || "Order preview unavailable"}
            {!isOrderLoading && openOrderId ? (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setOrderReloadToken((v) => v + 1)}
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

function HeaderCell({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
      {children}
    </th>
  );
}

function Cell({ children }: { children?: React.ReactNode }) {
  return <td className="px-4 py-3 text-sm text-slate-700">{children}</td>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
      <dt className="text-[11px] font-medium text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-xs font-semibold text-slate-900">{value}</dd>
    </div>
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
