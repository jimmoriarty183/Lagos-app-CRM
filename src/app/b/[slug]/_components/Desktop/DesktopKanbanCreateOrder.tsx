"use client";

import React, { useState } from "react";

import DesktopCreateOrder from "./DesktopCreateOrder";
import { createQuickOrderFromForm } from "../../actions";

type Props = {
  businessId: string;
  businessSlug: string;
};

type CreateMode = "quick" | "full" | null;

export default function DesktopKanbanCreateOrder({
  businessId,
  businessSlug,
}: Props) {
  const [mode, setMode] = useState<CreateMode>(null);
  const createQuickOrderAction = createQuickOrderFromForm.bind(null, businessId, businessSlug);

  const inputCls =
    "h-10 w-full min-w-0 rounded-xl border border-[#dde3ee] bg-white px-3 text-sm outline-none transition " +
    "focus:border-[#111827] focus:ring-2 focus:ring-[#111827]/10";

  return (
    <div className="rounded-[22px] border border-dashed border-[#cfd8e6] bg-white/80 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[#111827]">Create order</div>
          <div className="mt-1 text-xs text-[#98a2b3]">Add directly into the New column.</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode((current) => (current === "quick" ? null : "quick"))}
            className={[
              "inline-flex h-9 items-center justify-center rounded-xl border px-3 text-xs font-semibold transition",
              mode === "quick"
                ? "border-[#111827] bg-[#111827] text-white"
                : "border-[#dde3ee] bg-white text-[#344054] hover:border-[#cfd8e6] hover:bg-[#f8fafc]",
            ].join(" ")}
          >
            Quick create
          </button>
          <button
            type="button"
            onClick={() => setMode((current) => (current === "full" ? null : "full"))}
            className={[
              "inline-flex h-9 items-center justify-center rounded-xl border px-3 text-xs font-semibold transition",
              mode === "full"
                ? "border-[#111827] bg-[#111827] text-white"
                : "border-[#dde3ee] bg-white text-[#344054] hover:border-[#cfd8e6] hover:bg-[#f8fafc]",
            ].join(" ")}
          >
            Open full form
          </button>
        </div>
      </div>

      {mode === "quick" ? (
        <form
          action={createQuickOrderAction}
          className="mt-3 grid gap-3"
        >
          <div className="grid gap-3 xl:grid-cols-2">
            <input
              name="first_name"
              placeholder="First name *"
              className={inputCls}
              required
            />
            <input
              name="last_name"
              placeholder="Last name"
              className={inputCls}
            />
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_140px]">
            <input
              name="client_phone"
              placeholder="Phone"
              className={inputCls}
            />
            <input
              name="amount"
              placeholder="Amount *"
              inputMode="decimal"
              className={inputCls}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setMode(null)}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-[#dde3ee] bg-white px-3 text-sm font-semibold text-[#344054] transition hover:border-[#cfd8e6] hover:bg-[#f8fafc]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[#111827] px-4 text-sm font-semibold text-white transition hover:bg-[#0b1220]"
            >
              Create
            </button>
          </div>
        </form>
      ) : null}

      {mode === "full" ? (
        <div className="mt-3 border-t border-[#eef2f7] pt-3">
          <DesktopCreateOrder businessId={businessId} businessSlug={businessSlug} />
        </div>
      ) : null}
    </div>
  );
}
