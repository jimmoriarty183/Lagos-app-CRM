"use client";

import React, { useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { StatusCell } from "../../InlineCells";
import { OrderChecklist } from "../../OrderChecklist";
import { OrderComments } from "../../OrderComments";

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

function fmtAmount(n: number) {
  return new Intl.NumberFormat("uk-UA").format(n);
}

/* ================= Icons ================= */

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      aria-hidden="true"
    >
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
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 3l18 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
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

/* ================= Component ================= */

type Props = {
  list: OrderRow[];
  todayISO: string;
  businessSlug: string;
  businessId: string;
  phoneRaw: string;
  canManage: boolean;
  canEdit: boolean;
  userRole: UserRole; // ✅ ВАЖНО: реальная роль в этом business
};

export default function DesktopOrdersTable({
  list,
  todayISO,
  businessSlug,
  businessId,
  phoneRaw,
  canManage,
  canEdit,
  userRole,
}: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const eyeRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const supabase = useMemo(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const isOpen = (id: string) => !!open[id];

  const togglePreview = (id: string) => {
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const closePreview = (id: string) => {
    setOpen((prev) => ({ ...prev, [id]: false }));
  };

  const rows = useMemo(() => list ?? [], [list]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left border-b border-gray-100">
            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Client
            </th>
            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Amount
            </th>
            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Due
            </th>
            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Status
            </th>
            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">
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

            const opened = isOpen(o.id);

            return (
              <React.Fragment key={o.id}>
                <tr
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => eyeRefs.current[o.id]?.click()}
                >
                  <td className="px-6 py-4 align-top">
                    <div className="text-xs text-gray-500 mb-1">
                      <strong className="text-gray-700">
                        Order #{o.order_number ?? "-"}
                      </strong>{" "}
                      <span className="text-gray-300">·</span> Created:{" "}
                      {new Date(o.created_at).toLocaleString("en-NG", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>

                    <div className="font-semibold text-gray-900">
                      {o.client_name}
                    </div>

                    {o.client_phone ? (
                      <div className="text-xs text-gray-500">
                        {o.client_phone}
                      </div>
                    ) : null}
                  </td>

                  <td className="px-6 py-4 align-top font-extrabold text-gray-900 tabular-nums">
                    {fmtAmount(Number(o.amount))}
                  </td>

                  <td className="px-6 py-4 align-top">
                    <div
                      className={
                        isOverdue
                          ? "text-red-600 font-semibold"
                          : "text-gray-700"
                      }
                    >
                      {o.due_date || "—"}
                    </div>
                    {isOverdue ? (
                      <div className="text-xs text-red-600/80">Overdue</div>
                    ) : null}
                  </td>

                  <td className="px-6 py-4 align-top">
                    <div
                      className="inline-flex"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <StatusCell
                        orderId={o.id}
                        value={o.status}
                        canManage={canManage}
                      />
                    </div>
                  </td>

                  <td
                    className="px-6 py-4 align-top text-right"
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
                        className="h-9 w-10 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                        aria-label={opened ? "Hide preview" : "Show preview"}
                        title={opened ? "Hide preview" : "Show preview"}
                        type="button"
                      >
                        {opened ? (
                          <EyeOffIcon className="h-5 w-5 text-gray-700" />
                        ) : (
                          <EyeIcon className="h-5 w-5 text-gray-700" />
                        )}
                      </button>

                      {canEdit ? (
                        <a
                          href={`/b/${businessSlug}/o/${
                            o.id
                          }?u=${encodeURIComponent(phoneRaw)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="h-9 inline-flex items-center justify-center px-4 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
                        >
                          Edit
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                  </td>
                </tr>

                {opened ? (
                  <tr className="border-b border-gray-100">
                    <td colSpan={5} className="px-6 pb-5">
                      <div
                        className="mt-2 rounded-xl border border-gray-200 bg-white shadow-sm p-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              Description
                            </div>

                            <div className="mt-2 text-sm text-gray-800 whitespace-pre-wrap break-words">
                              {o.description && o.description.trim().length > 0
                                ? o.description
                                : "No description"}
                            </div>

                            {/* ✅ CHECKLIST */}
                            <OrderChecklist
                              order={{ id: o.id, business_id: businessId }}
                              supabase={supabase}
                            />

                            {/* ✅ COMMENTS */}
                            <OrderComments
                              order={{ id: o.id, business_id: businessId }}
                              supabase={supabase}
                              author={{
                                phone: phoneRaw,
                                role: userRole, // ✅ FIX: реальная роль (OWNER/MANAGER/GUEST)
                              }}
                            />
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              closePreview(o.id);
                            }}
                            className="shrink-0 h-8 inline-flex items-center justify-center px-3 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
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
              <td
                colSpan={5}
                className="px-6 py-12 text-center text-sm text-gray-500"
              >
                No orders found
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
