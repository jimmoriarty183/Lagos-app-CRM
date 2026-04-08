"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

type ClientsPageErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

function AlertIcon() {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 8V13"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.5" r="1" fill="currentColor" />
      <path
        d="M10.27 3.67L2.64 17.17C1.91 18.46 2.84 20 4.31 20H19.69C21.16 20 22.09 18.46 21.36 17.17L13.73 3.67C12.99 2.38 11.01 2.38 10.27 3.67Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ClientsPageError({ error, reset }: ClientsPageErrorProps) {
  return (
    <main className="mx-auto flex min-h-screen max-w-[1220px] items-center px-4 py-20 sm:px-6">
      <EmptyState
        className="w-full rounded-[24px] border border-[#E5E7EB] bg-white p-8 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
        icon={<AlertIcon />}
        title="No clients created yet"
        description="There are no clients in this workspace yet. Create your first order to add one."
        action={
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              className="h-10 rounded-xl px-4 text-sm font-semibold"
              onClick={reset}
            >
              Refresh
            </Button>
          </div>
        }
      />
      {error?.digest ? (
        <p className="sr-only" role="status">
          Error digest: {error.digest}
        </p>
      ) : null}
    </main>
  );
}
