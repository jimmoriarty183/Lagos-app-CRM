"use client";

import { useMemo, useState } from "react";
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

export default function MobileOrdersList({
  list = [],
  todayISO,
  businessSlug,
  businessId,
  phoneRaw,
  canManage,
  canEdit,
  userRole,
}: {
  list?: OrderRow[];
  todayISO: string;
  businessSlug: string;
  businessId: string;
  phoneRaw: string;
  canManage: boolean;
  canEdit: boolean;
  userRole: UserRole; // ✅ ВАЖНО: реальная роль в этом business
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const toggle = (id: string) => setOpenId((cur) => (cur === id ? null : id));

  const supabase = useMemo(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  return (
    <div className="mobileOnly grid gap-3">
      {list.map((o) => {
        const isOpen = openId === o.id;

        const editHref = `/b/${businessSlug}/o/${o.id}?u=${encodeURIComponent(
          phoneRaw
        )}`;

        return (
          <div
            key={o.id}
            onClick={() => toggle(o.id)}
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm cursor-pointer"
            style={{ position: "relative", overflow: "visible" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-gray-500 mb-1">
                  <span className="font-semibold text-gray-700">
                    Order #{o.order_number ?? "-"}
                  </span>{" "}
                  <span className="text-gray-300">·</span>{" "}
                  {new Date(o.created_at).toLocaleString("en-NG", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>

                <div className="text-sm font-extrabold text-gray-900 truncate">
                  {o.client_name || "—"}
                </div>

                {o.client_phone ? (
                  <div className="mt-1 text-sm text-gray-600">
                    📞 {o.client_phone}
                  </div>
                ) : null}
              </div>

              <div
                className="flex items-center gap-2"
                style={{
                  position: "relative",
                  zIndex: 20,
                  overflow: "visible",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="inline-flex"
                  style={{
                    position: "relative",
                    zIndex: 20,
                    overflow: "visible",
                  }}
                >
                  <StatusCell
                    orderId={o.id}
                    value={o.status}
                    canManage={canManage}
                  />
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(o.id);
                  }}
                  className="h-9 w-10 inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition"
                  title={isOpen ? "Hide preview" : "Preview"}
                  aria-label={isOpen ? "Hide preview" : "Preview"}
                >
                  {isOpen ? (
                    <EyeOffIcon className="h-5 w-5 text-gray-700" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-700" />
                  )}
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-gray-500">Amount</div>
                <div className="text-lg font-extrabold text-gray-900 tabular-nums">
                  {fmtAmount(Number(o.amount))}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-gray-500">Due</div>
                <div className="font-extrabold text-gray-900">
                  {o.due_date || "—"}
                </div>
                {o.due_date &&
                String(o.due_date).slice(0, 10) < todayISO &&
                (o.status === "NEW" || o.status === "IN_PROGRESS") ? (
                  <div className="text-xs text-red-600/80">Overdue</div>
                ) : null}
              </div>
            </div>

            {isOpen ? (
              <div
                className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 p-3"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-xs font-extrabold text-gray-500">
                  Description
                </div>
                <div className="mt-2 text-sm text-gray-900 whitespace-pre-wrap break-words">
                  {o.description?.trim() ? o.description : "No description"}
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

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenId(null);
                    }}
                    className="h-8 px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-extrabold"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : null}

            <div
              className="mt-3 flex justify-end"
              onClick={(e) => e.stopPropagation()}
            >
              {canEdit ? (
                <a
                  href={editHref}
                  onClick={(e) => e.stopPropagation()}
                  className="h-10 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 inline-flex items-center text-sm font-extrabold text-gray-900"
                >
                  Edit
                </a>
              ) : null}
            </div>
          </div>
        );
      })}

      {list.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center text-sm text-gray-500">
          No orders found
        </div>
      ) : null}
    </div>
  );
}
