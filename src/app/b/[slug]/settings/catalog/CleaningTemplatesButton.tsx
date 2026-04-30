"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { seedCleaningServiceTemplates } from "./actions";

type Props = {
  businessSlug: string;
};

export default function CleaningTemplatesButton({ businessSlug }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);

  const handleClick = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await seedCleaningServiceTemplates({ businessSlug });
      if (!result.ok) {
        setMessage({ kind: "error", text: result.error });
        return;
      }
      if (result.inserted === 0) {
        setMessage({
          kind: "ok",
          text: "All 6 cleaning templates are already in your catalog.",
        });
      } else {
        setMessage({
          kind: "ok",
          text:
            result.skipped > 0
              ? `Added ${result.inserted} cleaning service${result.inserted === 1 ? "" : "s"} (${result.skipped} already existed).`
              : `Added ${result.inserted} cleaning service${result.inserted === 1 ? "" : "s"} to your catalog.`,
        });
      }
      router.refresh();
    });
  };

  return (
    <div className="mb-3 rounded-[14px] border border-[var(--brand-200)] bg-[var(--brand-50)]/70 p-3 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Sparkles className="h-4 w-4 text-[var(--brand-700)]" />
            Quick start for cleaning businesses
          </div>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-white/60">
            Add 6 ready-made services (Regular, Deep, End of tenancy, Carpet, Office, Window) with default GBP pricing. Edit anything after.
          </p>
        </div>
        <Button
          type="button"
          onClick={handleClick}
          disabled={pending}
          className="h-9 rounded-lg px-3 text-xs font-semibold"
        >
          {pending ? "Adding…" : "Add cleaning templates"}
        </Button>
      </div>
      {message ? (
        <p
          className={`mt-2 text-xs font-medium ${
            message.kind === "ok"
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-rose-700 dark:text-rose-300"
          }`}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
