import * as React from "react";

import { cn } from "./utils";

function EmptyState({
  className,
  title,
  description,
  action,
  icon,
  ...props
}: React.ComponentProps<"section"> & {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <section data-slot="empty-state" className={cn("empty-state", className)} {...props}>
      {icon ? (
        <div className="text-[var(--neutral-500)]" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <h3 className="empty-state-title">{title}</h3>
      {description ? (
        <p className="empty-state-description">{description}</p>
      ) : null}
      {action ? <div>{action}</div> : null}
    </section>
  );
}

export { EmptyState };
