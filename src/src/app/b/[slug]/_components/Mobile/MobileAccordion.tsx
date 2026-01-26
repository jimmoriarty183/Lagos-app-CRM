"use client";

import { ReactNode, useId, useState } from "react";
import { ChevronDown } from "lucide-react";

type Props = {
  title: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  rightSlot?: ReactNode; // действия справа (например Clear)
};

export default function MobileAccordion({
  title,
  defaultOpen = false,
  children,
  rightSlot,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();

  return (
    <div className="w-full">
      <button
        type="button"
        aria-controls={id}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={[
          "w-full flex items-center justify-between gap-3",
          "px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm",
          "hover:bg-gray-50 transition-colors",
        ].join(" ")}
      >
        <div className="min-w-0 flex items-center gap-2">
          <span className="text-sm font-extrabold text-gray-900 truncate">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {rightSlot ? (
            <span
              onClick={(e) => e.stopPropagation()} // чтобы клик по Clear не открывал/закрывал
              className="inline-flex items-center"
            >
              {rightSlot}
            </span>
          ) : null}

          <span
            className={[
              "inline-flex items-center justify-center",
              "h-8 w-8 rounded-lg border border-gray-200 bg-white",
              "text-gray-600",
              "transition-transform",
              open ? "rotate-180" : "rotate-0",
            ].join(" ")}
            aria-hidden="true"
          >
            <ChevronDown className="h-4 w-4" />
          </span>
        </div>
      </button>

      {open ? (
        <div id={id} className="pt-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}
