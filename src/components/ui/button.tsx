import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "border border-[#6366F1] bg-[#6366F1] text-white shadow-[0_8px_20px_rgba(99,102,241,0.22)] hover:border-[#5558E3] hover:bg-[#5558E3]",
        destructive:
          "bg-destructive text-white shadow-[0_8px_18px_rgba(217,45,32,0.18)] hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border-2 border-[#6366F1] bg-white text-[#4338CA] hover:bg-[#6366F1] hover:text-white dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "border border-[#C7D2FE] bg-[#EEF2FF] text-[#4338CA] hover:border-[#A5B4FC] hover:bg-[#E0E7FF]",
        ghost:
          "text-[#4338CA] hover:bg-[#EEF2FF] hover:text-[#3730A3] dark:hover:bg-accent/50",
        link: "text-[#4338CA] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-3 has-[>svg]:px-4",
        sm: "h-10 gap-1.5 px-4 has-[>svg]:px-3",
        lg: "h-12 px-6 has-[>svg]:px-5",
        icon: "size-11",
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
