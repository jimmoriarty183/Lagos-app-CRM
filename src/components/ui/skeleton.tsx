import { cn } from "./utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-[4px] bg-[var(--neutral-200)]", className)}
      {...props}
    />
  );
}

export { Skeleton };
