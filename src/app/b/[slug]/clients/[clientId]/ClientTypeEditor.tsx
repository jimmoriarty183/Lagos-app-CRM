"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { convertClientType } from "@/app/b/[slug]/clients/actions";

export function ClientTypeEditor({
  clientId,
  businessSlug,
  currentType,
  companyNameHint,
  hasPrimaryContact,
  compact = false,
  showTypeBadge = true,
  compactLabel,
}: {
  clientId: string;
  businessSlug: string;
  currentType: "individual" | "company";
  companyNameHint: string;
  hasPrimaryContact: boolean;
  compact?: boolean;
  showTypeBadge?: boolean;
  compactLabel?: string;
}) {
  const [nextType, setNextType] = React.useState<"individual" | "company">(
    currentType === "individual" ? "company" : "individual",
  );
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [companyName, setCompanyName] = React.useState(companyNameHint || "");
  const [useIndividualAsPrimaryContact, setUseIndividualAsPrimaryContact] =
    React.useState(true);
  const [usePrimaryContactAsIndividual, setUsePrimaryContactAsIndividual] =
    React.useState(hasPrimaryContact);
  const [errorText, setErrorText] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    setNextType(currentType === "individual" ? "company" : "individual");
  }, [currentType]);

  function submit() {
    if (nextType === currentType) return;
    setErrorText(null);
    startTransition(async () => {
      try {
        await convertClientType({
          clientId,
          businessSlug,
          nextType,
          companyName: nextType === "company" ? companyName : null,
          useIndividualAsPrimaryContact:
            nextType === "company" ? useIndividualAsPrimaryContact : false,
          usePrimaryCompanyContactAsIndividual:
            nextType === "individual" ? usePrimaryContactAsIndividual : false,
        });
        setConfirmOpen(false);
      } catch (error) {
        setErrorText(
          error instanceof Error
            ? error.message
            : "Failed to convert client type",
        );
      }
    });
  }

  return (
    <>
      <div
        className={
          compact
            ? "flex items-center gap-2"
            : "rounded-2xl border border-slate-200 bg-slate-50 p-4"
        }
      >
        {!compact ? (
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Client type
          </div>
        ) : null}
        <div
          className={
            compact
              ? "flex items-center gap-2"
              : "mt-2 flex items-center justify-between gap-3"
          }
        >
          {showTypeBadge ? (
            <span className="inline-flex items-center rounded-full border border-[var(--brand-200)] bg-[var(--brand-50)] px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--brand-700)]">
              {currentType}
            </span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => setConfirmOpen(true)}
            className={
              compact
                ? "h-7 rounded-lg px-2.5 text-xs font-semibold"
                : "h-9 rounded-lg px-3 text-sm font-semibold"
            }
          >
            {compact ? compactLabel || "Change" : "Change client type"}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-2xl border-[#E5E7EB] bg-white sm:max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl leading-tight text-slate-900">
              Confirm client type conversion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-600">
              This changes the normalized profile structure from{" "}
              <b>{currentType}</b> to <b>{nextType}</b>. Compatible data is
              preserved where possible.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <label className="grid gap-1.5">
            <span className="text-xs font-semibold text-slate-600">
              New client type
            </span>
            <select
              value={nextType}
              onChange={(event) =>
                setNextType(
                  event.currentTarget.value as "individual" | "company",
                )
              }
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
            >
              <option value="individual">Individual</option>
              <option value="company">Company</option>
            </select>
          </label>

          {nextType === "company" ? (
            <div className="grid gap-2">
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold text-slate-600">
                  Company name
                </span>
                <input
                  value={companyName}
                  onChange={(event) =>
                    setCompanyName(event.currentTarget.value)
                  }
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none"
                />
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={useIndividualAsPrimaryContact}
                  onChange={(event) =>
                    setUseIndividualAsPrimaryContact(
                      event.currentTarget.checked,
                    )
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                Use existing personal data as primary company contact
              </label>
            </div>
          ) : (
            <div className="grid gap-2">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={usePrimaryContactAsIndividual}
                  onChange={(event) =>
                    setUsePrimaryContactAsIndividual(
                      event.currentTarget.checked,
                    )
                  }
                  disabled={!hasPrimaryContact}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Use primary company contact as individual identity
              </label>
              {!hasPrimaryContact ? (
                <div className="text-xs text-slate-500">
                  No active company contact found. Existing profile/client data
                  will be used.
                </div>
              ) : null}
            </div>
          )}

          {errorText ? (
            <div className="text-sm font-medium text-rose-700">{errorText}</div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending} className="text-slate-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={submit} disabled={isPending}>
              {isPending ? "Converting..." : "Confirm conversion"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
