import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-[rgba(99,102,241,0.18)] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "border border-[#6366F1] bg-[#6366F1] text-white shadow-[0_8px_20px_rgba(99,102,241,0.18)] hover:border-[#5558E3] hover:bg-[#5558E3]",
        destructive:
          "bg-destructive text-white shadow-[0_8px_18px_rgba(217,45,32,0.18)] hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border border-[#C7D2FE] bg-white text-[#4F46E5] shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:border-[#A5B4FC] hover:bg-[#EEF2FF] hover:text-[#4338CA] dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "border border-[#E5E7EB] bg-[#F9FAFB] text-[#4B5563] shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:border-[#D1D5DB] hover:bg-white hover:text-[#374151]",
        ghost:
          "text-[#6366F1] hover:bg-[#EEF2FF] hover:text-[#4338CA] dark:hover:bg-accent/50",
        link: "text-[#4338CA] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 px-5 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
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
