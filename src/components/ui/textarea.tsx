import * as React from "react";

import { cn } from "./utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[100px] w-full rounded-[var(--radius)] border border-[var(--neutral-200)] bg-white px-4 py-3 text-[0.9375rem] text-[var(--neutral-900)]",
        "placeholder:text-[var(--neutral-500)] transition-[border-color,box-shadow] outline-none",
        "focus-visible:border-[var(--brand-600)] focus-visible:ring-0",
        "aria-invalid:border-[var(--error-500)]",
        "resize-y disabled:cursor-not-allowed disabled:bg-[var(--neutral-100)] disabled:text-[var(--neutral-500)]",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
