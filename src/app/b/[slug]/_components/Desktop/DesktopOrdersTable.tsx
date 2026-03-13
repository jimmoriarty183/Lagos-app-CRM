"use client";

import React, { useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { StatusCell } from "../../InlineCells";
import { OrderChecklist } from "../../OrderChecklist";
import { OrderComments } from "../../OrderComments";
import Button from "../../Button";

type Status =
  | "NEW"
  | "IN_PROGRESS"
  | "WAITING_PAYMENT"
  | "DONE"
  | "CANCELED"
  | "DUPLICATE";

type OrderRow = {
  id: string;
  client_name: string;
  client_phone: string | null;
  amount: number;
  description: string | null;
  due_date: string | null;
  status: Status;
  order_number: number | null;
  created_at: string;
};

type UserRole = "OWNER" | "MANAGER" | "GUEST";
type Range = "ALL" | "today" | "week" | "month" | "year";

function fmtAmount(n: number) {
  return new Intl.NumberFormat("uk-UA").format(n);
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M10.6 10.6A3 3 0 0 0 13.4 13.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M6.2 6.2C4 8 2.5 10.5 2.5 12c0 0 3.5 7 9.5 7 1.9 0 3.6-.5 5-1.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 5.3A10.4 10.4 0 0 1 12 5c6 0 9.5 7 9.5 7 0 0-1.1 2.2-3.2 4.1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Props = {
  list: OrderRow[];
  todayISO: string;
  businessSlug: string;
  businessId: string;
  phoneRaw: string;
  searchQuery: string;
  statusFilter: "ALL" | "OVERDUE" | Status;
  rangeFilter: Range;
  actorFilter: string;
  clearHref: string;
  hasActiveFilters: boolean;
  canManage: boolean;
  canEdit: boolean;
  userRole: UserRole;
};

export default function DesktopOrdersTable({
  list,
  todayISO,
  businessSlug,
  businessId,
  phoneRaw,
  searchQuery,
  statusFilter,
  rangeFilter,
  actorFilter,
  clearHref,
  hasActiveFilters,
  canManage,
  canEdit,
  userRole,
}: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const eyeRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  const rows = useMemo(() => list ?? [], [list]);

  const togglePreview = (id: string) => {
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const closePreview = (id: string) => {
    setOpen((prev) => ({ ...prev, [id]: false }));
  };

  return (
    <div className="min-w-0 overflow-hidden rounded-3xl border border-[#dde3ee] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="border-b border-[#eef2f7] px-5 py-4">
        <form method="get" className="flex items-center gap-3">
          <input type="hidden" name="u" defaultValue={phoneRaw} />
          <input type="hidden" name="page" defaultValue="1" />
          <input type="hidden" name="status" defaultValue={statusFilter} />
          <input type="hidden" name="range" defaultValue={rangeFilter} />
          <input type="hidden" name="actor" defaultValue={actorFilter} />

          <input
            name="q"
            defaultValue={searchQuery}
            placeholder="Name, phone, amount..."
            className="h-10 w-full rounded-2xl border border-[#dde3ee] bg-[#f8fafc] px-4 text-sm outline-none transition placeholder:text-[#98a2b3] focus:border-[#111827] focus:bg-white focus:ring-2 focus:ring-[#111827]/10"
          />

          <Button
            type="submit"
            size="sm"
            style={{
              height: 32,
              minWidth: 72,
              borderRadius: 10,
              padding: "0 12px",
              fontSize: 12,
              boxShadow: "none",
            }}
          >
            Search
          </Button>

          {hasActiveFilters ? (
            <a
              href={clearHref}
              className="shrink-0 rounded-full border border-[#dde3ee] px-3 py-1.5 text-xs font-medium text-[#667085] transition hover:border-[#cfd8e6] hover:text-[#111827]"
            >
              Reset
            </a>
          ) : null}
        </form>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[#eef2f7] text-left">
              <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                Client
              </th>
              <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
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
            {rows.map((o) => {
              const dueISO = o.due_date ? String(o.due_date).slice(0, 10) : null;
              const isOverdue =
                !!dueISO &&
                dueISO < todayISO &&
                (o.status === "NEW" || o.status === "IN_PROGRESS");
              const opened = !!open[o.id];

              return (
                <React.Fragment key={o.id}>
                  <tr
                    className="cursor-pointer border-b border-[#f2f4f7] transition-colors hover:bg-[#fbfcfe]"
                    onClick={() => eyeRefs.current[o.id]?.click()}
                  >
                    <td className="px-5 py-4 align-top">
                      <div className="mb-1 text-[10px] font-medium text-[#98a2b3]">
                        <strong className="font-semibold text-[#667085]">
                          Order #{o.order_number ?? "-"}
                        </strong>{" "}
                        <span className="text-[#d0d5dd]">•</span> Created:{" "}
                        {new Date(o.created_at).toLocaleString("en-NG", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>

                      <div className="text-sm font-semibold text-[#111827]">{o.client_name}</div>

                      {o.client_phone ? (
                        <div className="text-xs text-[#98a2b3]">{o.client_phone}</div>
                      ) : null}
                    </td>

                    <td className="px-5 py-4 align-top text-sm font-bold tabular-nums text-[#364153]">
                      {fmtAmount(Number(o.amount))}
                    </td>

                    <td className="px-5 py-4 align-top">
                      <div
                        className={
                          isOverdue
                            ? "text-sm font-semibold text-[#ef4444]"
                            : "text-sm text-[#667085]"
                        }
                      >
                        {o.due_date || "—"}
                      </div>
                      {isOverdue ? (
                        <div className="text-[10px] text-[#ef4444]/80">Overdue</div>
                      ) : null}
                    </td>

                    <td className="px-5 py-4 align-top">
                      <div className="inline-flex" onClick={(e) => e.stopPropagation()}>
                        <StatusCell orderId={o.id} value={o.status} canManage={canManage} />
                      </div>
                    </td>

                    <td
                      className="px-5 py-4 align-top text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-2">
                        <button
                          ref={(el) => {
                            eyeRefs.current[o.id] = el;
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePreview(o.id);
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#dde3ee] bg-white transition-colors hover:bg-[#f8fafc]"
                          aria-label={opened ? "Hide preview" : "Show preview"}
                          title={opened ? "Hide preview" : "Show preview"}
                          type="button"
                        >
                          {opened ? (
                            <EyeOffIcon className="h-4 w-4 text-[#667085]" />
                          ) : (
                            <EyeIcon className="h-4 w-4 text-[#667085]" />
                          )}
                        </button>

                        {canEdit ? (
                          <a
                            href={`/b/${businessSlug}/o/${o.id}?u=${encodeURIComponent(phoneRaw)}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex h-8 items-center justify-center rounded-full border border-transparent px-3 text-xs font-semibold text-[#364153] transition-colors hover:bg-[#f5f7fb]"
                          >
                            Edit
                          </a>
                        ) : (
                          <span className="text-[#98a2b3]">—</span>
                        )}
                      </div>
                    </td>
                  </tr>

                  {opened ? (
                    <tr className="border-b border-[#f2f4f7]">
                      <td colSpan={5} className="px-5 pb-5">
                        <div
                          className="mt-2 rounded-2xl border border-[#dde3ee] bg-[#fcfdff] p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">
                                Description
                              </div>

                              <div className="mt-2 whitespace-pre-wrap break-words text-sm text-[#364153]">
                                {o.description && o.description.trim().length > 0
                                  ? o.description
                                  : "No description"}
                              </div>

                              <OrderChecklist
                                order={{ id: o.id, business_id: businessId }}
                                supabase={supabase}
                              />

                              <OrderComments
                                order={{ id: o.id, business_id: businessId }}
                                supabase={supabase}
                                author={{
                                  phone: phoneRaw,
                                  role: userRole,
                                }}
                              />
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                closePreview(o.id);
                              }}
                              className="inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-[#dde3ee] bg-white px-3 text-sm font-semibold text-[#111827] transition-colors hover:bg-[#f8fafc]"
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
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-[#98a2b3]">
                  No orders found
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
