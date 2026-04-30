"use client";

import { useState } from "react";
import DesktopCreateOrder from "./DesktopCreateOrder";

type Props = {
  businessId: string;
  businessSlug: string;
};

export default function DesktopAddOrderCard({ businessId, businessSlug }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <section className="bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-3 text-left hover:opacity-90 transition-opacity"
        >
          <span className="h-10 w-10 rounded-xl bg-gray-900 text-white flex items-center justify-center text-xl select-none">
            +
          </span>
          <div>
            <div className="text-base font-semibold text-gray-900 dark:text-white">
              Add order
            </div>
            <div className="text-xs text-gray-500 dark:text-white/55">
              {open ? "Click to hide" : "Click to open"}
            </div>
          </div>
        </button>

        {/* маленькая кнопка справа тоже кликабельна */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="h-9 px-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] text-sm font-semibold text-gray-900 dark:text-white hover:bg-gray-50 transition-colors"
        >
          {open ? "Hide" : "Open"}
        </button>
      </div>

      {/* Body */}
      {open ? (
        <div className="mt-4">
          <DesktopCreateOrder
            businessId={businessId}
            businessSlug={businessSlug}
          />
        </div>
      ) : null}
    </section>
  );
}
