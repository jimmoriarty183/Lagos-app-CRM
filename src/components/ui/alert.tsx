import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const alertVariants = cva(
  "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-[var(--radius)] border px-4 py-4 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default:
          "border-[var(--neutral-200)] bg-white text-[var(--neutral-700)]",
        info: "border-[var(--brand-400)] bg-[var(--brand-50)] text-[var(--brand-700)]",
        success:
          "border-[var(--success-500)] bg-[var(--success-50)] text-[var(--success-500)]",
        warning:
          "border-[var(--warning-500)] bg-[var(--warning-50)] text-[var(--warning-500)]",
        error:
          "border-[var(--error-500)] bg-[var(--error-50)] text-[var(--error-500)]",
        destructive:
          "border-[var(--error-500)] bg-[var(--error-50)] text-[var(--error-500)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 text-sm font-semibold tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
