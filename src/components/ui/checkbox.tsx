"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "lucide-react";

import { cn } from "./utils";

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-5 shrink-0 rounded-[4px] border-2 border-[var(--neutral-300)] bg-white text-white outline-none transition-colors",
        "data-[state=checked]:border-[var(--brand-600)] data-[state=checked]:bg-[var(--brand-600)]",
        "focus-visible:border-[var(--brand-600)] focus-visible:ring-0",
        "aria-invalid:border-[var(--error-500)]",
        "disabled:cursor-not-allowed disabled:bg-[var(--neutral-100)] disabled:opacity-100",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
