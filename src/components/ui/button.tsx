import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-[rgba(91,91,179,0.18)] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--brand-600)] text-white shadow-[0_8px_20px_rgba(91,91,179,0.18)] hover:bg-[var(--brand-700)]",
        destructive:
          "bg-[var(--error-500)] text-white shadow-[0_8px_18px_rgba(232,69,69,0.18)] hover:bg-[#D13535]",
        "destructive-outline":
          "bg-transparent border border-[var(--error-500)] text-[var(--error-500)] hover:bg-[var(--error-50)]",
        outline:
          "bg-transparent border border-[var(--neutral-200)] text-[var(--neutral-900)] hover:bg-[var(--neutral-100)]",
        secondary:
          "bg-[var(--neutral-100)] text-[var(--neutral-900)] hover:bg-[var(--neutral-200)]",
        ghost:
          "bg-transparent text-[var(--neutral-700)] hover:bg-[var(--neutral-100)]",
        "ghost-brand":
          "bg-transparent text-[var(--brand-600)] hover:bg-[var(--brand-50)]",
        link: "text-[var(--brand-700)] underline-offset-4 hover:underline",
      },
      size: {
        small: "h-8 px-3 text-[0.875rem] has-[>svg]:px-2",
        medium: "h-[44px] px-6 py-3 text-[1rem] has-[>svg]:px-5",
        large: "h-[52px] px-8 py-4 text-[1.125rem] has-[>svg]:px-6",
        default: "h-[44px] px-6 py-3 text-[1rem] has-[>svg]:px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "medium",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
