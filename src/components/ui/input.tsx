import * as React from "react";

import { cn } from "./utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-[var(--neutral-900)] dark:file:text-white placeholder:text-[var(--neutral-500)] dark:placeholder:text-white/40 selection:bg-[var(--brand-600)] selection:text-white",
        "flex h-8 w-full min-w-0 rounded-[var(--radius)] border border-[var(--neutral-200)] dark:border-white/15 bg-white dark:bg-white/[0.03] px-3 py-1.5 text-[0.8125rem] text-[var(--neutral-900)] dark:text-white transition-[border-color,box-shadow] outline-none",
        "focus-visible:border-[var(--brand-600)] focus-visible:ring-0",
        "aria-invalid:border-[var(--error-500)]",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[var(--neutral-100)] dark:disabled:bg-white/[0.02] disabled:text-[var(--neutral-500)] dark:disabled:text-white/40",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
