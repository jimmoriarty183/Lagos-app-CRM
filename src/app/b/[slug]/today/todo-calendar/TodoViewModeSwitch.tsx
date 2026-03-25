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
    <div className="inline-flex rounded-[18px] border border-[#D6DEEC] bg-[linear-gradient(180deg,#F8FAFF_0%,#EEF2FA_100%)] p-1 shadow-[inset_0_1px_2px_rgba(15,23,42,0.05)]">
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
                ? "border-[#CBD5E1] bg-white text-[#0F172A] shadow-[0_8px_18px_rgba(15,23,42,0.1)]"
                : "border-transparent text-[#667085] hover:bg-white/80 hover:text-[#334155]",
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
