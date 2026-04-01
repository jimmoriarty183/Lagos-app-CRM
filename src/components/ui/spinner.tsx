import * as React from "react";

import { cn } from "./utils";

function Spinner({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn("spinner", className)}
      {...props}
    />
  );
}

export { Spinner };
