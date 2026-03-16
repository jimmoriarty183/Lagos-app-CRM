"use client";

import React from "react";
import { Plus } from "lucide-react";

type Props = {
  onCreate: () => void;
};

export default function DesktopKanbanCreateOrder({ onCreate }: Props) {
  return (
    <div
      onClick={onCreate}
      className="flex cursor-pointer items-center gap-3 rounded-[22px] border border-dashed border-[#cfd8e6] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 transition hover:border-[#111827] hover:bg-white"
    >
      <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-white shadow-[0_10px_24px_rgba(17,24,39,0.18)]">
        <Plus className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-[#111827]">Create order</div>
      </div>
    </div>
  );
}
