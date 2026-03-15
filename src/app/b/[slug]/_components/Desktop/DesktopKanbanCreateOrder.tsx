"use client";

import React from "react";
import { Plus } from "lucide-react";

type Props = {
  onCreate: () => void;
};

export default function DesktopKanbanCreateOrder({ onCreate }: Props) {
  return (
    <div className="rounded-[22px] border border-dashed border-[#cfd8e6] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-white shadow-[0_10px_24px_rgba(17,24,39,0.18)]">
          <Plus className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[#111827]">Create order</div>
          <div className="mt-1 text-xs leading-5 text-[#98a2b3]">
            Open an empty order preview and fill it before saving.
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onCreate}
        className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[#111827] px-4 text-sm font-semibold text-white transition hover:bg-[#0b1220]"
      >
        <Plus className="mr-2 h-4 w-4" />
        Create order
      </button>
    </div>
  );
}
