"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/components/ui/utils";

export function TaskGroupSection({
  title,
  count,
  hint,
  tone = "neutral",
  defaultOpen = true,
  children,
}: {
  title: string;
  count: number;
  hint: string;
  tone?: "danger" | "primary" | "neutral";
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  const textClass =
    tone === "danger"
      ? "text-[#B42318]"
      : tone === "primary"
        ? "text-[#3645A0]"
        : "text-[#475467]";

  return (
    <section className="space-y-1.5">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-[14px] px-1 py-1 text-left transition hover:bg-[#F8FAFC]"
        aria-expanded={isOpen}
      >
        <div>
          <div className={`text-[12px] font-medium leading-4 ${textClass}`}>
            {title} ({count})
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-[#9CA3AF]">
              {hint}
            </span>
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#98A2B3]">
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </span>
          </div>
        </div>
      </button>

      {isOpen ? children : null}
    </section>
  );
}
