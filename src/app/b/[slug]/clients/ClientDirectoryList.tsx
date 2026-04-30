"use client";

import * as React from "react";
import Link from "next/link";
import { PreviewDrawer } from "@/app/b/[slug]/_components/preview/PreviewDrawer";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
  currentPage: number;
  totalPages: number;
  perPage: number;
  q: string;
  manager: string;
  type: string;
  phoneRaw?: string;
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

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function ClientTypeBadge({ type }: { type: "individual" | "company" }) {
  const cls =
    type === "company"
      ? "border-violet-200 bg-violet-50 text-violet-700"
      : "border-teal-200 bg-teal-50 text-teal-700";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.08em] ${cls}`}
    >
      {type}
    </span>
  );
}

const PAGE_SIZE_OPTIONS = [20, 50, 100, 500] as const;

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

export function ClientDirectoryList({
  rows,
  slug,
  businessId,
  mobileOnly = false,
  currentPage,
  totalPages,
  perPage,
  q,
  manager,
  type,
  phoneRaw,
}: Props) {
  const normalizedRows = React.useMemo(
    () => rows.map((row) => ({ ...row, id: String(row.id) })),
    [rows],
  );
  const [openClientId, setOpenClientId] = React.useState<string | null>(null);
  const [clientPreview, setClientPreview] =
    React.useState<ClientPreview | null>(null);
  const [isClientLoading, setIsClientLoading] = React.useState(false);
  const [clientError, setClientError] = React.useState<string | null>(null);
  const [clientReloadToken, setClientReloadToken] = React.useState(0);
  const [openOrderId, setOpenOrderId] = React.useState<string | null>(null);
  const [orderPreview, setOrderPreview] = React.useState<OrderPreview | null>(
    null,
  );
  const [isOrderLoading, setIsOrderLoading] = React.useState(false);
  const [orderError, setOrderError] = React.useState<string | null>(null);
  const [orderReloadToken, setOrderReloadToken] = React.useState(0);
  const clientRequestRef = React.useRef(0);
  const orderRequestRef = React.useRef(0);
  const selectedClientRow = React.useMemo(
    () => normalizedRows.find((row) => row.id === openClientId) ?? null,
    [normalizedRows, openClientId],
  );
  const pageItems = React.useMemo(
    () => getPaginationItems(currentPage, totalPages),
    [currentPage, totalPages],
  );
  const hasActiveFilters = React.useMemo(() => {
    const normalizedQ = String(q ?? "").trim();
    const normalizedManager = String(manager ?? "")
      .trim()
      .toLowerCase();
    const normalizedType = String(type ?? "")
      .trim()
      .toLowerCase();
    return Boolean(normalizedQ) || normalizedManager !== "all" || normalizedType !== "all";
  }, [manager, q, type]);
  const emptyStateText = hasActiveFilters
    ? "No clients match the current filters."
    : "No clients yet. Add your first client to get started.";

  const buildHref = React.useCallback(
    (page: number, nextPerPage = perPage) => {
      const params = new URLSearchParams();
      const normalizedQ = String(q ?? "").trim();
      const normalizedManager = String(manager ?? "")
        .trim()
        .toLowerCase();
      const normalizedType = String(type ?? "")
        .trim()
        .toLowerCase();
      const normalizedPhoneRaw = String(phoneRaw ?? "").trim();

      if (normalizedPhoneRaw) params.set("u", normalizedPhoneRaw);
      if (normalizedQ) params.set("q", normalizedQ);
      if (normalizedManager && normalizedManager !== "all") {
        params.set("manager", normalizedManager);
      }
      if (normalizedType && normalizedType !== "all") {
        params.set("type", normalizedType);
      }

      params.set("page", String(page));
      params.set("perPage", String(nextPerPage));

      const query = params.toString();
      return query ? `/b/${slug}/clients?${query}` : `/b/${slug}/clients`;
    },
    [manager, perPage, phoneRaw, q, slug, type],
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
          {
            cache: "no-store",
            credentials: "same-origin",
            signal: controller.signal,
          },
        );
        const data = (await res.json().catch(() => ({}))) as ClientPreview & {
          error?: string;
        };
        if (requestId !== clientRequestRef.current) return;
        if (!res.ok) {
          setClientPreview(null);
          const errMsg =
            typeof data.error === "string" &&
            data.error.length < 300 &&
            !data.error.trimStart().startsWith("<")
              ? data.error
              : "Failed to load client preview";
          setClientError(errMsg);
          return;
        }
        setClientPreview(data);
      } catch (error) {
        if (requestId !== clientRequestRef.current) return;
        setClientPreview(null);
        setClientError(
          error instanceof Error &&
            String(error.message || "")
              .toLowerCase()
              .includes("abort")
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
          {
            cache: "no-store",
            credentials: "same-origin",
            signal: controller.signal,
          },
        );
        const data = (await res.json().catch(() => ({}))) as OrderPreview & {
          error?: string;
        };
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
          error instanceof Error &&
            String(error.message || "")
              .toLowerCase()
              .includes("abort")
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
        <div className="overflow-hidden rounded-[24px] border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E5E7EB]">
              <thead className="bg-[#F9FAFB] dark:bg-white/[0.04]">
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
              <tbody className="divide-y divide-[#E5E7EB] bg-white dark:bg-white/[0.03]">
                {normalizedRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-10 text-center text-sm text-slate-500 dark:text-white/55"
                    >
                      {emptyStateText}
                    </td>
                  </tr>
                ) : (
                  normalizedRows.map((row) => (
                    <tr key={row.id} className="hover:bg-[#FAFBFF]">
                      <Cell>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {row.resolved_name}
                        </div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-white/55">
                          {row.resolved_email ||
                            row.resolved_phone ||
                            row.resolved_postcode ||
                            "No contact data"}
                        </div>
                      </Cell>
                      <Cell>
                        <ClientTypeBadge type={row.client_type} />
                      </Cell>
                      <Cell>{row.current_manager_name || "Unassigned"}</Cell>
                      <Cell>{String(row.contacts_count)}</Cell>
                      <Cell>{String(row.orders_count)}</Cell>
                      <Cell>{formatMoney(row.turnover_total)}</Cell>
                      <Cell>{formatDate(row.last_order_at)}</Cell>
                      <Cell>{formatDateTime(row.updated_at)}</Cell>
                      <td className="whitespace-nowrap py-3 pl-2 pr-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setOpenClientId(String(row.id))}
                            className="inline-flex h-8 items-center rounded-lg border border-[var(--brand-200)] bg-[var(--brand-50)] px-2.5 text-xs font-semibold text-[var(--brand-700)] transition hover:border-[var(--brand-300)]"
                          >
                            Preview
                          </button>
                          <Link
                            href={`/b/${slug}/clients/${String(row.id)}`}
                            className="inline-flex h-8 items-center rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-white/[0.03] px-2.5 text-xs font-semibold text-slate-700 dark:text-white/80 transition hover:border-slate-400 hover:text-slate-900 dark:hover:text-white"
                          >
                            Open
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="space-y-4 lg:hidden">
        {normalizedRows.length === 0 ? (
          <article className="rounded-[20px] border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] p-6 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <p className="text-sm text-slate-500 dark:text-white/55">{emptyStateText}</p>
          </article>
        ) : (
          normalizedRows.map((row) => (
            <article
              key={row.id}
              className="rounded-[20px] border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {row.resolved_name}
                  </div>
                  <div className="mt-1">
                    <ClientTypeBadge type={row.client_type} />
                  </div>
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
                    className="inline-flex h-8 items-center rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-white/[0.03] px-3 text-xs font-semibold text-slate-700 dark:text-white/80"
                  >
                    Open
                  </Link>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <Stat
                  label="Manager"
                  value={row.current_manager_name || "Unassigned"}
                />
                <Stat label="Orders" value={String(row.orders_count)} />
                <Stat label="Turnover" value={formatMoney(row.turnover_total)} />
                <Stat label="Contacts" value={String(row.contacts_count)} />
                <Stat label="Last order" value={formatDate(row.last_order_at)} />
              </dl>
            </article>
          ))
        )}
      </div>

      <div className="mt-4 rounded-[20px] border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <form
            action={`/b/${slug}/clients`}
            className="flex items-center gap-2 text-xs font-medium text-[#6B7280] dark:text-white/55"
          >
            {phoneRaw ? (
              <input type="hidden" name="u" value={phoneRaw} />
            ) : null}
            <input type="hidden" name="q" value={q} />
            <input type="hidden" name="manager" value={manager} />
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="page" value="1" />
            <span>Per page</span>
            <select
              name="perPage"
              defaultValue={String(perPage)}
              onChange={(event) => event.currentTarget.form?.requestSubmit()}
              className="h-9 min-w-[96px] rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] pl-3 pr-8 text-sm font-medium text-[#374151] outline-none transition hover:border-[var(--brand-200)] focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/15"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </form>

          {totalPages > 1 ? (
            <Pagination className="justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href={buildHref(Math.max(1, currentPage - 1))}
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
                    <React.Fragment key={page}>
                      {needsEllipsis ? (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : null}
                      <PaginationItem>
                        <PaginationLink
                          href={buildHref(page)}
                          isActive={page === currentPage}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    </React.Fragment>
                  );
                })}

                <PaginationItem>
                  <PaginationNext
                    href={buildHref(Math.min(totalPages, currentPage + 1))}
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
                    href={buildHref(totalPages)}
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
          ) : null}
        </div>
      </div>

      <PreviewDrawer
        open={Boolean(openClientId)}
        onClose={() => setOpenClientId(null)}
        title={
          clientPreview?.displayName ||
          selectedClientRow?.resolved_name ||
          "Client preview"
        }
        subtitle={
          clientPreview
            ? `${clientPreview.clientType.toUpperCase()} • ${clientPreview.email || "No email"} • ${clientPreview.phone || "No phone"}`
            : selectedClientRow
              ? `${selectedClientRow.client_type.toUpperCase()} • ${selectedClientRow.resolved_email || "No email"} • ${selectedClientRow.resolved_phone || "No phone"}`
              : "Loading…"
        }
        footerHref={
          openClientId ? `/b/${slug}/clients/${openClientId}` : undefined
        }
        footerLabel="Open full page"
      >
        {clientPreview ? (
          <>
            <CardRow
              label="Current manager"
              value={clientPreview.managerName || "Unassigned"}
            />
            <CardRow label="Postcode" value={clientPreview.postcode || "—"} />
            {clientPreview.clientType === "company" ? (
              <>
                <CardRow
                  label="Registration number"
                  value={clientPreview.registrationNumber || "—"}
                />
                <CardRow
                  label="VAT number"
                  value={clientPreview.vatNumber || "—"}
                />
              </>
            ) : null}

            {clientPreview.clientType === "company" ? (
              <section className="rounded-2xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] p-4">
                <div className="text-sm font-semibold text-[#111827]">
                  Key contacts
                </div>
                {clientPreview.contacts.length === 0 ? (
                  <div className="mt-2 text-sm text-[#667085]">
                    No active contacts
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    {clientPreview.contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-[#F9FAFB] dark:bg-white/[0.04] p-3"
                      >
                        <div className="text-sm font-semibold text-[#111827]">
                          {contact.fullName}
                          {contact.isPrimary ? (
                            <span className="ml-2 inline-flex items-center rounded-full border border-[var(--brand-200)] bg-[var(--brand-50)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--brand-700)]">
                              Primary
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 text-xs text-[#667085]">
                          {[contact.jobTitle, contact.email, contact.phone]
                            .filter(Boolean)
                            .join(" • ")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            <section className="rounded-2xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] p-4">
              <div className="text-sm font-semibold text-[#111827]">
                Recent orders
              </div>
              {clientPreview.recentOrders.length === 0 ? (
                <div className="mt-2 text-sm text-[#667085]">
                  No linked orders
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  {clientPreview.recentOrders.map((order) => (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => setOpenOrderId(String(order.id))}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-[#F9FAFB] dark:bg-white/[0.04] px-3 py-2 text-left transition hover:border-[#C7D2FE] dark:hover:border-[var(--brand-500)]/40"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-[#111827]">
                          {formatDisplayOrderNumber({
                            orderNumber: order.orderNumber,
                            orderId: order.id,
                          })}
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
          <div className="rounded-2xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 text-sm text-[#667085]">
            {isClientLoading
              ? "Loading client preview…"
              : clientError || "Client preview unavailable"}
            {!isClientLoading && openClientId ? (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setClientReloadToken((v) => v + 1)}
                  className="inline-flex h-8 items-center rounded-lg border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-xs font-semibold text-[#374151] hover:border-[#C7D2FE] dark:hover:border-[var(--brand-500)]/40"
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
        title={
          orderPreview
            ? `Order ${orderPreview.displayOrderNumber ?? formatDisplayOrderNumber({ orderNumber: orderPreview.orderNumber, orderId: orderPreview.id })}`
            : "Order preview"
        }
        subtitle={
          orderPreview
            ? `${orderPreview.clientDisplayName} • ${orderPreview.status}`
            : isOrderLoading
              ? "Loading…"
              : orderError || "Preview unavailable"
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
              label="Created"
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
        ) : (
          <div className="rounded-2xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 text-sm text-[#667085]">
            {isOrderLoading
              ? "Loading order preview…"
              : orderError || "Order preview unavailable"}
            {!isOrderLoading && openOrderId ? (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setOrderReloadToken((v) => v + 1)}
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

function HeaderCell({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-white/55">
      {children}
    </th>
  );
}

function Cell({ children }: { children?: React.ReactNode }) {
  return <td className="px-4 py-3 text-sm text-slate-700 dark:text-white/80">{children}</td>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] p-2">
      <dt className="text-[11px] font-medium text-slate-500 dark:text-white/55">{label}</dt>
      <dd className="mt-0.5 text-xs font-semibold text-slate-900 dark:text-white">{value}</dd>
    </div>
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
