import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-md border px-2 py-0.5 text-[0.75rem] font-medium [&>svg]:size-3 [&>svg]:pointer-events-none transition-[color,box-shadow]",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--neutral-100)] text-[var(--neutral-700)]",
        primary:
          "border-transparent bg-[var(--brand-50)] text-[var(--brand-700)]",
        success:
          "border-transparent bg-[var(--success-50)] text-[var(--success-500)]",
        warning:
          "border-transparent bg-[var(--warning-50)] text-[var(--warning-500)]",
        error:
          "border-transparent bg-[var(--error-50)] text-[var(--error-500)]",
        secondary:
          "border-transparent bg-[var(--neutral-100)] text-[var(--neutral-700)]",
        destructive:
          "border-transparent bg-[var(--error-50)] text-[var(--error-500)]",
        outline:
          "border-[var(--neutral-200)] bg-white text-[var(--neutral-700)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
