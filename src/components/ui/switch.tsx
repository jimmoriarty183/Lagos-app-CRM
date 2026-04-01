"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "./utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent bg-[var(--neutral-300)] transition-colors outline-none",
        "data-[state=checked]:bg-[var(--brand-600)]",
        "focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-4 rounded-full bg-white ring-0 transition-transform data-[state=unchecked]:translate-x-1 data-[state=checked]:translate-x-6",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
