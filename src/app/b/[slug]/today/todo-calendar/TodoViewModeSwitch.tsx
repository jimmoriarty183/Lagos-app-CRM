"use client";

import { cn } from "@/components/ui/utils";

type Option<T extends string> = {
  value: T;
  label: string;
};

export function TodoViewModeSwitch<T extends string>({
  value,
  options,
  onChange,
  size = "md",
}: {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex rounded-[18px] border border-[#E5E7EB] bg-[linear-gradient(180deg,#F9FAFB_0%,#F3F4F6_100%)] p-1 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)]">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-[14px] border px-3.5 font-medium transition",
              size === "sm" ? "h-8 text-[12px]" : "h-9.5 text-[13px]",
              active
                ? "border-[#D8DEE9] bg-white text-[#111827] shadow-[0_6px_16px_rgba(15,23,42,0.08)]"
                : "border-transparent text-[#667085] hover:bg-white/70 hover:text-[#344054]",
            )}
            aria-pressed={active}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
