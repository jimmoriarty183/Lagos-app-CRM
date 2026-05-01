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
    <div className="inline-flex rounded-[18px] border border-[#D6DEEC] dark:border-white/10 bg-[#EEF2FA] dark:bg-white/[0.04] p-1 shadow-[inset_0_1px_2px_rgba(15,23,42,0.05)]">
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
                ? "border-[var(--brand-600)] bg-[var(--brand-600)] !text-white shadow-[0_8px_18px_rgba(91,91,179,0.24)] hover:border-[var(--brand-700)] hover:bg-[var(--brand-700)] hover:!text-white"
                : "border-transparent text-[#667085] dark:text-white/65 hover:bg-[#F1F5F9] dark:hover:!bg-white/[0.08] hover:text-[#334155] dark:hover:!text-white",
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
